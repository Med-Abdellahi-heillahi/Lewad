import type { FieldMapping, StagedLocalisationRow } from './localisationImport'
import type { PaginatedResult, PaginationParams } from './pagination'
import { paginatedResult, resolvePagination } from './pagination'
import { supabase } from './supabaseClient'

export type { FieldMapping, StagedLocalisationRow } from './localisationImport'

export const LOCALISATION_IMPORT_MAX_ROWS = 10_000
export const LOCALISATION_IMPORT_CHUNK_SIZE = 250

export const localisationImportEntityTypes = [
  'establishment',
  'wilaya',
  'moughataa',
  'commune',
  'locality',
] as const

export type LocalisationImportEntityType = typeof localisationImportEntityTypes[number]
export type LocalisationEntityType = LocalisationImportEntityType
export type LocalisationImportFileType = 'xlsx' | 'csv'
export type LocalisationFileType = LocalisationImportFileType
export type LocalisationImportFailure = 'not-connected' | 'access-denied' | 'unavailable'
export type LocalisationImportBatchStatus = 'created' | 'staging' | 'validated' | 'invalid' | 'applied' | 'expired'
export type LocalisationImportRowStatus = 'pending' | 'valid' | 'invalid' | 'duplicate' | 'applied'
export type LocalisationImportDuplicateKind = 'batch' | 'final'

export type LocalisationImportResult<T> = Readonly<{
  data: T | null
  error: LocalisationImportFailure | null
}>

export type LocalisationImportBatch = Readonly<{
  id: string
  fileName: string
  fileType: LocalisationImportFileType
  sheetName: string | null
  entityType: LocalisationImportEntityType
  columnMapping: FieldMapping
  status: LocalisationImportBatchStatus
  totalRows: number
  stagedRows: number
  validRows: number
  invalidRows: number
  duplicateRows: number
  appliedRows: number
  createdAt: string
  validatedAt: string | null
  completedAt: string | null
}>

export type CreateLocalisationImportBatchInput = Readonly<{
  fileName: string
  fileType: LocalisationImportFileType
  sheetName?: string | null
  entityType: LocalisationImportEntityType
  columnMapping: FieldMapping
  totalRows: number
}>

export type LocalisationImportStageResult = Readonly<{
  batchId: string
  status: LocalisationImportBatchStatus
  stagedRows: number
  totalRows: number
}>

export type LocalisationImportValidationResult = Readonly<{
  batchId: string
  status: 'validated' | 'invalid'
  totalRows: number
  validRows: number
  invalidRows: number
  duplicateRows: number
  validatedAt: string
}>

export type LocalisationImportApplyResult = Readonly<{
  batchId: string
  status: 'applied'
  insertedRows: number
  updatedRows: number
  skippedRows: number
  completedAt: string
  alreadyApplied: boolean
}>

export type LocalisationImportValidationError = Readonly<{
  code: string
  field: string
  message: string
}>

export type LocalisationImportNormalizedData = Readonly<{
  entityType: LocalisationImportEntityType
  name: string
  nameFr: string | null
  nameAr: string | null
  nameEn: string | null
  category: string | null
  address: string | null
  wilaya: string | null
  phone: string | null
  openingStatus: string | null
  amenities: readonly string[]
  sourceUrl: string | null
  latitude: number | null
  longitude: number | null
}>

export type LocalisationImportJson =
  | null
  | boolean
  | number
  | string
  | readonly LocalisationImportJson[]
  | { readonly [key: string]: LocalisationImportJson }

export type LocalisationImportRow = Readonly<{
  id: string
  rowNumber: number
  sheetName: string | null
  status: LocalisationImportRowStatus
  validationErrors: readonly LocalisationImportValidationError[]
  duplicateKind: LocalisationImportDuplicateKind | null
  matchedPlaceId: string | null
  normalizedData: LocalisationImportNormalizedData | null
  rawData: Readonly<Record<string, LocalisationImportJson>>
  createdAt: string
  validatedAt: string | null
}>

export type LocalisationImportBatchDetails = Readonly<{
  batch: LocalisationImportBatch
  rows: readonly LocalisationImportRow[]
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
}>

