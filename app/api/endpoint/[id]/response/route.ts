import { NextResponse } from 'next/server'
import { getDataProvider } from '@/lib/data'
import { cacheDel, endpointCacheKey } from '@/lib/redis'
import type { CustomResponse } from '@/lib/types'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const provider = getDataProvider()
    const endpoint = await provider.getEndpoint(id)

    if (endpoint == null) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json({
      status: endpoint.custom_response_status,
      headers: endpoint.custom_response_headers,
      body: endpoint.custom_response_body,
      contentType: endpoint.custom_response_content_type,
      delayMs: endpoint.custom_response_delay_ms ?? 0,
      maxRequests: endpoint.max_requests ?? 500,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    let reqBody: CustomResponse
    try {
      reqBody = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }
    const { status, headers, body: responseBody, contentType, delayMs, maxRequests } = reqBody as CustomResponse
    const provider = getDataProvider()
    const endpoint = await provider.updateEndpointResponse(id, {
      status,
      headers,
      body: responseBody,
      contentType,
      delayMs,
      maxRequests,
    })

    if (endpoint == null) {
      return NextResponse.json({ error: 'Update failed' }, { status: 500 })
    }

    cacheDel(endpointCacheKey(id))
    return NextResponse.json(endpoint)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid request'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}