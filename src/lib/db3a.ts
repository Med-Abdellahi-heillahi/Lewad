import { type Db2Branch, type Db2Category, type Db2Establishment } from './db2'
import { supabase } from './supabaseClient'

export type Db3aSearchStatus = 'success' | 'not_found' | 'insufficient_credits' | 'invalid_query' | 'error' | 'unauthenticated'

export type Db3aSearchResponse = {
  ok: boolean
  status: Db3aSearchStatus
  message: string | null
  balance: number | null
  unlimited: boolean
  debitedPoints: number
  resultsCount: number
  results: Db2Establishment[]
}

type RpcBranch = Omit<Db2Branch, 'establishment_id' | 'status'>
type RpcEstablishment = Omit<Db2Establishment, 'status' | 'branches' | 'branchesError'> & {
  branches?: RpcBranch[]
}

const validStatuses = new Set<Db3aSearchStatus>([
  'success',
  'not_found',
  'insufficient_credits',
  'invalid_query',
  'error',
  'unauthenticated',
])

const errorResponse: Db3aSearchResponse = {
  ok: false,
  status: 'error',
  message: null,
  balance: null,
  unlimited: false,
  debitedPoints: 0,
  resultsCount: 0,
  results: [],
}

function normalizeResults(value: unknown): Db2Establishment[] {
  if (!Array.isArray(value)) return []

  return value.flatMap((item) => {
    const establishment = item as RpcEstablishment
    if (!establishment || typeof establishment.id !== 'string' || typeof establishment.name !== 'string') return []

    return [{
      ...establishment,
      category: (establishment.category as Db2Category | null) ?? null,
      status: 'approved' as const,
      branchesError: false,
      branches: Array.isArray(establishment.branches)
        ? establishment.branches.map((branch) => ({
          ...branch,
          establishment_id: establishment.id,
          status: 'active' as const,
        }))
        : [],
    }]
  })
}

export async function searchServicesWithCredit(query: string): Promise<Db3aSearchResponse> {
  const { data, error } = await supabase.rpc('search_services_with_credit', { p_query: query })
  if (error || !data || typeof data !== 'object') return errorResponse

  const response = data as Record<string, unknown>
  const status = typeof response.status === 'string' && validStatuses.has(response.status as Db3aSearchStatus)
    ? response.status as Db3aSearchStatus
    : 'error'

  return {
    ok: response.ok === true,
    status,
    message: typeof response.message === 'string' ? response.message : null,
    balance: typeof response.balance === 'number' ? response.balance : null,
    unlimited: response.unlimited === true,
    debitedPoints: typeof response.debited_points === 'number' ? response.debited_points : 0,
    resultsCount: typeof response.results_count === 'number' ? response.results_count : 0,
    results: normalizeResults(response.results),
  }
}
