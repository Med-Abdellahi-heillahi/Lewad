import { strToU8, zipSync } from 'fflate'
import { describe, expect, it } from 'vitest'
import {
  CANONICAL_LOCALISATION_FIELDS,
  LOCALISATION_IMPORT_LIMITS,
  LocalisationImportError,
  MAX_LOCALISATION_CELL_LENGTH,
  MAX_LOCALISATION_COLUMNS,
  MAX_LOCALISATION_FILE_BYTES,
  MAX_LOCALISATION_ROWS,
  autoMapHeaders,
  chunkRows,
  createEmptyFieldMapping,
  deduplicateHeaders,
  normalizeMappedRows,
  parseCsvText,
  parseLocalisationBytes,
  parseLocalisationFile,
  sanitizeCellValue,
  validateMapping,
  type FieldMapping,
  type ParsedLocalisationSheet,
} from './localisationImport'

function expectImportError(action: () => unknown, code: string) {
  try {
    action()
    throw new Error('Expected LocalisationImportError')
  } catch (error) {
    expect(error).toBeInstanceOf(LocalisationImportError)
    expect((error as LocalisationImportError).code).toBe(code)
  }
}

async function expectAsyncImportError(action: () => Promise<unknown>, code: string) {
  try {
    await action()
    throw new Error('Expected LocalisationImportError')
  } catch (error) {
    expect(error).toBeInstanceOf(LocalisationImportError)
    expect((error as LocalisationImportError).code).toBe(code)
  }
}

const contentTypes = `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>`

const packageRelationships = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`

const workbookXml = `<?xml version="1.0" encoding="UTF-8"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="Places" sheetId="1" r:id="rId1"/>
    <sheet name="Wilayas" sheetId="2" r:id="rId2"/>
  </sheets>
</workbook>`

const workbookRelationships = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/>
</Relationships>`

const firstSheet = `<?xml version="1.0" encoding="UTF-8"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>
    <row r="1">
      <c r="A1" t="inlineStr"><is><t>Title</t></is></c>
      <c r="B1" t="inlineStr"><is><t>Title</t></is></c>
      <c r="C1" t="inlineStr"><is><t>Formula</t></is></c>
    </row>
    <row r="2">
      <c r="A2" t="inlineStr"><is><r><t>مصحة </t></r><r><t>IBN SINA</t></r></is></c>
      <c r="B2" t="str"><f>CONCATENATE(&quot;cached&quot;,&quot; value&quot;)</f><v>cached value</v></c>
      <c r="C2" t="str"><f>CONCATENATE(A2,B2)</f></c>
    </row>
    <row r="3"/>
    <row r="4"><c r="A4" t="inlineStr"><is><t>&lt;script&gt;literal&lt;/script&gt;</t></is></c></row>
  </sheetData>
</worksheet>`

const secondSheet = `<?xml version="1.0" encoding="UTF-8"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>
    <row r="1"><c r="A1" t="inlineStr"><is><t>Name</t></is></c></row>
    <row r="2"><c r="A2" t="inlineStr"><is><t>Adrar</t></is></c></row>
  </sheetData>
</worksheet>`

function syntheticWorkbook(): Uint8Array {
  return zipSync({
    '[Content_Types].xml': strToU8(contentTypes),
    '_rels/.rels': strToU8(packageRelationships),
    'xl/workbook.xml': strToU8(workbookXml),
    'xl/_rels/workbook.xml.rels': strToU8(workbookRelationships),
    'xl/worksheets/sheet1.xml': strToU8(firstSheet),
    'xl/worksheets/sheet2.xml': strToU8(secondSheet),
  })
}

function findZipEndOffset(bytes: Uint8Array): number {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  for (let offset = bytes.byteLength - 22; offset >= 0; offset -= 1) {
    if (view.getUint32(offset, true) === 0x06054b50) return offset
  }
  throw new Error('Synthetic ZIP has no end-of-central-directory record')
}

function patchZipUncompressedSizes(bytes: Uint8Array, sizes: readonly number[]): Uint8Array {
  const patched = bytes.slice()
  const view = new DataView(patched.buffer, patched.byteOffset, patched.byteLength)
  const endOffset = findZipEndOffset(patched)
  let cursor = view.getUint32(endOffset + 16, true)
  sizes.forEach((size) => {
    expect(view.getUint32(cursor, true)).toBe(0x02014b50)
    const localOffset = view.getUint32(cursor + 42, true)
    view.setUint32(cursor + 24, size, true)
    view.setUint32(localOffset + 22, size, true)
    cursor += 46
      + view.getUint16(cursor + 28, true)
      + view.getUint16(cursor + 30, true)
      + view.getUint16(cursor + 32, true)
  })
  return patched
}