export type LocalisationImportPurgeResult = Readonly<{
  purgedRows: number
  affectedBatches: number
  cutoff: string
}>

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f]/
const UNSAFE_CELL_CONTROL_PATTERN = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/
const PATH_SEPARATOR_PATTERN = /[\\/]/
const MAX_FILE_NAME_LENGTH = 255
const MAX_SHEET_NAME_LENGTH = 160
const MAX_HEADER_LENGTH = 160
const MAX_MAPPING_VALUE_LENGTH = 240
const MAX_TEXT_LENGTH = 2_048
const MAX_RAW_TEXT_LENGTH = 4_096
const MAX_SPREADSHEET_ROW_NUMBER = 1_000_000
const MAX_JSON_DEPTH = 4
const MAX_JSON_KEYS = 64
const MAX_JSON_ARRAY_ITEMS = 100
const MAX_STAGE_PAYLOAD_BYTES = 8 * 1024 * 1024
const MAX_RAW_DATA_BYTES = 64 * 1024
const MAX_NORMALIZED_DATA_BYTES = 16 * 1024
const MAX_COLUMN_MAPPING_BYTES = 8 * 1024
const MAX_PAGE = 100_000
const MAX_PURGE_DAYS = 365

const canonicalFields = [
  'name',
  'name_fr',
  'name_ar',
  'name_en',
  'category',
  'address',
  'wilaya',
  'phone',
  'opening_status',
  'amenities',
  'source_url',
  'latitude',
  'longitude',
] as const

const entityTypeSet = new Set<string>(localisationImportEntityTypes)
const fileTypeSet = new Set<string>(['xlsx', 'csv'])
const batchStatusSet = new Set<string>(['created', 'staging', 'validated', 'invalid', 'applied', 'expired'])
const rowStatusSet = new Set<string>(['pending', 'valid', 'invalid', 'duplicate', 'applied'])
const duplicateKindSet = new Set<string>(['batch', 'final'])
const allowedPageSizes = new Set([10, 20, 50, 100])
const rejectedJsonKeys = new Set(['__proto__', 'constructor', 'prototype'])

type JsonRecord = Record<string, unknown>

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function singleRecord(value: unknown): JsonRecord | null {
  const candidate = Array.isArray(value) && value.length === 1 ? value[0] : value
  return isRecord(candidate) ? candidate : null
}

function boundedString(value: unknown, maximum: number, allowEmpty = false) {
  if (typeof value !== 'string' || value.length > maximum || CONTROL_CHARACTER_PATTERN.test(value)) return null
  if (!allowEmpty && value.trim() === '') return null
  return value
}

function boundedCellString(value: unknown, maximum: number, allowEmpty = false) {
  if (typeof value !== 'string' || value.length > maximum || UNSAFE_CELL_CONTROL_PATTERN.test(value)) return null
  if (!allowEmpty && value.trim() === '') return null
  return value
}

function nullableBoundedString(value: unknown, maximum: number) {
  if (value === null) return null
  return boundedString(value, maximum)
}

function integerValue(value: unknown, maximum = Number.MAX_SAFE_INTEGER) {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= maximum
    ? value
    : null
}

function positiveIntegerValue(value: unknown, maximum = Number.MAX_SAFE_INTEGER) {
  const parsed = integerValue(value, maximum)
  return parsed !== null && parsed > 0 ? parsed : null
}

function timestampValue(value: unknown) {
  if (typeof value !== 'string') return null
  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null
}

function nullableTimestampValue(value: unknown) {
  return value === null ? null : timestampValue(value)
}

function uuidValue(value: unknown) {
  return typeof value === 'string' && UUID_PATTERN.test(value) ? value.toLowerCase() : null
}

function entityTypeValue(value: unknown): LocalisationImportEntityType | null {
  return typeof value === 'string' && entityTypeSet.has(value)
    ? value as LocalisationImportEntityType
    : null
}

function fileTypeValue(value: unknown): LocalisationImportFileType | null {
  return typeof value === 'string' && fileTypeSet.has(value)
    ? value as LocalisationImportFileType
    : null
}

function batchStatusValue(value: unknown): LocalisationImportBatchStatus | null {
  return typeof value === 'string' && batchStatusSet.has(value)
    ? value as LocalisationImportBatchStatus
    : null
}

function rowStatusValue(value: unknown): LocalisationImportRowStatus | null {
  return typeof value === 'string' && rowStatusSet.has(value)
    ? value as LocalisationImportRowStatus
    : null
}

