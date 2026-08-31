import type { AdminUser } from './admin'
import { adminUpdateUserStatus } from './admin'
import { DEFAULT_PAGE_SIZE, paginatedResult, resolvePagination, type PaginatedResult, type PaginationParams } from './pagination'
import { isPlaceTypeKey, type PlaceTypeKey } from './placeTypes'
import { supabase } from './supabaseClient'

export type SuperAdminFailure = 'not-connected' | 'access-denied' | 'unavailable'

export type SuperAdminResult<T> = {
  data: T
  error: SuperAdminFailure | null
}

type JsonRecord = Record<string, unknown>

export type SuperAdminAdmin = AdminUser & {
  establishmentsAdded: number
}

export type SuperAdminAuditEvent = {
  id: string
  actorId: string
  actorName: string
  actorRole: AdminUser['role'] | null
  action: string
  targetType: string
  targetId: string
  metadata: JsonRecord
  createdAt: string
}

export type SuperAdminRecentAction = Pick<SuperAdminAuditEvent, 'id' | 'action' | 'targetType' | 'targetId' | 'metadata' | 'createdAt'>

export type SuperAdminAdminDetails = SuperAdminAdmin & {
  recentActions: SuperAdminRecentAction[]
}

export type SuperAdminAdminStats = {
  totalAdmins: number
  activeAdmins: number
  suspendedAdmins: number
  establishmentsAdded: number
  adminActionsThisWeek: number
}

export type SuperAdminAdminInvitation = {
  id: string
  email: string
  fullName: string
  phone: string
  role: 'admin'
  status: 'pending' | 'expired' | 'cancelled'
  expiresAt: string
  createdAt: string
}

export type SuperAdminAdminsQuery = PaginationParams & {
  search?: string
}

export type SuperAdminEstablishmentStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'suspended'

export type SuperAdminEstablishmentType = 'private' | 'public' | 'administrative'

export type SuperAdminEstablishmentSource = 'admin_created' | 'client_submission' | 'map_discovery' | 'unknown'

export type SuperAdminEstablishment = {
  id: string
  name: string
  nameAr: string | null
  categoryId: string | null
  categoryName: string | null
  categorySlug: string | null
  establishmentType: SuperAdminEstablishmentType
  placeTypes: PlaceTypeKey[]
  status: SuperAdminEstablishmentStatus
  isVerified: boolean
  phone: string | null
  whatsapp: string | null
  location: string | null
  wilaya: string | null
  branchCount: number
  createdAt: string
  source: SuperAdminEstablishmentSource
}

export type SuperAdminEstablishmentBranch = {
  id: string
  name: string
  phone: string | null
  whatsapp: string | null
  address: string | null
  wilaya: string | null
  neighborhood: string | null
  latitude: number | null
  longitude: number | null
  isMain: boolean
  status: 'active' | 'hidden' | 'closed'
  createdAt: string
}

export type SuperAdminEstablishmentDetails = SuperAdminEstablishment & {
  description: string | null
  website: string | null
  imageUrl: string | null
  openingDate: string | null
  closingDate: string | null
  updatedAt: string
  branches: SuperAdminEstablishmentBranch[]
}

export type SuperAdminEstablishmentsQuery = PaginationParams & {
  search?: string
  status?: SuperAdminEstablishmentStatus
  establishmentType?: SuperAdminEstablishmentType
  placeType?: PlaceTypeKey
  verified?: boolean
  source?: SuperAdminEstablishmentSource
  categoryId?: string
}

export type SuperAdminEstablishmentCategoryOption = {
  id: string
  name: string
  slug: string
  status: 'active' | 'hidden'
}

export type SuperAdminEstablishmentOptions = {
  categories: SuperAdminEstablishmentCategoryOption[]
  establishmentTypes: SuperAdminEstablishmentType[]
  placeTypes: PlaceTypeKey[]
}

