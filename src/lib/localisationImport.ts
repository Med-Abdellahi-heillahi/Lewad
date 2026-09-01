export const MAX_LOCALISATION_FILE_BYTES = 5 * 1024 * 1024
export const MAX_LOCALISATION_ROWS = 10_000
export const MAX_LOCALISATION_COLUMNS = 32
export const MAX_LOCALISATION_CELL_LENGTH = 4_096
export const LOCALISATION_STAGE_CHUNK_SIZE = 250

// CSV input is already byte-bounded, but a small file can still contain millions
// of empty physical records. Keep a generous allowance for ordinary blank lines
// while stopping record-count attacks before they can consume unbounded memory.
const MAX_CSV_PHYSICAL_RECORDS = MAX_LOCALISATION_ROWS * 4 + 1
const MAX_XLSX_ARCHIVE_ENTRIES = 2_048
const MAX_XLSX_ENTRY_UNCOMPRESSED_BYTES = 32 * 1024 * 1024
const MAX_XLSX_TOTAL_UNCOMPRESSED_BYTES = 64 * 1024 * 1024

export const LOCALISATION_IMPORT_LIMITS = {
  fileBytes: MAX_LOCALISATION_FILE_BYTES,
  rows: MAX_LOCALISATION_ROWS,
  columns: MAX_LOCALISATION_COLUMNS,
  cellLength: MAX_LOCALISATION_CELL_LENGTH,
  chunkSize: LOCALISATION_STAGE_CHUNK_SIZE,
} as const

export const CANONICAL_LOCALISATION_FIELDS = [
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

export type CanonicalField = (typeof CANONICAL_LOCALISATION_FIELDS)[number]
export type LocalisationEntityType =
  | 'establishment'
  | 'wilaya'
  | 'moughataa'
  | 'commune'
  | 'locality'
export type LocalisationFileType = 'xlsx' | 'csv'
export type ParsedCellValue = string | number | boolean | null
export type FieldMapping = Record<CanonicalField, string | null>

export type ParsedLocalisationRow = {
  rowNumber: number
  values: Record<string, ParsedCellValue>
  formulaColumns: string[]
  rejectedFormulaColumns: string[]
}

export type ParsedLocalisationSheet = {
  name: string
  headers: string[]
  rows: ParsedLocalisationRow[]
  formulaCellCount: number
  rejectedFormulaCellCount: number
}

export type ParsedLocalisationWorkbook = {
  fileName: string
  fileType: LocalisationFileType
  sheets: ParsedLocalisationSheet[]
  totalRows: number
}

// Short aliases keep the page/API imports readable.
export type ParsedRow = ParsedLocalisationRow
export type ParsedSheet = ParsedLocalisationSheet
export type ParsedWorkbook = ParsedLocalisationWorkbook

export type LocalisationImportFile = {
  name: string
  size: number
  arrayBuffer: () => Promise<ArrayBuffer>
}

export type MappingValidation = {
  valid: boolean
  errors: string[]
  warnings: string[]
  missingRequiredFields: CanonicalField[]
  duplicateSourceHeaders: string[]
}

export type NormalizedLocalisationData = {
  entity_type: LocalisationEntityType
  name: string
  name_fr: string | null
  name_ar: string | null
  name_en: string | null
  category: string | null
  address: string | null
  wilaya: string | null
  phone: string | null
  opening_status: string | null
  amenities: string[]
  source_url: string | null
  latitude: number | null
  longitude: number | null
}

export type StagedLocalisationRow = {
  row_number: number
  raw_data: Partial<Record<CanonicalField, ParsedCellValue>>
  normalized_data: NormalizedLocalisationData
}

export type RowValidationError = {
  row_number: number
  field: CanonicalField | 'coordinates' | null
  code:
    | 'missing_required_value'
    | 'invalid_coordinate'
    | 'invalid_source_url'
    | 'formula_without_cached_scalar'
    | 'too_long'
    | 'invalid_phone'
    | 'too_many_items'
    | 'invalid_item'
    | 'coordinate_pair_required'
    | 'formula_like_value'
  message: string
}

export type NormalizationResult = {
  rows: StagedLocalisationRow[]
  errors: RowValidationError[]
}

export type LocalisationImportErrorCode =
  | 'empty_file'
  | 'file_too_large'
  | 'unsupported_file_type'
  | 'legacy_xls_not_supported'
  | 'malformed_csv'
  | 'too_many_rows'
  | 'too_many_columns'
  | 'cell_too_long'
  | 'workbook_has_no_data'
  | 'malformed_xlsx_archive'
  | 'xlsx_archive_too_large'
  | 'xlsx_zip64_not_supported'

export class LocalisationImportError extends Error {
  readonly code: LocalisationImportErrorCode

  constructor(code: LocalisationImportErrorCode, message: string) {
    super(message)
    this.name = 'LocalisationImportError'
    this.code = code
  }
}

const emptyMapping = (): FieldMapping => ({
  name: null,
  name_fr: null,
  name_ar: null,
  name_en: null,
  category: null,
  address: null,
  wilaya: null,
  phone: null,
  opening_status: null,
  amenities: null,
  source_url: null,
  latitude: null,
  longitude: null,
})

export function createEmptyFieldMapping(): FieldMapping {
  return emptyMapping()
}

function importError(code: LocalisationImportErrorCode, message: string): never {
  throw new LocalisationImportError(code, message)
}

function sanitizeString(value: string, context: string): string {
  // Keep proper names, accents, Arabic script, punctuation, and embedded line breaks
  // verbatim. Only non-printing control bytes are removed; React will render the
  // result as text, not HTML.
  const sanitized = value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim()

  if (sanitized.length > MAX_LOCALISATION_CELL_LENGTH) {
    importError(
      'cell_too_long',
      `${context} exceeds the ${MAX_LOCALISATION_CELL_LENGTH}-character cell limit.`,
    )
  }

  return sanitized
}

export function sanitizeCellValue(
  value: string | number | boolean | Date | null | undefined,
  context = 'Cell',
): ParsedCellValue {
  if (value === null || value === undefined) return null
  if (typeof value === 'string') {
    const sanitized = sanitizeString(value, context)
    return sanitized || null
  }
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value === 'boolean') return value
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString()
  return null
}

