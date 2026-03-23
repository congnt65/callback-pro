import { NextRequest, NextResponse, after } from 'next/server'
import { supabase } from '@/lib/supabase'
import { cacheGet, cacheSet, endpointCacheKey } from '@/lib/redis'

const MAX_REQUESTS = 500

export async function handler(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Use the timestamp injected by middleware (when request first arrived) for accurate duration
  const requestStart = Number(request.headers.get('X-Request-Start')) || Date.now()
  const { id } = await params

  // Try in-process cache first (zero latency), then fall back to Supabase
  const cacheKey = endpointCacheKey(id)
  const [cached, body] = await Promise.all([
    Promise.resolve(cacheGet(cacheKey)),
    request.text().then(t => t || null).catch(() => null),
  ])

  let endpoint: Record<string, unknown> | null = cached

  if (endpoint == null) {
    const { data, error } = await supabase.from('endpoints').select().eq('id', id).single()
    if (error || data == null) {
      return NextResponse.json({ error: 'Endpoint not found' }, { status: 404 })
    }
    endpoint = data as Record<string, unknown>
    cacheSet(cacheKey, endpoint)
  }

  if ((endpoint.request_count as number) >= MAX_REQUESTS) {
    return NextResponse.json(
      { error: 'Request limit exceeded. Max 500 requests per endpoint.' },
      { status: 429 }
    )
  }

  // Parse metadata (all synchronous — zero cost)
  const method = request.method
  const url = new URL(request.url)
  const pathname = url.pathname.replace(/^\/api\/hook\/[^/]+/, '') || '/'

  const queryParams: Record<string, string> = {}
  url.searchParams.forEach((v, k) => { queryParams[k] = v })

  const headersObj: Record<string, string> = {}
  request.headers.forEach((v, k) => {
    if (k !== 'host' && k !== 'content-length' && !k.startsWith('x-vercel-')) headersObj[k] = v
  })

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ?? null

  // Build response headers synchronously
  const responseHeaders = new Headers()
  responseHeaders.set('Content-Type', endpoint.custom_response_content_type as string)
  const customHeaders = endpoint.custom_response_headers as Record<string, string>
  Object.entries(customHeaders).forEach(([k, v]) => responseHeaders.set(k, v))
  responseHeaders.set('X-CallbackPro-Endpoint', id)

  // Honour configured delay before sending response
  const delayMs = (endpoint.custom_response_delay_ms as number) ?? 0
  if (delayMs > 0) {
    await new Promise(resolve => setTimeout(resolve, delayMs))
  }

  const duration_ms = Date.now() - requestStart

  // Defer all DB writes to AFTER the response is sent to the client
  // Client gets the response immediately — DB writes happen in background
  after(async () => {
    const requestData = {
      endpoint_id: id,
      method,
      path: pathname,
      query_params: queryParams,
      headers: headersObj,
      body,
      ip,
      duration_ms,
    }

    const { error: insertError } = await supabase.from('requests').insert(requestData)

    // Fallback: if insert failed (e.g. duration_ms column not yet migrated), retry without it
    if (insertError) {
      const { duration_ms: _d, ...requestDataFallback } = requestData
      await supabase.from('requests').insert(requestDataFallback)
    }

    const newCount = (endpoint.request_count as number) + 1
    await supabase
      .from('endpoints')
      .update({ request_count: newCount })
      .eq('id', id)

    // Keep the cache up-to-date so consecutive requests in the same warm instance
    // see the correct count instead of repeatedly writing the same stale value.
    cacheSet(cacheKey, { ...endpoint, request_count: newCount })
  })

  // Return immediately — no waiting for DB
  return new NextResponse(endpoint.custom_response_body as string || null, {
    status: endpoint.custom_response_status as number,
    headers: responseHeaders,
  })
}

export const GET = handler
export const POST = handler
export const PUT = handler
export const PATCH = handler
export const DELETE = handler
export const HEAD = handler
export const OPTIONS = handler