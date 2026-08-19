import type { CreditLedgerType, Db1Profile } from './db1'
import type { MissingServiceRequestStatus } from './db3b'
import { paginatedResult, resolvePagination, type PaginatedResult, type PaginationParams } from './pagination'
import { supabase } from './supabaseClient'

type AdminResult<T> = {
  data: T
  error: string | null
  /** A secondary profile lookup failed; the main admin rows remain usable. */
  warning?: string | null
}

export type AdminOverview = {
  pendingRequests: number
  totalUsers: number
  activeUsers: number
  totalWallets: number
  /** Somme des soldes lus dans la portée RLS de l'admin. Aucun montant monétaire. */
  totalPoints: number
  emptyWallets: number
  totalSearches: number
  successfulSearches: number
  notFoundSearches: number
  errorSearches: number
  approvedEstablishments: number
  activeCategories: number
  activeBranches: number
}

export type AdminUser = Pick<Db1Profile, 'id' | 'full_name' | 'full_name_ar' | 'email' | 'phone' | 'avatar_url' | 'role' | 'status' | 'created_at' | 'updated_at'>

export type AdminUserRoleFilter = 'all' | Db1Profile['role']
export type AdminUserStatusFilter = 'all' | Db1Profile['status']

export type AdminUserQuery = PaginationParams & {
  search?: string
  role?: AdminUserRoleFilter
  status?: AdminUserStatusFilter
}

export type AdminRequestSearchLog = {
  id: string
  query: string
  status: string
  created_at: string
}

export type AdminMissingRequest = {
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
  user: AdminUser | null
  search_log: AdminRequestSearchLog | null
}

export type AdminWallet = {
  id: string
  user_id: string
  balance: number
  created_at: string
  updated_at: string
  user: Pick<AdminUser, 'id' | 'full_name' | 'full_name_ar' | 'email' | 'status'> | null
}

export type AdminCreditLedgerEntry = {
  id: string
  user_id: string
  wallet_id: string
  amount: number
  type: CreditLedgerType
  reason: string | null
  reference_type: string | null
  reference_id: string | null
  created_at: string
  user: Pick<AdminUser, 'id' | 'full_name' | 'full_name_ar' | 'email'> | null
}

export type AdminSearchLog = {
  id: string
  user_id: string
  query: string
  normalized_query: string
  status: 'success' | 'not_found' | 'insufficient_credits' | 'invalid_query' | 'error'
  results_count: number
  debited_points: number
  created_at: string
  user: Pick<AdminUser, 'id' | 'full_name' | 'full_name_ar' | 'email'> | null
}

export type AdminCategory = {
  id: string
  name: string
  slug: string
  status: 'active' | 'hidden'
  sort_order: number
  created_at: string
}

export type AdminEstablishment = {
  id: string
  category_id: string | null
  name: string
  slug: string
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'suspended'
  is_verified: boolean
  created_at: string
  category: Pick<AdminCategory, 'id' | 'name' | 'slug'> | null
}

export type AdminBranch = {
  id: string
  establishment_id: string
  name: string
  city: string | null
  neighborhood: string | null
  latitude: number | null
  longitude: number | null
  is_main: boolean
  status: 'active' | 'hidden' | 'closed'
  created_at: string
  establishment: Pick<AdminEstablishment, 'id' | 'name' | 'slug'> | null
}

export type AdminServices = {
  categories: PaginatedResult<AdminCategory>
  establishments: PaginatedResult<AdminEstablishment>
  branches: PaginatedResult<AdminBranch>
}

export type AdminServicesPagination = {
  categories?: PaginationParams
  establishments?: PaginationParams
  branches?: PaginationParams
}

const profileFields = 'id, full_name, full_name_ar, email, phone, avatar_url, role, status, created_at, updated_at'
const requestFields = `
  id, user_id, query, normalized_query, message, status, search_log_id, admin_note,
  resolved_establishment_id, created_at, updated_at,
  search_log:search_logs!missing_service_requests_search_log_id_fkey (id, query, status, created_at)
`

const walletFields = `
  id, user_id, balance, created_at, updated_at
`

const ledgerFields = `
  id, user_id, wallet_id, amount, type, reason, reference_type, reference_id, created_at
`

const searchLogFields = `
  id, user_id, query, normalized_query, status, results_count, debited_points, created_at
`

function errorMessage(error: { message: string } | null) {
  return error?.message ?? null
}

function emptyPage<T>(pagination: PaginationParams = {}) {
  return paginatedResult<T>([], 0, pagination)
}

function uniqueUserIds(rows: Array<{ user_id: string | null | undefined }>) {
  return [...new Set(rows.map((row) => row.user_id).filter((id): id is string => Boolean(id)))]
}

