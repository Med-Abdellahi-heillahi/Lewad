import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const migrationPath = new URL(
  '../supabase/migrations/20260831000021_super_admin_analytics.sql',
  import.meta.url,
)

function source() {
  return readFileSync(migrationPath, 'utf8').replaceAll('\r\n', '\n')
}

const eventTypes = [
  'page_view',
  'search_started',
  'search_completed',
  'external_map_lookup',
  'add_business_started',
  'recharge_started',
  'install_prompt_viewed',
] as const

const trackedPaths = [
  '/',
  '/auth',
  '/app',
  '/profile',
  '/history',
  '/credits',
  '/recharge',
  '/add-business',
  '/settings',
  '/contact',
] as const

describe('privacy-safe analytics contracts', () => {
  it('keeps raw analytics events behind RLS with no direct browser policy or table grant', () => {
    const sql = source()

    expect(sql).toContain('create table if not exists public.analytics_events')
    expect(sql).toContain('id uuid primary key default gen_random_uuid()')
    expect(sql).toContain('alter table public.analytics_events enable row level security')
    expect(sql).toContain('revoke all on table public.analytics_events from public, anon, authenticated;')
    expect(sql).not.toMatch(/create\s+policy/i)
    expect(sql).not.toMatch(/grant\s+(?:select|insert|update|delete)\s+on(?:\s+table)?\s+public\.analytics_events/i)
    expect(sql.toLowerCase()).not.toContain('disable row level security')
  })

  it('accepts only the reviewed event and path vocabularies', () => {
    const sql = source()

    for (const eventType of eventTypes) expect(sql).toContain(`'${eventType}'`)
    for (const path of trackedPaths) expect(sql).toContain(`'${path}'`)

    expect(sql).toContain("event_type text not null check (event_type in (")
    expect(sql).toContain("path text not null check (path in (")
    expect(sql).toContain("locale in ('fr', 'ar', 'en', 'unknown')")
    expect(sql).toContain("device_type in ('mobile', 'tablet', 'desktop', 'unknown')")
    expect(sql).toContain("session_id ~* '^[0-9a-f]{8}-")
    expect(sql).not.toContain("'/admin'")
    expect(sql).not.toContain("'/super-admin'")
  })

  it('indexes the reviewed analytics dimensions and time-series access path', () => {
    const sql = source()

    expect(sql).toContain('on public.analytics_events (created_at desc);')
    expect(sql).toContain('on public.analytics_events (event_type);')
    expect(sql).toContain('on public.analytics_events (path);')
    expect(sql).toContain('on public.analytics_events (user_id)')
    expect(sql).toContain('on public.analytics_events (session_id);')
    expect(sql).toContain('on public.analytics_events (event_type, created_at desc, session_id);')
  })

  it('derives identity server-side and admits writes only through the bounded tracker', () => {
    const sql = source()
    const tracker = sql.slice(
      sql.indexOf('create or replace function public.track_analytics_event'),
      sql.indexOf('create or replace function public.get_public_activity_stats'),
    )

    expect(tracker).toContain('p_event_type text')
    expect(tracker).toContain('p_path text')
    expect(tracker).toContain('p_session_id text')
    expect(tracker).not.toContain('p_user_id')
    expect(tracker).toContain('auth.uid()')
    expect(tracker).toContain('security definer')
    expect(tracker).toContain("set search_path = ''")
    expect(tracker).toContain('pg_catalog.pg_advisory_xact_lock')
    expect(tracker).toContain("event.created_at >= v_now - interval '2 seconds'")
    expect(tracker).toContain("event.created_at >= v_now - interval '1 hour'")
    expect(tracker).toContain('v_recent_event_count >= 120')
    expect(tracker).toContain("return jsonb_build_object('ok', true, 'status', 'recorded')")
    expect(tracker).not.toContain("'event_id'")

    expect(sql).toContain('revoke all on function public.track_analytics_event(text, text, text, text, text, jsonb) from public, anon, authenticated;')
    expect(sql).toContain('grant execute on function public.track_analytics_event(text, text, text, text, text, jsonb) to anon, authenticated;')
  })

  it('rejects sensitive metadata and stores only bounded scalar analytics fields', () => {
    const sql = source()
    const tracker = sql.slice(
      sql.indexOf('create or replace function public.track_analytics_event'),
      sql.indexOf('create or replace function public.get_public_activity_stats'),
    )

    expect(sql).toContain("metadata - array['query_length', 'result_count', 'result_status']::text[]")
    expect(sql).toContain('pg_catalog.pg_column_size(metadata) <= 1024')
    expect(tracker).toContain('pg_catalog.octet_length(v_metadata_input::text) > 2048')
    expect(tracker).toContain("metadata_key.key_name not in ('query_length', 'result_count', 'result_status')")
    expect(tracker).toContain("'access_token', 'refresh_token', 'authorization'")
    expect(tracker).toContain("'service_role', 'secret', 'api_key'")
    expect(tracker).toContain("'email', 'phone', 'whatsapp'")
    expect(tracker).toContain("'query', 'search_query', 'address'")
    expect(tracker).toContain("between 0 and 500")
    expect(tracker).toContain("between 0 and 1000")
    expect(tracker).toContain("pg_catalog.jsonb_typeof(v_metadata_input -> 'result_status') <> 'string'")
    expect(tracker).not.toContain('insert into public.analytics_events select')
  })

  it('exposes only the three public aggregate counters with the reviewed formula', () => {
    const sql = source()
    const publicStats = sql.slice(
      sql.indexOf('create or replace function public.get_public_activity_stats'),
      sql.indexOf('create or replace function public.super_admin_get_analytics_summary'),
    )

    expect(publicStats).toContain('returns table (\n  active_sessions_real bigint,\n  visits_today_real bigint,\n  estimated_activity bigint\n)')
    expect(publicStats).toContain('count(distinct event.session_id)')
    expect(publicStats).toContain("event.event_type = 'page_view'")
    expect(publicStats).toContain('metrics.visits_today_real * 30')
    expect(publicStats).toContain('greatest(')
    expect(publicStats).not.toContain('user_id')
    expect(publicStats).not.toContain('metadata')
    expect(publicStats).not.toContain('event_type text')

    expect(sql).toContain('revoke all on function public.get_public_activity_stats() from public, anon, authenticated;')
    expect(sql).toContain('grant execute on function public.get_public_activity_stats() to anon, authenticated;')
  })

  it('gates the full summary on an active super admin and returns only aggregate or minimised data', () => {
    const sql = source()
    const summary = sql.slice(
      sql.indexOf('create or replace function public.super_admin_get_analytics_summary'),
      sql.indexOf("select pg_notify('pgrst'"),
    )

    expect(summary).toContain("p_from timestamptz default (now() - interval '30 days')")
    expect(summary).toContain('p_to timestamptz default now()')
    expect(summary).toContain('auth.uid() is null or not public.is_super_admin()')
    expect(summary).toContain('security definer')
    expect(summary).toContain("set search_path = ''")
    expect(summary).toContain("p_to - p_from > interval '90 days'")
    expect(summary).toContain("where scoped.event_type = 'page_view' and scoped.user_id is not null")
    expect(summary).toContain("where scoped.event_type = 'page_view' and scoped.user_id is null")

    for (const key of [
      'total_events',
      'total_page_views',
      'unique_sessions',
      'unique_authenticated_users',
      'active_sessions_now',
      'visits_today',
      'visits_7_days',
      'visits_30_days',
      'top_pages',
      'top_event_types',
      'device_breakdown',
      'locale_breakdown',
      'auth_breakdown',
      'recent_events',
    ]) {
      expect(summary).toContain(`'${key}'`)
    }

    const recent = summary.slice(summary.indexOf("'recent_events'"))
    expect(recent).toContain('limit 20')
    expect(recent).toContain("'authenticated', scoped.user_id is not null")
    expect(recent).not.toContain("'id'")
    expect(recent).not.toContain("'session_id'")
    expect(recent).not.toContain("'user_id'")
    expect(recent).not.toContain("'metadata'")

    expect(sql).toContain('revoke all on function public.super_admin_get_analytics_summary(timestamptz, timestamptz) from public, anon, authenticated;')
    expect(sql).toContain('grant execute on function public.super_admin_get_analytics_summary(timestamptz, timestamptz) to authenticated;')
    expect(sql).not.toContain('grant execute on function public.super_admin_get_analytics_summary(timestamptz, timestamptz) to anon')
  })

  it('reloads the PostgREST schema after installing the RPCs', () => {
    expect(source()).toContain("select pg_notify('pgrst', 'reload schema');")
  })
})
