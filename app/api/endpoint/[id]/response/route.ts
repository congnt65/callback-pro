import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { cacheDel, endpointCacheKey } from '@/lib/redis'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { data, error } = await supabase.from('endpoints').select().eq('id', id).single()
  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({
    status: data.custom_response_status,
    headers: data.custom_response_headers,
    body: data.custom_response_body,
    contentType: data.custom_response_content_type,
    delayMs: data.custom_response_delay_ms ?? 0,
    maxRequests: data.max_requests ?? 500,
  })
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const reqBody = await request.json()
    const { status, headers, body: responseBody, contentType, delayMs, maxRequests } = reqBody
    const { data, error } = await supabase
      .from('endpoints')
      .update({
        custom_response_status: status ?? 200,
        custom_response_headers: headers ?? {},
        custom_response_body: responseBody ?? '',
        custom_response_content_type: contentType ?? 'application/json',
        custom_response_delay_ms: Math.max(0, Math.min(30000, Number(delayMs) || 0)),
        max_requests: Math.max(1, Number(maxRequests) || 500),
      })
      .eq('id', id)
      .select()
      .single()
    if (error || !data) return NextResponse.json({ error: error?.message ?? 'Update failed' }, { status: 500 })
    // Invalidate in-process cache so the next hook hit picks up the new config
    cacheDel(endpointCacheKey(id))
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}