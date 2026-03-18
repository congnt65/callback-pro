export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export interface Database {
  public: {
    Tables: {
      endpoints: {
        Row: {
          id: string
          created_at: string
          request_count: number
          custom_response_status: number
          custom_response_headers: Record<string, string>
          custom_response_body: string
          custom_response_content_type: string
          custom_response_delay_ms: number
        }
        Insert: {
          id: string
          created_at?: string
          request_count?: number
          custom_response_status?: number
          custom_response_headers?: Record<string, string>
          custom_response_body?: string
          custom_response_content_type?: string
        }
        Update: {
          request_count?: number
          custom_response_status?: number
          custom_response_headers?: Record<string, string>
          custom_response_body?: string
          custom_response_content_type?: string
          custom_response_delay_ms?: number
        }
      }
      requests: {
        Row: {
          id: string
          endpoint_id: string
          method: string
          path: string
          query_params: Record<string, string>
          headers: Record<string, string>
          body: string | null
          received_at: string
          is_read: boolean
          ip: string | null
          duration_ms: number | null
        }
        Insert: {
          id?: string
          endpoint_id: string
          method: string
          path: string
          query_params?: Record<string, string>
          headers?: Record<string, string>
          body?: string | null
          received_at?: string
          is_read?: boolean
          ip?: string | null
          duration_ms?: number | null
        }
        Update: {
          is_read?: boolean
        }
      }
    }
  }
}

export type Endpoint = Database['public']['Tables']['endpoints']['Row']
export type WebhookRequest = Database['public']['Tables']['requests']['Row']

export interface CustomResponse {
  status: number
  headers: Record<string, string>
  body: string
  contentType: string
  delayMs: number
}