function duplicateKindValue(value: unknown): LocalisationImportDuplicateKind | null | undefined {
  if (value === null) return null
  return typeof value === 'string' && duplicateKindSet.has(value)
    ? value as LocalisationImportDuplicateKind
    : undefined
}

function readColumnMapping(value: unknown, requireName = false): FieldMapping | null {
  if (!isRecord(value)) return null
  const keys = Object.keys(value)
  if (keys.some((key) => !canonicalFields.includes(key as typeof canonicalFields[number]))) return null

  const output = {} as FieldMapping
  for (const field of canonicalFields) {
    const header = value[field]
    if (header !== null && header !== undefined) {
      const parsed = boundedString(header, MAX_MAPPING_VALUE_LENGTH)
      if (parsed === null) return null
      output[field] = parsed
    } else {
      output[field] = null
    }
  }

  return !requireName || output.name ? output : null
}

function readJsonValue(value: unknown, depth = 0): LocalisationImportJson | undefined {
  if (value === null || typeof value === 'boolean') return value
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined
  if (typeof value === 'string') return boundedCellString(value, MAX_RAW_TEXT_LENGTH, true) ?? undefined
  if (depth >= MAX_JSON_DEPTH) return undefined

  if (Array.isArray(value)) {
    if (value.length > MAX_JSON_ARRAY_ITEMS) return undefined
    const items = value.map((item) => readJsonValue(item, depth + 1))
    return items.some((item) => item === undefined) ? undefined : items as LocalisationImportJson[]
  }

  if (!isRecord(value)) return undefined
  const keys = Object.keys(value)
  if (
    keys.length > MAX_JSON_KEYS
    || keys.some((key) => (
      key.length > MAX_HEADER_LENGTH || CONTROL_CHARACTER_PATTERN.test(key) || rejectedJsonKeys.has(key)
    ))
  ) return undefined

  const output = Object.create(null) as Record<string, LocalisationImportJson>
  for (const key of keys) {
    const parsed = readJsonValue(value[key], depth + 1)
    if (parsed === undefined) return undefined
    output[key] = parsed
  }
  return output
}

function readJsonRecord(value: unknown): Record<string, LocalisationImportJson> | null {
  const parsed = readJsonValue(value)
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
    ? parsed as Record<string, LocalisationImportJson>
    : null
}

function jsonByteLength(value: unknown) {
  try {
    return new TextEncoder().encode(JSON.stringify(value)).byteLength
  } catch {
    return null
  }
}

function optionalText(value: unknown, maximum = MAX_TEXT_LENGTH) {
  return value === null ? null : boundedCellString(value, maximum)
}

function coordinateValue(value: unknown, minimum: number, maximum: number) {
  if (value === null) return null
  return typeof value === 'number' && Number.isFinite(value) && value >= minimum && value <= maximum
    ? value
    : undefined
}

function readNormalizedData(value: unknown): LocalisationImportNormalizedData | null {
  if (!isRecord(value)) return null
  const entityType = entityTypeValue(value.entity_type)
  const name = boundedCellString(value.name, 240)
  const nameFr = optionalText(value.name_fr, 240)
  const nameAr = optionalText(value.name_ar, 240)
  const nameEn = optionalText(value.name_en, 240)
  const category = optionalText(value.category, 160)
  const address = optionalText(value.address, 500)
  const wilaya = optionalText(value.wilaya, 160)
  const phone = optionalText(value.phone, 64)
  const openingStatus = optionalText(value.opening_status, 160)
  const sourceUrl = optionalText(value.source_url, MAX_RAW_TEXT_LENGTH)
  const latitude = coordinateValue(value.latitude, -90, 90)
  const longitude = coordinateValue(value.longitude, -180, 180)

  if (!Array.isArray(value.amenities) || value.amenities.length > MAX_JSON_ARRAY_ITEMS) return null
  const amenities = value.amenities.map((item) => boundedCellString(item, 160))
  if (
    !entityType || !name || nameFr === null && value.name_fr !== null
    || nameAr === null && value.name_ar !== null
    || nameEn === null && value.name_en !== null
    || category === null && value.category !== null
    || address === null && value.address !== null
    || wilaya === null && value.wilaya !== null
    || phone === null && value.phone !== null
    || openingStatus === null && value.opening_status !== null
    || sourceUrl === null && value.source_url !== null
    || latitude === undefined || longitude === undefined
    || (latitude === null) !== (longitude === null)
    || amenities.some((item) => item === null)
  ) return null

  return {
    entityType,
    name,
    nameFr,
    nameAr,
    nameEn,
    category,
    address,
    wilaya,
    phone,
    openingStatus,
    amenities: amenities as string[],
    sourceUrl,
    latitude,
    longitude,
  }
}

