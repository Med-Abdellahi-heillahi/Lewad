import { supabase } from './supabaseClient'

/**
 * Historique client — lecture seule.
 *
 * Aucune migration n'est nécessaire : les quatre tables sources portent déjà
 * une policy RLS `select` limitée au propriétaire (`auth.uid() = user_id`, et
 * `auth.uid() = created_by` pour les soumissions) et n'accordent que `select`
 * au rôle `authenticated`. Le navigateur ne peut donc lire que les événements
 * du compte connecté, et rien d'autre — c'est le serveur qui le garantit, pas
 * ce fichier.
 *
 * Rien ici n'écrit, ne débite, ne crédite, ni ne journalise. L'historique
 * raconte ce qui s'est passé ; il ne déclenche aucune action métier.
 */

export type UserHistoryEventType =
  /** Recherche ayant renvoyé au moins un résultat. */
  | 'search_success'
  /** Recherche sans résultat. */
  | 'search_no_result'
  /** Points crédités (bonus de bienvenue, recharge approuvée, ajustement). */
  | 'points_added'
  /** Demande de recharge, avec son statut. */
  | 'recharge'
  /** Demande d'ajout d'établissement, avec son statut. */
  | 'business_submission'

export type UserHistoryStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'

/** Origine d'un crédit, pour choisir une phrase compréhensible côté UI. */
export type PointsAddedReason = 'welcome_bonus' | 'recharge_credit' | 'admin_adjustment' | 'referral_bonus' | 'other'

export type UserHistoryEvent = {
  id: string
  type: UserHistoryEventType
  createdAt: string
  /** Terme recherché ou nom d'établissement, affiché tel quel. */
  subject: string | null
  /** Négatif = points utilisés, positif = points ajoutés, 0 = sans effet. */
  pointsDelta: number
  amountMro: number | null
  periodMonths: number | null
  /** Points demandés dans une recharge — distinct de `pointsDelta`, qui n'arrive qu'à l'approbation. */
  requestedPoints: number | null
  status: UserHistoryStatus | null
  reason: PointsAddedReason | null
}

export type UserHistoryResult = {
  events: UserHistoryEvent[]
  /** Vrai si au moins une source n'a pas pu être lue : la liste est incomplète. */
  incomplete: boolean
}

/** Nombre d'événements chargés au premier affichage, puis par palier. */
export const HISTORY_PAGE_SIZE = 20

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null
}

function numberValue(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function statusValue(value: unknown): UserHistoryStatus | null {
  return value === 'pending' || value === 'approved' || value === 'rejected' || value === 'cancelled' ? value : null
}

function reasonValue(value: unknown): PointsAddedReason {
  return value === 'welcome_bonus' || value === 'recharge_credit' || value === 'admin_adjustment' || value === 'referral_bonus'
    ? value
    : 'other'
}

type SourceResult = { events: UserHistoryEvent[]; failed: boolean }

const failedSource: SourceResult = { events: [], failed: true }

/**
 * Recherches. Seuls les deux résultats qu'un client comprend sont retenus :
 * « trouvé » et « aucun résultat ». Les états techniques (requête invalide,
 * erreur, solde insuffisant au moment du clic) ne racontent rien d'utile et
 * encombreraient la liste.
 *
 * `debited_points` vient de la même ligne : l'événement porte donc lui-même son
 * coût. C'est pourquoi les lignes `search_debit` du grand livre sont exclues
 * plus bas — sinon la même recherche apparaîtrait deux fois.
 */
async function loadSearches(limit: number): Promise<SourceResult> {
  const { data, error } = await supabase
    .from('search_logs')
    .select('id, query, status, results_count, debited_points, created_at')
    .in('status', ['success', 'not_found'])
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) return failedSource

  const events = (data ?? []).flatMap((row): UserHistoryEvent[] => {
    if (!isRecord(row)) return []
    const id = stringValue(row.id)
    const createdAt = stringValue(row.created_at)
    if (!id || !createdAt) return []

    const debited = numberValue(row.debited_points) ?? 0
    return [{
      id: `search:${id}`,
      type: row.status === 'success' ? 'search_success' : 'search_no_result',
      createdAt,
      subject: stringValue(row.query),
      pointsDelta: -debited,
      amountMro: null,
      periodMonths: null,
      requestedPoints: null,
      status: null,
      reason: null,
    }]
  })

  return { events, failed: false }
}

/**
 * Crédits. `search_debit` est volontairement exclu : la recherche
 * correspondante porte déjà son coût, et afficher les deux ferait apparaître un
 * même geste deux fois à la même seconde.
 */
