import type { AdminUser } from './admin'
import { adminUpdateUserStatus } from './admin'
import { DEFAULT_PAGE_SIZE, paginatedResult, resolvePagination, type PaginatedResult, type PaginationParams } from './pagination'
import { supabase } from './supabaseClient'

export type SuperAdminFailure = 'not-connected' | 'access-denied' | 'unavailable'

type SuperAdminResult<T> = {
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

const roles = ['user', 'admin', 'super_admin'] as const
const statuses = ['active', 'suspended', 'deleted'] as const

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

function adminRole(value: unknown): AdminUser['role'] | null {
  return typeof value === 'string' && roles.includes(value as AdminUser['role']) ? value as AdminUser['role'] : null
}

function adminStatus(value: unknown): AdminUser['status'] | null {
  return typeof value === 'string' && statuses.includes(value as AdminUser['status']) ? value as AdminUser['status'] : null
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