function parsedSheet(
  headers: string[],
  rows: Array<Record<string, string | number | boolean | null>>,
): ParsedLocalisationSheet {
  return {
    name: 'Sheet',
    headers,
    rows: rows.map((values, index) => ({
      rowNumber: index + 2,
      values,
      formulaColumns: [],
      rejectedFormulaColumns: [],
    })),
    formulaCellCount: 0,
    rejectedFormulaCellCount: 0,
  }
}

describe('localisation import parser safety limits', () => {
  it('exports the approved hard limits and canonical fields', () => {
    expect(LOCALISATION_IMPORT_LIMITS).toEqual({
      fileBytes: 5 * 1024 * 1024,
      rows: 10_000,
      columns: 32,
      cellLength: 4_096,
      chunkSize: 250,
    })
    expect(CANONICAL_LOCALISATION_FIELDS).toContain('name')
    expect(CANONICAL_LOCALISATION_FIELDS).toContain('source_url')
  })

  it('rejects legacy xls explicitly before reading the file', async () => {
    let readAttempted = false
    await expectAsyncImportError(
      () => parseLocalisationFile({
        name: 'legacy.xls',
        size: 12,
        arrayBuffer: async () => {
          readAttempted = true
          return new ArrayBuffer(12)
        },
      }),
      'legacy_xls_not_supported',
    )
    expect(readAttempted).toBe(false)
  })

  it('rejects unsupported, empty, and oversized inputs before parsing', async () => {
    await expectAsyncImportError(
      () => parseLocalisationBytes('places.json', new Uint8Array([1])),
      'unsupported_file_type',
    )
    await expectAsyncImportError(
      () => parseLocalisationBytes('places.csv', new Uint8Array()),
      'empty_file',
    )
    await expectAsyncImportError(
      () => parseLocalisationFile({
        name: 'places.xlsx',
        size: MAX_LOCALISATION_FILE_BYTES + 1,
        arrayBuffer: async () => new ArrayBuffer(0),
      }),
      'file_too_large',
    )
  })

  it('rejects malformed, ZIP64, and excessive XLSX archives before materialization', async () => {
    await expectAsyncImportError(
      () => parseLocalisationBytes('malformed.xlsx', new Uint8Array([1, 2, 3, 4])),
      'malformed_xlsx_archive',
    )

    const zip64 = syntheticWorkbook().slice()
    const zip64View = new DataView(zip64.buffer, zip64.byteOffset, zip64.byteLength)
    const endOffset = findZipEndOffset(zip64)
    zip64View.setUint16(endOffset + 10, 0xffff, true)
    await expectAsyncImportError(
      () => parseLocalisationBytes('zip64.xlsx', zip64),
      'xlsx_zip64_not_supported',
    )

    const compressedBomb = zipSync({
      'xl/worksheets/oversized.xml': new Uint8Array(32 * 1024 * 1024 + 1),
    }, { level: 9 })
    expect(compressedBomb.byteLength).toBeLessThan(MAX_LOCALISATION_FILE_BYTES)
    await expectAsyncImportError(
      () => parseLocalisationBytes('bomb.xlsx', compressedBomb),
      'xlsx_archive_too_large',
    )

    const excessiveEntries = syntheticWorkbook().slice()
    const excessiveEntriesView = new DataView(
      excessiveEntries.buffer,
      excessiveEntries.byteOffset,
      excessiveEntries.byteLength,
    )
    const excessiveEntriesEnd = findZipEndOffset(excessiveEntries)
    excessiveEntriesView.setUint16(excessiveEntriesEnd + 8, 2_049, true)
    excessiveEntriesView.setUint16(excessiveEntriesEnd + 10, 2_049, true)
    await expectAsyncImportError(
      () => parseLocalisationBytes('too-many-entries.xlsx', excessiveEntries),
      'xlsx_archive_too_large',
    )

    const excessiveTotal = patchZipUncompressedSizes(
      syntheticWorkbook(),
      [24 * 1024 * 1024, 24 * 1024 * 1024, 24 * 1024 * 1024],
    )
    await expectAsyncImportError(
      () => parseLocalisationBytes('too-large-total.xlsx', excessiveTotal),
      'xlsx_archive_too_large',
    )
  })

  it('rejects excessive CSV columns, rows, and cell length', () => {
    expectImportError(
      () => parseCsvText(Array.from({ length: MAX_LOCALISATION_COLUMNS + 1 }, (_, index) => `h${index}`).join(',')),
      'too_many_columns',
    )
    expectImportError(
      () => parseCsvText(`name\n${'x'.repeat(MAX_LOCALISATION_CELL_LENGTH + 1)}`),
      'cell_too_long',
    )
    const tooManyRows = ['name', ...Array.from({ length: MAX_LOCALISATION_ROWS + 1 }, () => 'Place')].join('\n')
    expectImportError(() => parseCsvText(tooManyRows), 'too_many_rows')
  })

  it('bounds physical CSV records without retaining ordinary blank lines', () => {
    const ordinaryBlankLines = `Name\n${'\n'.repeat(100)}Place`
    const sheet = parseCsvText(ordinaryBlankLines)
    expect(sheet.rows).toHaveLength(1)
    expect(sheet.rows[0].rowNumber).toBe(102)

    const recordFlood = `${'\n'.repeat(MAX_LOCALISATION_ROWS * 4 + 2)}Name\nPlace`
    expectImportError(() => parseCsvText(recordFlood), 'too_many_rows')
  })
})