export type SuperAdminEstablishmentInput = {
  name: string
  nameAr?: string | null
  categoryId?: string | null
  establishmentType: SuperAdminEstablishmentType
  placeTypes: PlaceTypeKey[]
  description?: string | null
  phone?: string | null
  whatsapp?: string | null
  website?: string | null
  imageUrl?: string | null
  isVerified: boolean
  openingDate?: string | null
  closingDate?: string | null
  branchName?: string | null
  location?: string | null
  wilaya?: string | null
  neighborhood?: string | null
  latitude?: number | null
  longitude?: number | null
}

export type SuperAdminEstablishmentMutation = {
  ok: true
  status: 'created' | 'updated' | 'archived' | 'reactivated'
  establishmentId: string
  branchId?: string
}

const roles = ['user', 'admin', 'super_admin'] as const
const statuses = ['active', 'suspended', 'deleted'] as const
const establishmentStatuses: SuperAdminEstablishmentStatus[] = ['draft', 'pending', 'approved', 'rejected', 'suspended']
const establishmentTypes: SuperAdminEstablishmentType[] = ['private', 'public', 'administrative']
const establishmentSources: SuperAdminEstablishmentSource[] = ['admin_created', 'client_submission', 'map_discovery', 'unknown']
const branchStatuses: SuperAdminEstablishmentBranch['status'][] = ['active', 'hidden', 'closed']

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function stringValue(value: unknown) {
  return typeof value === 'string' ? value : null
}

function nullableStringValue(value: unknown) {
  return value === null || typeof value === 'string' ? value : undefined
}

