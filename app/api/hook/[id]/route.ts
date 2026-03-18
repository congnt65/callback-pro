import { NextRequest, NextResponse, after } from 'next/server'
import { supabase } from '@/lib/supabase'

const MAX_REQUESTS = 500

export async function handler(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const startTime = Date.now()
  const { id } = await params

  // Run endpoint fetch + body read in parallel — saves ~50% of this phase
  const [endpointResult, body] = await Promise.all([
    supabase.from('endpoints').select().eq('id', id).single(),
    request.text().then(t => t || null).catch(() => null),
  ])

  const { data: endpoint, error: endpointError } = endpointResult

  if (endpointError || endpoint == null) {
    return NextResponse.json({ error: 'Endpoint not found' }, { status: 404 })
  }

  if (endpoint.request_count >= MAX_REQUESTS) {
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
  responseHeaders.set('Content-Type', endpoint.custom_response_content_type)
  const customHeaders = endpoint.custom_response_headers as Record<string, string>
  Object.entries(customHeaders).forEach(([k, v]) => responseHeaders.set(k, v))
  responseHeaders.set('X-CallbackPro-Endpoint', id)

  const duration_ms = Date.now() - startTime

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

    await supabase
      .from('endpoints')
      .update({ request_count: endpoint.request_count + 1 })
      .eq('id', id)
  })

  // Return immediately — no waiting for DB
  return new NextResponse(endpoint.custom_response_body || null, {
    status: endpoint.custom_response_status,
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