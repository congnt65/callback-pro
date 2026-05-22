import { getSupabase } from '../supabase'
import type { CustomResponse, Endpoint, WebhookRequest } from '../types'
import type { CreateEndpointResult, DataProvider, RequestInsert } from './provider'

export class SupabaseDataProvider implements DataProvider {
  async createEndpoint(requestedId?: string): Promise<CreateEndpointResult> {
    const supabase = getSupabase()
    const id = requestedId?.trim() || crypto.randomUUID()

    const { data, error } = await supabase
      .from('endpoints')
      .insert({ id, custom_response_body: JSON.stringify({ message: 'ok' }) })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        const { data: existing, error: existingError } = await supabase
          .from('endpoints')
          .select()
          .eq('id', id)
          .single()

        if (existingError || existing == null) {
          throw new Error(existingError?.message ?? 'Failed to read existing endpoint')
        }

        return {
          endpoint: existing as Endpoint,
          created: false,
        }
      }

      throw new Error(error.message)
    }

    return {
      endpoint: data as Endpoint,
      created: true,
    }
  }

  async getEndpoint(id: string): Promise<Endpoint | null> {
    const supabase = getSupabase()
    const { data, error } = await supabase.from('endpoints').select().eq('id', id).maybeSingle()

    if (error) {
      throw new Error(error.message)
    }

    return (data as Endpoint | null) ?? null
  }

  async updateEndpointResponse(id: string, config: CustomResponse): Promise<Endpoint | null> {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('endpoints')
      .update({
        custom_response_status: config.status ?? 200,
        custom_response_headers: config.headers ?? {},
        custom_response_body: config.body ?? '',
        custom_response_content_type: config.contentType ?? 'application/json',
        custom_response_delay_ms: Math.max(0, Math.min(30000, Number(config.delayMs) || 0)),
        max_requests: Math.max(1, Number(config.maxRequests) || 500),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return (data as Endpoint | null) ?? null
  }

  async listRequests(endpointId: string): Promise<WebhookRequest[]> {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('requests')
      .select()
      .eq('endpoint_id', endpointId)
      .order('received_at', { ascending: false })
      .limit(500)

    if (error) {
      throw new Error(error.message)
    }

    return (data as WebhookRequest[] | null) ?? []
  }

  async clearRequests(endpointId: string): Promise<void> {
    const supabase = getSupabase()
    const { error } = await supabase.from('requests').delete().eq('endpoint_id', endpointId)

    if (error) {
      throw new Error(error.message)
    }

    const { error: resetError } = await supabase
      .from('endpoints')
      .update({ request_count: 0 })
      .eq('id', endpointId)

    if (resetError) {
      throw new Error(resetError.message)
    }
  }

  async markRequestRead(requestId: string): Promise<void> {
    const supabase = getSupabase()
    const { error } = await supabase.from('requests').update({ is_read: true }).eq('id', requestId)

    if (error) {
      throw new Error(error.message)
    }
  }

  async deleteRequest(endpointId: string, requestId: string): Promise<void> {
    const supabase = getSupabase()
    const { error } = await supabase.from('requests').delete().eq('id', requestId)

    if (error) {
      throw new Error(error.message)
    }

    const { error: rpcError } = await supabase.rpc('decrement_request_count', { p_endpoint_id: endpointId })

    if (rpcError) {
      throw new Error(rpcError.message)
    }
  }

  async tryIncrementRequestCount(endpointId: string): Promise<boolean> {
    const supabase = getSupabase()
    const { data, error } = await supabase.rpc('try_increment_request_count', { endpoint_id: endpointId })

    if (error) {
      throw new Error(error.message)
    }

    return Boolean(data)
  }

  async insertRequest(request: RequestInsert): Promise<void> {
    const supabase = getSupabase()
    const { error: insertError } = await supabase.from('requests').insert(request)

    if (insertError == null) {
      return
    }

    const fallbackRequest = {
      endpoint_id: request.endpoint_id,
      method: request.method,
      path: request.path,
      query_params: request.query_params,
      headers: request.headers,
      body: request.body,
      ip: request.ip,
    }
    const { error: fallbackError } = await supabase.from('requests').insert(fallbackRequest)

    if (fallbackError) {
      throw new Error(fallbackError.message)
    }
  }
}