describe('CSV and workbook extraction', () => {
  it('parses RFC 4180 quotes, embedded newlines and escaped quotes', () => {
    const sheet = parseCsvText('\ufeffName,Address,Note\r\n"Clinique, Centrale","Rue 1\r\nNouakchott","said ""hello"""\r\n,,\r\n')
    expect(sheet.headers).toEqual(['Name', 'Address', 'Note'])
    expect(sheet.rows).toHaveLength(1)
    expect(sheet.rows[0]).toMatchObject({
      rowNumber: 2,
      values: {
        Name: 'Clinique, Centrale',
        Address: 'Rue 1\r\nNouakchott',
        Note: 'said "hello"',
      },
    })
  })

  it('rejects malformed RFC 4180 quoting', () => {
    expectImportError(() => parseCsvText('Name\n"unterminated'), 'malformed_csv')
    expectImportError(() => parseCsvText('Name\n"value"tail'), 'malformed_csv')
  })

  it('deduplicates headers deterministically and ignores empty rows', () => {
    expect(deduplicateHeaders(['Name', ' name ', null, 'NAME'])).toEqual([
      'Name',
      'name (2)',
      'Column 3',
      'NAME (3)',
    ])
    const sheet = parseCsvText('Name,Name,,NAME\nA,B,,C\n,,,\nD,E,,F')
    expect(sheet.headers).toEqual(['Name', 'Name (2)', 'Column 3', 'NAME (3)'])
    expect(sheet.rows.map((row) => row.rowNumber)).toEqual([2, 4])
  })

  it('extracts all xlsx sheets and only cached scalar formula results', async () => {
    const workbook = await parseLocalisationBytes('safe.xlsx', syntheticWorkbook())
    expect(workbook.sheets.map((sheet) => sheet.name)).toEqual(['Places', 'Wilayas'])
    expect(workbook.totalRows).toBe(3)
    expect(workbook.sheets[0].headers).toEqual(['Title', 'Title (2)', 'Formula'])
    expect(workbook.sheets[0].rows[0].values).toEqual({
      Title: 'مصحة IBN SINA',
      'Title (2)': 'cached value',
      Formula: null,
    })
    expect(workbook.sheets[0].rows[0].formulaColumns).toEqual([])
    expect(workbook.sheets[0].rows[1].values.Title).toBe('<script>literal</script>')
  })

  it('accepts a File-like object without requiring a browser File implementation', async () => {
    const csv = new TextEncoder().encode('Title,Link\nBanque,http://example.test')
    const workbook = await parseLocalisationFile({
      name: 'places.csv',
      size: csv.byteLength,
      arrayBuffer: async () => csv.buffer as ArrayBuffer,
    })
    expect(workbook.fileType).toBe('csv')
    expect(workbook.sheets[0].rows[0].values.Title).toBe('Banque')
  })
})

