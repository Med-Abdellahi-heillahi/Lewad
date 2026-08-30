import { paginatedResult, resolvePagination, type PaginatedResult, type PaginationParams } from './pagination'
import { supabase } from './supabaseClient'

export type BusinessSubmissionStatus = 'pending_review' | 'approved' | 'rejected' | 'cancelled'

export type BusinessSubmissionInput = {
  ownerFirstName: string
  ownerLastName: string
  ownerPhone: string
  businessNameFr: string
  businessNameAr: string
  businessPhone: string
  whatsapp?: string | null
  website?: string | null
  categoryId?: string | null
  location?: string | null
  nearestPlace?: string | null
  latitude: number
  longitude: number
}

export type BusinessSubmissionFailure = 'not-connected' | 'access-denied' | 'invalid-input' | 'rate-limited' | 'unavailable'

export type BusinessSubmissionResult<T> = {
  data: T
  error: BusinessSubmissionFailure | null
}

export type CreatedBusinessSubmission = {
  id: string
  amountMro: number
  periodMonths: number | null
  status: 'pending_review'
}

export type CreateBusinessSubmissionResult = {
  ok: boolean
  status: 'created' | 'duplicate' | 'rate_limited' | 'invalid_input' | 'invalid_category' | 'invalid_coordinates' | 'unauthenticated' | 'missing_backend' | 'error'
  message: string | null
  submissionId: string | null
  amountMro: number | null
  /**
   * Null until 20260821000004 is applied remotely: an older server simply does
   * not return the field, and a missing period must not fail the submission.
   */
  periodMonths: number | null
}

export type BusinessSubmissionSummary = {
  id: string
  createdBy: string
  ownerFirstName: string
  ownerLastName: string
  ownerPhone: string
  businessNameFr: string
  businessNameAr: string
  businessPhone: string
  whatsapp: string | null
  categoryId: string | null
  categoryName: string | null
  status: BusinessSubmissionStatus
  amountMro: number
  periodMonths: number | null
  resolvedEstablishmentId: string | null
  approvedAt: string | null
  rejectedAt: string | null
  createdAt: string
  updatedAt: string
}

export type BusinessSubmissionCreator = {
  id: string
  fullName: string | null
  fullNameAr: string | null
  email: string | null
  phone: string | null
}

export type BusinessSubmissionDetails = BusinessSubmissionSummary & {
  website: string | null
  location: string | null
  nearestPlace: string | null
  latitude: number | null
  longitude: number | null
  adminNote: string | null
  rejectionReason: string | null
  approvedBy: string | null
  rejectedBy: string | null
  category: {
    id: string
    name: string
    slug: string
    status: 'active' | 'hidden'
  } | null
  creator: BusinessSubmissionCreator | null
}

export type AdminBusinessSubmissionQuery = PaginationParams & {
  status?: 'all' | BusinessSubmissionStatus
  search?: string
}

export type AdminBusinessSubmissionDecision = {
  ok: boolean
  status: 'approved' | 'rejected' | 'not_found' | 'not_pending' | 'invalid_category' | 'invalid_coordinates' | 'error'
  submissionId: string | null
  establishmentId: string | null
  branchId: string | null
}

type JsonRecord = Record<string, unknown>

const submissionStatuses = ['pending_review', 'approved', 'rejected', 'cancelled'] as const
const decisionStatuses = ['approved', 'rejected', 'not_found', 'not_pending', 'invalid_category', 'invalid_coordinates', 'error'] as const

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function stringValue(value: unknown) {
  return typeof value === 'string' ? value : null
}

function nullableStringValue(value: unknown) {
  return value === null || typeof value === 'string' ? value : undefined
}

function optionalDecisionString(value: unknown) {
  return value === undefined ? null : nullableStringValue(value)
}

