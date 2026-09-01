import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const migrationPath = new URL(
  '../supabase/migrations/20260901000022_localisation_excel_import.sql',
  import.meta.url,
)
const apiPath = new URL('../src/lib/localisationImportApi.ts', import.meta.url)

function read(path: URL) {
  return readFileSync(path, 'utf8').replaceAll('\r\n', '\n')
}

const rpcNames = [
  'super_admin_create_localisation_import_batch',
  'super_admin_stage_localisation_import_rows',
  'super_admin_validate_localisation_import_batch',
  'super_admin_apply_localisation_import_batch',
  'super_admin_get_localisation_import_batches',
  'super_admin_get_localisation_import_batch_details',
  'super_admin_purge_localisation_import_rows',
] as const

function functionBody(sql: string, rpc: string) {
  const start = sql.indexOf(`create or replace function public.${rpc}`)
  expect(start).toBeGreaterThan(-1)
  const next = sql.indexOf('create or replace function public.', start + 1)
  return sql.slice(start, next < 0 ? sql.length : next)
}

describe('localisation import database contracts', () => {
  it('creates the generic staging and final schema derived from the supplied place corpus', () => {
    const sql = read(migrationPath)

    expect(sql).toContain('create table if not exists public.localisation_import_batches')
    expect(sql).toContain('create table if not exists public.localisation_import_rows')
    expect(sql).toContain('create table if not exists public.localisation_places')
    expect(sql).toContain('dependable hierarchy, row-coordinate pair, or language-column convention.')
    expect(sql).not.toContain('create table if not exists public.wilayas')
    expect(sql).not.toContain('create table if not exists public.moughataas')
    expect(sql).not.toContain('create table if not exists public.communes')

    for (const field of [
      'entity_type text not null', 'name text not null', 'name_fr text', 'name_ar text',
      'name_en text', 'category text', 'address text', 'wilaya text', 'phone text',
      'opening_status text', "amenities text[] not null default '{}'::text[]", 'source_url text',
      'latitude numeric(9, 6)', 'longitude numeric(10, 6)',
    ]) expect(sql).toContain(field)
    expect(sql).toContain("status in ('created', 'staging', 'validated', 'invalid', 'applied', 'expired')")
  })

  it('enables RLS and removes all direct browser access to batches, staging, and final rows', () => {
    const sql = read(migrationPath)
    const tables = ['localisation_import_batches', 'localisation_import_rows', 'localisation_places']

    for (const table of tables) {
      expect(sql).toContain(`alter table public.${table} enable row level security;`)
      expect(sql).toContain(`revoke all on table public.${table} from public, anon, authenticated;`)
    }
    expect(sql).not.toMatch(/create\s+policy/i)
    expect(sql).not.toMatch(/grant\s+(?:select|insert|update|delete)\s+on(?:\s+table)?\s+public\.localisation_/i)
    expect(sql.toLowerCase()).not.toContain('disable row level security')
  })

  it('gates every import RPC on an active Super Admin with a fixed empty search path', () => {
    const sql = read(migrationPath)

    for (const rpc of rpcNames) {
      const body = functionBody(sql, rpc)
      expect(body).toContain('security definer')
      expect(body).toContain("set search_path = ''")
      expect(body).toContain('auth.uid() is null or not public.is_super_admin()')
      expect(sql).toContain(`revoke all on function public.${rpc}`)
      expect(sql).toContain(`grant execute on function public.${rpc}`)
    }

    expect(sql).not.toMatch(/grant execute on function public\.super_admin_[^;]+\bto\s+(?:anon|public)\b/i)
  })

  it('keeps staging, dry-run validation, and final application as separate server transitions', () => {
    const sql = read(migrationPath)
    const stage = functionBody(sql, 'super_admin_stage_localisation_import_rows')
    const validate = functionBody(sql, 'super_admin_validate_localisation_import_batch')
    const apply = functionBody(sql, 'super_admin_apply_localisation_import_batch')

    expect(stage).toContain('insert into public.localisation_import_rows')
    expect(stage).toContain("set status = 'staging'")
    expect(stage).toContain("if v_batch.status in ('applied', 'expired') then")
    expect(stage).toContain('An applied or expired import batch cannot be changed.')
    expect(stage).not.toContain('insert into public.localisation_places')
    expect(stage).not.toContain('update public.localisation_places')

    expect(validate).toContain("if v_batch.status in ('applied', 'expired') then")
    expect(validate).toContain('An applied or expired import batch cannot be revalidated.')
    expect(validate).toContain('All declared rows must be staged before validation.')
    expect(validate).toContain("v_batch_status := case when v_invalid_rows = 0 then 'validated' else 'invalid' end")
    expect(validate).not.toContain('insert into public.localisation_places')
    expect(validate).not.toContain('update public.localisation_places')

    expect(apply).toContain("v_batch.status <> 'validated' or v_batch.invalid_rows <> 0")
    expect(apply).toContain("status in ('valid', 'duplicate')")
    expect(apply).not.toContain("if v_row.status = 'duplicate'")
    expect(apply).toContain('order by staged.dedupe_key, staged.row_number, staged.id')
    expect(apply).toContain('pg_advisory_xact_lock(pg_catalog.hashtextextended(v_row.dedupe_key, 0))')
    expect(apply).toContain('insert into public.localisation_places')
    expect(apply).toContain('on conflict (dedupe_key) do nothing')
    expect(apply).toContain('where place.dedupe_key = v_row.dedupe_key')
    expect(apply).toContain('for update;')
    expect(apply).toContain('update public.localisation_places as place')
    expect(apply).toContain('name_fr = coalesce(place.name_fr, v_name_fr)')
    expect(apply).not.toContain('set name =')
    expect(apply).toContain("set status = 'applied'")
    expect(apply).toContain("if v_batch.status = 'applied' then")
    expect(apply).toContain("'already_applied', true")
  })

  it('validates names, coordinates, safe URLs, formulas, and transparent duplicate handling', () => {
    const sql = read(migrationPath)
    const validate = functionBody(sql, 'super_admin_validate_localisation_import_batch')

    expect(sql).toContain('name = pg_catalog.btrim(name)')
    expect(sql).toContain('latitude between -90 and 90')
    expect(sql).toContain('longitude between -180 and 180')
    expect(sql).toContain('(latitude is null and longitude is null)')
    expect(sql).toContain("source_url ~* '^https?://[^/[:space:]]+[^[:space:]]*$'")
    expect(validate).toContain("'formula_like_value'")
    expect(validate).toContain('pg_catalog.pg_column_size(v_amenities) > 8192')
    expect(validate).toContain("'amenities_too_large'")
    expect(validate).toContain('pg_catalog.pg_column_size(v_data) > 16384')
    expect(validate).toContain("'normalized_data_too_large'")
    expect(validate).toContain("v_text_value ~ '^[=+@]'")
    expect(validate).toContain("elsif v_entity_type <> v_batch.entity_type then")
    expect(validate).toContain("'code', 'batch_mismatch'")
    expect(validate).toContain('Row entity type must match the import batch.')
    expect(validate).toContain('v_latitude := pg_catalog.round(v_latitude, 6)')
    expect(validate).toContain('v_longitude := pg_catalog.round(v_longitude, 6)')
    expect(validate).toContain("status = 'duplicate'")
    expect(validate).toContain("duplicate_kind = 'batch'")
    expect(validate).toContain("duplicate_kind = case when v_matched_place_id is null then null else 'final' end")
    expect(sql).toContain('constraint localisation_places_dedupe_key_unique unique (dedupe_key)')
    expect(sql).toContain('localisation_import_rows_batch_dedupe_idx')
  })

  it('bounds files, mapping, chunks, rows, JSON payloads, pages, and retention', () => {
    const sql = read(migrationPath)

    expect(sql).toContain("file_type in ('xlsx', 'csv')")
    expect(sql).toContain('p_total_rows > 10000')
    expect(sql).toContain('v_input_count < 1 or v_input_count > 250')
    expect(sql).toContain('pg_catalog.pg_column_size(v_raw_data) > 65536')
    expect(sql).toContain('pg_catalog.pg_column_size(v_normalized_data) > 16384')
    expect(sql).toContain('v_page > 100000')
    expect(sql).toContain('v_page_size not in (10, 20, 50, 100)')
    expect(sql).toContain('p_older_than_days < 1 or p_older_than_days > 365')
    expect(sql).not.toMatch(/\bexecute\s+(?:format\s*\(|p_)/i)
  })

  it('uses publishable-client RPC wrappers without direct tables, credentials, or unsafe response passthrough', () => {
    const api = read(apiPath)

    for (const rpc of rpcNames) expect(api).toContain(`'${rpc}'`)
    expect(api).toContain("import { supabase } from './supabaseClient'")
    expect(api).toContain("export type LocalisationImportFailure = 'not-connected' | 'access-denied' | 'unavailable'")
    expect(api).toContain("export type LocalisationImportBatchStatus = 'created' | 'staging' | 'validated' | 'invalid' | 'applied' | 'expired'")
    expect(api).toContain('const parsed = decoder(data)')
    expect(api).not.toContain('.from(')
    expect(api).not.toContain('service_role')
    expect(api).not.toMatch(/SUPABASE_SERVICE_ROLE|DATABASE_URL|POSTGRES_PASSWORD|JWT_SECRET|PRIVATE_KEY|API_SECRET|sb_secret_/)
  })

  it('purges only old staging rows while retaining import history and final localisation data', () => {
    const sql = read(migrationPath)
    const purge = functionBody(sql, 'super_admin_purge_localisation_import_rows')

    expect(purge).toContain("batch.status in ('created', 'staging', 'validated', 'invalid', 'applied')")
    expect(purge).toContain('coalesce(batch.completed_at, batch.validated_at, batch.created_at) < v_cutoff')
    expect(purge).toContain('batch.staging_purged_at is null')
    expect(purge).toContain('for update of batch skip locked')
    expect(purge).toContain('delete from public.localisation_import_rows')
    expect(purge).toContain("set status = case when status = 'applied' then status else 'expired' end")
    expect(purge).toContain('staging_purged_at = pg_catalog.now()')
    expect(purge).not.toContain('delete from public.localisation_import_batches')
    expect(purge).not.toContain('delete from public.localisation_places')
  })
})