type ExtractedCell = {
  value: ParsedCellValue
  formula: boolean
  rejectedFormula: boolean
}

function scalarFromUnknown(value: unknown, context: string): ParsedCellValue {
  if (
    value === null
    || value === undefined
    || typeof value === 'string'
    || typeof value === 'number'
    || typeof value === 'boolean'
    || value instanceof Date
  ) {
    return sanitizeCellValue(value, context)
  }
  return null
}

function hasValue(value: ParsedCellValue): boolean {
  return value !== null && value !== ''
}

function dedupeHeaderBase(raw: ParsedCellValue, columnNumber: number): string {
  const asText = raw === null ? '' : String(raw)
  return sanitizeString(asText, `Header column ${columnNumber}`) || `Column ${columnNumber}`
}

export function deduplicateHeaders(values: readonly ParsedCellValue[]): string[] {
  const seen = new Map<string, number>()
  return values.map((value, index) => {
    const base = dedupeHeaderBase(value, index + 1)
    const key = base.toLocaleLowerCase()
    const occurrence = (seen.get(key) ?? 0) + 1
    seen.set(key, occurrence)
    if (occurrence === 1) return base

    const suffix = ` (${occurrence})`
    return `${base.slice(0, MAX_LOCALISATION_CELL_LENGTH - suffix.length)}${suffix}`
  })
}

function buildParsedSheet(
  sheetName: string,
  rawRows: Array<{
    rowNumber: number
    cells: ExtractedCell[]
  }>,
): ParsedLocalisationSheet | null {
  const firstNonEmptyIndex = rawRows.findIndex((row) => row.cells.some((cell) => hasValue(cell.value)))
  if (firstNonEmptyIndex < 0) return null

  const relevantRows = rawRows.slice(firstNonEmptyIndex)
  const highestColumn = relevantRows.reduce((highest, row) => {
    for (let index = row.cells.length - 1; index >= 0; index -= 1) {
      const cell = row.cells[index]
      if (hasValue(cell?.value) || cell?.formula) return Math.max(highest, index + 1)
    }
    return highest
  }, 0)

  if (highestColumn > MAX_LOCALISATION_COLUMNS) {
    importError(
      'too_many_columns',
      `Sheet "${sheetName}" exceeds the ${MAX_LOCALISATION_COLUMNS}-column limit.`,
    )
  }

  const headerRow = relevantRows[0]
  const headers = deduplicateHeaders(
    Array.from({ length: highestColumn }, (_, index) => headerRow.cells[index]?.value ?? null),
  )
  const rows: ParsedLocalisationRow[] = []
  let formulaCellCount = 0
  let rejectedFormulaCellCount = 0

  relevantRows.slice(1).forEach((rawRow) => {
    const cells = Array.from(
      { length: highestColumn },
      (_, index) => rawRow.cells[index] ?? { value: null, formula: false, rejectedFormula: false },
    )
    if (!cells.some((cell) => hasValue(cell.value) || cell.formula)) return

    const values: Record<string, ParsedCellValue> = {}
    const formulaColumns: string[] = []
    const rejectedFormulaColumns: string[] = []
    headers.forEach((header, index) => {
      const cell = cells[index]
      values[header] = cell.value
      if (cell.formula) {
        formulaColumns.push(header)
        formulaCellCount += 1
      }
      if (cell.rejectedFormula) {
        rejectedFormulaColumns.push(header)
        rejectedFormulaCellCount += 1
      }
    })
    rows.push({ rowNumber: rawRow.rowNumber, values, formulaColumns, rejectedFormulaColumns })
  })

  return {
    name: sanitizeString(sheetName, 'Sheet name') || 'Sheet',
    headers,
    rows,
    formulaCellCount,
    rejectedFormulaCellCount,
  }
}

function assertTotalRows(sheets: readonly ParsedLocalisationSheet[]): number {
  const totalRows = sheets.reduce((sum, sheet) => sum + sheet.rows.length, 0)
  if (totalRows > MAX_LOCALISATION_ROWS) {
    importError('too_many_rows', `The workbook exceeds the ${MAX_LOCALISATION_ROWS}-row limit.`)
  }
  return totalRows
}

type CsvState = 'unquoted' | 'quoted' | 'after_quote'

type CsvRecord = {
  rowNumber: number
  cells: string[]
}