function numberValue(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function nullableNumberValue(value: unknown) {
  if (value === null) return null
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function submissionStatus(value: unknown): BusinessSubmissionStatus | null {
  return typeof value === 'string' && submissionStatuses.includes(value as BusinessSubmissionStatus)
    ? value as BusinessSubmissionStatus
    : null
}

function decisionStatus(value: unknown): AdminBusinessSubmissionDecision['status'] {
  return typeof value === 'string' && decisionStatuses.includes(value as AdminBusinessSubmissionDecision['status'])
    ? value as AdminBusinessSubmissionDecision['status']
    : 'error'
}

function readSummary(value: unknown): BusinessSubmissionSummary | null {
  if (!isRecord(value)) return null

  const id = stringValue(value.id)
  const createdBy = stringValue(value.created_by)
  const ownerFirstName = stringValue(value.owner_first_name)
  const ownerLastName = stringValue(value.owner_last_name)
  const ownerPhone = stringValue(value.owner_phone)
  const businessNameFr = stringValue(value.business_name_fr)
  const businessNameAr = stringValue(value.business_name_ar)
  const businessPhone = stringValue(value.business_phone)
  const whatsapp = nullableStringValue(value.whatsapp)
  const categoryId = nullableStringValue(value.category_id)
  const categoryName = nullableStringValue(value.category_name)
  const status = submissionStatus(value.status)
  const amountMro = numberValue(value.amount_mro)
  const periodMonths = numberValue(value.period_months)
  const resolvedEstablishmentId = nullableStringValue(value.resolved_establishment_id)
  const approvedAt = nullableStringValue(value.approved_at)
  const rejectedAt = nullableStringValue(value.rejected_at)
  const createdAt = stringValue(value.created_at)
  const updatedAt = stringValue(value.updated_at)

  if (
    !id || !createdBy || !ownerFirstName || !ownerLastName || !ownerPhone || !businessNameFr || !businessNameAr || !businessPhone
    || whatsapp === undefined || categoryId === undefined || categoryName === undefined || !status || amountMro === null
    || resolvedEstablishmentId === undefined || approvedAt === undefined || rejectedAt === undefined || !createdAt || !updatedAt
  ) {
    return null
  }

  return {
    id,
    createdBy,
    ownerFirstName,
    ownerLastName,
    ownerPhone,
    businessNameFr,
    businessNameAr,
    businessPhone,
    whatsapp,
    categoryId,
    categoryName,
    status,
    amountMro,
    periodMonths,
    resolvedEstablishmentId,
    approvedAt,
    rejectedAt,
    createdAt,
    updatedAt,
  }
}

function readCreator(value: unknown): BusinessSubmissionCreator | null | undefined {
  if (value === null) return null
  if (!isRecord(value)) return undefined

  const id = stringValue(value.id)
  const fullName = nullableStringValue(value.full_name)
  const fullNameAr = nullableStringValue(value.full_name_ar)
  const email = nullableStringValue(value.email)
  const phone = nullableStringValue(value.phone)

  if (!id || fullName === undefined || fullNameAr === undefined || email === undefined || phone === undefined) return undefined
  return { id, fullName, fullNameAr, email, phone }
}

function readDetails(value: unknown): BusinessSubmissionDetails | null {
  const summary = readSummary(value)
  if (!summary || !isRecord(value)) return null

  const website = nullableStringValue(value.website)
  const location = nullableStringValue(value.location)
  const nearestPlace = nullableStringValue(value.nearest_place)
  const latitude = nullableNumberValue(value.latitude)
  const longitude = nullableNumberValue(value.longitude)
  const adminNote = nullableStringValue(value.admin_note)
  const rejectionReason = nullableStringValue(value.rejection_reason)
  const approvedBy = nullableStringValue(value.approved_by)
  const rejectedBy = nullableStringValue(value.rejected_by)
  const creator = readCreator(value.creator)
  const categoryValue = value.category

  let category: BusinessSubmissionDetails['category'] | undefined
  if (categoryValue === null) {
    category = null
  } else if (isRecord(categoryValue)) {
    const id = stringValue(categoryValue.id)
    const name = stringValue(categoryValue.name)
    const slug = stringValue(categoryValue.slug)
    const status = categoryValue.status
    category = id && name && slug && (status === 'active' || status === 'hidden') ? { id, name, slug, status } : undefined
  }

  if (
    website === undefined || location === undefined || nearestPlace === undefined || latitude === undefined || longitude === undefined || adminNote === undefined || rejectionReason === undefined
    || approvedBy === undefined || rejectedBy === undefined || creator === undefined || category === undefined
  ) {
    return null
  }

  return {
    ...summary,
    website,
    location,
    nearestPlace,
    latitude,
    longitude,
    adminNote,
    rejectionReason,
    approvedBy,
    rejectedBy,
    category,
    creator,
  }
}

function emptyPage<T>(pagination: PaginationParams = {}) {
  return paginatedResult<T>([], 0, pagination)
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

function failureFor(error: unknown, responseIsValid: boolean): BusinessSubmissionFailure | null {
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

  if (code === '42501') return 'access-denied'
  if (code === '22023') return 'invalid-input'
  return 'unavailable'
}

function createStatusFor(response: JsonRecord): CreateBusinessSubmissionResult['status'] {
  switch (response.status) {
    case 'rate_limited':
    case 'invalid_input':
    case 'invalid_category':
    case 'invalid_coordinates':
    case 'unauthenticated':
    case 'duplicate':
      return response.status
    default:
      return 'error'
  }
}

/**
 * Creates a proposal through PostgreSQL. The browser sends business details
 * only: the server owns the price, the listing period, the owner id, the
 * pending status, and the anti-spam decision.
 */
export async function createBusinessSubmission(input: BusinessSubmissionInput): Promise<CreateBusinessSubmissionResult> {
  const { data, error } = await supabase.rpc('create_business_submission', {
    p_owner_first_name: input.ownerFirstName,
    p_owner_last_name: input.ownerLastName,
    p_owner_phone: input.ownerPhone,
    p_business_name_fr: input.businessNameFr,
    p_business_name_ar: input.businessNameAr,
    p_business_phone: input.businessPhone,
    p_latitude: input.latitude,
    p_longitude: input.longitude,
    p_whatsapp: input.whatsapp ?? null,
    p_website: input.website ?? null,
    p_category_id: input.categoryId ?? null,
    p_location: input.location ?? null,
    p_nearest_place: input.nearestPlace ?? null,
  })

  if (error) {
    return {
      ok: false,
      status: failureFor(error, false) === 'not-connected' ? 'missing_backend' : 'error',
      message: stringValue(error.message),
      submissionId: null,
      amountMro: null,
      periodMonths: null,
    }
  }

  if (!isRecord(data)) {
    return { ok: false, status: 'error', message: null, submissionId: null, amountMro: null, periodMonths: null }
  }

  const id = stringValue(data.submission_id)
  const amountMro = numberValue(data.amount_mro)
  if (data.ok === true && data.status === 'pending_review' && id && amountMro !== null) {
    return { ok: true, status: 'created', message: null, submissionId: id, amountMro, periodMonths: numberValue(data.period_months) }
  }

  return {
    ok: false,
    status: createStatusFor(data),
    message: nullableStringValue(data.message) ?? null,
    submissionId: null,
    amountMro: null,
    periodMonths: null,
  }
}

/** Privileged list access remains server-paginated and server-authorised. */
export async function adminListBusinessSubmissions(
  { status = 'all', search, ...pagination }: AdminBusinessSubmissionQuery = {},
): Promise<BusinessSubmissionResult<PaginatedResult<BusinessSubmissionSummary>>> {
  const { page, pageSize } = resolvePagination(pagination)
  const { data, error } = await supabase.rpc('admin_list_business_submissions', {
    p_status: status === 'all' ? null : status,
    p_search: search?.trim().slice(0, 120) || null,
    p_page: page,
    p_page_size: pageSize,
  })

  const parsed = readPage(data, readSummary)
  return {
    data: parsed ?? emptyPage({ page, pageSize }),
    error: failureFor(error, parsed !== null),
  }
}

/** Returns details only through the active-admin RPC, never from a component query. */
export async function adminGetBusinessSubmissionDetails(
  submissionId: string,
): Promise<BusinessSubmissionResult<BusinessSubmissionDetails | null>> {
  const { data, error } = await supabase.rpc('admin_get_business_submission_details', {
    p_submission_id: submissionId,
  })

  const parsed = readDetails(data)
  return { data: parsed, error: failureFor(error, parsed !== null) }
}

function readDecision(data: unknown, expectedStatus: 'approved' | 'rejected'): AdminBusinessSubmissionDecision {
  if (!isRecord(data)) {
    return { ok: false, status: 'error', submissionId: null, establishmentId: null, branchId: null }
  }

  const status = decisionStatus(data.status)
  const submissionId = optionalDecisionString(data.submission_id)
  const establishmentId = optionalDecisionString(data.establishment_id)
  const branchId = optionalDecisionString(data.branch_id)

  if (submissionId === undefined || establishmentId === undefined || branchId === undefined) {
    return { ok: false, status: 'error', submissionId: null, establishmentId: null, branchId: null }
  }

  const successShapeValid = expectedStatus === 'approved'
    ? Boolean(submissionId && establishmentId && branchId)
    : Boolean(submissionId)

  return {
    ok: data.ok === true && status === expectedStatus && successShapeValid,
    status,
    submissionId,
    establishmentId,
    branchId,
  }
}

/** Approval creates the establishment and its main branch atomically in PostgreSQL. */
export async function adminApproveBusinessSubmission(
  submissionId: string,
  note: string | null = null,
): Promise<BusinessSubmissionResult<AdminBusinessSubmissionDecision>> {
  const { data, error } = await supabase.rpc('admin_approve_business_submission', {
    p_submission_id: submissionId,
    p_admin_note: note,
  })

  const decision = readDecision(data, 'approved')
  return { data: decision, error: error ? failureFor(error, false) : null }
}

/** A rejection records its required reason, but never creates an establishment. */
export async function adminRejectBusinessSubmission(
  submissionId: string,
  reason: string,
  note: string | null = null,
): Promise<BusinessSubmissionResult<AdminBusinessSubmissionDecision>> {
  const { data, error } = await supabase.rpc('admin_reject_business_submission', {
    p_submission_id: submissionId,
    p_rejection_reason: reason,
    p_admin_note: note,
  })

  const decision = readDecision(data, 'rejected')
  return { data: decision, error: error ? failureFor(error, false) : null }
}