function numberValue(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function nullableNumberValue(value: unknown) {
  return value === null ? null : numberValue(value) ?? undefined
}

function booleanValue(value: unknown) {
  return typeof value === 'boolean' ? value : null
}

function adminRole(value: unknown): AdminUser['role'] | null {
  return typeof value === 'string' && roles.includes(value as AdminUser['role']) ? value as AdminUser['role'] : null
}

function adminStatus(value: unknown): AdminUser['status'] | null {
  return typeof value === 'string' && statuses.includes(value as AdminUser['status']) ? value as AdminUser['status'] : null
}

function establishmentStatus(value: unknown): SuperAdminEstablishmentStatus | null {
  return typeof value === 'string' && establishmentStatuses.includes(value as SuperAdminEstablishmentStatus)
    ? value as SuperAdminEstablishmentStatus
    : null
}

function establishmentType(value: unknown): SuperAdminEstablishmentType | null {
  return typeof value === 'string' && establishmentTypes.includes(value as SuperAdminEstablishmentType)
    ? value as SuperAdminEstablishmentType
    : null
}

function establishmentSource(value: unknown): SuperAdminEstablishmentSource | null {
  return typeof value === 'string' && establishmentSources.includes(value as SuperAdminEstablishmentSource)
    ? value as SuperAdminEstablishmentSource
    : null
}

function branchStatus(value: unknown): SuperAdminEstablishmentBranch['status'] | null {
  return typeof value === 'string' && branchStatuses.includes(value as SuperAdminEstablishmentBranch['status'])
    ? value as SuperAdminEstablishmentBranch['status']
    : null
}

function readPlaceTypes(value: unknown): PlaceTypeKey[] | null {
  if (!Array.isArray(value) || value.some((type) => !isPlaceTypeKey(type))) return null
  return value as PlaceTypeKey[]
}

function emptyPage<T>(pagination: PaginationParams = {}) {
  return paginatedResult<T>([], 0, pagination)
}

function readAdmin(value: unknown): SuperAdminAdmin | null {
  if (!isRecord(value)) return null

  const id = stringValue(value.id)
  const role = adminRole(value.role)
  const status = adminStatus(value.status)
  const createdAt = stringValue(value.created_at)
  const updatedAt = stringValue(value.updated_at)
  const establishmentsAdded = numberValue(value.establishments_added)
  const fullName = nullableStringValue(value.full_name)
  const fullNameAr = nullableStringValue(value.full_name_ar)
  const email = nullableStringValue(value.email)
  const phone = nullableStringValue(value.phone)
  const avatarUrl = nullableStringValue(value.avatar_url)

  if (!id || !role || !status || !createdAt || !updatedAt || establishmentsAdded === null || fullName === undefined || fullNameAr === undefined || email === undefined || phone === undefined || avatarUrl === undefined) return null

  return {
    id,
    role,
    status,
    created_at: createdAt,
    updated_at: updatedAt,
    full_name: fullName,
    full_name_ar: fullNameAr,
    email,
    phone,
    avatar_url: avatarUrl,
    establishmentsAdded,
  }
}

function readAuditEvent(value: unknown): SuperAdminAuditEvent | null {
  if (!isRecord(value)) return null
  const id = stringValue(value.id)
  const actorId = stringValue(value.actor_id)
  const actorName = stringValue(value.actor_name)
  const action = stringValue(value.action)
  const targetType = stringValue(value.target_type)
  const targetId = stringValue(value.target_id)
  const createdAt = stringValue(value.created_at)
  const actorRole = value.actor_role === null ? null : adminRole(value.actor_role)
  const metadata = isRecord(value.metadata) ? value.metadata : {}

  if (!id || !actorId || actorName === null || !action || !targetType || !targetId || !createdAt || (value.actor_role !== null && !actorRole)) return null

  return { id, actorId, actorName, actorRole, action, targetType, targetId, metadata, createdAt }
}

/** The details RPC scopes actions to one admin, so it intentionally omits duplicate actor data. */
function readAdminRecentAction(value: unknown): SuperAdminRecentAction | null {
  if (!isRecord(value)) return null
  const id = stringValue(value.id)
  const action = stringValue(value.action)
  const targetType = stringValue(value.target_type)
  const targetId = stringValue(value.target_id)
  const createdAt = stringValue(value.created_at)
  const metadata = isRecord(value.metadata) ? value.metadata : {}

  if (!id || !action || !targetType || !targetId || !createdAt) return null
  return { id, action, targetType, targetId, metadata, createdAt }
}

function readPage<T>(value: unknown, readItem: (item: unknown) => T | null): PaginatedResult<T> | null {
  if (!isRecord(value) || !Array.isArray(value.items)) return null

  const page = numberValue(value.page)
  const pageSize = numberValue(value.page_size)
  const totalCount = numberValue(value.total_count)
  const items = value.items.map(readItem)

  if (!page || !pageSize || totalCount === null || items.some((item): item is null => item === null)) return null
  return paginatedResult(items as T[], totalCount, { page, pageSize })
}

function readEstablishment(value: unknown): SuperAdminEstablishment | null {
  if (!isRecord(value)) return null

  const id = stringValue(value.id)
  const name = stringValue(value.name)
  const nameAr = nullableStringValue(value.name_ar)
  const categoryId = nullableStringValue(value.category_id)
  const categoryName = nullableStringValue(value.category_name)
  const categorySlug = nullableStringValue(value.category_slug)
  const itemEstablishmentType = establishmentType(value.establishment_type)
  const placeTypes = readPlaceTypes(value.place_types)
  const status = establishmentStatus(value.status)
  const isVerified = booleanValue(value.is_verified)
  const phone = nullableStringValue(value.phone)
  const whatsapp = nullableStringValue(value.whatsapp)
  const location = nullableStringValue(value.location)
  const wilaya = nullableStringValue(value.wilaya)
  const branchCount = numberValue(value.branch_count)
  const createdAt = stringValue(value.created_at)
  const source = establishmentSource(value.source)

  if (
    !id || !name || nameAr === undefined || categoryId === undefined || categoryName === undefined || categorySlug === undefined
    || !itemEstablishmentType || !placeTypes || !status || isVerified === null || phone === undefined || whatsapp === undefined
    || location === undefined || wilaya === undefined || branchCount === null || !createdAt || !source
  ) return null

  return {
    id,
    name,
    nameAr,
    categoryId,
    categoryName,
    categorySlug,
    establishmentType: itemEstablishmentType,
    placeTypes,
    status,
    isVerified,
    phone,
    whatsapp,
    location,
    wilaya,
    branchCount,
    createdAt,
    source,
  }
}

function readEstablishmentBranch(value: unknown): SuperAdminEstablishmentBranch | null {
  if (!isRecord(value)) return null

  const id = stringValue(value.id)
  const name = stringValue(value.name)
  const phone = nullableStringValue(value.phone)
  const whatsapp = nullableStringValue(value.whatsapp)
  const address = nullableStringValue(value.address)
  const wilaya = nullableStringValue(value.wilaya)
  const neighborhood = nullableStringValue(value.neighborhood)
  const latitude = nullableNumberValue(value.latitude)
  const longitude = nullableNumberValue(value.longitude)
  const isMain = booleanValue(value.is_main)
  const status = branchStatus(value.status)
  const createdAt = stringValue(value.created_at)

  if (
    !id || !name || phone === undefined || whatsapp === undefined || address === undefined || wilaya === undefined
    || neighborhood === undefined || latitude === undefined || longitude === undefined || isMain === null || !status || !createdAt
  ) return null

  return { id, name, phone, whatsapp, address, wilaya, neighborhood, latitude, longitude, isMain, status, createdAt }
}

function readEstablishmentDetails(value: unknown): SuperAdminEstablishmentDetails | null {
  const establishment = readEstablishment(value)
  if (!establishment || !isRecord(value) || !Array.isArray(value.branches)) return null

  const description = nullableStringValue(value.description)
  const website = nullableStringValue(value.website)
  const imageUrl = nullableStringValue(value.image_url)
  const openingDate = nullableStringValue(value.opening_date)
  const closingDate = nullableStringValue(value.closing_date)
  const updatedAt = stringValue(value.updated_at)
  const branches = value.branches.map(readEstablishmentBranch)

  if (
    description === undefined || website === undefined || imageUrl === undefined || openingDate === undefined
    || closingDate === undefined || !updatedAt || branches.some((branch) => branch === null)
  ) return null

  return {
    ...establishment,
    description,
    website,
    imageUrl,
    openingDate,
    closingDate,
    updatedAt,
    branches: branches as SuperAdminEstablishmentBranch[],
  }
}

function readCategoryOption(value: unknown): SuperAdminEstablishmentCategoryOption | null {
  if (!isRecord(value)) return null

  const id = stringValue(value.id)
  const name = stringValue(value.name)
  const slug = stringValue(value.slug)
  const status = value.status === 'active' || value.status === 'hidden' ? value.status : null
  return id && name && slug && status ? { id, name, slug, status } : null
}

function readEstablishmentOptions(value: unknown): SuperAdminEstablishmentOptions | null {
  if (
    !isRecord(value) || !Array.isArray(value.categories)
    || !Array.isArray(value.establishment_types) || !Array.isArray(value.place_types)
  ) return null

  const categories = value.categories.map(readCategoryOption)
  const parsedEstablishmentTypes = value.establishment_types.map(establishmentType)
  const placeTypes = readPlaceTypes(value.place_types)

  if (
    categories.some((category) => category === null)
    || parsedEstablishmentTypes.some((type) => type === null)
    || !placeTypes
  ) return null

  return {
    categories: categories as SuperAdminEstablishmentCategoryOption[],
    establishmentTypes: parsedEstablishmentTypes as SuperAdminEstablishmentType[],
    placeTypes,
  }
}

function readEstablishmentMutation(value: unknown): SuperAdminEstablishmentMutation | null {
  if (!isRecord(value) || value.ok !== true) return null

  const status = typeof value.status === 'string' && ['created', 'updated', 'archived', 'reactivated'].includes(value.status)
    ? value.status as SuperAdminEstablishmentMutation['status']
    : null
  const establishmentId = stringValue(value.establishment_id)
  const branchId = value.branch_id === undefined || value.branch_id === null ? undefined : stringValue(value.branch_id) ?? null

  if (!status || !establishmentId || branchId === null) return null
  return { ok: true, status, establishmentId, ...(branchId ? { branchId } : {}) }
}

function failureFor(error: unknown, responseIsValid: boolean): SuperAdminFailure | null {
  if (!error) return responseIsValid ? null : 'unavailable'
  if (!isRecord(error)) return 'unavailable'

  const code = stringValue(error.code)
  const message = stringValue(error.message)?.toLowerCase() ?? ''

  if (
    code === 'PGRST202'
    || code === 'PGRST205'
    || code === '42883'
    || code === '42P01'
    || message.includes('could not find the function')
    || message.includes('schema cache')
    || message.includes('relation') && message.includes('does not exist')
  ) {
    return 'not-connected'
  }

  return code === '42501' ? 'access-denied' : 'unavailable'
}

/** Admin accounts are read only through the dedicated, super-admin-gated RPC. */
export async function getSuperAdminAdmins({ search, ...pagination }: SuperAdminAdminsQuery = {}): Promise<SuperAdminResult<PaginatedResult<SuperAdminAdmin>>> {
  const { page, pageSize } = resolvePagination({ ...pagination, pageSize: DEFAULT_PAGE_SIZE })
  const { data, error } = await supabase.rpc('super_admin_list_admins', {
    p_search: search?.trim().slice(0, 120) || null,
    p_page: page,
    p_page_size: pageSize,
  })

  const parsed = readPage(data, readAdmin)
  return { data: parsed ?? emptyPage({ page, pageSize }), error: failureFor(error, parsed !== null) }
}

export async function getSuperAdminAdminStats(): Promise<SuperAdminResult<SuperAdminAdminStats | null>> {
  const { data, error } = await supabase.rpc('super_admin_get_admin_stats')
  if (error || !isRecord(data)) return { data: null, error: failureFor(error, false) }

  const totalAdmins = numberValue(data.total_admins)
  const activeAdmins = numberValue(data.active_admins)
  const suspendedAdmins = numberValue(data.suspended_admins)
  const establishmentsAdded = numberValue(data.establishments_added)
  const adminActionsThisWeek = numberValue(data.admin_actions_this_week)

  if (totalAdmins === null || activeAdmins === null || suspendedAdmins === null || establishmentsAdded === null || adminActionsThisWeek === null) {
    return { data: null, error: 'unavailable' }
  }

  return { data: { totalAdmins, activeAdmins, suspendedAdmins, establishmentsAdded, adminActionsThisWeek }, error: null }
}

export async function getSuperAdminAdminDetails(adminId: string): Promise<SuperAdminResult<SuperAdminAdminDetails | null>> {
  const { data, error } = await supabase.rpc('super_admin_get_admin_details', { p_admin_id: adminId })
  const admin = readAdmin(data)
  const record = isRecord(data) ? data : null
  const recentActions = record && Array.isArray(record.recent_actions) ? record.recent_actions.map(readAdminRecentAction) : null

  if (error || !admin || !recentActions) {
    return { data: null, error: failureFor(error, false) }
  }

  const validRecentActions = recentActions.filter((event): event is SuperAdminRecentAction => event !== null)
  if (validRecentActions.length !== recentActions.length) return { data: null, error: 'unavailable' }

  return { data: { ...admin, recentActions: validRecentActions }, error: null }
}

/** Safe profile fields only; role and status remain separate server-controlled transitions. */
export async function updateSuperAdminAdminProfile({
  adminId,
  fullName,
  fullNameAr,
  phone,
}: {
  adminId: string
  fullName: string
  fullNameAr: string
  phone: string
}): Promise<SuperAdminResult<AdminUser | null>> {
  const { data, error } = await supabase
    .rpc('super_admin_update_admin_profile', {
      p_admin_id: adminId,
      p_full_name: fullName,
      p_full_name_ar: fullNameAr || null,
      p_phone: phone || null,
    })
    .maybeSingle()

  const updated = readAdmin({ ...(isRecord(data) ? data : {}), establishments_added: 0 })
  if (error || !updated) return { data: null, error: failureFor(error, false) }

  const { establishmentsAdded: _establishmentsAdded, ...profile } = updated
  return { data: profile, error: null }
}

/** Creates a pending invitation record; it deliberately does not create an Auth user. */
export async function createSuperAdminInvitation({
  email,
  fullName,
  fullNameAr,
  phone,
}: {
  email: string
  fullName: string
  fullNameAr: string
  phone: string
}): Promise<SuperAdminResult<SuperAdminAdminInvitation | null>> {
  const { data, error } = await supabase.rpc('super_admin_create_admin_invitation', {
    p_email: email,
    p_full_name: fullName,
    p_full_name_ar: fullNameAr || null,
    p_phone: phone,
  })

  if (error || !isRecord(data)) return { data: null, error: failureFor(error, false) }

  const id = stringValue(data.id)
  const invitationEmail = stringValue(data.email)
  const invitationName = stringValue(data.full_name)
  const invitationPhone = stringValue(data.phone)
  const role = data.role === 'admin' ? data.role : null
  const status = typeof data.status === 'string' && ['pending', 'expired', 'cancelled'].includes(data.status) ? data.status as SuperAdminAdminInvitation['status'] : null
  const expiresAt = stringValue(data.expires_at)
  const createdAt = stringValue(data.created_at)

  if (!id || !invitationEmail || !invitationName || !invitationPhone || !role || !status || !expiresAt || !createdAt) {
    return { data: null, error: 'unavailable' }
  }

  return { data: { id, email: invitationEmail, fullName: invitationName, phone: invitationPhone, role, status, expiresAt, createdAt }, error: null }
}

export async function getSuperAdminAuditEvents(pagination: PaginationParams = {}): Promise<SuperAdminResult<PaginatedResult<SuperAdminAuditEvent>>> {
  const { page, pageSize } = resolvePagination({ ...pagination, pageSize: DEFAULT_PAGE_SIZE })
  const { data, error } = await supabase.rpc('super_admin_list_audit_events', {
    p_page: page,
    p_page_size: pageSize,
  })

  const parsed = readPage(data, readAuditEvent)
  return { data: parsed ?? emptyPage({ page, pageSize }), error: failureFor(error, parsed !== null) }
}

/** The existing audited status RPC keeps the final permission decision in PostgreSQL. */
export async function updateSuperAdminAdminStatus(adminId: string, status: 'active' | 'suspended') {
  return adminUpdateUserStatus({ userId: adminId, status })
}

function establishmentWritePayload(input: SuperAdminEstablishmentInput) {
  return {
    p_name: input.name,
    p_name_ar: input.nameAr ?? null,
    p_category_id: input.categoryId ?? null,
    p_establishment_type: input.establishmentType,
    p_place_types: input.placeTypes,
    p_description: input.description ?? null,
    p_phone: input.phone ?? null,
    p_whatsapp: input.whatsapp ?? null,
    p_website: input.website ?? null,
    p_image_url: input.imageUrl ?? null,
    p_is_verified: input.isVerified,
    p_opening_date: input.openingDate ?? null,
    p_closing_date: input.closingDate ?? null,
    p_branch_name: input.branchName ?? null,
    p_location: input.location ?? null,
    p_wilaya: input.wilaya ?? null,
    p_neighborhood: input.neighborhood ?? null,
    p_latitude: input.latitude ?? null,
    p_longitude: input.longitude ?? null,
  }
}

/** The catalogue RPC includes hidden categories because this is a management surface. */
export async function getSuperAdminEstablishmentOptions(): Promise<SuperAdminResult<SuperAdminEstablishmentOptions | null>> {
  const { data, error } = await supabase.rpc('super_admin_get_establishment_options')
  const parsed = readEstablishmentOptions(data)
  return { data: parsed, error: failureFor(error, parsed !== null) }
}

/** Paginated, explicitly projected reads keep raw administrative rows out of the browser. */
export async function getSuperAdminEstablishments({
  search,
  status,
  establishmentType: type,
  placeType,
  verified,
  source,
  categoryId,
  ...pagination
}: SuperAdminEstablishmentsQuery = {}): Promise<SuperAdminResult<PaginatedResult<SuperAdminEstablishment>>> {
  const resolved = resolvePagination({ ...pagination, pageSize: pagination.pageSize ?? DEFAULT_PAGE_SIZE })
  const pageSize = resolved.pageSize === 20 ? 20 : DEFAULT_PAGE_SIZE
  const { data, error } = await supabase.rpc('super_admin_list_establishments', {
    p_search: search?.trim().slice(0, 120) || null,
    p_status: status ?? null,
    p_establishment_type: type ?? null,
    p_place_type: placeType ?? null,
    p_verified: verified ?? null,
    p_source: source ?? null,
    p_category_id: categoryId?.trim() || null,
    p_page: resolved.page,
    p_page_size: pageSize,
  })

  const parsed = readPage(data, readEstablishment)
  return {
    data: parsed ?? emptyPage({ page: resolved.page, pageSize }),
    error: failureFor(error, parsed !== null),
  }
}

export async function getSuperAdminEstablishmentDetails(
  establishmentId: string,
): Promise<SuperAdminResult<SuperAdminEstablishmentDetails | null>> {
  const { data, error } = await supabase.rpc('super_admin_get_establishment_details', {
    p_establishment_id: establishmentId,
  })
  const parsed = readEstablishmentDetails(data)
  return { data: parsed, error: failureFor(error, parsed !== null) }
}

export async function createSuperAdminEstablishment(
  input: SuperAdminEstablishmentInput,
): Promise<SuperAdminResult<SuperAdminEstablishmentMutation | null>> {
  const { data, error } = await supabase.rpc('super_admin_create_establishment', establishmentWritePayload(input))
  const parsed = readEstablishmentMutation(data)
  return { data: parsed, error: failureFor(error, parsed !== null) }
}

export async function updateSuperAdminEstablishment(
  establishmentId: string,
  input: SuperAdminEstablishmentInput,
): Promise<SuperAdminResult<SuperAdminEstablishmentMutation | null>> {
  const { data, error } = await supabase.rpc('super_admin_update_establishment', {
    p_establishment_id: establishmentId,
    ...establishmentWritePayload(input),
  })
  const parsed = readEstablishmentMutation(data)
  return { data: parsed, error: failureFor(error, parsed !== null) }
}

export async function archiveSuperAdminEstablishment(
  establishmentId: string,
): Promise<SuperAdminResult<SuperAdminEstablishmentMutation | null>> {
  const { data, error } = await supabase.rpc('super_admin_archive_establishment', {
    p_establishment_id: establishmentId,
  })
  const parsed = readEstablishmentMutation(data)
  return { data: parsed, error: failureFor(error, parsed !== null) }
}

export async function reactivateSuperAdminEstablishment(
  establishmentId: string,
): Promise<SuperAdminResult<SuperAdminEstablishmentMutation | null>> {
  const { data, error } = await supabase.rpc('super_admin_reactivate_establishment', {
    p_establishment_id: establishmentId,
  })
  const parsed = readEstablishmentMutation(data)
  return { data: parsed, error: failureFor(error, parsed !== null) }
}