function readCsvRecords(text: string): CsvRecord[] {
  const source = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text
  const records: CsvRecord[] = []
  let record: string[] = []
  let field = ''
  let state: CsvState = 'unquoted'
  let physicalRecordCount = 0

  const finishField = () => {
    if (record.length >= MAX_LOCALISATION_COLUMNS) {
      importError('too_many_columns', `CSV exceeds the ${MAX_LOCALISATION_COLUMNS}-column limit.`)
    }
    record.push(field)
    field = ''
  }
  const finishRecord = () => {
    finishField()
    physicalRecordCount += 1
    if (physicalRecordCount > MAX_CSV_PHYSICAL_RECORDS) {
      importError(
        'too_many_rows',
        `CSV exceeds the ${MAX_CSV_PHYSICAL_RECORDS}-physical-record safety limit.`,
      )
    }

    // Empty physical rows still count toward the safety cap and source row
    // numbering, but do not need their own retained arrays.
    if (record.some((value) => value.trim().length > 0)) {
      records.push({ rowNumber: physicalRecordCount, cells: record })
      // One retained record is the header; the rest are bounded data rows.
      if (records.length > MAX_LOCALISATION_ROWS + 1) {
        importError('too_many_rows', `CSV exceeds the ${MAX_LOCALISATION_ROWS}-row limit.`)
      }
    }
    record = []
  }
  const append = (character: string) => {
    field += character
    if (field.length > MAX_LOCALISATION_CELL_LENGTH) {
      importError(
        'cell_too_long',
        `CSV cell exceeds the ${MAX_LOCALISATION_CELL_LENGTH}-character limit.`,
      )
    }
  }

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index]

    if (state === 'quoted') {
      if (character === '"') {
        if (source[index + 1] === '"') {
          append('"')
          index += 1
        } else {
          state = 'after_quote'
        }
      } else {
        append(character)
      }
      continue
    }

    if (state === 'after_quote') {
      if (character === ',') {
        finishField()
        state = 'unquoted'
      } else if (character === '\r' || character === '\n') {
        if (character === '\r' && source[index + 1] === '\n') index += 1
        finishRecord()
        state = 'unquoted'
      } else {
        importError('malformed_csv', 'CSV has characters after a closing quote.')
      }
      continue
    }

    if (character === '"') {
      if (field.length > 0) importError('malformed_csv', 'CSV has a quote inside an unquoted field.')
      state = 'quoted'
    } else if (character === ',') {
      finishField()
    } else if (character === '\r' || character === '\n') {
      if (character === '\r' && source[index + 1] === '\n') index += 1
      finishRecord()
    } else {
      append(character)
    }
  }

  if (state === 'quoted') importError('malformed_csv', 'CSV has an unterminated quoted field.')
  if (field.length > 0 || record.length > 0 || source.endsWith(',')) finishRecord()
  return records
}

export function parseCsvText(text: string, sheetName = 'CSV'): ParsedLocalisationSheet {
  const rawRows = readCsvRecords(text).map(({ cells, rowNumber }) => ({
    rowNumber,
    cells: cells.map((value, columnIndex) => ({
      value: sanitizeCellValue(value, `CSV row ${rowNumber}, column ${columnIndex + 1}`),
      formula: false,
      rejectedFormula: false,
    })),
  }))
  const sheet = buildParsedSheet(sheetName, rawRows)
  if (!sheet) importError('workbook_has_no_data', 'The CSV file has no header or data.')
  assertTotalRows([sheet])
  return sheet
}

const ZIP_LOCAL_FILE_HEADER_SIGNATURE = 0x04034b50
const ZIP_CENTRAL_DIRECTORY_SIGNATURE = 0x02014b50
const ZIP_END_OF_CENTRAL_DIRECTORY_SIGNATURE = 0x06054b50
const ZIP64_END_OF_CENTRAL_DIRECTORY_LOCATOR_SIGNATURE = 0x07064b50
const ZIP64_EXTRA_FIELD_ID = 0x0001

function malformedXlsx(message: string): never {
  importError('malformed_xlsx_archive', message)
}

function findZipEndOfCentralDirectory(view: DataView): number {
  const minimumOffset = Math.max(0, view.byteLength - 22 - 0xffff)
  for (let offset = view.byteLength - 22; offset >= minimumOffset; offset -= 1) {
    if (view.getUint32(offset, true) !== ZIP_END_OF_CENTRAL_DIRECTORY_SIGNATURE) continue
    const commentLength = view.getUint16(offset + 20, true)
    if (offset + 22 + commentLength === view.byteLength) return offset
  }
  return malformedXlsx('The XLSX ZIP central directory is missing or malformed.')
}

function hasZip64ExtraField(view: DataView, offset: number, length: number): boolean {
  const end = offset + length
  let cursor = offset
  while (cursor < end) {
    if (cursor + 4 > end) malformedXlsx('The XLSX ZIP extra fields are malformed.')
    const fieldId = view.getUint16(cursor, true)
    const fieldLength = view.getUint16(cursor + 2, true)
    cursor += 4
    if (cursor + fieldLength > end) malformedXlsx('The XLSX ZIP extra fields are malformed.')
    if (fieldId === ZIP64_EXTRA_FIELD_ID) return true
    cursor += fieldLength
  }
  return false
}

