import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  createAdminExternalPlaceImportDetails,
  resolvedAdminExternalPlaceName,
  toAdminExternalPlaceImportDetailsPayload,
  toAdminExternalPlaceImportRpcParams,
  validateAdminExternalPlaceImportDetails,
  validateAdminExternalPlaceImportTypes,
  visibleAdminExternalPlaceImportFields,
} from '../src/lib/adminExternalPlaceImport'
import { PLACE_TYPE_KEYS } from '../src/lib/placeTypes'

const adminPagePath = new URL('../src/components/AdminPage.tsx', import.meta.url)
const adminLibPath = new URL('../src/lib/admin.ts', import.meta.url)
const importModalPath = new URL('../src/components/admin/AdminExternalPlaceImportModal.tsx', import.meta.url)
const adminUiPath = new URL('../src/components/admin/AdminUi.tsx', import.meta.url)
const adminCopyPath = new URL('../src/components/admin/adminCopy.ts', import.meta.url)
const adminAccessPath = new URL('../src/components/admin/AdminAccess.tsx', import.meta.url)
const appPath = new URL('../src/App.tsx', import.meta.url)
const clientSearchPath = new URL('../src/lib/externalPlaceSearch.ts', import.meta.url)
const edgeFunctionPath = new URL('../supabase/functions/geocode-place/index.ts', import.meta.url)
const importMigrationPath = new URL('../supabase/migrations/20260831000018_admin_import_extra_fields.sql', import.meta.url)
const legacyImportMigrationPath = new URL('../supabase/migrations/20260826000013_admin_external_place_review_actions.sql', import.meta.url)

function read(path: URL) {
  return readFileSync(path, 'utf8').replaceAll('\r\n', '\n')
}

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) return sourceFiles(path)
    return /\.(?:ts|tsx)$/.test(entry.name) ? [readFileSync(path, 'utf8')] : []
  })
}

describe('admin verification import form behavior', () => {
  it('requires at least one internal place type before import', () => {
    expect(validateAdminExternalPlaceImportTypes([])).toBe('types_required')
    expect(validateAdminExternalPlaceImportTypes(['restaurant'])).toBeNull()
    expect(validateAdminExternalPlaceImportTypes(['company', 'administration'])).toBe('conflicting_natures')
    expect(PLACE_TYPE_KEYS).toEqual([
      'establishment',
      'company',
      'region',
      'moughataa',
      'wilaya',
      'sports_hall',
      'restaurant',
      'hall',
      'administration',
      'private',
      'public',
    ])
  })

  it('sends the corrected name, normalized phone, and exact internal type keys in the RPC payload', () => {
    const details = createAdminExternalPlaceImportDetails()
    details.correctedName = '  Marché central  '
    details.phone = '  45 25 00 00  '
    details.label = '  Commerce local  '

    expect(toAdminExternalPlaceImportRpcParams({
      discoveryId: 'discovery-1',
      selectedTypes: ['restaurant', 'private'],
      details,
    })).toEqual({
      p_discovery_id: 'discovery-1',
      p_selected_types: ['restaurant', 'private'],
      p_details: {
        corrected_name: 'Marché central',
        phone: '45250000',
        label: 'Commerce local',
      },
    })
  })

  it('uses the provider display name when the corrected name is blank', () => {
    const details = createAdminExternalPlaceImportDetails()
    details.correctedName = '   '
    expect(resolvedAdminExternalPlaceName('Provider original name', details)).toBe('Provider original name')
    expect(toAdminExternalPlaceImportDetailsPayload(['public'], details)).toEqual({})
    expect(toAdminExternalPlaceImportRpcParams({
      discoveryId: 'discovery-2',
      selectedTypes: ['public'],
      details,
    })).toEqual({
      p_discovery_id: 'discovery-2',
      p_selected_types: ['public'],
    })
  })

  it('keeps private/business fields optional and config driven', () => {
    const details = createAdminExternalPlaceImportDetails()
    const fields = visibleAdminExternalPlaceImportFields(['company', 'private'])
    expect(fields).toContain('phone')
    expect(fields).not.toContain('parentMinistry')
    expect(toAdminExternalPlaceImportDetailsPayload(['company', 'private'], details)).toEqual({})
    expect(validateAdminExternalPlaceImportDetails(['company', 'private'], details)).toBeNull()
  })

  it('keeps public/administrative fields optional and omits hidden stale fields', () => {
    const details = createAdminExternalPlaceImportDetails()
    details.phone = '45250000'
    const fields = visibleAdminExternalPlaceImportFields(['administration', 'public'])
    expect(fields).toContain('parentMinistry')
    expect(fields).toContain('parentAdministration')
    expect(fields).not.toContain('phone')
    expect(toAdminExternalPlaceImportDetailsPayload(['administration', 'public'], details)).toEqual({})
  })

  it('validates provided contact details without making them mandatory', () => {
    const details = createAdminExternalPlaceImportDetails()
    details.phone = 'not a number'
    expect(validateAdminExternalPlaceImportDetails(['company'], details)).toBe('invalid_phone')
    details.phone = '+222 45 25 00 00'
    details.whatsapp = '36 00 00 00'
    expect(validateAdminExternalPlaceImportDetails(['company'], details)).toBeNull()
    expect(toAdminExternalPlaceImportDetailsPayload(['company'], details)).toMatchObject({
      phone: '45250000',
      whatsapp: '36000000',
    })
  })
})

