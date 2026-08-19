import { supabase } from './supabaseClient'

export type MissingServiceRequestStatus = 'pending' | 'reviewed' | 'added' | 'rejected' | 'duplicate'
export type CreateMissingServiceRequestStatus = 'created' | 'duplicate' | 'invalid_query' | 'error' | 'unauthenticated'

export type MissingServiceRequest = {
  id: string
  user_id: string
  query: string
  normalized_query: string
  message: string | null
  status: MissingServiceRequestStatus
  search_log_id: string | null
  admin_note: string | null
  resolved_establishment_id: string | null
  created_at: string
  updated_at: string
}

export type CreateMissingServiceRequestResult = {
  ok: boolean
  status: CreateMissingServiceRequestStatus
  message: string | null
  requestId: string | null
}

type CreateMissingServiceRequestParams = {
  query: string
  message?: string | null
  searchLogId?: string | null
}

const requestFields = 'id, user_id, query, normalized_query, message, status, search_log_id, admin_note, resolved_establishment_id, created_at, updated_at'
const validCreateStatuses = new Set<CreateMissingServiceRequestStatus>(['created', 'duplicate', 'invalid_query', 'error', 'unauthenticated'])

export async function createMissingServiceRequest({ query, message = null, searchLogId = null }: CreateMissingServiceRequestParams): Promise<CreateMissingServiceRequestResult> {
  const { data, error } = await supabase.rpc('create_missing_service_request', {
    p_query: query,
    p_message: message,
    p_search_log_id: searchLogId,
  })

  if (import.meta.env.DEV) {
    console.debug('[DB3B] createMissingServiceRequest result', { data, error })
  }

  if (error) {
    if (import.meta.env.DEV) {
      console.error('create_missing_service_request failed', { code: error.code, message: error.message })
    }
    return { ok: false, status: 'error', message: error.message, requestId: null }
  }

  if (!data || typeof data !== 'object') {
    if (import.meta.env.DEV) {
      console.error('create_missing_service_request returned an invalid response')
    }
    return { ok: false, status: 'error', message: null, requestId: null }
  }

  const response = data as Record<string, unknown>
  const status = typeof response.status === 'string' && validCreateStatuses.has(response.status as CreateMissingServiceRequestStatus)
    ? response.status as CreateMissingServiceRequestStatus
    : 'error'

  return {
    ok: response.ok === true,
    status,
    message: typeof response.message === 'string' ? response.message : null,
    requestId: typeof response.request_id === 'string' ? response.request_id : null,
  }
}

export async function getMyMissingServiceRequests(): Promise<{ data: MissingServiceRequest[]; error: boolean }> {
  const { data, error } = await supabase
    .from('missing_service_requests')
    .select(requestFields)
    .order('created_at', { ascending: false })

  return { data: (data as MissingServiceRequest[] | null) ?? [], error: Boolean(error) }
}
