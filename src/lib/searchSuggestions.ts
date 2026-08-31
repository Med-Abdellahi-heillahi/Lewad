import { supabase } from './supabaseClient'

/**
 * Une suggestion ne porte jamais de téléphone, de WhatsApp ni de site : ce sont
 * exactement les informations qu'une recherche payante achète. L'autocomplétion
 * n'expose que ce qu'un annuaire affiche déjà — nom, catégorie, quartier.
 */
export type ServiceSuggestion = {
  id: string
  name: string
  nameAr: string | null
  slug: string
  categoryName: string | null
  neighborhood: string | null
}

export type SuggestServicesStatus = 'success' | 'invalid_query' | 'unauthenticated' | 'error'

export type SuggestServicesResponse = {
  ok: boolean
  status: SuggestServicesStatus
  items: ServiceSuggestion[]
}

/** Aligné sur `suggest_services` : une lettre suffit, contrairement à la recherche payante. */
export const SUGGESTION_MIN_LENGTH = 1

/** Le serveur plafonne déjà à 8 ; la constante sert aux libellés et aux tests. */
export const SUGGESTION_LIMIT = 8

/** Les suggestions permanentes sous le champ restent volontairement rares. */
export const APPROVED_SUGGESTION_LIMIT = 3

const approvedSuggestionFields = 'id, name, name_ar, slug'

const emptyResponse: SuggestServicesResponse = { ok: false, status: 'error', items: [] }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null
}

function readSuggestions(value: unknown): ServiceSuggestion[] {
  if (!Array.isArray(value)) return []

  return value.flatMap((item) => {
    if (!isRecord(item)) return []
    const id = stringValue(item.id)
    const name = stringValue(item.name)
    const slug = stringValue(item.slug)
    if (!id || !name || !slug) return []

    return [{
      id,
      name,
      nameAr: stringValue(item.name_ar),
      slug,
      categoryName: stringValue(item.category_name),
      neighborhood: stringValue(item.neighborhood),
    }]
  })
}

/**
 * Lecture seule : cette RPC ne débite aucun point, n'écrit pas dans
 * `search_logs` et ne consomme pas la fenêtre anti-abus de la recherche. Le
 * débit reste réservé à `searchServicesWithCredit`.
 */
export async function suggestServices(query: string, signal?: AbortSignal): Promise<SuggestServicesResponse> {
  if (signal?.aborted) return emptyResponse

  const { data, error } = await supabase.rpc('suggest_services', { p_query: query })
  if (signal?.aborted) return emptyResponse
  if (error || !isRecord(data)) return emptyResponse

  const status = data.status
  if (status === 'unauthenticated' || status === 'invalid_query') {
    return { ok: false, status, items: [] }
  }

  return {
    ok: data.ok === true,
    status: 'success',
    items: readSuggestions(data.items),
  }
}

/**
 * Suggestions initiales en lecture seule. La requête ne sélectionne que les
 * noms publics nécessaires à l'interface, et la policy RLS des établissements
 * limite en plus les clients authentifiés aux lignes approuvées.
 */
export async function getApprovedServiceSuggestions(signal?: AbortSignal): Promise<ServiceSuggestion[]> {
  if (signal?.aborted) return []

  const request = supabase
    .from('establishments')
    .select(approvedSuggestionFields)
    .eq('status', 'approved')
    .order('is_verified', { ascending: false })
    .order('name', { ascending: true })
    .limit(APPROVED_SUGGESTION_LIMIT)

  if (signal) request.abortSignal(signal)

  const { data, error } = await request
  if (signal?.aborted || error) return []

  return readSuggestions(data).slice(0, APPROVED_SUGGESTION_LIMIT)
}