function normalizedDataPayload(value: unknown) {
  const parsed = readNormalizedData(value)
  return parsed ? {
    entity_type: parsed.entityType,
    name: parsed.name,
    name_fr: parsed.nameFr,
    name_ar: parsed.nameAr,
    name_en: parsed.nameEn,
    category: parsed.category,
    address: parsed.address,
    wilaya: parsed.wilaya,
    phone: parsed.phone,
    opening_status: parsed.openingStatus,
    amenities: [...parsed.amenities],
    source_url: parsed.sourceUrl,
    latitude: parsed.latitude,
    longitude: parsed.longitude,
  } : null
}

function readBatch(value: unknown): LocalisationImportBatch | null {
  const source = singleRecord(value)
  if (!source) return null

  const id = uuidValue(source.id)
  const fileName = boundedString(source.file_name, MAX_FILE_NAME_LENGTH)
  const fileType = fileTypeValue(source.file_type)
  const sheetName = nullableBoundedString(source.sheet_name, MAX_SHEET_NAME_LENGTH)
  const entityType = entityTypeValue(source.entity_type)
  const columnMapping = readColumnMapping(source.column_mapping)
  const status = batchStatusValue(source.status)
  const totalRows = integerValue(source.total_rows, LOCALISATION_IMPORT_MAX_ROWS)
  const stagedRows = integerValue(source.staged_rows, LOCALISATION_IMPORT_MAX_ROWS)
  const validRows = integerValue(source.valid_rows, LOCALISATION_IMPORT_MAX_ROWS)
  const invalidRows = integerValue(source.invalid_rows, LOCALISATION_IMPORT_MAX_ROWS)
  const duplicateRows = integerValue(source.duplicate_rows, LOCALISATION_IMPORT_MAX_ROWS)
  const appliedRows = integerValue(source.applied_rows, LOCALISATION_IMPORT_MAX_ROWS)
  const createdAt = timestampValue(source.created_at)
  const validatedAt = nullableTimestampValue(source.validated_at)
  const completedAt = nullableTimestampValue(source.completed_at)

  if (
    !id || !fileName || !fileType || sheetName === null && source.sheet_name !== null
    || !entityType || !columnMapping || !status || totalRows === null || stagedRows === null
    || validRows === null || invalidRows === null || duplicateRows === null || appliedRows === null
    || !createdAt || validatedAt === null && source.validated_at !== null
    || completedAt === null && source.completed_at !== null
    || stagedRows > totalRows || validRows + invalidRows > totalRows
    || duplicateRows > totalRows || appliedRows > totalRows
  ) return null

  return {
    id,
    fileName,
    fileType,
    sheetName,
    entityType,
    columnMapping,
    status,
    totalRows,
    stagedRows,
    validRows,
    invalidRows,
    duplicateRows,
    appliedRows,
    createdAt,
    validatedAt,
    completedAt,
  }
}

function readStageResult(value: unknown): LocalisationImportStageResult | null {
  const source = singleRecord(value)
  if (!source) return null
  const batchId = uuidValue(source.batch_id)
  const status = batchStatusValue(source.status)
  const stagedRows = integerValue(source.staged_rows, LOCALISATION_IMPORT_MAX_ROWS)
  const totalRows = integerValue(source.total_rows, LOCALISATION_IMPORT_MAX_ROWS)
  return batchId && status && stagedRows !== null && totalRows !== null && stagedRows <= totalRows
    ? { batchId, status, stagedRows, totalRows }
    : null
}