describe('admin verification import UI and security contracts', () => {
  it('provides the three-step modal and exact FR/AR/EN field labels', () => {
    const modal = read(importModalPath)
    const adminUi = read(adminUiPath)
    const copy = read(adminCopyPath)

    expect(modal).toContain('AdminExternalPlaceImportModal')
    expect(modal).toContain("useState<1 | 2 | 3>(1)")
    expect(modal).toContain("fieldKey === 'notes'")
    expect(modal).toContain('label={fieldLabels[fieldKey]}')
    expect(modal).toContain('onClose={guardedClose}')
    expect(adminUi).toContain('const onCloseRef = useRef(onClose)')
    expect(adminUi).toContain("if (event.key !== 'Tab') return")
    expect(copy).toContain("correctedName: 'Nom corrigé'")
    expect(copy).toContain("verificationPlace: 'Lieu de vérification'")
    expect(copy).toContain("parentMinistry: 'Ministère de tutelle'")
    expect(copy).toContain("parentAdministration: 'Administration de tutelle'")
    expect(copy).toContain("correctedName: 'الاسم المصحح'")
    expect(copy).toContain("parentMinistry: 'الوزارة التابعة لها'")
    expect(copy).toContain("parentAdministration: 'الإدارة التابعة لها'")
    expect(copy).toContain("correctedName: 'Corrected name'")
    expect(copy).toContain("parentMinistry: 'Parent ministry'")
    expect(copy).toContain("parentAdministration: 'Parent administration'")
  })

  it('keeps the modal behind authentication and the active-admin route guard', () => {
    const app = read(appPath)
    const access = read(adminAccessPath)
    const adminPage = read(adminPagePath)
    const adminLib = read(adminLibPath)

    expect(app).toContain("if (route === 'admin') return <RequireAuthentication>")
    expect(app).toContain('<RequireAdmin>')
    expect(access).toContain("profile.role !== 'admin' && profile.role !== 'super_admin'")
    expect(access).toContain("profile.status !== 'active'")
    expect(adminPage).toContain('<AdminExternalPlaceImportModal')
    expect(adminPage).toContain("activeError === 'backend_update_required'")
    expect(adminLib).toContain("return missingReviewedTypes ? 'backend_update_required' : 'unavailable'")
  })

  it('keeps service-role credentials and client auto-approval out of frontend search', () => {
    const frontend = sourceFiles(fileURLToPath(new URL('../src/', import.meta.url))).join('\n')
    const clientSearch = read(clientSearchPath)
    const edgeFunction = read(edgeFunctionPath)

    expect(frontend).not.toContain('service_role')
    expect(clientSearch).not.toContain('admin_import_external_place')
    expect(edgeFunction).toContain('"create_external_place_discovery"')
    expect(edgeFunction).not.toContain('admin_import_external_place')
  })

  it('keeps import server-authorized, approved, active, and non-overwriting for duplicates', () => {
    const sql = read(importMigrationPath)
    const legacy = read(legacyImportMigrationPath)

    expect(sql).toContain('if not public.is_admin() then')
    expect(sql).toContain("return jsonb_build_object('ok', false, 'status', 'invalid_types')")
    expect(sql).toContain("return jsonb_build_object('ok', false, 'status', 'conflicting_natures')")
    expect(sql).toContain("where pg_catalog.jsonb_typeof(detail.detail_value) not in ('string', 'null')")
    expect(sql).toContain("if v_response ->> 'status' = 'imported' then")
    expect(sql).toContain('set reviewed_place_types = v_selected_types')
    expect(sql).toContain('drop index if exists public.external_place_discoveries_imported_establishment_uidx')
    expect(sql).toContain('grant execute on function public.admin_import_external_place_discovery_with_types(uuid, text[], jsonb) to authenticated')
    expect(legacy).toContain("'approved'")
    expect(legacy).toContain("'active'")
  })
})