function assertSafeXlsxArchive(bytes: Uint8Array): void {
  if (bytes.byteLength < 22) malformedXlsx('The XLSX ZIP archive is truncated.')
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const endOffset = findZipEndOfCentralDirectory(view)

  if (
    endOffset >= 20
    && view.getUint32(endOffset - 20, true) === ZIP64_END_OF_CENTRAL_DIRECTORY_LOCATOR_SIGNATURE
  ) {
    importError('xlsx_zip64_not_supported', 'ZIP64 XLSX workbooks are not supported.')
  }

  const diskNumber = view.getUint16(endOffset + 4, true)
  const centralDirectoryDisk = view.getUint16(endOffset + 6, true)
  const entriesOnDisk = view.getUint16(endOffset + 8, true)
  const totalEntries = view.getUint16(endOffset + 10, true)
  const centralDirectorySize = view.getUint32(endOffset + 12, true)
  const centralDirectoryOffset = view.getUint32(endOffset + 16, true)

  if (
    entriesOnDisk === 0xffff
    || totalEntries === 0xffff
    || centralDirectorySize === 0xffffffff
    || centralDirectoryOffset === 0xffffffff
  ) {
    importError('xlsx_zip64_not_supported', 'ZIP64 XLSX workbooks are not supported.')
  }
  if (diskNumber !== 0 || centralDirectoryDisk !== 0 || entriesOnDisk !== totalEntries) {
    malformedXlsx('Multi-disk XLSX ZIP archives are not supported.')
  }
  if (totalEntries === 0) malformedXlsx('The XLSX ZIP archive contains no entries.')
  if (totalEntries > MAX_XLSX_ARCHIVE_ENTRIES) {
    importError(
      'xlsx_archive_too_large',
      `The XLSX archive exceeds the ${MAX_XLSX_ARCHIVE_ENTRIES}-entry safety limit.`,
    )
  }

  const centralDirectoryEnd = centralDirectoryOffset + centralDirectorySize
  if (
    centralDirectoryEnd > endOffset
    || centralDirectoryOffset > endOffset
    || centralDirectoryEnd !== endOffset
  ) {
    malformedXlsx('The XLSX ZIP central directory bounds are invalid.')
  }

  let cursor = centralDirectoryOffset
  let totalUncompressedBytes = 0
  for (let entryIndex = 0; entryIndex < totalEntries; entryIndex += 1) {
    if (
      cursor + 46 > centralDirectoryEnd
      || view.getUint32(cursor, true) !== ZIP_CENTRAL_DIRECTORY_SIGNATURE
    ) {
      malformedXlsx('The XLSX ZIP central directory contains an invalid entry.')
    }

    const flags = view.getUint16(cursor + 8, true)
    const compressionMethod = view.getUint16(cursor + 10, true)
    const compressedSize = view.getUint32(cursor + 20, true)
    const uncompressedSize = view.getUint32(cursor + 24, true)
    const fileNameLength = view.getUint16(cursor + 28, true)
    const extraFieldLength = view.getUint16(cursor + 30, true)
    const commentLength = view.getUint16(cursor + 32, true)
    const startingDisk = view.getUint16(cursor + 34, true)
    const localHeaderOffset = view.getUint32(cursor + 42, true)
    const entryEnd = cursor + 46 + fileNameLength + extraFieldLength + commentLength

    if (entryEnd > centralDirectoryEnd) {
      malformedXlsx('The XLSX ZIP central directory entry is truncated.')
    }
    if (
      compressedSize === 0xffffffff
      || uncompressedSize === 0xffffffff
      || startingDisk === 0xffff
      || localHeaderOffset === 0xffffffff
      || hasZip64ExtraField(view, cursor + 46 + fileNameLength, extraFieldLength)
    ) {
      importError('xlsx_zip64_not_supported', 'ZIP64 XLSX workbooks are not supported.')
    }
    if (startingDisk !== 0 || (flags & 0x0001) !== 0) {
      malformedXlsx('Encrypted or multi-disk XLSX ZIP entries are not supported.')
    }
    if (compressionMethod !== 0 && compressionMethod !== 8) {
      malformedXlsx('The XLSX ZIP archive uses an unsupported compression method.')
    }
    if (uncompressedSize > MAX_XLSX_ENTRY_UNCOMPRESSED_BYTES) {
      importError(
        'xlsx_archive_too_large',
        'An XLSX archive entry exceeds the 32 MB uncompressed safety limit.',
      )
    }
    totalUncompressedBytes += uncompressedSize
    if (totalUncompressedBytes > MAX_XLSX_TOTAL_UNCOMPRESSED_BYTES) {
      importError(
        'xlsx_archive_too_large',
        'The XLSX archive exceeds the 64 MB total uncompressed safety limit.',
      )
    }

    if (
      localHeaderOffset + 30 > centralDirectoryOffset
      || view.getUint32(localHeaderOffset, true) !== ZIP_LOCAL_FILE_HEADER_SIGNATURE
    ) {
      malformedXlsx('The XLSX ZIP archive contains an invalid local file header.')
    }
    const localFlags = view.getUint16(localHeaderOffset + 6, true)
    const localCompressionMethod = view.getUint16(localHeaderOffset + 8, true)
    const localFileNameLength = view.getUint16(localHeaderOffset + 26, true)
    const localExtraFieldLength = view.getUint16(localHeaderOffset + 28, true)
    const compressedDataOffset = localHeaderOffset + 30 + localFileNameLength + localExtraFieldLength
    if (
      localFlags !== flags
      || localCompressionMethod !== compressionMethod
      || compressedDataOffset + compressedSize > centralDirectoryOffset
    ) {
      malformedXlsx('The XLSX ZIP local entry bounds are invalid.')
    }
    if ((flags & 0x0008) === 0) {
      const localCompressedSize = view.getUint32(localHeaderOffset + 18, true)
      const localUncompressedSize = view.getUint32(localHeaderOffset + 22, true)
      if (localCompressedSize !== compressedSize || localUncompressedSize !== uncompressedSize) {
        malformedXlsx('The XLSX ZIP entry sizes do not match.')
      }
    }

    cursor = entryEnd
  }

  if (cursor !== centralDirectoryEnd) {
    malformedXlsx('The XLSX ZIP central directory has unexpected trailing data.')
  }
}