describe('plain-text handling and field mapping', () => {
  it('preserves proper names exactly while removing only unsafe controls', () => {
    expect(sanitizeCellValue('  CLINIQUE IBN SINA مصحة إبن سينا  ')).toBe('CLINIQUE IBN SINA مصحة إبن سينا')
    expect(sanitizeCellValue('École Privée Menabi\u0000 El Ouloulm')).toBe('École Privée Menabi El Ouloulm')
    expect(sanitizeCellValue('<img src=x onerror=alert(1)>')).toBe('<img src=x onerror=alert(1)>')
  })

  it('auto-maps generic scraped columns from their contents', () => {
    const sheet = parsedSheet(
      ['Field 1', 'Title', 'Field 3', 'Field 4', 'Field 5', 'Link'],
      [
        {
          'Field 1': 'Banque/coopérative de crédit',
          Title: 'Bamis Banque',
          'Field 3': 'Independence St, Nouakchott',
          'Field 4': 'Ouvrir',
          'Field 5': '+222 45 25 14 24',
          Link: 'https://www.bing.com/maps/search?cp=18.09~-15.97',
        },
        {
          'Field 1': 'Banque/coopérative de crédit',
          Title: 'Banque Nationale De Mauritanie',
          'Field 3': 'Route de l Espoir, Arafat',
          'Field 4': 'Ouvert 24 h/24',
          'Field 5': '+222 37 77 38 77',
          Link: 'https://www.bing.com/maps/search?cp=18.10~-15.98',
        },
      ],
    )
    expect(autoMapHeaders(sheet.headers, sheet.rows)).toMatchObject({
      name: 'Title',
      category: 'Field 1',
      address: 'Field 3',
      opening_status: 'Field 4',
      phone: 'Field 5',
      source_url: 'Link',
      latitude: null,
      longitude: null,
    })
  })

  it('maps explicit multilingual and coordinate headers', () => {
    const headers = ['Name', 'Nom français', 'الاسم العربي', 'Latitude', 'Longitude']
    expect(autoMapHeaders(headers)).toMatchObject({
      name: 'Name',
      name_fr: 'Nom français',
      name_ar: 'الاسم العربي',
      latitude: 'Latitude',
      longitude: 'Longitude',
    })
  })

  it('validates required, duplicate, and missing source mappings', () => {
    const missingName = validateMapping(createEmptyFieldMapping(), ['Title'])
    expect(missingName.valid).toBe(false)
    expect(missingName.missingRequiredFields).toEqual(['name'])

    const duplicate = createEmptyFieldMapping()
    duplicate.name = 'Title'
    duplicate.name_fr = 'Title'
    expect(validateMapping(duplicate, ['Title'])).toMatchObject({
      valid: false,
      duplicateSourceHeaders: ['Title'],
    })

    const unknown = createEmptyFieldMapping()
    unknown.name = 'Missing'
    expect(validateMapping(unknown, ['Title']).valid).toBe(false)

    const unpairedCoordinate = createEmptyFieldMapping()
    unpairedCoordinate.name = 'Title'
    unpairedCoordinate.latitude = 'Latitude'
    expect(validateMapping(unpairedCoordinate, ['Title', 'Latitude']).valid).toBe(false)
  })
})