async function loadProfilesForUserIds(userIds: string[]) {
  if (userIds.length === 0) return { profiles: new Map<string, AdminUser>(), warning: null }

  const { data, error } = await supabase
    .from('profiles')
    .select(profileFields)
    .in('id', userIds)

  if (error) {
    return {
      profiles: new Map<string, AdminUser>(),
      warning: 'Les informations de profil ne sont pas disponibles pour le moment. Les données principales restent affichées.',
    }
  }

  const profiles = ((data as AdminUser[] | null) ?? []).map((profile) => [profile.id, profile] as const)
  return { profiles: new Map(profiles), warning: null }
}

async function enrichWithProfiles<T extends { user_id: string }>(rows: T[]) {
  const profileResult = await loadProfilesForUserIds(uniqueUserIds(rows))
  return {
    data: rows.map((row) => ({ ...row, user: profileResult.profiles.get(row.user_id) ?? null })),
    warning: profileResult.warning,
  }
}

/** Reads the dashboard counters through the logged-in administrator's RLS scope. */
export async function getAdminOverview(): Promise<AdminResult<AdminOverview | null>> {
  const [
    requests, users, activeUsers, wallets, balances, emptyWallets,
    searches, successful, notFound, errored, establishments, categories, branches,
  ] = await Promise.all([
    supabase.from('missing_service_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('wallets').select('*', { count: 'exact', head: true }),
    // Seule colonne lue : PostgREST n'expose pas d'agrégat SUM sans RPC dédiée.
    supabase.from('wallets').select('balance'),
    supabase.from('wallets').select('*', { count: 'exact', head: true }).eq('balance', 0),
    supabase.from('search_logs').select('*', { count: 'exact', head: true }),
    supabase.from('search_logs').select('*', { count: 'exact', head: true }).eq('status', 'success'),
    supabase.from('search_logs').select('*', { count: 'exact', head: true }).eq('status', 'not_found'),
    supabase.from('search_logs').select('*', { count: 'exact', head: true }).eq('status', 'error'),
    supabase.from('establishments').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
    supabase.from('categories').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('branches').select('*', { count: 'exact', head: true }).eq('status', 'active'),
  ])

  const errors = [
    requests, users, activeUsers, wallets, balances, emptyWallets,
    searches, successful, notFound, errored, establishments, categories, branches,
  ]
    .map((result) => errorMessage(result.error))
    .filter((message): message is string => Boolean(message))

  if (errors.length > 0) return { data: null, error: errors[0] }

  const totalPoints = ((balances.data as { balance: number }[] | null) ?? [])
    .reduce((sum, wallet) => sum + (Number(wallet.balance) || 0), 0)

  return {
    data: {
      pendingRequests: requests.count ?? 0,
      totalUsers: users.count ?? 0,
      activeUsers: activeUsers.count ?? 0,
      totalWallets: wallets.count ?? 0,
      totalPoints,
      emptyWallets: emptyWallets.count ?? 0,
      totalSearches: searches.count ?? 0,
      successfulSearches: successful.count ?? 0,
      notFoundSearches: notFound.count ?? 0,
      errorSearches: errored.count ?? 0,
      approvedEstablishments: establishments.count ?? 0,
      activeCategories: categories.count ?? 0,
      activeBranches: branches.count ?? 0,
    },
    error: null,
  }
}

/** Identifiant d'alerte ; le libellé vit dans `adminCopy`, pas ici. */
export type AdminAlertId =
  | 'pendingRequests'
  | 'emptyWallets'
  | 'notFoundRate'
  | 'searchErrors'
  | 'establishmentsWithoutBranch'
  | 'branchesWithoutCoordinates'
  | 'rechargeManual'
  | 'businessSubmissions'
  | 'backupCheck'

export type AdminAlert = { id: AdminAlertId; tone: 'warning' | 'info'; count?: number }

/** Seuil au-delà duquel la proportion de recherches sans résultat mérite un signalement. */
const NOT_FOUND_ALERT_RATIO = 0.3

/**
 * Dérive les alertes des données déjà chargées — aucune requête supplémentaire.
 * Les trois dernières sont des rappels permanents de modules non connectés.
 */
export function buildAdminAlerts(overview: AdminOverview | null, services: AdminServices | null): AdminAlert[] {
  const alerts: AdminAlert[] = []
  if (!overview) return alerts

  if (overview.pendingRequests > 0) alerts.push({ id: 'pendingRequests', tone: 'warning', count: overview.pendingRequests })
  if (overview.emptyWallets > 0) alerts.push({ id: 'emptyWallets', tone: 'info', count: overview.emptyWallets })

  if (overview.totalSearches > 0 && overview.notFoundSearches / overview.totalSearches > NOT_FOUND_ALERT_RATIO) {
    alerts.push({ id: 'notFoundRate', tone: 'warning', count: overview.notFoundSearches })
  }
  if (overview.errorSearches > 0) alerts.push({ id: 'searchErrors', tone: 'warning', count: overview.errorSearches })

  // A partial page cannot reliably prove that a business has no branch, or that
  // every branch has coordinates. Keep those alerts for complete small datasets.
  if (services && services.establishments.totalPages <= 1 && services.branches.totalPages <= 1) {
    const withBranch = new Set(services.branches.data.map((branch) => branch.establishment_id))
    const orphans = services.establishments.data.filter(
      (establishment) => establishment.status === 'approved' && !withBranch.has(establishment.id),
    ).length
    if (orphans > 0) alerts.push({ id: 'establishmentsWithoutBranch', tone: 'warning', count: orphans })

    const uncharted = services.branches.data.filter(
      (branch) => branch.latitude === null || branch.longitude === null,
    ).length
    if (uncharted > 0) alerts.push({ id: 'branchesWithoutCoordinates', tone: 'info', count: uncharted })
  }

  alerts.push({ id: 'rechargeManual', tone: 'info' })
  alerts.push({ id: 'businessSubmissions', tone: 'info' })
  alerts.push({ id: 'backupCheck', tone: 'info' })

  return alerts
}

export async function getAdminMissingRequests(
  pagination: PaginationParams = {},
): Promise<AdminResult<PaginatedResult<AdminMissingRequest>>> {
  const { page, pageSize, from, to } = resolvePagination(pagination)
  const { data, error, count } = await supabase
    .from('missing_service_requests')
    .select(requestFields, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) return { data: emptyPage({ page, pageSize }), error: errorMessage(error) }

  const enriched = await enrichWithProfiles((data as unknown as Omit<AdminMissingRequest, 'user'>[] | null) ?? [])
  return {
    data: paginatedResult(enriched.data as AdminMissingRequest[], count, { page, pageSize }),
    error: null,
    warning: enriched.warning,
  }
}

export async function updateMissingRequestStatus({
  id,
  status,
  adminNote,
}: {
  id: string
  status: MissingServiceRequestStatus
  adminNote: string | null
}): Promise<AdminResult<AdminMissingRequest | null>> {
  const { data, error } = await supabase
    .from('missing_service_requests')
    .update({ status, admin_note: adminNote?.trim() || null })
    .eq('id', id)
    .select(requestFields)
    .maybeSingle()

  if (error || !data) return { data: null, error: errorMessage(error) }

  const enriched = await enrichWithProfiles([data as unknown as Omit<AdminMissingRequest, 'user'>])
  return { data: enriched.data[0] as AdminMissingRequest, error: null, warning: enriched.warning }
}

function sanitizeAdminUserSearch(search: string | undefined) {
  return search?.trim().slice(0, 120).replace(/[(),]/g, ' ') ?? ''
}

/** Reads user profiles through the active administrator's existing RLS scope. */
export async function getAdminUsers({
  search,
  role = 'all',
  status = 'all',
  ...pagination
}: AdminUserQuery = {}): Promise<AdminResult<PaginatedResult<AdminUser>>> {
  const { page, pageSize, from, to } = resolvePagination(pagination)
  const safeSearch = sanitizeAdminUserSearch(search)
  let query = supabase
    .from('profiles')
    .select(profileFields, { count: 'exact' })
    .order('created_at', { ascending: false })

  if (safeSearch) {
    query = query.or([
      `full_name.ilike.%${safeSearch}%`,
      `full_name_ar.ilike.%${safeSearch}%`,
      `email.ilike.%${safeSearch}%`,
      `phone.ilike.%${safeSearch}%`,
    ].join(','))
  }
  if (role !== 'all') query = query.eq('role', role)
  if (status !== 'all') query = query.eq('status', status)

  const { data, error, count } = await query.range(from, to)

  return {
    data: paginatedResult((data as AdminUser[] | null) ?? [], count, { page, pageSize }),
    error: errorMessage(error),
  }
}

type AdminUserWriteResult = AdminResult<AdminUser | null>

/** Calls the status RPC; role and target checks remain enforced by PostgreSQL. */
export async function adminUpdateUserStatus({
  userId,
  status,
}: {
  userId: string
  status: Extract<Db1Profile['status'], 'active' | 'suspended'>
}): Promise<AdminUserWriteResult> {
  const { data, error } = await supabase
    .rpc('admin_update_user_status', { p_user_id: userId, p_status: status })
    .maybeSingle()

  return { data: (data as AdminUser | null) ?? null, error: errorMessage(error) }
}

/** Calls the super-admin-only role RPC; the browser never writes profiles directly. */
export async function superAdminUpdateUserRole({
  userId,
  role,
}: {
  userId: string
  role: Db1Profile['role']
}): Promise<AdminUserWriteResult> {
  const { data, error } = await supabase
    .rpc('super_admin_update_user_role', { p_user_id: userId, p_role: role })
    .maybeSingle()

  return { data: (data as AdminUser | null) ?? null, error: errorMessage(error) }
}

export async function getAdminWallets(
  pagination: PaginationParams = {},
): Promise<AdminResult<PaginatedResult<AdminWallet>>> {
  const { page, pageSize, from, to } = resolvePagination(pagination)
  const { data, error, count } = await supabase
    .from('wallets')
    .select(walletFields, { count: 'exact' })
    .order('updated_at', { ascending: false })
    .range(from, to)

  if (error) return { data: emptyPage({ page, pageSize }), error: errorMessage(error) }

  const enriched = await enrichWithProfiles((data as Omit<AdminWallet, 'user'>[] | null) ?? [])
  return {
    data: paginatedResult(enriched.data as AdminWallet[], count, { page, pageSize }),
    error: null,
    warning: enriched.warning,
  }
}

export async function getAdminCreditLedger(
  pagination: PaginationParams = {},
): Promise<AdminResult<PaginatedResult<AdminCreditLedgerEntry>>> {
  const { page, pageSize, from, to } = resolvePagination(pagination)
  const { data, error, count } = await supabase
    .from('credit_ledger')
    .select(ledgerFields, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) return { data: emptyPage({ page, pageSize }), error: errorMessage(error) }

  const enriched = await enrichWithProfiles((data as Omit<AdminCreditLedgerEntry, 'user'>[] | null) ?? [])
  return {
    data: paginatedResult(enriched.data as AdminCreditLedgerEntry[], count, { page, pageSize }),
    error: null,
    warning: enriched.warning,
  }
}

export async function getAdminSearchLogs(
  pagination: PaginationParams = {},
): Promise<AdminResult<PaginatedResult<AdminSearchLog>>> {
  const { page, pageSize, from, to } = resolvePagination(pagination)
  const { data, error, count } = await supabase
    .from('search_logs')
    .select(searchLogFields, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) return { data: emptyPage({ page, pageSize }), error: errorMessage(error) }

  const enriched = await enrichWithProfiles((data as Omit<AdminSearchLog, 'user'>[] | null) ?? [])
  return {
    data: paginatedResult(enriched.data as AdminSearchLog[], count, { page, pageSize }),
    error: null,
    warning: enriched.warning,
  }
}

export async function getAdminServices(
  pagination: AdminServicesPagination = {},
): Promise<AdminResult<AdminServices>> {
  const categoriesPagination = resolvePagination(pagination.categories)
  const establishmentsPagination = resolvePagination(pagination.establishments)
  const branchesPagination = resolvePagination(pagination.branches)
  const [categories, establishments, branches] = await Promise.all([
    supabase
      .from('categories')
      .select('id, name, slug, status, sort_order, created_at', { count: 'exact' })
      .order('sort_order')
      .order('name')
      .range(categoriesPagination.from, categoriesPagination.to),
    supabase
      .from('establishments')
      .select('id, category_id, name, slug, status, is_verified, created_at, category:categories!establishments_category_id_fkey (id, name, slug)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(establishmentsPagination.from, establishmentsPagination.to),
    supabase
      .from('branches')
      .select('id, establishment_id, name, city, neighborhood, latitude, longitude, is_main, status, created_at, establishment:establishments!branches_establishment_id_fkey (id, name, slug)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(branchesPagination.from, branchesPagination.to),
  ])

  const errors = [categories, establishments, branches]
    .map((result) => errorMessage(result.error))
    .filter((message): message is string => Boolean(message))

  if (errors.length > 0) {
    return {
      data: {
        categories: emptyPage(categoriesPagination),
        establishments: emptyPage(establishmentsPagination),
        branches: emptyPage(branchesPagination),
      },
      error: errors[0],
    }
  }

  return {
    data: {
      categories: paginatedResult((categories.data as AdminCategory[] | null) ?? [], categories.count, categoriesPagination),
      establishments: paginatedResult((establishments.data as AdminEstablishment[] | null) ?? [], establishments.count, establishmentsPagination),
      branches: paginatedResult((branches.data as AdminBranch[] | null) ?? [], branches.count, branchesPagination),
    },
    error: null,
  }
}