async function parseXlsxBytes(fileName: string, bytes: Uint8Array): Promise<ParsedLocalisationWorkbook> {
  assertSafeXlsxArchive(bytes)
  // Loaded only when an .xlsx file is selected so the public application does not
  // eagerly execute or bundle spreadsheet parsing into its initial path.
  const { default: readXlsxFile } = await import('read-excel-file/browser')
  const arrayBuffer = bytes.byteOffset === 0 && bytes.byteLength === bytes.buffer.byteLength
    ? bytes.buffer as ArrayBuffer
    : bytes.slice().buffer as ArrayBuffer
  // read-excel-file never executes formulas. It returns only an already-cached
  // scalar result; an uncached or errored formula becomes an empty cell. It also
  // flattens rich-text runs to a plain string, so no workbook markup is rendered.
  const workbookSheets = await readXlsxFile(arrayBuffer)
  const sheets: ParsedLocalisationSheet[] = []

  workbookSheets.forEach(({ sheet: sheetName, data }) => {
    const rawRows = data.map((row, rowIndex) => {
      if (row.length > MAX_LOCALISATION_COLUMNS) {
        importError(
          'too_many_columns',
          `Sheet "${sheetName}" exceeds the ${MAX_LOCALISATION_COLUMNS}-column limit.`,
        )
      }
      return {
        rowNumber: rowIndex + 1,
        cells: row.map((value, columnIndex) => ({
          value: scalarFromUnknown(
            value,
            `Sheet "${sheetName}", row ${rowIndex + 1}, column ${columnIndex + 1}`,
          ),
          // The library intentionally does not expose formula source text. A returned
          // scalar may be cached formula output, but it is indistinguishable from a
          // literal and is safe to treat as reviewed plain data.
          formula: false,
          rejectedFormula: false,
        })),
      }
    })

    const parsed = buildParsedSheet(sheetName, rawRows)
    if (parsed) sheets.push(parsed)
  })

  if (sheets.length === 0) importError('workbook_has_no_data', 'The workbook has no header or data.')
  return {
    fileName,
    fileType: 'xlsx',
    sheets,
    totalRows: assertTotalRows(sheets),
  }
}

function fileExtension(fileName: string): string {
  const match = /\.([^.]+)$/.exec(fileName.trim())
  return match?.[1]?.toLocaleLowerCase() ?? ''
}

function assertSupportedFileName(fileName: string): LocalisationFileType {
  const extension = fileExtension(fileName)
  if (extension === 'xls') {
    importError(
      'legacy_xls_not_supported',
      'Legacy .xls workbooks are not supported. Save the file as .xlsx or RFC 4180 CSV.',
    )
  }
  if (extension !== 'xlsx' && extension !== 'csv') {
    importError('unsupported_file_type', 'Only .xlsx and .csv files are supported.')
  }
  return extension
}

export async function parseLocalisationBytes(
  fileName: string,
  input: ArrayBuffer | Uint8Array,
): Promise<ParsedLocalisationWorkbook> {
  const fileType = assertSupportedFileName(fileName)
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input)
  if (bytes.byteLength === 0) importError('empty_file', 'The selected file is empty.')
  if (bytes.byteLength > MAX_LOCALISATION_FILE_BYTES) {
    importError('file_too_large', 'The selected file exceeds the 5 MB limit.')
  }

  if (fileType === 'xlsx') return parseXlsxBytes(fileName, bytes)

  const sheetName = fileName.replace(/\.csv$/i, '') || 'CSV'
  const sheet = parseCsvText(new TextDecoder('utf-8').decode(bytes), sheetName)
  return {
    fileName,
    fileType,
    sheets: [sheet],
    totalRows: sheet.rows.length,
  }
}

export async function parseLocalisationFile(
  file: LocalisationImportFile,
): Promise<ParsedLocalisationWorkbook> {
  assertSupportedFileName(file.name)
  if (file.size === 0) importError('empty_file', 'The selected file is empty.')
  if (file.size > MAX_LOCALISATION_FILE_BYTES) {
    importError('file_too_large', 'The selected file exceeds the 5 MB limit.')
  }
  return parseLocalisationBytes(file.name, await file.arrayBuffer())
}

