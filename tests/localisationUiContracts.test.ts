import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const paths = {
  app: new URL('../src/App.tsx', import.meta.url),
  access: new URL('../src/components/admin/AdminAccess.tsx', import.meta.url),
  adminPage: new URL('../src/components/AdminPage.tsx', import.meta.url),
  superAdminPage: new URL('../src/components/SuperAdminPage.tsx', import.meta.url),
  sidebar: new URL('../src/components/super-admin/SuperAdminSidebar.tsx', import.meta.url),
  page: new URL('../src/components/super-admin/SuperAdminLocalisationImport.tsx', import.meta.url),
  copy: new URL('../src/components/super-admin/localisationImportCopy.ts', import.meta.url),
  adminCopy: new URL('../src/components/admin/adminCopy.ts', import.meta.url),
  parser: new URL('../src/lib/localisationImport.ts', import.meta.url),
  api: new URL('../src/lib/localisationImportApi.ts', import.meta.url),
  appDemo: new URL('../src/components/AppDemo.tsx', import.meta.url),
  searchLocation: new URL('../src/lib/searchLocationContext.ts', import.meta.url),
  migration: new URL('../supabase/migrations/20260901000022_localisation_excel_import.sql', import.meta.url),
}

function read(path: URL) {
  return readFileSync(path, 'utf8').replaceAll('\r\n', '\n')
}

function runtimeSources(directory = fileURLToPath(new URL('../src/', import.meta.url))): string {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) return [runtimeSources(path)]
    if (!entry.isFile() || !/\.(?:ts|tsx)$/.test(entry.name) || entry.name.endsWith('.test.ts')) return []
    return [readFileSync(path, 'utf8')]
  }).join('\n')
}