function readValidationResult(value: unknown): LocalisationImportValidationResult | null {
  const source = singleRecord(value)
  if (!source) return null
  const batchId = uuidValue(source.batch_id)
  const status = source.status === 'validated' || source.status === 'invalid' ? source.status : null
  const totalRows = integerValue(source.total_rows, LOCALISATION_IMPORT_MAX_ROWS)
  const validRows = integerValue(source.valid_rows, LOCALISATION_IMPORT_MAX_ROWS)
  const invalidRows = integerValue(source.invalid_rows, LOCALISATION_IMPORT_MAX_ROWS)
  const duplicateRows = integerValue(source.duplicate_rows, LOCALISATION_IMPORT_MAX_ROWS)
  const validatedAt = timestampValue(source.validated_at)
  return batchId && status && totalRows !== null && validRows !== null && invalidRows !== null
    && duplicateRows !== null && validRows + invalidRows <= totalRows && duplicateRows <= totalRows && validatedAt
    ? { batchId, status, totalRows, validRows, invalidRows, duplicateRows, validatedAt }
    : null
}

function readApplyResult(value: unknown): LocalisationImportApplyResult | null {
  const source = singleRecord(value)
  if (!source) return null
  const batchId = uuidValue(source.batch_id)
  const insertedRows = integerValue(source.inserted_rows, LOCALISATION_IMPORT_MAX_ROWS)
  const updatedRows = integerValue(source.updated_rows, LOCALISATION_IMPORT_MAX_ROWS)
  const skippedRows = integerValue(source.skipped_rows, LOCALISATION_IMPORT_MAX_ROWS)
  const completedAt = timestampValue(source.completed_at)
  return batchId && source.status === 'applied' && insertedRows !== null && updatedRows !== null
    && skippedRows !== null && completedAt && typeof source.already_applied === 'boolean'
    ? {
        batchId,
        status: 'applied',
        insertedRows,
        updatedRows,
        skippedRows,
        completedAt,
        alreadyApplied: source.already_applied,
      }
    : null
}

function readValidationError(value: unknown): LocalisationImportValidationError | null {
  if (!isRecord(value)) return null
  const code = boundedString(value.code, 80)
  const field = boundedString(value.field, 120)
  const message = boundedString(value.message, 500)
  return code && field && message ? { code, field, message } : null
}

function readImportRow(value: unknown): LocalisationImportRow | null {
  if (!isRecord(value) || !Array.isArray(value.validation_errors)) return null
  const id = uuidValue(value.id)
  const rowNumber = positiveIntegerValue(value.row_number, MAX_SPREADSHEET_ROW_NUMBER)
  const sheetName = nullableBoundedString(value.sheet_name, MAX_SHEET_NAME_LENGTH)
  const status = rowStatusValue(value.status)
  const validationErrors = value.validation_errors.map(readValidationError)
  const duplicateKind = duplicateKindValue(value.duplicate_kind)
  const matchedPlaceId = value.matched_place_id === null ? null : uuidValue(value.matched_place_id)
  const normalizedData = readNormalizedData(value.normalized_data)
  const rawData = readJsonRecord(value.raw_data)
  const createdAt = timestampValue(value.created_at)
  const validatedAt = nullableTimestampValue(value.validated_at)

  if (
    !id || rowNumber === null || sheetName === null && value.sheet_name !== null || !status
    || validationErrors.some((error) => error === null) || duplicateKind === undefined
    || matchedPlaceId === null && value.matched_place_id !== null
    || status !== 'invalid' && (!normalizedData || !rawData)
    || !createdAt || validatedAt === null && value.validated_at !== null
  ) return null

  return {
    id,
    rowNumber,
    sheetName,
    status,
    validationErrors: validationErrors as LocalisationImportValidationError[],
    duplicateKind,
    matchedPlaceId,
    // Invalid rows can intentionally contain data that failed the strict typed
    // projection. Keep their server-authored errors/history readable without
    // exposing an unbounded or malformed payload to the UI.
    normalizedData: normalizedData ?? null,
    rawData: rawData ?? {},
    createdAt,
    validatedAt,
  }
}

function readPage<T>(value: unknown, readItem: (item: unknown) => T | null): PaginatedResult<T> | null {
  if (!isRecord(value) || !Array.isArray(value.items)) return null
  const page = positiveIntegerValue(value.page, 100_000)
  const pageSize = positiveIntegerValue(value.page_size, 100)
  const totalCount = integerValue(value.total_count)
  const items = value.items.map(readItem)
  if (
    page === null || pageSize === null || !allowedPageSizes.has(pageSize) || totalCount === null || items.length > pageSize
    || items.length > totalCount || items.some((item) => item === null)
  ) return null
  return paginatedResult(items as T[], totalCount, { page, pageSize })
}

