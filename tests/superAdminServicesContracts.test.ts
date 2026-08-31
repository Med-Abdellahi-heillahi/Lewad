import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const paths = {
  access: new URL('../src/components/admin/AdminAccess.tsx', import.meta.url),
  app: new URL('../src/App.tsx', import.meta.url),
  copyAr: new URL('../src/i18n/ar.ts', import.meta.url),
  copyEn: new URL('../src/i18n/en.ts', import.meta.url),
  copyFr: new URL('../src/i18n/fr.ts', import.meta.url),
  data: new URL('../src/lib/superAdmin.ts', import.meta.url),
  migration: new URL('../supabase/migrations/20260831000019_super_admin_services_management.sql', import.meta.url),
  page: new URL('../src/components/SuperAdminPage.tsx', import.meta.url),
  placeTypes: new URL('../src/lib/placeTypes.ts', import.meta.url),
  services: new URL('../src/components/super-admin/SuperAdminServices.tsx', import.meta.url),
  sidebar: new URL('../src/components/super-admin/SuperAdminSidebar.tsx', import.meta.url),
}

function read(path: URL) {
  return readFileSync(path, 'utf8').replaceAll('\r\n', '\n')
}

const rpcNames = [
  'super_admin_get_establishment_options',
  'super_admin_list_establishments',
  'super_admin_get_establishment_details',
  'super_admin_create_establishment',
  'super_admin_update_establishment',
  'super_admin_archive_establishment',
  'super_admin_reactivate_establishment',
] as const

