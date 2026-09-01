import { readFileSync, readdirSync } from 'node:fs'
import { basename, extname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  LocalisationImportError,
  autoMapHeaders,
  createEmptyFieldMapping,
  normalizeMappedRows,
  parseCsvText,
  parseLocalisationBytes,
  type ParsedLocalisationWorkbook,
} from '../src/lib/localisationImport'

const localisationRoot = fileURLToPath(new URL('../localisation/', import.meta.url))

function discoverSourceFiles(directory = localisationRoot): string[] {
  return readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const path = join(directory, entry.name)
      if (entry.isDirectory()) return discoverSourceFiles(path)
      return entry.isFile() && /\.(?:xlsx|xls|csv)$/i.test(entry.name) ? [path] : []
    })
    .sort((left, right) => left.localeCompare(right))
}

type CorpusResult = {
  path: string
  workbook: ParsedLocalisationWorkbook
}

type CorpusRejection = {
  path: string
  code: string
}

let corpusPromise: Promise<{ parsed: CorpusResult[]; rejected: CorpusRejection[] }> | undefined

function loadCorpus() {
  corpusPromise ??= (async () => {
    const parsed: CorpusResult[] = []
    const rejected: CorpusRejection[] = []

    for (const path of discoverSourceFiles()) {
      try {
        parsed.push({
          path,
          workbook: await parseLocalisationBytes(basename(path), readFileSync(path)),
        })
      } catch (error) {
        if (!(error instanceof LocalisationImportError)) throw error
        rejected.push({ path, code: error.code })
      }
    }

    return { parsed, rejected }
  })()
  return corpusPromise
}

function repositoryPath(path: string) {
  return relative(fileURLToPath(new URL('../', import.meta.url)), path).replaceAll('\\', '/')
}

function expectImportErrorCode(operation: () => unknown, code: string) {
  try {
    operation()
  } catch (error) {
    expect(error).toBeInstanceOf(LocalisationImportError)
    expect((error as LocalisationImportError).code).toBe(code)
    return
  }
  throw new Error(`Expected LocalisationImportError with code ${code}.`)
}