function readBatchDetails(value: unknown): LocalisationImportBatchDetails | null {
  if (!isRecord(value)) return null
  const batch = readBatch(value.batch)
  const page = readPage(value, readImportRow)
  if (!batch || !page) return null
  const { data: rows, ...pagination } = page
  return { batch, rows, ...pagination }
}

function readPurgeResult(value: unknown): LocalisationImportPurgeResult | null {
  const source = singleRecord(value)
  if (!source) return null
  const purgedRows = integerValue(source.purged_rows)
  const affectedBatches = integerValue(source.affected_batches)
  const cutoff = timestampValue(source.cutoff)
  return purgedRows !== null && affectedBatches !== null && cutoff
    ? { purgedRows, affectedBatches, cutoff }
    : null
}

function errorFailure(error: unknown): LocalisationImportFailure {
  if (!isRecord(error)) return 'unavailable'
  const code = typeof error.code === 'string' ? error.code : ''
  const status = integerValue(error.status, 599)
  const message = typeof error.message === 'string' ? error.message.toLowerCase() : ''

  if (
    ['PGRST202', 'PGRST205', '42883', '42P01'].includes(code)
    || message.includes('could not find the function')
    || message.includes('schema cache')
    || message.includes('relation') && message.includes('does not exist')
  ) return 'not-connected'

  if (
    code === '42501' || code === 'PGRST301' || status === 401 || status === 403
    || message.includes('active super admin account is required')
    || message.includes('permission denied')
  ) return 'access-denied'

  return 'unavailable'
}

async function rpcResult<T>(
  rpcName: string,
  parameters: Record<string, unknown>,
  decoder: (value: unknown) => T | null,
): Promise<LocalisationImportResult<T>> {
  try {
    const { data, error } = await supabase.rpc(rpcName, parameters)
    if (error) return { data: null, error: errorFailure(error) }
    const parsed = decoder(data)
    return parsed === null ? { data: null, error: 'unavailable' } : { data: parsed, error: null }
  } catch {
    return { data: null, error: 'unavailable' }
  }
}

function safeCreateInput(input: CreateLocalisationImportBatchInput) {
  const fileName = boundedString(input.fileName?.trim(), MAX_FILE_NAME_LENGTH)
  const fileType = fileTypeValue(input.fileType)
  const sheetName = input.sheetName === null || input.sheetName === undefined
    ? null
    : boundedString(input.sheetName.trim(), MAX_SHEET_NAME_LENGTH)
  const entityType = entityTypeValue(input.entityType)
  const columnMapping = readColumnMapping(input.columnMapping, true)
  const totalRows = integerValue(input.totalRows, LOCALISATION_IMPORT_MAX_ROWS)
  const mappingBytes = jsonByteLength(columnMapping)
  if (
    !fileName || PATH_SEPARATOR_PATTERN.test(fileName) || !fileType
    || input.sheetName != null && !sheetName || !entityType || !columnMapping || totalRows === null
    || mappingBytes === null || mappingBytes > MAX_COLUMN_MAPPING_BYTES
  ) return null
  return { fileName, fileType, sheetName, entityType, columnMapping, totalRows }
}

function safeStageRows(rows: readonly StagedLocalisationRow[]) {
  if (!Array.isArray(rows) || rows.length === 0 || rows.length > LOCALISATION_IMPORT_CHUNK_SIZE) return null
  const rowNumbers = new Set<number>()
  const payload: Array<Record<string, unknown>> = []

  for (const candidate of rows as readonly unknown[]) {
    if (!isRecord(candidate)) return null
    const rowNumber = positiveIntegerValue(candidate.row_number, MAX_SPREADSHEET_ROW_NUMBER)
    const rawData = readJsonRecord(candidate.raw_data)
    const normalizedData = normalizedDataPayload(candidate.normalized_data)
    const rawDataBytes = jsonByteLength(rawData)
    const normalizedDataBytes = jsonByteLength(normalizedData)
    if (
      rowNumber === null || rowNumbers.has(rowNumber) || !rawData || !normalizedData
      || rawDataBytes === null || rawDataBytes > MAX_RAW_DATA_BYTES
      || normalizedDataBytes === null || normalizedDataBytes > MAX_NORMALIZED_DATA_BYTES
    ) return null
    rowNumbers.add(rowNumber)
    payload.push({ row_number: rowNumber, raw_data: rawData, normalized_data: normalizedData })
  }

  try {
    const payloadBytes = jsonByteLength(payload)
    return payloadBytes !== null && payloadBytes <= MAX_STAGE_PAYLOAD_BYTES ? payload : null
  } catch {
    return null
  }
}