describe('Super Admin services and establishments contracts', () => {
  it('keeps the page behind the active Super Admin route and exposes its dedicated tab', () => {
    const app = read(paths.app)
    const access = read(paths.access)
    const page = read(paths.page)
    const sidebar = read(paths.sidebar)

    expect(app).toContain('<RequireSuperAdmin>')
    expect(access).toContain("profile.role === 'super_admin' && profile.status === 'active'")
    expect(sidebar).toContain("{ id: 'services'")
    expect(page).toContain("activeTab === 'services'")
    expect(page).toContain('<SuperAdminServices')
  })

  it('gates every establishment RPC on the live Super Admin role without widening table access', () => {
    const sql = read(paths.migration)

    for (const rpc of rpcNames) {
      expect(sql).toContain(`create or replace function public.${rpc}`)
      expect(sql).toContain(`revoke all on function public.${rpc}`)
      expect(sql).toContain(`grant execute on function public.${rpc}`)
    }

    expect(sql.match(/security definer/g)?.length).toBeGreaterThanOrEqual(rpcNames.length)
    expect(sql.match(/not public\.is_super_admin\(\)/g)?.length).toBeGreaterThanOrEqual(rpcNames.length)
    expect(sql.match(/set search_path = ''/g)?.length).toBeGreaterThanOrEqual(rpcNames.length)
    expect(sql).not.toMatch(/create\s+policy/i)
    expect(sql).not.toMatch(/grant\s+(?:insert|update|delete)\s+on\s+public\.(?:establishments|branches)/i)
    expect(sql).not.toMatch(/delete\s+from\s+public\.establishments/i)
  })

  it('uses bounded backend pagination, deterministic ordering, escaped search, and validated filters', () => {
    const sql = read(paths.migration)

    for (const parameter of ['p_search text', 'p_status text', 'p_establishment_type text', 'p_place_type text', 'p_verified boolean', 'p_source text', 'p_category_id uuid', 'p_page integer', 'p_page_size integer']) {
      expect(sql).toContain(parameter)
    }

    expect(sql).toContain('v_page_size not in (10, 20)')
    expect(sql).toContain('v_page > 100000')
    expect(sql).toContain("replace(replace(replace(v_search, E'\\\\', E'\\\\\\\\'), '%', E'\\\\%'), '_', E'\\\\_')")
    expect(sql).toContain("ilike v_pattern escape E'\\\\'")
    expect(sql).toContain('order by establishment.created_at desc, establishment.id desc')
    expect(sql).toContain('limit v_page_size offset v_offset')
    expect(sql).toContain('establishment.place_types @> array[v_place_type]::text[]')
    expect(sql).toContain('establishments_created_at_id_idx')
    expect(sql).toContain("v_source not in ('admin_created', 'client_submission', 'map_discovery', 'unknown')")
    expect(sql).toContain("v_establishment_type not in ('private', 'public', 'administrative')")
  })

  it('returns the requested safe display fields and derives source without exposing creator data', () => {
    const sql = read(paths.migration)

    for (const field of ['name_ar', 'category_name', 'establishment_type', 'place_types', 'is_verified', 'phone', 'whatsapp', 'location', 'wilaya', 'branch_count', 'created_at', 'source']) {
      expect(sql).toContain(`'${field}'`)
    }

    expect(sql).toContain("event.action = 'external_place_discovery.imported_as_establishment'")
    expect(sql).toContain("then 'map_discovery'")
    expect(sql).toContain("then 'client_submission'")
    expect(sql).toContain("then 'admin_created'")
    expect(sql).toContain('limit 50')
    expect(sql).not.toContain("'created_by', establishment.created_by")
  })

  it('keeps updates allowlisted and archive/reactivation soft, locked, and audited', () => {
    const sql = read(paths.migration)
    const archive = sql.slice(sql.indexOf('create or replace function public.super_admin_archive_establishment'), sql.indexOf('create or replace function public.super_admin_reactivate_establishment'))
    const reactivate = sql.slice(sql.indexOf('create or replace function public.super_admin_reactivate_establishment'), sql.indexOf("select pg_notify('pgrst'"))

    expect(sql).toContain('p_latitude numeric')
    expect(sql).toContain('p_longitude numeric')
    expect(sql.match(/pg_catalog\.cardinality\(v_place_types\) = 0/g)?.length).toBe(2)
    expect(sql).toContain("p_latitude = 'NaN'::numeric")
    expect(sql).toContain('p_latitude < -90 or p_latitude > 90')
    expect(sql).toContain('p_longitude < -180 or p_longitude > 180')
    expect(sql).toContain('insert into public.admin_audit_events')
    expect(sql).toContain("'establishment.created_by_super_admin'")
    expect(sql).toContain("'establishment.updated_by_super_admin'")

    expect(archive).toContain('for update')
    expect(archive).toContain("set status = 'suspended'")
    expect(archive).toContain("'establishment.archived_by_super_admin'")
    expect(reactivate).toContain('for update')
    expect(reactivate).toContain("set status = 'approved'")
    expect(reactivate).toContain("'establishment.reactivated_by_super_admin'")
  })

  it('keeps all Supabase access in typed RPC wrappers with no direct or destructive table call', () => {
    const data = read(paths.data)

    for (const rpc of rpcNames) expect(data).toContain(`supabase.rpc('${rpc}'`)
    expect(data).toContain("type PlaceTypeKey } from './placeTypes'")
    expect(data).not.toContain(".from('establishments')")
    expect(data).not.toContain('.delete(')
    expect(data).not.toContain('service_role')
  })

  it('provides search, stable-key filters, backend page sizes, and confirmed actions in the UI', () => {
    const services = read(paths.services)

    for (const key of ['search', 'status', 'placeType', 'establishmentType', 'verified', 'source', 'categoryId']) {
      expect(services).toContain(`${key}:`)
    }

    expect(services).toContain('PaginationControls')
    expect(services).toContain("useState<10 | 20>(10)")
    expect(services).toContain("kind: 'details'")
    expect(services).toContain("kind: 'add'")
    expect(services).toContain("kind: 'edit'")
    expect(services).toContain("kind: 'transition'")
    expect(services).toContain("establishment.status === 'approved'")
    expect(services).toContain("establishment.status === 'suspended'")
    expect(services).toContain('archiveSuperAdminEstablishment')
    expect(services).toContain('reactivateSuperAdminEstablishment')
    expect(services).toContain('copy.archiveTitle')
    expect(services).toContain('copy.reactivateTitle')
    expect(services).toContain('MapLocationPicker')
    expect(services).toContain('detailsRequestId')
    expect(services).toContain('editRequestId')
    expect(services).toContain('page > lastPage')
    expect(services).toContain('copy.branchPreview')
    expect(services).not.toContain('.delete(')
  })

  it('translates the section and every stable place-type key in French, Arabic, and English', () => {
    const placeTypes = read(paths.placeTypes)
    const copies = [read(paths.copyFr), read(paths.copyAr), read(paths.copyEn)]
    const stableKeys = ['establishment', 'company', 'region', 'moughataa', 'wilaya', 'sports_hall', 'restaurant', 'hall', 'administration', 'private', 'public']

    expect(copies[0]).toContain('title: "Services et établissements"')
    expect(copies[1]).toContain('title: "الخدمات والمؤسسات"')
    expect(copies[2]).toContain('title: "Services and establishments"')

    for (const key of stableKeys) {
      expect(placeTypes).toContain(`'${key}'`)
      for (const copy of copies) expect(copy).toContain(`${key}:`)
    }
  })
})
