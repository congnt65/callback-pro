import { NextRequest, NextResponse, after } from 'next/server'
import { getDataProvider } from '@/lib/data'
import { cacheGet, cacheSet, endpointCacheKey } from '@/lib/redis'
import { DEFAULT_MAX_REQUESTS } from '@/lib/types'
import type { Endpoint } from '@/lib/types'

export async function handler(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Use the timestamp injected by middleware (when request first arrived) for accurate duration
  const requestStart = Number(request.headers.get('X-Request-Start')) || Date.now()
  const { id } = await params
  const provider = getDataProvider()

  // Try in-process cache first (zero latency), then fall back to Supabase
  const cacheKey = endpointCacheKey(id)
  const [cached, body] = await Promise.all([
    Promise.resolve(cacheGet(cacheKey)),
    request.text().then(t => t || null).catch(() => null),
  ])

  let endpoint: Endpoint | null = cached as Endpoint | null

  if (endpoint == null) {
    try {
      endpoint = await provider.getEndpoint(id)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return NextResponse.json({ error: message }, { status: 500 })
    }

    if (endpoint == null) {
      return NextResponse.json({ error: 'Endpoint not found' }, { status: 404 })
    }
    cacheSet(cacheKey, endpoint)
  }

  // Atomically increment request_count only if below max_requests.
  // A single conditional UPDATE in Postgres eliminates the race condition that would
  // occur if we did a separate SELECT (or cache read) followed by an UPDATE.
  const maxRequests = (endpoint.max_requests as number) ?? DEFAULT_MAX_REQUESTS
  let allowed = false

  try {
    allowed = await provider.tryIncrementRequestCount(id)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }

  if (!allowed) {
    return NextResponse.json(
      { error: `Request limit exceeded. Max ${maxRequests} requests per endpoint.` },
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

    await provider.insertRequest(requestData)

    // Keep the cache up-to-date so consecutive requests in the same warm instance
    // don't re-fetch from DB. The authoritative increment is already done by the
    // try_increment_request_count RPC called before the response was sent.
    const newCount = (endpoint.request_count as number) + 1
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