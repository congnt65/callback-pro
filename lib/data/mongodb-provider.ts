import { getMongoDb } from './mongodb'
import type { CreateEndpointResult, DataProvider, RequestInsert } from './provider'
import { DEFAULT_MAX_REQUESTS } from '../types'
import type { CustomResponse, Endpoint, WebhookRequest } from '../types'

type EndpointDocument = Endpoint & { _id: string }
type RequestDocument = WebhookRequest & { _id: string }

function mapEndpoint(document: EndpointDocument): Endpoint {
  return {
    id: document.id,
    created_at: document.created_at,
    request_count: document.request_count,
    max_requests: document.max_requests,
    custom_response_status: document.custom_response_status,
    custom_response_headers: document.custom_response_headers,
    custom_response_body: document.custom_response_body,
    custom_response_content_type: document.custom_response_content_type,
    custom_response_delay_ms: document.custom_response_delay_ms,
  }
}

function mapRequest(document: RequestDocument): WebhookRequest {
  return {
    id: document.id,
    endpoint_id: document.endpoint_id,
    method: document.method,
    path: document.path,
    query_params: document.query_params,
    headers: document.headers,
    body: document.body,
    received_at: document.received_at,
    is_read: document.is_read,
    ip: document.ip,
    duration_ms: document.duration_ms,
  }
}

export class MongoDataProvider implements DataProvider {
  async createEndpoint(requestedId?: string): Promise<CreateEndpointResult> {
    const db = await getMongoDb()
    const endpoints = db.collection<EndpointDocument>('endpoints')
    const id = requestedId?.trim() || crypto.randomUUID()
    const endpoint: EndpointDocument = {
      _id: id,
      id,
      created_at: new Date().toISOString(),
      request_count: 0,
      max_requests: DEFAULT_MAX_REQUESTS,
      custom_response_status: 200,
      custom_response_headers: {},
      custom_response_body: JSON.stringify({ message: 'ok' }),
      custom_response_content_type: 'application/json',
      custom_response_delay_ms: 0,
    }
    const result = await endpoints.updateOne(
      { _id: id },
      { $setOnInsert: endpoint },
      { upsert: true }
    )

    if (result.upsertedCount > 0) {
      return {
        endpoint: mapEndpoint(endpoint),
        created: true,
      }
    }

    const existing = await endpoints.findOne({ _id: id })

    if (existing == null) {
      throw new Error('Failed to read existing endpoint')
    }

    return {
      endpoint: mapEndpoint(existing),
      created: false,
    }
  }

  async getEndpoint(id: string): Promise<Endpoint | null> {
    const db = await getMongoDb()
    const endpoint = await db.collection<EndpointDocument>('endpoints').findOne({ _id: id })

    return endpoint == null ? null : mapEndpoint(endpoint)
  }

  async updateEndpointResponse(_id: string, _config: CustomResponse): Promise<Endpoint | null> {
    const db = await getMongoDb()
    const updated = await db.collection<EndpointDocument>('endpoints').findOneAndUpdate(
      { _id },
      {
        $set: {
          custom_response_status: _config.status ?? 200,
          custom_response_headers: _config.headers ?? {},
          custom_response_body: _config.body ?? '',
          custom_response_content_type: _config.contentType ?? 'application/json',
          custom_response_delay_ms: Math.max(0, Math.min(30000, Number(_config.delayMs) || 0)),
          max_requests: Math.max(1, Number(_config.maxRequests) || DEFAULT_MAX_REQUESTS),
        },
      },
      { returnDocument: 'after' }
    )

    return updated == null ? null : mapEndpoint(updated)
  }

  async listRequests(endpointId: string): Promise<WebhookRequest[]> {
    const db = await getMongoDb()
    const requests = await db
      .collection<RequestDocument>('requests')
      .find({ endpoint_id: endpointId })
      .sort({ received_at: -1 })
      .limit(500)
      .toArray()

    return requests.map(mapRequest)
  }

  async clearRequests(endpointId: string): Promise<void> {
    const db = await getMongoDb()

    await db.collection<RequestDocument>('requests').deleteMany({ endpoint_id: endpointId })
    await db.collection<EndpointDocument>('endpoints').updateOne(
      { _id: endpointId },
      {
        $set: {
          request_count: 0,
        },
      }
    )
  }

  async markRequestRead(requestId: string): Promise<void> {
    const db = await getMongoDb()

    await db.collection<RequestDocument>('requests').updateOne(
      { _id: requestId },
      {
        $set: {
          is_read: true,
        },
      }
    )
  }

  async deleteRequest(endpointId: string, requestId: string): Promise<void> {
    const db = await getMongoDb()
    const deleted = await db.collection<RequestDocument>('requests').findOneAndDelete({
      _id: requestId,
      endpoint_id: endpointId,
    })

    if (deleted != null) {
      await db.collection<EndpointDocument>('endpoints').updateOne(
        {
          _id: endpointId,
          request_count: { $gt: 0 },
        },
        {
          $inc: {
            request_count: -1,
          },
        }
      )
    }
  }

  async tryIncrementRequestCount(_endpointId: string): Promise<boolean> {
    const db = await getMongoDb()
    const updated = await db.collection<EndpointDocument>('endpoints').findOneAndUpdate(
      {
        _id: _endpointId,
        $expr: {
          $lt: ['$request_count', '$max_requests'],
        },
      },
      {
        $inc: {
          request_count: 1,
        },
      },
      { returnDocument: 'after' }
    )

    return updated != null
  }

  async insertRequest(request: RequestInsert): Promise<void> {
    const db = await getMongoDb()
    const document: RequestDocument = {
      _id: crypto.randomUUID(),
      id: crypto.randomUUID(),
      endpoint_id: request.endpoint_id,
      method: request.method,
      path: request.path,
      query_params: request.query_params,
      headers: request.headers,
      body: request.body,
      received_at: new Date().toISOString(),
      is_read: false,
      ip: request.ip,
      duration_ms: request.duration_ms ?? null,
    }

    document.id = document._id

    await db.collection<RequestDocument>('requests').insertOne(document)
  }
}