describe('localisation import Super Admin UI contracts', () => {
  it('routes the page only through the existing active Super Admin guard', () => {
    const app = read(paths.app)
    const access = read(paths.access)
    const superAdminPage = read(paths.superAdminPage)
    const sidebar = read(paths.sidebar)
    const adminPage = read(paths.adminPage)

    expect(app).toContain('<RequireSuperAdmin>')
    expect(app).toContain("path === '/super-admin' || path.startsWith('/super-admin/')")
    expect(access).toContain("profile.role === 'super_admin' && profile.status === 'active'")
    expect(superAdminPage).toContain("path === '/super-admin/localisation-import'")
    expect(superAdminPage).toContain("if (tab === 'localisation-import') return '/super-admin/localisation-import'")
    expect(superAdminPage).toContain("activeTab === 'localisation-import' && <SuperAdminLocalisationImport />")
    expect(sidebar).toContain("{ id: 'localisation-import', icon: FileSpreadsheet }")
    expect(adminPage).not.toContain('SuperAdminLocalisationImport')
    expect(adminPage).not.toContain('localisation-import')
  })

  it('implements upload, multi-sheet selection, adjustable mapping, preview, dry run, apply, and history', () => {
    const page = read(paths.page)

    expect(page).toContain('type="file"')
    expect(page).toContain('accept=".xlsx,.xls,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"')
    expect(page).toContain('parseLocalisationFile(file)')
    expect(page).toContain('workbook.sheets.map')
    expect(page).toContain('setSheetIndex(nextIndex)')
    expect(page).toContain('CANONICAL_LOCALISATION_FIELDS.map')
    expect(page).toContain('autoMapHeaders(')
    expect(page).toContain('validateMapping(mapping, sheet?.headers)')
    expect(page).toContain('sheet.rows.slice(0, 5).map')
    expect(page).toContain('normalizeMappedRows(sheet, mapping, entityType)')
    expect(page).toContain('createLocalisationImportBatch({')
    expect(page).toContain('for (const rows of chunkRows(normalized.rows))')
    expect(page).toContain('stageLocalisationImportRows(created.data.id, rows)')
    expect(page).toContain('validateLocalisationImportBatch(created.data.id)')
    expect(page).toContain('const activeValidation = validation?.batchId === activeBatchId ? validation : null')
    expect(page).toContain('const activeApplyResult = applyResult?.batchId === activeBatchId ? applyResult : null')
    expect(page).toContain('if (!activeBatchId || !activeValidation || activeValidation.invalidRows > 0) return')
    expect(page).toContain('disabled={processing || !activeValidation || activeValidation.invalidRows > 0 || activeValidation.validRows === 0 || Boolean(activeApplyResult)}')
    expect(page).toContain('setConfirmOpen(true)')
    expect(page).toContain('applyLocalisationImportBatch(activeBatchId)')
    expect(page).toContain('listLocalisationImportBatches({ page: 1, pageSize: 20 })')
    expect(page).toContain('getLocalisationImportBatchDetails(batchId, { page: 1, pageSize: 100 })')
  })

  it('opens import history through a keyboard-accessible filename control', () => {
    const page = read(paths.page)

    expect(page).toMatch(/<button\s+type="button"\s+dir="auto"\s+className="[^"]*focus-visible:ring-2[^"]*"/)
    expect(page).toContain('{batch.fileName}')
    expect(page).not.toMatch(/<tr[^>]*\bonClick=/)
  })

  it('enforces reviewed browser limits and rejects unsupported legacy XLS before reading it', () => {
    const parser = read(paths.parser)
    const page = read(paths.page)
    const copy = read(paths.copy)

    expect(parser).toContain('export const MAX_LOCALISATION_FILE_BYTES = 5 * 1024 * 1024')
    expect(parser).toContain('export const MAX_LOCALISATION_ROWS = 10_000')
    expect(parser).toContain('export const MAX_LOCALISATION_COLUMNS = 32')
    expect(parser).toContain('export const MAX_LOCALISATION_CELL_LENGTH = 4_096')
    expect(parser).toContain('export const LOCALISATION_STAGE_CHUNK_SIZE = 250')
    expect(parser.indexOf("if (extension === 'xls')")).toBeLessThan(parser.indexOf('await file.arrayBuffer()'))
    expect(page).toContain('accept=".xlsx,.xls,.csv')
    expect(copy).toContain("legacyXls: 'Les anciens fichiers .xls ne sont pas pris en charge. Convertissez-les en .xlsx.'")
    expect(copy).toContain("legacyXls: 'ملفات .xls القديمة غير مدعومة. حوّلها إلى .xlsx.'")
    expect(copy).toContain("legacyXls: 'Legacy .xls files are unsupported. Convert them to .xlsx first.'")
  })

  it('renders untrusted workbook values as plain React text and never executes formulas or HTML', () => {
    const parser = read(paths.parser)
    const page = read(paths.page)

    expect(parser).toContain("await import('read-excel-file/browser')")
    expect(parser).toContain('read-excel-file never executes formulas')
    expect(parser).toContain('It returns only an already-cached')
    expect(parser).toContain("code: 'formula_without_cached_scalar'")
    expect(page).toContain('{cellText(row.values[header])}')
    expect(page).toContain('dir="auto"')
    expect(page).toContain('whitespace-normal break-words')
    expect(page).not.toContain('dangerouslySetInnerHTML')
    expect(page).not.toMatch(/\.innerHTML\s*=/)
    expect(page).not.toContain('eval(')
  })

  it('provides the requested French, Arabic, and English navigation and confirmation copy', () => {
    const copy = read(paths.copy)
    const adminCopy = read(paths.adminCopy)

    expect(adminCopy).toContain("'localisation-import': 'Import localisation'")
    expect(adminCopy).toContain("'localisation-import': 'استيراد المواقع'")
    expect(adminCopy).toContain("'localisation-import': 'Localization import'")
    expect(copy).toContain("confirmTitle: 'Confirmer l’importation'")
    expect(copy).toContain("confirmWarning: 'Cette action ajoutera ou mettra à jour les données de localisation. Vérifiez les erreurs avant de continuer.'")
    expect(copy).toContain("confirmTitle: 'تأكيد الاستيراد'")
    expect(copy).toContain("confirmWarning: 'سيؤدي هذا الإجراء إلى إضافة أو تحديث بيانات المواقع. تحقق من الأخطاء قبل المتابعة.'")
    expect(copy).toContain("confirmTitle: 'Confirm import'")
    expect(copy).toContain("confirmWarning: 'This action will add or update localization data. Review errors before continuing.'")
    expect(copy).toContain("previewText: 'تُعرض الصفوف الخمسة الأولى كنص عادي.'")
    expect(copy).toContain("duplicateRows: 'Doublons / correspondances'")
    expect(copy).toContain("duplicateRows: 'صفوف مكررة / مطابقة'")
    expect(copy).toContain("duplicateRows: 'Duplicate / matched rows'")
    expect(copy).toContain("expired: 'Expiré'")
    expect(copy).toContain("expired: 'منتهي الصلاحية'")
    expect(copy).toContain("expired: 'Expired'")
    expect(copy).not.toContain('Doublons ignorés')
    expect(copy).not.toContain('التكرارات المتجاهلة')
    expect(copy).not.toContain('Skipped duplicates')
  })

  it('keeps the importer mobile/RTL-safe and reports row-level failures without raw markup', () => {
    const page = read(paths.page)

    expect(page).toContain('sm:grid-cols-2')
    expect(page).toContain('xl:grid-cols-3')
    expect(page).toContain('overflow-x-auto')
    expect(page).toContain('flex-col-reverse')
    expect(page).toContain('sm:flex-row')
    expect(page).toContain('text-start')
    expect(page).not.toContain('text-left')
    expect(page).not.toContain('text-right')
    expect(page).toContain('row.validationErrors.map')
    expect(page).toContain('{error.message || error.code}')
  })

  it('keeps wallet debit, paid search, map fallback, and existing wilaya filters outside import code', () => {
    const feature = [read(paths.page), read(paths.parser), read(paths.api), read(paths.migration)].join('\n')
    const appDemo = read(paths.appDemo)
    const searchLocation = read(paths.searchLocation)

    expect(feature).not.toMatch(/search_services_with_credit|applyWalletBalance|debited_points|credit_ledger|wallet_transactions/)
    expect(feature).not.toContain('searchExternalPlace')
    expect(feature).not.toContain('MAURITANIA_WILAYAS')

    expect(appDemo).toContain('result = await searchServicesWithCredit(requestedQuery)')
    expect(appDemo).toContain('if (result.balance !== null) applyWalletBalance(result.balance)')
    expect(appDemo).toContain('setDebited(result.debitedPoints === 1)')
    expect(appDemo).toContain('if (result.status !== "not_found")')
    expect(appDemo).toContain('response = await searchExternalPlace({')
    expect(appDemo).toContain('MAURITANIA_WILAYAS.map')
    expect(searchLocation).toContain('export const MAURITANIA_WILAYAS = [')
    expect(searchLocation).toContain('"Nouakchott Ouest"')
  })

  it('keeps credentials and service-role access out of all frontend runtime source', () => {
    const frontend = runtimeSources()

    expect(frontend).not.toContain('service_role')
    expect(frontend).not.toMatch(/SUPABASE_SERVICE_ROLE|DATABASE_URL|POSTGRES_PASSWORD|JWT_SECRET|PRIVATE_KEY|API_SECRET|sb_secret_/)
  })
})
