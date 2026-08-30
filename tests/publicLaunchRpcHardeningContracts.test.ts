import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const hardeningMigrationPath = new URL(
  '../supabase/migrations/20260830000017_public_launch_rpc_hardening.sql',
  import.meta.url,
)
const supportedImportMigrationPath = new URL(
  '../supabase/migrations/20260826000016_fix_external_place_import_rpc_coalesce.sql',
  import.meta.url,
)
const adminDataPath = new URL('../src/lib/admin.ts', import.meta.url)

function read(path: URL) {
  return readFileSync(path, 'utf8').replaceAll('\r\n', '\n')
}

describe('public launch RPC hardening contracts', () => {
  it('removes the imported transition from the legacy review RPC and retires its browser grant', () => {
    const sql = read(hardeningMigrationPath)
    const reviewStart = sql.indexOf(
      'create or replace function public.admin_review_external_place_discovery(',
    )
    const reviewEnd = sql.indexOf('$$;', reviewStart)
    const reviewFunction = sql.slice(reviewStart, reviewEnd)

    expect(reviewStart).toBeGreaterThan(-1)
    expect(reviewEnd).toBeGreaterThan(reviewStart)
    expect(reviewFunction).toContain("if v_source_status <> 'rejected' then")
    expect(reviewFunction).toContain(
      'return public.admin_reject_external_place_discovery(p_discovery_id);',
    )
    expect(reviewFunction).not.toContain("'imported'")
    expect(reviewFunction).not.toContain('update public.external_place_discoveries')
    expect(sql).toContain(
      'revoke all on function public.admin_review_external_place_discovery(uuid, text) from public, anon, authenticated;',
    )
  })

  it('retires both obsolete import signatures without dropping the internal helper', () => {
    const sql = read(hardeningMigrationPath)
    const supportedImport = read(supportedImportMigrationPath)
    const adminData = read(adminDataPath)

    expect(sql).toContain(
      'revoke all on function public.admin_import_external_place_discovery_as_establishment(uuid, text[]) from public, anon, authenticated;',
    )
    expect(sql).toContain(
      'revoke all on function public.admin_import_external_place_discovery_as_establishment(uuid) from public, anon, authenticated;',
    )
    expect(sql).not.toContain('drop function')
    expect(supportedImport).toContain(
      'create or replace function public.admin_import_external_place_discovery_with_types(',
    )
    expect(supportedImport).toContain(
      'public.admin_import_external_place_discovery_as_establishment(p_discovery_id)',
    )
    expect(supportedImport).toContain(
      'grant execute on function public.admin_import_external_place_discovery_with_types(uuid, text[]) to authenticated;',
    )
    expect(adminData).toContain("'admin_import_external_place_discovery_with_types'")
    expect(adminData).not.toContain("'admin_import_external_place_discovery_as_establishment'")
  })

  it('validates coordinate pairs and ranges only after the private delegation', () => {
    const sql = read(hardeningMigrationPath)
    const privateBranch = sql.indexOf("if v_type = 'private' then")
    const privateReturn = sql.indexOf('return v_response;', privateBranch)
    const coordinatePairCheck = sql.indexOf(
      'if (p_latitude is null) <> (p_longitude is null) then',
    )
    const branchInsert = sql.indexOf('insert into public.branches')

    expect(privateBranch).toBeGreaterThan(-1)
    expect(privateReturn).toBeGreaterThan(privateBranch)
    expect(coordinatePairCheck).toBeGreaterThan(privateReturn)
    expect(branchInsert).toBeGreaterThan(coordinatePairCheck)
    expect(sql).toContain("p_latitude = 'NaN'::numeric or p_longitude = 'NaN'::numeric")
    expect(sql).toContain('or p_latitude < -90 or p_latitude > 90')
    expect(sql).toContain('or p_longitude < -180 or p_longitude > 180')
    expect(sql).toContain("'status', 'invalid_coordinates'")
    expect(sql).toContain("if v_type = 'public' or v_type = 'administrative' then")
    expect(sql).toContain(
      'grant execute on function public.admin_create_establishment(text, text, text, text, text, text, text, date, date, uuid, numeric, numeric) to authenticated;',
    )
  })
})
