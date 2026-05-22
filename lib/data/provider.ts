import type { CustomResponse, Endpoint, WebhookRequest } from '../types'

export interface CreateEndpointResult {
  endpoint: Endpoint
  created: boolean
}

export interface RequestInsert {
  endpoint_id: string
  method: string
  path: string
  query_params: Record<string, string>
  headers: Record<string, string>
  body: string | null
  ip: string | null
  duration_ms: number
}

export interface DataProvider {
  createEndpoint(requestedId?: string): Promise<CreateEndpointResult>
  getEndpoint(id: string): Promise<Endpoint | null>
  updateEndpointResponse(id: string, config: CustomResponse): Promise<Endpoint | null>
  listRequests(endpointId: string): Promise<WebhookRequest[]>
  clearRequests(endpointId: string): Promise<void>
  markRequestRead(requestId: string): Promise<void>
  deleteRequest(endpointId: string, requestId: string): Promise<void>
  tryIncrementRequestCount(endpointId: string): Promise<boolean>
  insertRequest(request: RequestInsert): Promise<void>
}