describe('localisation source corpus contracts', () => {
  it('discovers every supplied spreadsheet source, including nested wilaya files', () => {
    const files = discoverSourceFiles()
    const paths = files.map(repositoryPath)

    expect(files).toHaveLength(20)
    expect(files.filter((path) => extname(path).toLowerCase() === '.xlsx')).toHaveLength(19)
    expect(files.filter((path) => extname(path).toLowerCase() === '.csv')).toHaveLength(1)
    expect(files.filter((path) => extname(path).toLowerCase() === '.xls')).toHaveLength(0)
    expect(paths).toContain('localisation/scraped-data_2026-09-01_unv.csv')
    expect(paths).toContain('localisation/wilaya/scraped-data_2026-09-01_adrar.xlsx')
    expect(paths).toContain('localisation/wilaya/scraped-data_2026-09-01_inchiri.xlsx')
    expect(new Set(paths).size).toBe(paths.length)
  })

  it('reads every valid workbook, sheet, header, and non-empty sample row', async () => {
    const { parsed, rejected } = await loadCorpus()

    expect(parsed).toHaveLength(19)
    expect(rejected).toEqual([{
      path: join(localisationRoot, 'scraped-data_2026-09-01_unv.csv'),
      code: 'cell_too_long',
    }])

    for (const { workbook } of parsed) {
      expect(workbook.fileType).toBe('xlsx')
      expect(workbook.sheets.length).toBeGreaterThan(0)
      expect(workbook.totalRows).toBeGreaterThan(0)
      for (const sheet of workbook.sheets) {
        expect(sheet.name).toBe('Scraped Data')
        expect(sheet.headers.length).toBeGreaterThan(0)
        expect(sheet.headers.length).toBeLessThanOrEqual(32)
        expect(sheet.rows.length).toBeGreaterThan(0)
        expect(sheet.rows.slice(0, 5).length).toBeGreaterThan(0)
        expect(sheet.rows.every((row) => Object.values(row.values).some((value) => value !== null))).toBe(true)
      }
    }
  })

  it('derives a required proper-name field without inventing language, hierarchy, or coordinate columns', async () => {
    const { parsed } = await loadCorpus()
    const mappings = parsed.flatMap(({ workbook }) => workbook.sheets.map((sheet) => (
      autoMapHeaders(sheet.headers, sheet.rows)
    )))
    const mappedOptionalFields = new Set(
      mappings.flatMap((mapping) => Object.entries(mapping)
        .filter(([field, header]) => field !== 'name' && header !== null)
        .map(([field]) => field)),
    )

    expect(mappings.every((mapping) => mapping.name === 'Title')).toBe(true)
    expect(mappings.every((mapping) => mapping.name_fr === null)).toBe(true)
    expect(mappings.every((mapping) => mapping.name_ar === null)).toBe(true)
    expect(mappings.every((mapping) => mapping.name_en === null)).toBe(true)
    expect(mappings.every((mapping) => mapping.wilaya === null)).toBe(true)
    expect(mappings.every((mapping) => mapping.latitude === null && mapping.longitude === null)).toBe(true)
    expect(mappedOptionalFields).toContain('source_url')
    expect(mappedOptionalFields).toContain('address')
    expect(mappedOptionalFields).toContain('phone')
    expect(mappedOptionalFields).toContain('opening_status')
  })

  it('documents null cells, mixed French/Arabic names, and duplicate proper names in the real sources', async () => {
    const { parsed } = await loadCorpus()
    const values = parsed.flatMap(({ workbook }) => workbook.sheets.flatMap((sheet) => (
      sheet.rows.flatMap((row) => Object.values(row.values))
    )))
    const names = parsed.flatMap(({ workbook }) => workbook.sheets.flatMap((sheet) => {
      const mapping = autoMapHeaders(sheet.headers, sheet.rows)
      return mapping.name
        ? sheet.rows.map((row) => row.values[mapping.name as string]).filter((value): value is string => typeof value === 'string')
        : []
    }))
    const nameCounts = new Map<string, number>()
    names.forEach((name) => {
      const key = name.trim().toLocaleLowerCase()
      nameCounts.set(key, (nameCounts.get(key) ?? 0) + 1)
    })

    expect(values).toContain(null)
    expect(names.some((name) => /[A-Za-zÀ-ÿ]/.test(name) && /[\u0600-\u06ff]/.test(name))).toBe(true)
    expect([...nameCounts.values()].some((count) => count > 1)).toBe(true)
    expect(nameCounts.get('pharmacie bon choix')).toBeGreaterThan(1)
  })

  it('ignores empty rows and rejects malformed required fields, coordinates, URLs, and CSV quoting', () => {
    const sheet = parseCsvText([
      'Title,Latitude,Longitude,Link',
      'Adrar,"20,5",-13.05,https://example.test',
      ',18,-15,https://example.test',
      ',,,',
      'Out of range,91,-15,https://example.test',
      'Unsafe URL,18,-15,javascript:alert(1)',
    ].join('\n'))
    const mapping = createEmptyFieldMapping()
    mapping.name = 'Title'
    mapping.latitude = 'Latitude'
    mapping.longitude = 'Longitude'
    mapping.source_url = 'Link'
    const normalized = normalizeMappedRows(sheet, mapping, 'locality')

    expect(sheet.rows.map((row) => row.rowNumber)).toEqual([2, 3, 5, 6])
    expect(normalized.rows).toHaveLength(1)
    expect(normalized.rows[0].normalized_data).toMatchObject({
      name: 'Adrar',
      latitude: 20.5,
      longitude: -13.05,
    })
    expect(normalized.errors.map((error) => error.code)).toEqual([
      'missing_required_value',
      'invalid_coordinate',
      'invalid_source_url',
    ])
    expect(() => parseCsvText('Title\n"unterminated')).toThrow(LocalisationImportError)
  })

  it('preserves physical CSV row numbers while bounding blank-record floods', () => {
    const sheet = parseCsvText([
      'Title',
      'First place',
      '',
      '',
      '',
      'Second place',
    ].join('\n'))

    expect(sheet.rows.map((row) => row.rowNumber)).toEqual([2, 6])
    expectImportErrorCode(
      () => parseCsvText(`Title${'\n'.repeat(40_002)}`),
      'too_many_rows',
    )
  })

  it('drops each unsafe normalized row and reports bounded text, phone, amenity, formula, and coordinate errors', () => {
    const longName = 'N'.repeat(241)
    const longAddress = 'A'.repeat(501)
    const tooManyAmenities = Array.from({ length: 33 }, (_, index) => `item-${index + 1}`).join(';')
    const sheet = parseCsvText([
      'Title,Address,Phone,Amenities,Latitude,Longitude',
      `${longName},${longAddress},12abc,${tooManyAmenities},18,`,
      '=unsafe-name,Safe address,,@unsafe-amenity,18,-15',
      '  Pharmacie Étoile صيدلية  ,Tevragh-Zeina,+222 45 67 89 00,Wi-Fi;24/7,18.1234567,-15.1234567',
    ].join('\n'))
    const mapping = createEmptyFieldMapping()
    mapping.name = 'Title'
    mapping.address = 'Address'
    mapping.phone = 'Phone'
    mapping.amenities = 'Amenities'
    mapping.latitude = 'Latitude'
    mapping.longitude = 'Longitude'

    const normalized = normalizeMappedRows(sheet, mapping, 'establishment')

    expect(normalized.rows).toHaveLength(1)
    expect(normalized.rows[0]).toMatchObject({
      row_number: 4,
      normalized_data: {
        entity_type: 'establishment',
        name: 'Pharmacie Étoile صيدلية',
        phone: '+222 45 67 89 00',
        amenities: ['Wi-Fi', '24/7'],
        latitude: 18.1234567,
        longitude: -15.1234567,
      },
    })
    expect(normalized.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_number: 2, field: 'name', code: 'too_long' }),
      expect.objectContaining({ row_number: 2, field: 'address', code: 'too_long' }),
      expect.objectContaining({ row_number: 2, field: 'phone', code: 'invalid_phone' }),
      expect.objectContaining({ row_number: 2, field: 'amenities', code: 'too_many_items' }),
      expect.objectContaining({ row_number: 2, field: 'coordinates', code: 'coordinate_pair_required' }),
      expect.objectContaining({ row_number: 3, field: 'name', code: 'formula_like_value' }),
      expect.objectContaining({ row_number: 3, field: 'amenities', code: 'invalid_item' }),
    ]))
    expect(normalized.errors.every((error) => error.row_number !== 4)).toBe(true)
  })
})