describe('normalization and staging payloads', () => {
  it('keeps only mapped raw values and preserves mixed-script proper names', () => {
    const sheet = parsedSheet(
      ['Title', 'Arabic', 'Amenities', 'Link', 'Ignored'],
      [{
        Title: 'CLINIQUE IBN SINA مصحة إبن سينا',
        Arabic: 'مصحة إبن سينا',
        Amenities: 'Parking gratuit;واي فاي',
        Link: 'https://www.bing.com/maps/search?cp=18.090911~-15.974719',
        Ignored: 'must not leave the browser',
      }],
    )
    const mapping = createEmptyFieldMapping()
    mapping.name = 'Title'
    mapping.name_ar = 'Arabic'
    mapping.amenities = 'Amenities'
    mapping.source_url = 'Link'

    const result = normalizeMappedRows(sheet, mapping)
    expect(result.errors).toEqual([])
    expect(result.rows[0].raw_data).toEqual({
      name: 'CLINIQUE IBN SINA مصحة إبن سينا',
      name_ar: 'مصحة إبن سينا',
      amenities: 'Parking gratuit;واي فاي',
      source_url: 'https://www.bing.com/maps/search?cp=18.090911~-15.974719',
    })
    expect(result.rows[0].normalized_data).toMatchObject({
      entity_type: 'establishment',
      name: 'CLINIQUE IBN SINA مصحة إبن سينا',
      name_ar: 'مصحة إبن سينا',
      amenities: ['Parking gratuit', 'واي فاي'],
      latitude: null,
      longitude: null,
    })
  })

  it('never extracts Bing viewport cp values as coordinates', () => {
    const sheet = parsedSheet(
      ['Title', 'Link'],
      [{ Title: 'Pharmacie ZemZem', Link: 'https://bing.com/maps?q=test&cp=18.1~-15.9&lvl=13' }],
    )
    const mapping = createEmptyFieldMapping()
    mapping.name = 'Title'
    mapping.source_url = 'Link'
    const normalized = normalizeMappedRows(sheet, mapping).rows[0].normalized_data
    expect(normalized.latitude).toBeNull()
    expect(normalized.longitude).toBeNull()
  })

  it('normalizes explicit decimal coordinates and rejects malformed rows', () => {
    const sheet = parsedSheet(
      ['Title', 'Latitude', 'Longitude', 'Link'],
      [
        { Title: 'Adrar', Latitude: '20,50', Longitude: '-13.05', Link: 'https://example.test' },
        { Title: '', Latitude: 18, Longitude: -15, Link: 'https://example.test' },
        { Title: 'Out of range', Latitude: 91, Longitude: -15, Link: 'https://example.test' },
        { Title: 'Unsafe URL', Latitude: 18, Longitude: -15, Link: 'javascript:alert(1)' },
      ],
    )
    const mapping = createEmptyFieldMapping()
    mapping.name = 'Title'
    mapping.latitude = 'Latitude'
    mapping.longitude = 'Longitude'
    mapping.source_url = 'Link'

    const result = normalizeMappedRows(sheet, mapping, 'locality')
    expect(result.rows).toHaveLength(1)
    expect(result.rows[0].normalized_data).toMatchObject({
      entity_type: 'locality',
      latitude: 20.5,
      longitude: -13.05,
    })
    expect(result.errors.map((error) => error.code)).toEqual([
      'missing_required_value',
      'invalid_coordinate',
      'invalid_source_url',
    ])
  })

  it('returns row-level errors for every bounded canonical text field', () => {
    const cases: Array<{
      field: Exclude<keyof FieldMapping, 'amenities' | 'latitude' | 'longitude'>
      maximum: number
      value?: string
    }> = [
      { field: 'name', maximum: 240 },
      { field: 'name_fr', maximum: 240 },
      { field: 'name_ar', maximum: 240 },
      { field: 'name_en', maximum: 240 },
      { field: 'category', maximum: 160 },
      { field: 'address', maximum: 500 },
      { field: 'wilaya', maximum: 160 },
      { field: 'phone', maximum: 64, value: '1'.repeat(65) },
      { field: 'opening_status', maximum: 160 },
      { field: 'source_url', maximum: 4_096, value: `https://${'x'.repeat(4_089)}` },
    ]

    cases.forEach(({ field, maximum, value }) => {
      const header = field === 'name' ? 'Title' : field
      const sheet = parsedSheet(['Title', header], [{
        Title: 'CLINIQUE IBN SINA مصحة إبن سينا',
        [header]: value ?? 'x'.repeat(maximum + 1),
      }])
      const mapping = createEmptyFieldMapping()
      mapping.name = 'Title'
      mapping[field] = header
      const result = normalizeMappedRows(sheet, mapping)
      expect(result.rows, field).toEqual([])
      expect(result.errors, field).toContainEqual(expect.objectContaining({
        field,
        code: 'too_long',
      }))
    })
  })

  it('matches server phone, amenities, coordinate-pair, and formula-like rules', () => {
    const sheet = parsedSheet(
      ['Title', 'French', 'Phone', 'Amenities', 'Latitude', 'Longitude'],
      [
        {
          Title: 'Valid mixed proper name مصحة IBN SINA',
          French: 'Clinique IBN SINA',
          Phone: '+222 ABC',
          Amenities: 'Parking',
          Latitude: 18.1,
          Longitude: -15.9,
        },
        {
          Title: 'Too many amenities',
          French: 'Clinique',
          Phone: '+222 45 25 14 24',
          Amenities: Array.from({ length: 33 }, (_, index) => `item ${index}`).join(';'),
          Latitude: 18.1,
          Longitude: -15.9,
        },
        {
          Title: 'Unsafe amenity',
          French: 'Clinique',
          Phone: '+222 45 25 14 24',
          Amenities: `Parking;${'x'.repeat(161)};@IMPORT`,
          Latitude: 18.1,
          Longitude: -15.9,
        },
        {
          Title: '@FORMULA',
          French: '+FORMULA',
          Phone: '+222 45 25 14 24',
          Amenities: 'Parking',
          Latitude: 18.1,
          Longitude: -15.9,
        },
        {
          Title: 'Missing longitude',
          French: 'Clinique',
          Phone: '+222 45 25 14 24',
          Amenities: 'Parking',
          Latitude: 18.1,
          Longitude: null,
        },
      ],
    )
    const mapping = createEmptyFieldMapping()
    mapping.name = 'Title'
    mapping.name_fr = 'French'
    mapping.phone = 'Phone'
    mapping.amenities = 'Amenities'
    mapping.latitude = 'Latitude'
    mapping.longitude = 'Longitude'

    const result = normalizeMappedRows(sheet, mapping)
    expect(result.rows).toEqual([])
    expect(result.errors.map(({ row_number, field, code }) => ({ row_number, field, code }))).toEqual([
      { row_number: 2, field: 'phone', code: 'invalid_phone' },
      { row_number: 3, field: 'amenities', code: 'too_many_items' },
      { row_number: 4, field: 'amenities', code: 'invalid_item' },
      { row_number: 4, field: 'amenities', code: 'invalid_item' },
      { row_number: 5, field: 'name', code: 'formula_like_value' },
      { row_number: 5, field: 'name_fr', code: 'formula_like_value' },
      { row_number: 6, field: 'coordinates', code: 'coordinate_pair_required' },
    ])
  })

  it('rejects formula-like values for every server-protected canonical text field', () => {
    const protectedFields = [
      'name',
      'name_fr',
      'name_ar',
      'name_en',
      'category',
      'address',
      'wilaya',
    ] as const

    protectedFields.forEach((field, index) => {
      const header = field === 'name' ? 'Title' : field
      const sheet = parsedSheet(field === 'name' ? ['Title'] : ['Title', header], [{
        Title: 'CLINIQUE IBN SINA مصحة إبن سينا',
        [header]: `${['=', '+', '@'][index % 3]}unsafe`,
      }])
      const mapping = createEmptyFieldMapping()
      mapping.name = 'Title'
      mapping[field] = header
      expect(normalizeMappedRows(sheet, mapping).errors).toContainEqual(expect.objectContaining({
        field,
        code: 'formula_like_value',
      }))
    })
  })

  it('preserves valid proper names while applying the new row validation', () => {
    const properName = `CLINIQUE IBN SINA مصحة إبن سينا — Étage 2 ${'😀'.repeat(100)}`
    const sheet = parsedSheet(['Title'], [{ Title: properName }])
    const mapping = createEmptyFieldMapping()
    mapping.name = 'Title'
    const result = normalizeMappedRows(sheet, mapping)
    expect(result.errors).toEqual([])
    expect(result.rows[0].normalized_data.name).toBe(properName)
  })

  it('rejects a mapped formula explicitly marked as lacking a cached scalar', () => {
    const sheet = parsedSheet(['Title'], [{ Title: null }])
    sheet.rows[0].formulaColumns = ['Title']
    sheet.rows[0].rejectedFormulaColumns = ['Title']
    sheet.formulaCellCount = 1
    sheet.rejectedFormulaCellCount = 1
    const mapping = createEmptyFieldMapping()
    mapping.name = 'Title'
    expect(normalizeMappedRows(sheet, mapping).errors.map((error) => error.code)).toEqual([
      'formula_without_cached_scalar',
      'missing_required_value',
    ])
  })

  it('chunks staging rows at 250 and prevents larger batches', () => {
    const values = Array.from({ length: 501 }, (_, index) => index)
    expect(chunkRows(values).map((chunk) => chunk.length)).toEqual([250, 250, 1])
    expect(chunkRows([], 250)).toEqual([])
    expect(() => chunkRows(values, 251)).toThrow(RangeError)
    expect(() => chunkRows(values, 0)).toThrow(RangeError)
  })

  it('requires a valid adjustable mapping before normalization', () => {
    const sheet = parsedSheet(['Title'], [{ Title: 'Place' }])
    const mapping = createEmptyFieldMapping() as FieldMapping
    expect(() => normalizeMappedRows(sheet, mapping)).toThrow('Invalid field mapping')
  })
})
