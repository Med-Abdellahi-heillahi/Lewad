import { type Db2Branch, type Db2Category, type Db2Establishment } from './db2'
import { readPlaceTypeKeys } from './placeTypes'
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
  searchLogId: string | null
  results: Db2Establishment[]
}

type RpcBranch = Omit<Db2Branch, 'establishment_id' | 'status'>
type RpcEstablishment = Omit<
  Db2Establishment,
  'status' | 'branches' | 'branchesError' | 'name_ar' | 'place_types'
> & {
  name_ar?: unknown
  place_types?: unknown
  branches?: RpcBranch[]
}

type PlaceTypeHydrationRow = {
  id: unknown
  place_types: unknown
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
  searchLogId: null,
  results: [],
}

function normalizeResults(value: unknown): Db2Establishment[] {
  if (!Array.isArray(value)) return []

  return value.flatMap((item) => {
    const establishment = item as RpcEstablishment
    if (!establishment || typeof establishment.id !== 'string' || typeof establishment.name !== 'string') return []

    return [{
      ...establishment,
      name_ar: typeof establishment.name_ar === 'string' ? establishment.name_ar : null,
      place_types: readPlaceTypeKeys(establishment.place_types),
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

/**
 * The paid search RPC predates imported place types, so enrich only the rows it
 * already returned. This approved-row RLS read is optional: a failed or partial
 * hydration must never discard a paid result or trigger another search.
 */
export async function hydrateApprovedClientSearchPlaceTypes(
  results: readonly Db2Establishment[],
): Promise<Db2Establishment[]> {
  const resultIds = [
    ...new Set(
      results
        .map(({ id }) => id)
        .filter((id): id is string => typeof id === 'string' && id.length > 0),
    ),
  ].slice(0, 20)

  if (resultIds.length === 0) return [...results]

  try {
    const { data, error } = await supabase
      .from('establishments')
      .select('id, place_types')
      .in('id', resultIds)
      .eq('status', 'approved')

    if (error || !Array.isArray(data)) return [...results]

    const allowedIds = new Set(resultIds)
    const placeTypesById = new Map<string, Db2Establishment['place_types']>()
    for (const row of data as PlaceTypeHydrationRow[]) {
      if (typeof row.id !== 'string' || !allowedIds.has(row.id)) continue
      placeTypesById.set(row.id, readPlaceTypeKeys(row.place_types))
    }

    return results.map((result) => {
      const placeTypes = placeTypesById.get(result.id)
      return placeTypes ? { ...result, place_types: placeTypes } : result
    })
  } catch {
    return [...results]
  }
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
    searchLogId: typeof response.search_log_id === 'string' ? response.search_log_id : null,
    results: normalizeResults(response.results),
  }
}