function importPagination(pagination: PaginationParams, defaultPageSize: 20 | 50) {
  const resolved = resolvePagination({ ...pagination, pageSize: pagination.pageSize ?? defaultPageSize })
  return {
    page: Math.min(MAX_PAGE, resolved.page),
    pageSize: allowedPageSizes.has(resolved.pageSize) ? resolved.pageSize : defaultPageSize,
  }
}

export async function createLocalisationImportBatch(
  input: CreateLocalisationImportBatchInput,
): Promise<LocalisationImportResult<LocalisationImportBatch>> {
  const safe = safeCreateInput(input)
  if (!safe) return { data: null, error: 'unavailable' }
  return rpcResult('super_admin_create_localisation_import_batch', {
    p_file_name: safe.fileName,
    p_file_type: safe.fileType,
    p_sheet_name: safe.sheetName,
    p_entity_type: safe.entityType,
    p_column_mapping: safe.columnMapping,
    p_total_rows: safe.totalRows,
  }, readBatch)
}

export async function stageLocalisationImportRows(
  batchId: string,
  rows: readonly StagedLocalisationRow[],
): Promise<LocalisationImportResult<LocalisationImportStageResult>> {
  const safeBatchId = uuidValue(batchId)
  const safeRows = safeStageRows(rows)
  if (!safeBatchId || !safeRows) return { data: null, error: 'unavailable' }
  return rpcResult('super_admin_stage_localisation_import_rows', {
    p_batch_id: safeBatchId,
    p_rows: safeRows,
  }, readStageResult)
}

export async function validateLocalisationImportBatch(
  batchId: string,
): Promise<LocalisationImportResult<LocalisationImportValidationResult>> {
  const safeBatchId = uuidValue(batchId)
  return safeBatchId
    ? rpcResult('super_admin_validate_localisation_import_batch', { p_batch_id: safeBatchId }, readValidationResult)
    : { data: null, error: 'unavailable' }
}

export async function applyLocalisationImportBatch(
  batchId: string,
): Promise<LocalisationImportResult<LocalisationImportApplyResult>> {
  const safeBatchId = uuidValue(batchId)
  return safeBatchId
    ? rpcResult('super_admin_apply_localisation_import_batch', { p_batch_id: safeBatchId }, readApplyResult)
    : { data: null, error: 'unavailable' }
}

export async function listLocalisationImportBatches(
  pagination: PaginationParams = {},
): Promise<LocalisationImportResult<PaginatedResult<LocalisationImportBatch>>> {
  const { page, pageSize } = importPagination(pagination, 20)
  return rpcResult('super_admin_get_localisation_import_batches', {
    p_page: page,
    p_page_size: pageSize,
  }, (value) => readPage(value, readBatch))
}

export async function getLocalisationImportBatchDetails(
  batchId: string,
  pagination: PaginationParams = {},
): Promise<LocalisationImportResult<LocalisationImportBatchDetails>> {
  const safeBatchId = uuidValue(batchId)
  if (!safeBatchId) return { data: null, error: 'unavailable' }
  const { page, pageSize } = importPagination(pagination, 50)
  return rpcResult('super_admin_get_localisation_import_batch_details', {
    p_batch_id: safeBatchId,
    p_page: page,
    p_page_size: pageSize,
  }, readBatchDetails)
}

/** Purges expired staging rows only. It never removes applied/final localisation records. */
export async function purgeLocalisationImportRows(
  olderThanDays = 30,
): Promise<LocalisationImportResult<LocalisationImportPurgeResult>> {
  const safeDays = positiveIntegerValue(olderThanDays, MAX_PURGE_DAYS)
  return safeDays === null
    ? { data: null, error: 'unavailable' }
    : rpcResult('super_admin_purge_localisation_import_rows', { p_older_than_days: safeDays }, readPurgeResult)
}