async function loadPointsAdded(limit: number): Promise<SourceResult> {
  const { data, error } = await supabase
    .from('credit_ledger')
    .select('id, amount, type, created_at')
    .neq('type', 'search_debit')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) return failedSource

  const events = (data ?? []).flatMap((row): UserHistoryEvent[] => {
    if (!isRecord(row)) return []
    const id = stringValue(row.id)
    const createdAt = stringValue(row.created_at)
    const amount = numberValue(row.amount)
    if (!id || !createdAt || amount === null) return []

    return [{
      id: `credit:${id}`,
      type: 'points_added',
      createdAt,
      subject: null,
      pointsDelta: amount,
      amountMro: null,
      periodMonths: null,
      requestedPoints: null,
      status: null,
      reason: reasonValue(row.type),
    }]
  })

  return { events, failed: false }
}

async function loadRecharges(limit: number): Promise<SourceResult> {
  const { data, error } = await supabase
    .from('recharge_requests')
    .select('id, requested_points, amount_mro, status, created_at')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) return failedSource

  const events = (data ?? []).flatMap((row): UserHistoryEvent[] => {
    if (!isRecord(row)) return []
    const id = stringValue(row.id)
    const createdAt = stringValue(row.created_at)
    if (!id || !createdAt) return []

    return [{
      id: `recharge:${id}`,
      type: 'recharge',
      createdAt,
      subject: null,
      // Les points n'arrivent qu'à l'approbation, et le grand livre porte déjà
      // cette arrivée. La demande elle-même ne déplace donc aucun point.
      pointsDelta: 0,
      amountMro: numberValue(row.amount_mro),
      periodMonths: null,
      requestedPoints: numberValue(row.requested_points),
      status: statusValue(row.status),
      reason: null,
    }]
  })

  return { events, failed: false }
}

const submissionColumns = 'id, business_name_fr, amount_mro, status, created_at'

/**
 * Soumissions d'établissement.
 *
 * `period_months` n'existe qu'à partir de 20260821000004, qui n'est pas encore
 * appliquée. PostgREST rejette la requête entière si on demande une colonne
 * absente, ce qui viderait tout le bloc « établissements » de l'historique. On
 * tente donc la version complète, et on retombe sur les colonnes garanties si
 * le serveur ne connaît pas encore la durée.
 */
async function loadBusinessSubmissions(limit: number): Promise<SourceResult> {
  // Les deux formes renvoient des colonnes différentes, d'où le type large :
  // chaque ligne est relue champ par champ juste en dessous.
  let rows: unknown[]

  const withPeriod = await supabase
    .from('business_submissions')
    .select(`${submissionColumns}, period_months`)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (withPeriod.error) {
    const withoutPeriod = await supabase
      .from('business_submissions')
      .select(submissionColumns)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (withoutPeriod.error) return failedSource
    rows = (withoutPeriod.data ?? []) as unknown[]
  } else {
    rows = withPeriod.data ?? []
  }

  const events = rows.flatMap((row): UserHistoryEvent[] => {
    if (!isRecord(row)) return []
    const id = stringValue(row.id)
    const createdAt = stringValue(row.created_at)
    if (!id || !createdAt) return []

    return [{
      id: `submission:${id}`,
      type: 'business_submission',
      createdAt,
      subject: stringValue(row.business_name_fr),
      pointsDelta: 0,
      amountMro: numberValue(row.amount_mro),
      periodMonths: numberValue(row.period_months),
      requestedPoints: null,
      status: statusValue(row.status),
      reason: null,
    }]
  })

  return { events, failed: false }
}

/**
 * Fusionne les quatre sources en une seule frise, la plus récente en premier.
 *
 * Chaque source est interrogée sur ses `limit` lignes les plus récentes. Les
 * `limit` événements globalement les plus récents sont forcément contenus dans
 * cette union, donc la tranche renvoyée est exacte — il suffit d'augmenter
 * `limit` pour en afficher davantage.
 *
 * Une source en échec ne masque pas les autres : on renvoie ce qui a pu être lu
 * et on signale que la liste est incomplète.
 */
export async function getMyHistory(limit: number = HISTORY_PAGE_SIZE): Promise<UserHistoryResult> {
  const sources = await Promise.all([
    loadSearches(limit),
    loadPointsAdded(limit),
    loadRecharges(limit),
    loadBusinessSubmissions(limit),
  ])

  const events = sources
    .flatMap((source) => source.events)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, limit)

  return { events, incomplete: sources.some((source) => source.failed) }
}
