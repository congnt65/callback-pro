import type { PoolClient } from 'pg'
import { getPostgresPool } from './postgres'
import type { CreateEndpointResult, DataProvider, RequestInsert } from './provider'
import type { CustomResponse, Endpoint, WebhookRequest } from '../types'

function mapEndpoint(row: Record<string, unknown>): Endpoint {
  return {
    id: String(row.id),
    created_at: String(row.created_at),
    request_count: Number(row.request_count),
    max_requests: Number(row.max_requests),
    custom_response_status: Number(row.custom_response_status),
    custom_response_headers: (row.custom_response_headers ?? {}) as Record<string, string>,
    custom_response_body: String(row.custom_response_body ?? ''),
    custom_response_content_type: String(row.custom_response_content_type ?? 'application/json'),
    custom_response_delay_ms: Number(row.custom_response_delay_ms ?? 0),
  }
}

function mapRequest(row: Record<string, unknown>): WebhookRequest {
  return {
    id: String(row.id),
    endpoint_id: String(row.endpoint_id),
    method: String(row.method),
    path: String(row.path),
    query_params: (row.query_params ?? {}) as Record<string, string>,
    headers: (row.headers ?? {}) as Record<string, string>,
    body: (row.body as string | null) ?? null,
    received_at: String(row.received_at),
    is_read: Boolean(row.is_read),
    ip: (row.ip as string | null) ?? null,
    duration_ms: row.duration_ms == null ? null : Number(row.duration_ms),
  }
}

async function withClient<T>(callback: (client: PoolClient) => Promise<T>) {
  const pool = getPostgresPool()
  const client = await pool.connect()

  try {
    return await callback(client)
  } finally {
    client.release()
  }
}

export class PostgresDataProvider implements DataProvider {
  async createEndpoint(requestedId?: string): Promise<CreateEndpointResult> {
    return withClient(async (client) => {
      const id = requestedId?.trim() || crypto.randomUUID()
      const inserted = await client.query(
        `
          insert into endpoints (id, custom_response_body)
          values ($1, $2)
          on conflict (id) do nothing
          returning *
        `,
        [id, JSON.stringify({ message: 'ok' })]
      )

      if (inserted.rowCount && inserted.rows[0]) {
        return {
          endpoint: mapEndpoint(inserted.rows[0]),
          created: true,
        }
      }

      const existing = await client.query('select * from endpoints where id = $1 limit 1', [id])

      if (!existing.rowCount || !existing.rows[0]) {
        throw new Error('Failed to read existing endpoint')
      }

      return {
        endpoint: mapEndpoint(existing.rows[0]),
        created: false,
      }
    })
  }

  async getEndpoint(id: string): Promise<Endpoint | null> {
    return withClient(async (client) => {
      const result = await client.query('select * from endpoints where id = $1 limit 1', [id])
      return result.rowCount && result.rows[0] ? mapEndpoint(result.rows[0]) : null
    })
  }

  async updateEndpointResponse(id: string, config: CustomResponse): Promise<Endpoint | null> {
    return withClient(async (client) => {
      const result = await client.query(
        `
          update endpoints
          set custom_response_status = $2,
              custom_response_headers = $3::jsonb,
              custom_response_body = $4,
              custom_response_content_type = $5,
              custom_response_delay_ms = $6,
              max_requests = $7
          where id = $1
          returning *
        `,
        [
          id,
          config.status ?? 200,
          JSON.stringify(config.headers ?? {}),
          config.body ?? '',
          config.contentType ?? 'application/json',
          Math.max(0, Math.min(30000, Number(config.delayMs) || 0)),
          Math.max(1, Number(config.maxRequests) || 500),
        ]
      )

      return result.rowCount && result.rows[0] ? mapEndpoint(result.rows[0]) : null
    })
  }

  async listRequests(endpointId: string): Promise<WebhookRequest[]> {
    return withClient(async (client) => {
      const result = await client.query(
        `
          select *
          from requests
          where endpoint_id = $1
          order by received_at desc
          limit 500
        `,
        [endpointId]
      )

      return result.rows.map((row) => mapRequest(row))
    })
  }

  async clearRequests(endpointId: string): Promise<void> {
    await withClient(async (client) => {
      await client.query('begin')

      try {
        await client.query('delete from requests where endpoint_id = $1', [endpointId])
        await client.query('update endpoints set request_count = 0 where id = $1', [endpointId])
        await client.query('commit')
      } catch (error) {
        await client.query('rollback')
        throw error
      }
    })
  }

  async markRequestRead(requestId: string): Promise<void> {
    await withClient(async (client) => {
      await client.query('update requests set is_read = true where id = $1', [requestId])
    })
  }

  async deleteRequest(endpointId: string, requestId: string): Promise<void> {
    await withClient(async (client) => {
      await client.query('begin')

      try {
        const deleted = await client.query(
          'delete from requests where id = $1 and endpoint_id = $2 returning id',
          [requestId, endpointId]
        )

        if (deleted.rowCount) {
          await client.query(
            'update endpoints set request_count = greatest(0, request_count - 1) where id = $1',
            [endpointId]
          )
        }

        await client.query('commit')
      } catch (error) {
        await client.query('rollback')
        throw error
      }
    })
  }

  async tryIncrementRequestCount(endpointId: string): Promise<boolean> {
    return withClient(async (client) => {
      const result = await client.query(
        `
          update endpoints
          set request_count = request_count + 1
          where id = $1
            and request_count < max_requests
          returning request_count
        `,
        [endpointId]
      )

      return Boolean(result.rowCount)
    })
  }

  async insertRequest(request: RequestInsert): Promise<void> {
    await withClient(async (client) => {
      await client.query(
        `
          insert into requests (
            endpoint_id,
            method,
            path,
            query_params,
            headers,
            body,
            ip,
            duration_ms
          ) values ($1, $2, $3, $4::jsonb, $5::jsonb, $6, $7, $8)
        `,
        [
          request.endpoint_id,
          request.method,
          request.path,
          JSON.stringify(request.query_params),
          JSON.stringify(request.headers),
          request.body,
          request.ip,
          request.duration_ms,
        ]
      )
    })
  }
}