function normalizedHeader(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
    .replace(/[_./\\()-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const headerAliases: Record<CanonicalField, readonly string[]> = {
  name: ['name', 'title', 'nom', 'place name', 'establishment name', 'nom etablissement', 'اسم', 'الاسم'],
  name_fr: ['name fr', 'nom fr', 'nom francais', 'french name', 'الاسم الفرنسي'],
  name_ar: ['name ar', 'nom ar', 'nom arabe', 'arabic name', 'الاسم العربي'],
  name_en: ['name en', 'nom en', 'english name', 'الاسم الانجليزي'],
  category: ['category', 'categorie', 'type', 'place type', 'service type', 'الفئة', 'النوع'],
  address: ['address', 'adresse', 'street address', 'location', 'emplacement', 'العنوان', 'الموقع'],
  wilaya: ['wilaya', 'region', 'state', 'province', 'الولاية', 'ولاية'],
  phone: ['phone', 'telephone', 'tel', 'mobile', 'contact phone', 'الهاتف', 'رقم الهاتف'],
  opening_status: ['opening status', 'open status', 'status', 'statut', 'hours', 'horaires', 'حالة الفتح'],
  amenities: ['amenities', 'facilities', 'equipements', 'services', 'مرافق', 'الخدمات'],
  source_url: ['source url', 'url', 'link', 'lien', 'source', 'الرابط', 'رابط المصدر'],
  latitude: ['latitude', 'lat', 'y coordinate', 'خط العرض'],
  longitude: ['longitude', 'lng', 'lon', 'long', 'x coordinate', 'خط الطول'],
}

function headerScore(field: CanonicalField, header: string): number {
  const normalized = normalizedHeader(header)
  const aliases = headerAliases[field].map(normalizedHeader)
  if (aliases.includes(normalized)) return 120
  if (aliases.some((alias) => normalized.includes(alias) || alias.includes(normalized))) return 80
  return 0
}

function nonEmptySamples(header: string, rows: readonly ParsedLocalisationRow[]): string[] {
  return rows
    .slice(0, 100)
    .map((row) => row.values[header])
    .filter(hasValue)
    .map((value) => String(value))
}

function matchingRatio(values: readonly string[], predicate: (value: string) => boolean): number {
  if (values.length === 0) return 0
  return values.filter(predicate).length / values.length
}

function contentScore(
  field: CanonicalField,
  header: string,
  rows: readonly ParsedLocalisationRow[],
): number {
  const values = nonEmptySamples(header, rows)
  if (values.length === 0) return 0

  const urlRatio = matchingRatio(values, (value) => /^https?:\/\/\S+$/i.test(value.trim()))
  const phoneRatio = matchingRatio(values, (value) => /^\+?\d[\d\s()./-]{5,}$/.test(value.trim()))
  const statusRatio = matchingRatio(values, (value) =>
    /^(open|opened|closed|ouvrir|ouvert|ferme|ferm[eé]|ouvert 24|مفتوح|مغلق)/i.test(value.trim()),
  )
  const amenityRatio = matchingRatio(values, (value) =>
    /(parking|wifi|wi-fi|accessible|climatisation|livraison|equipement|موقف|واي فاي)/i.test(value),
  )
  const addressRatio = matchingRatio(values, (value) =>
    /,|\b(rue|route|avenue|street|road|quartier|nouakchott|nouadhibou|arafat|tevragh|ksar)\b/i.test(value),
  )
  const arabicRatio = matchingRatio(values, (value) => /[\u0600-\u06ff]/.test(value))
  const distinctCount = new Set(values.map((value) => value.toLocaleLowerCase())).size
  const distinctRatio = distinctCount / values.length
  const shortTextRatio = matchingRatio(values, (value) => value.length <= 80)

  if (field === 'source_url' && urlRatio >= 0.6) return 110
  if (field === 'phone' && phoneRatio >= 0.6) return 105
  if (field === 'opening_status' && statusRatio >= 0.5) return 100
  if (field === 'amenities' && amenityRatio >= 0.5) return 90
  if (field === 'address' && addressRatio >= 0.5 && urlRatio === 0 && phoneRatio === 0) return 75
  if (field === 'name_ar' && arabicRatio >= 0.9 && distinctRatio >= 0.5) return 70
  if (
    field === 'category'
    && shortTextRatio >= 0.8
    && distinctCount <= Math.max(3, Math.ceil(values.length * 0.4))
    && urlRatio === 0
    && phoneRatio === 0
    && statusRatio === 0
    && addressRatio < 0.5
  ) return 65
  if (
    field === 'name'
    && distinctRatio >= 0.6
    && shortTextRatio >= 0.7
    && urlRatio === 0
    && phoneRatio === 0
    && statusRatio === 0
  ) return 55
  return 0
}

export function autoMapHeaders(
  headers: readonly string[],
  sampleRows: readonly ParsedLocalisationRow[] = [],
): FieldMapping {
  const mapping = emptyMapping()
  const candidates = CANONICAL_LOCALISATION_FIELDS.flatMap((field) =>
    headers.map((header, headerIndex) => ({
      field,
      header,
      headerIndex,
      score: headerScore(field, header) + contentScore(field, header, sampleRows),
    })),
  )
    .filter((candidate) => candidate.score >= 55)
    .sort((left, right) => right.score - left.score || left.headerIndex - right.headerIndex)

  const usedHeaders = new Set<string>()
  candidates.forEach(({ field, header }) => {
    if (mapping[field] || usedHeaders.has(header)) return
    mapping[field] = header
    usedHeaders.add(header)
  })
  return mapping
}

export function validateMapping(
  mapping: FieldMapping,
  headers?: readonly string[],
): MappingValidation {
  const errors: string[] = []
  const warnings: string[] = []
  const missingRequiredFields: CanonicalField[] = []
  const duplicateSourceHeaders: string[] = []

  if (!mapping.name) {
    missingRequiredFields.push('name')
    errors.push('The required name field is not mapped.')
  }

  const selectedHeaders = CANONICAL_LOCALISATION_FIELDS
    .map((field) => mapping[field])
    .filter((header): header is string => Boolean(header))
  const counts = new Map<string, number>()
  selectedHeaders.forEach((header) => counts.set(header, (counts.get(header) ?? 0) + 1))
  counts.forEach((count, header) => {
    if (count <= 1) return
    duplicateSourceHeaders.push(header)
    errors.push(`Source column "${header}" is mapped more than once.`)
  })

  if (headers) {
    const available = new Set(headers)
    selectedHeaders.forEach((header) => {
      if (!available.has(header)) errors.push(`Mapped source column "${header}" does not exist.`)
    })
  }

  if (!mapping.name_fr && !mapping.name_ar && !mapping.name_en) {
    warnings.push('No language-specific name column is mapped.')
  }
  if ((mapping.latitude && !mapping.longitude) || (!mapping.latitude && mapping.longitude)) {
    errors.push('Latitude and longitude columns must be mapped together.')
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    missingRequiredFields,
    duplicateSourceHeaders,
  }
}

function asText(value: ParsedCellValue): string | null {
  if (value === null) return null
  // Parsed input has already passed the global cell limit. Avoid throwing here
  // for manually constructed/parser-compatible rows so field-specific server
  // limits can be returned as row-level validation errors instead.
  const sanitized = String(value)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim()
  return sanitized || null
}

function parseCoordinate(
  value: ParsedCellValue,
  minimum: number,
  maximum: number,
): number | null | 'invalid' {
  if (value === null || value === '') return null
  if (typeof value === 'boolean') return 'invalid'
  const normalized = typeof value === 'string'
    ? value.trim().replace(/^(-?\d+),(\d+)$/, '$1.$2')
    : value
  const numeric = typeof normalized === 'number' ? normalized : Number(normalized)
  if (!Number.isFinite(numeric) || numeric < minimum || numeric > maximum) return 'invalid'
  return numeric
}

function parseAmenities(value: ParsedCellValue): string[] {
  const text = asText(value)
  if (!text) return []
  return text
    .split(/[;|\n]+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

const NORMALIZED_TEXT_LIMITS = {
  name: 240,
  name_fr: 240,
  name_ar: 240,
  name_en: 240,
  category: 160,
  address: 500,
  wilaya: 160,
  phone: 64,
  opening_status: 160,
  source_url: MAX_LOCALISATION_CELL_LENGTH,
} as const satisfies Record<
  Exclude<CanonicalField, 'amenities' | 'latitude' | 'longitude'>,
  number
>

type NormalizedTextField = keyof typeof NORMALIZED_TEXT_LIMITS

const FORMULA_LIKE_TEXT_FIELDS = new Set<CanonicalField>([
  'name',
  'name_fr',
  'name_ar',
  'name_en',
  'category',
  'address',
  'wilaya',
])

const PHONE_PATTERN = /^[0-9+(). /-]+$/
const FORMULA_LIKE_PATTERN = /^[=+@]/
const MAX_AMENITIES = 32
const MAX_AMENITY_LENGTH = 160

function characterLength(value: string): number {
  // PostgreSQL char_length counts Unicode characters rather than UTF-16 code
  // units, so astral characters must not be counted twice in browser validation.
  return Array.from(value).length
}

function coordinateForPair(value: ParsedCellValue): number | null {
  if (value === null || value === '' || typeof value === 'boolean') return null
  const normalized = typeof value === 'string'
    ? value.trim().replace(/^(-?\d+),(\d+)$/, '$1.$2')
    : value
  const numeric = typeof normalized === 'number' ? normalized : Number(normalized)
  return Number.isFinite(numeric) ? numeric : null
}

function isSafeSourceUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

export function normalizeMappedRows(
  sheet: ParsedLocalisationSheet,
  mapping: FieldMapping,
  entityType: LocalisationEntityType = 'establishment',
): NormalizationResult {
  const mappingValidation = validateMapping(mapping, sheet.headers)
  if (!mappingValidation.valid) {
    throw new Error(`Invalid field mapping: ${mappingValidation.errors.join(' ')}`)
  }

  const rows: StagedLocalisationRow[] = []
  const errors: RowValidationError[] = []
  const mappedFields = CANONICAL_LOCALISATION_FIELDS.filter((field) => mapping[field])

  sheet.rows.forEach((row) => {
    const rowErrors: RowValidationError[] = []
    const rawData: Partial<Record<CanonicalField, ParsedCellValue>> = {}
    mappedFields.forEach((field) => {
      const header = mapping[field]
      if (header) rawData[field] = row.values[header] ?? null
    })

    const rejectedMappedFormula = mappedFields.find((field) => {
      const header = mapping[field]
      return header ? row.rejectedFormulaColumns.includes(header) : false
    })
    if (rejectedMappedFormula) {
      rowErrors.push({
        row_number: row.rowNumber,
        field: rejectedMappedFormula,
        code: 'formula_without_cached_scalar',
        message: 'A mapped formula does not contain a cached scalar result.',
      })
    }

    const name = asText(rawData.name ?? null)
    if (!name) {
      rowErrors.push({
        row_number: row.rowNumber,
        field: 'name',
        code: 'missing_required_value',
        message: 'Name is required.',
      })
    }

    const normalizedTextFields = Object.keys(NORMALIZED_TEXT_LIMITS) as NormalizedTextField[]
    const normalizedText = Object.fromEntries(
      normalizedTextFields.map((field) => [
        field,
        asText(rawData[field] ?? null),
      ]),
    ) as Record<NormalizedTextField, string | null>

    normalizedTextFields.forEach((field) => {
      const value = normalizedText[field]
      if (value && characterLength(value) > NORMALIZED_TEXT_LIMITS[field]) {
        rowErrors.push({
          row_number: row.rowNumber,
          field,
          code: 'too_long',
          message: `${field} exceeds the ${NORMALIZED_TEXT_LIMITS[field]}-character limit.`,
        })
      }
      if (value && FORMULA_LIKE_TEXT_FIELDS.has(field) && FORMULA_LIKE_PATTERN.test(value)) {
        rowErrors.push({
          row_number: row.rowNumber,
          field,
          code: 'formula_like_value',
          message: 'Formula-like mapped text is not accepted.',
        })
      }
    })

    const phone = normalizedText.phone
    if (phone && !PHONE_PATTERN.test(phone)) {
      rowErrors.push({
        row_number: row.rowNumber,
        field: 'phone',
        code: 'invalid_phone',
        message: 'Phone contains unsupported characters.',
      })
    }

    const latitude = parseCoordinate(rawData.latitude ?? null, -90, 90)
    const longitude = parseCoordinate(rawData.longitude ?? null, -180, 180)
    if (latitude === 'invalid') {
      rowErrors.push({
        row_number: row.rowNumber,
        field: 'latitude',
        code: 'invalid_coordinate',
        message: 'Latitude must be between -90 and 90.',
      })
    }
    if (longitude === 'invalid') {
      rowErrors.push({
        row_number: row.rowNumber,
        field: 'longitude',
        code: 'invalid_coordinate',
        message: 'Longitude must be between -180 and 180.',
      })
    }

    const latitudeForPair = coordinateForPair(rawData.latitude ?? null)
    const longitudeForPair = coordinateForPair(rawData.longitude ?? null)
    if ((latitudeForPair === null) !== (longitudeForPair === null)) {
      rowErrors.push({
        row_number: row.rowNumber,
        field: 'coordinates',
        code: 'coordinate_pair_required',
        message: 'Latitude and longitude must be supplied together.',
      })
    }

    const sourceUrl = normalizedText.source_url
    if (sourceUrl && !isSafeSourceUrl(sourceUrl)) {
      rowErrors.push({
        row_number: row.rowNumber,
        field: 'source_url',
        code: 'invalid_source_url',
        message: 'Source URL must use HTTP or HTTPS.',
      })
    }

    const amenities = parseAmenities(rawData.amenities ?? null)
    if (amenities.length > MAX_AMENITIES) {
      rowErrors.push({
        row_number: row.rowNumber,
        field: 'amenities',
        code: 'too_many_items',
        message: `Amenities cannot contain more than ${MAX_AMENITIES} items.`,
      })
    } else {
      amenities.forEach((amenity) => {
        if (characterLength(amenity) > MAX_AMENITY_LENGTH || FORMULA_LIKE_PATTERN.test(amenity)) {
          rowErrors.push({
            row_number: row.rowNumber,
            field: 'amenities',
            code: 'invalid_item',
            message: 'An amenity is too long or contains unsafe text.',
          })
        }
      })
    }

    if (rowErrors.length > 0) {
      errors.push(...rowErrors)
      return
    }

    rows.push({
      row_number: row.rowNumber,
      raw_data: rawData,
      normalized_data: {
        entity_type: entityType,
        name: name as string,
        name_fr: normalizedText.name_fr,
        name_ar: normalizedText.name_ar,
        name_en: normalizedText.name_en,
        category: normalizedText.category,
        address: normalizedText.address,
        wilaya: normalizedText.wilaya,
        phone,
        opening_status: normalizedText.opening_status,
        amenities,
        source_url: sourceUrl,
        // Coordinates are read only from explicitly mapped columns. In particular,
        // Bing `cp`/viewport query parameters are intentionally never interpreted as
        // establishment coordinates.
        latitude: latitude as number | null,
        longitude: longitude as number | null,
      },
    })
  })

  return { rows, errors }
}

export function chunkRows<T>(
  rows: readonly T[],
  size = LOCALISATION_STAGE_CHUNK_SIZE,
): T[][] {
  if (!Number.isSafeInteger(size) || size <= 0 || size > LOCALISATION_STAGE_CHUNK_SIZE) {
    throw new RangeError(`Chunk size must be between 1 and ${LOCALISATION_STAGE_CHUNK_SIZE}.`)
  }
  const chunks: T[][] = []
  for (let index = 0; index < rows.length; index += size) {
    chunks.push(rows.slice(index, index + size))
  }
  return chunks
}
