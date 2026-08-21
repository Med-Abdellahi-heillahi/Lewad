import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const mapsMigrationPath = new URL('../supabase/migrations/20260821000003_db4_maps_location_support.sql', import.meta.url)
const searchMigrationPath = new URL('../supabase/migrations/20260819000002_phase_db3a_secure_search_credit_debit.sql', import.meta.url)
const submissionsDataLayerPath = new URL('../src/lib/businessSubmissions.ts', import.meta.url)
const searchDataLayerPath = new URL('../src/lib/db3a.ts', import.meta.url)
const branchTypePath = new URL('../src/lib/db2.ts', import.meta.url)

function mapsMigration() {
  return readFileSync(mapsMigrationPath, 'utf8')
}

describe('DB4 map-location contracts', () => {
  it('adds nullable historic columns while requiring a coordinate pair for every new submission', () => {
    const sql = mapsMigration()

    expect(sql).toContain('add column if not exists latitude numeric')
    expect(sql).toContain('add column if not exists longitude numeric')
    expect(sql).toContain('business_submissions_coordinates_in_range')
    expect(sql).toContain('p_latitude numeric')
    expect(sql).toContain('p_longitude numeric')
    expect(sql).toContain('if p_latitude is null or p_longitude is null then')
    expect(sql).toContain("'status', 'invalid_coordinates'")
    expect(sql).toContain('p_latitude < -90 or p_latitude > 90')
    expect(sql).toContain('p_longitude < -180 or p_longitude > 180')
    expect(sql).not.toContain('p_amount_mro')
  })

  it('copies the validated submission point into the approved main branch', () => {
    const sql = mapsMigration()

    expect(sql).toContain('v_submission.latitude is null or v_submission.longitude is null')
    expect(sql).toContain('address,\n    neighborhood,\n    latitude,\n    longitude,')
    expect(sql).toContain('v_submission.location,\n    v_submission.nearest_place,\n    v_submission.latitude,\n    v_submission.longitude,')
  })

  it('keeps admin-created branch coordinates optional but validates and saves them as a pair', () => {
    const sql = mapsMigration()

    expect(sql).toContain('p_latitude numeric default null')
    expect(sql).toContain('p_longitude numeric default null')
    expect(sql).toContain('if (p_latitude is null) <> (p_longitude is null) then')
    expect(sql).toContain('set latitude = p_latitude,\n      longitude = p_longitude')
    expect(sql).toContain('grant execute on function public.admin_create_establishment(text, text, text, text, text, text, date, date, uuid, numeric, numeric) to authenticated;')
  })

  it('keeps search map data available through the existing bounded search RPC and typed branch model', () => {
    const searchSql = readFileSync(searchMigrationPath, 'utf8')
    const searchSource = readFileSync(searchDataLayerPath, 'utf8')
    const branchSource = readFileSync(branchTypePath, 'utf8')

    expect(searchSql).toContain("'address', branch.address")
    expect(searchSql).toContain("'neighborhood', branch.neighborhood")
    expect(searchSql).toContain("'latitude', branch.latitude")
    expect(searchSql).toContain("'longitude', branch.longitude")
    expect(searchSource).toContain("supabase.rpc('search_services_with_credit'")
    expect(branchSource).toContain('latitude: number | null')
    expect(branchSource).toContain('longitude: number | null')
  })

  it('keeps the browser submission boundary typed and RPC-only', () => {
    const source = readFileSync(submissionsDataLayerPath, 'utf8')

    expect(source).toContain('latitude: number')
    expect(source).toContain('longitude: number')
    expect(source).toContain('p_latitude: input.latitude')
    expect(source).toContain('p_longitude: input.longitude')
    expect(source).not.toContain(".from('business_submissions')")
  })
})
