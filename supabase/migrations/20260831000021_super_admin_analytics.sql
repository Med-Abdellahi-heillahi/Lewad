-- Privacy-minimised product analytics.
--
-- Raw events are write-only from browser roles. Public readers receive three
-- aggregate counters, while the detailed aggregate is restricted to an active
-- super admin. No IP address, user agent, referrer, search query, coordinates,
-- contact detail, client timestamp, or authentication secret is accepted.

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (event_type in (
    'page_view',
    'search_started',
    'search_completed',
    'external_map_lookup',
    'add_business_started',
    'recharge_started',
    'install_prompt_viewed'
  )),
  path text not null check (path in (
    '/',
    '/auth',
    '/app',
    '/profile',
    '/history',
    '/credits',
    '/recharge',
    '/add-business',
    '/settings',
    '/contact'
  )),
  user_id uuid references auth.users (id) on delete set null,
  session_id text not null check (
    session_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  ),
  locale text not null default 'unknown' check (locale in ('fr', 'ar', 'en', 'unknown')),
  device_type text not null default 'unknown' check (device_type in ('mobile', 'tablet', 'desktop', 'unknown')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint analytics_events_metadata_object_check
    check (pg_catalog.jsonb_typeof(metadata) = 'object'),
  constraint analytics_events_metadata_size_check
    check (pg_catalog.pg_column_size(metadata) <= 1024),
  constraint analytics_events_metadata_keys_check
    check (
      metadata - array['query_length', 'result_count', 'result_status']::text[] = '{}'::jsonb
    ),
  constraint analytics_events_query_length_check
    check (
      case
        when not (metadata ? 'query_length') then true
        when pg_catalog.jsonb_typeof(metadata -> 'query_length') <> 'number' then false
        when metadata ->> 'query_length' !~ '^[0-9]{1,3}$' then false
        else (metadata ->> 'query_length')::integer between 0 and 500
      end
    ),
  constraint analytics_events_result_count_check
    check (
      case
        when not (metadata ? 'result_count') then true
        when pg_catalog.jsonb_typeof(metadata -> 'result_count') <> 'number' then false
        when metadata ->> 'result_count' !~ '^[0-9]{1,4}$' then false
        else (metadata ->> 'result_count')::integer between 0 and 1000
      end
    ),
  constraint analytics_events_result_status_check
    check (
      case
        when not (metadata ? 'result_status') then true
        when pg_catalog.jsonb_typeof(metadata -> 'result_status') <> 'string' then false
        else metadata ->> 'result_status' in (
          'success', 'not_found', 'found', 'unavailable', 'rate_limited',
          'insufficient_credits', 'invalid_query', 'error', 'cancelled',
          'created', 'duplicate'
        )
      end
    )
);

create index if not exists analytics_events_created_at_idx
  on public.analytics_events (created_at desc);

create index if not exists analytics_events_event_type_idx
  on public.analytics_events (event_type);

create index if not exists analytics_events_path_idx
  on public.analytics_events (path);

create index if not exists analytics_events_user_id_idx
  on public.analytics_events (user_id)
  where user_id is not null;

create index if not exists analytics_events_session_id_idx
  on public.analytics_events (session_id);

create index if not exists analytics_events_event_created_session_idx
  on public.analytics_events (event_type, created_at desc, session_id);

alter table public.analytics_events enable row level security;

-- There are deliberately no direct browser policies. All writes and reads go
-- through the narrow RPCs below, including for super admins.
revoke all on table public.analytics_events from public, anon, authenticated;

create or replace function public.track_analytics_event(
  p_event_type text,
  p_path text,
  p_session_id text,
  p_locale text default null,
  p_device_type text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event_type text := pg_catalog.lower(pg_catalog.btrim(coalesce(p_event_type, '')));
  v_path text := pg_catalog.btrim(coalesce(p_path, ''));
  v_session_id text := pg_catalog.lower(pg_catalog.btrim(coalesce(p_session_id, '')));
  v_locale text := pg_catalog.lower(pg_catalog.btrim(coalesce(p_locale, '')));
  v_device_type text := pg_catalog.lower(pg_catalog.btrim(coalesce(p_device_type, '')));
  v_metadata_input jsonb := coalesce(p_metadata, '{}'::jsonb);
  v_metadata jsonb := '{}'::jsonb;
  v_result_status text;
  v_now timestamptz;
  v_recent_event_count integer;
begin
  if v_event_type not in (
    'page_view',
    'search_started',
    'search_completed',
    'external_map_lookup',
    'add_business_started',
    'recharge_started',
    'install_prompt_viewed'
  ) then
    return jsonb_build_object('ok', false, 'status', 'invalid_input');
  end if;

  if v_path not in (
    '/',
    '/auth',
    '/app',
    '/profile',
    '/history',
    '/credits',
    '/recharge',
    '/add-business',
    '/settings',
    '/contact'
  ) then
    return jsonb_build_object('ok', false, 'status', 'invalid_input');
  end if;

  if v_session_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return jsonb_build_object('ok', false, 'status', 'invalid_input');
  end if;

  v_locale := case when v_locale in ('fr', 'ar', 'en') then v_locale else 'unknown' end;
  v_device_type := case
    when v_device_type in ('mobile', 'tablet', 'desktop') then v_device_type
    else 'unknown'
  end;

  if pg_catalog.jsonb_typeof(v_metadata_input) <> 'object'
    or pg_catalog.octet_length(v_metadata_input::text) > 2048 then
    return jsonb_build_object('ok', false, 'status', 'invalid_metadata');
  end if;

  -- Reject well-known sensitive names explicitly before enforcing the positive
  -- allowlist. Values nested below an allowed key are rejected by scalar checks.
  if exists (
    select 1
    from pg_catalog.jsonb_object_keys(v_metadata_input) as metadata_key(key_name)
    where pg_catalog.lower(metadata_key.key_name) in (
      'name', 'full_name', 'full_name_ar', 'email', 'phone', 'whatsapp',
      'password', 'token', 'access_token', 'refresh_token', 'authorization',
      'service_role', 'secret', 'api_key',
      'user_id', 'session_id', 'query', 'search_query', 'address',
      'latitude', 'longitude', 'coordinates', 'user_agent', 'referrer'
    )
  ) then
    return jsonb_build_object('ok', false, 'status', 'invalid_metadata');
  end if;

  if exists (
    select 1
    from pg_catalog.jsonb_object_keys(v_metadata_input) as metadata_key(key_name)
    where metadata_key.key_name not in ('query_length', 'result_count', 'result_status')
  ) then
    return jsonb_build_object('ok', false, 'status', 'invalid_metadata');
  end if;

  if v_metadata_input ? 'query_length'
    and pg_catalog.jsonb_typeof(v_metadata_input -> 'query_length') <> 'null' then
    if pg_catalog.jsonb_typeof(v_metadata_input -> 'query_length') <> 'number'
      or v_metadata_input ->> 'query_length' !~ '^[0-9]{1,3}$'
      or (v_metadata_input ->> 'query_length')::integer not between 0 and 500 then
      return jsonb_build_object('ok', false, 'status', 'invalid_metadata');
    end if;
    v_metadata := v_metadata || jsonb_build_object(
      'query_length', (v_metadata_input ->> 'query_length')::integer
    );
  end if;

  if v_metadata_input ? 'result_count'
    and pg_catalog.jsonb_typeof(v_metadata_input -> 'result_count') <> 'null' then
    if pg_catalog.jsonb_typeof(v_metadata_input -> 'result_count') <> 'number'
      or v_metadata_input ->> 'result_count' !~ '^[0-9]{1,4}$'
      or (v_metadata_input ->> 'result_count')::integer not between 0 and 1000 then
      return jsonb_build_object('ok', false, 'status', 'invalid_metadata');
    end if;
    v_metadata := v_metadata || jsonb_build_object(
      'result_count', (v_metadata_input ->> 'result_count')::integer
    );
  end if;

  if v_metadata_input ? 'result_status'
    and pg_catalog.jsonb_typeof(v_metadata_input -> 'result_status') <> 'null' then
    if pg_catalog.jsonb_typeof(v_metadata_input -> 'result_status') <> 'string' then
      return jsonb_build_object('ok', false, 'status', 'invalid_metadata');
    end if;
    v_result_status := pg_catalog.lower(pg_catalog.btrim(v_metadata_input ->> 'result_status'));
    if v_result_status not in (
      'success', 'not_found', 'found', 'unavailable', 'rate_limited',
      'insufficient_credits', 'invalid_query', 'error', 'cancelled',
      'created', 'duplicate'
    ) then
      return jsonb_build_object('ok', false, 'status', 'invalid_metadata');
    end if;
    v_metadata := v_metadata || jsonb_build_object('result_status', v_result_status);
  end if;

  -- Serialize one client session so the duplicate and hourly-limit decisions
  -- cannot be bypassed by concurrent calls carrying the same session token.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtext('analytics_session:' || v_session_id)::bigint
  );
  v_now := pg_catalog.clock_timestamp();

  if exists (
    select 1
    from public.analytics_events as event
    where event.session_id = v_session_id
      and event.event_type = v_event_type
      and event.path = v_path
      and event.created_at >= v_now - interval '2 seconds'
  ) then
    return jsonb_build_object('ok', true, 'status', 'duplicate');
  end if;

  select count(*)::integer
  into v_recent_event_count
  from public.analytics_events as event
  where event.session_id = v_session_id
    and event.created_at >= v_now - interval '1 hour';

  if v_recent_event_count >= 120 then
    return jsonb_build_object('ok', false, 'status', 'rate_limited');
  end if;

  insert into public.analytics_events (
    event_type,
    path,
    user_id,
    session_id,
    locale,
    device_type,
    metadata,
    created_at
  )
  values (
    v_event_type,
    v_path,
    auth.uid(),
    v_session_id,
    v_locale,
    v_device_type,
    v_metadata,
    v_now
  );

  return jsonb_build_object('ok', true, 'status', 'recorded');
exception
  when others then
    return jsonb_build_object('ok', false, 'status', 'unavailable');
end;
$$;

revoke all on function public.track_analytics_event(text, text, text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.track_analytics_event(text, text, text, text, text, jsonb) to anon, authenticated;

create or replace function public.get_public_activity_stats()
returns table (
  active_sessions_real bigint,
  visits_today_real bigint,
  estimated_activity bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  with bounds as (
    select
      now() as observed_at,
      pg_catalog.date_trunc('day', now() at time zone 'UTC') at time zone 'UTC' as today_start
  ), metrics as (
    select
      count(distinct event.session_id) filter (
        where event.created_at >= bounds.observed_at - interval '5 minutes'
      )::bigint as active_sessions_real,
      count(*) filter (
        where event.event_type = 'page_view'
          and event.created_at >= bounds.today_start
      )::bigint as visits_today_real
    from public.analytics_events as event
    cross join bounds
    where event.created_at >= least(
      bounds.today_start,
      bounds.observed_at - interval '5 minutes'
    )
  )
  select
    metrics.active_sessions_real,
    metrics.visits_today_real,
    greatest(
      metrics.visits_today_real * 30,
      metrics.active_sessions_real
    )::bigint as estimated_activity
  from metrics;
$$;

revoke all on function public.get_public_activity_stats() from public, anon, authenticated;
grant execute on function public.get_public_activity_stats() to anon, authenticated;

create or replace function public.super_admin_get_analytics_summary(
  p_from timestamptz default (now() - interval '30 days'),
  p_to timestamptz default now()
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := now();
  v_today_start timestamptz := pg_catalog.date_trunc('day', now() at time zone 'UTC') at time zone 'UTC';
begin
  if auth.uid() is null or not public.is_super_admin() then
    raise exception using errcode = '42501', message = 'An active super admin account is required.';
  end if;

  if p_from is null or p_to is null or p_from >= p_to
    or p_to - p_from > interval '90 days'
    or p_to > v_now + interval '1 minute' then
    raise exception using errcode = '22023', message = 'Analytics window is invalid.';
  end if;

  return (
    with scoped as materialized (
      select
        event.event_type,
        event.path,
        event.user_id,
        event.session_id,
        event.locale,
        event.device_type,
        event.created_at
      from public.analytics_events as event
      where event.created_at >= p_from
        and event.created_at < p_to
    )
    select jsonb_build_object(
      'total_events', (select count(*) from scoped),
      'total_page_views', (
        select count(*) from scoped where event_type = 'page_view'
      ),
      'unique_sessions', (
        select count(distinct session_id) from scoped
      ),
      'unique_authenticated_users', (
        select count(distinct user_id) from scoped where user_id is not null
      ),
      'active_sessions_now', (
        select count(distinct event.session_id)
        from public.analytics_events as event
        where event.created_at >= v_now - interval '5 minutes'
          and event.created_at <= v_now
      ),
      'visits_today', (
        select count(*)
        from public.analytics_events as event
        where event.event_type = 'page_view'
          and event.created_at >= v_today_start
          and event.created_at <= v_now
      ),
      'visits_7_days', (
        select count(*)
        from public.analytics_events as event
        where event.event_type = 'page_view'
          and event.created_at >= v_now - interval '7 days'
          and event.created_at <= v_now
      ),
      'visits_30_days', (
        select count(*)
        from public.analytics_events as event
        where event.event_type = 'page_view'
          and event.created_at >= v_now - interval '30 days'
          and event.created_at <= v_now
      ),
      'top_pages', (
        select coalesce(
          jsonb_agg(
            jsonb_build_object('path', page.path, 'count', page.event_count)
            order by page.event_count desc, page.path
          ),
          '[]'::jsonb
        )
        from (
          select scoped.path, count(*) as event_count
          from scoped
          where scoped.event_type = 'page_view'
          group by scoped.path
          order by event_count desc, scoped.path
          limit 10
        ) as page
      ),
      'top_event_types', (
        select coalesce(
          jsonb_agg(
            jsonb_build_object('event_type', event_kind.event_type, 'count', event_kind.event_count)
            order by event_kind.event_count desc, event_kind.event_type
          ),
          '[]'::jsonb
        )
        from (
          select scoped.event_type, count(*) as event_count
          from scoped
          group by scoped.event_type
          order by event_count desc, scoped.event_type
          limit 10
        ) as event_kind
      ),
      'device_breakdown', (
        select coalesce(
          jsonb_agg(
            jsonb_build_object('device_type', device.device_type, 'count', device.event_count)
            order by device.event_count desc, device.device_type
          ),
          '[]'::jsonb
        )
        from (
          select scoped.device_type, count(*) as event_count
          from scoped
          group by scoped.device_type
        ) as device
      ),
      'locale_breakdown', (
        select coalesce(
          jsonb_agg(
            jsonb_build_object('locale', locale_group.locale, 'count', locale_group.event_count)
            order by locale_group.event_count desc, locale_group.locale
          ),
          '[]'::jsonb
        )
        from (
          select scoped.locale, count(*) as event_count
          from scoped
          group by scoped.locale
        ) as locale_group
      ),
      'auth_breakdown', (
        select jsonb_build_object(
          'authenticated', count(*) filter (
            where scoped.event_type = 'page_view' and scoped.user_id is not null
          ),
          'anonymous', count(*) filter (
            where scoped.event_type = 'page_view' and scoped.user_id is null
          )
        )
        from scoped
      ),
      'recent_events', (
        select coalesce(
          jsonb_agg(recent.payload order by recent.created_at desc),
          '[]'::jsonb
        )
        from (
          select
            scoped.created_at,
            jsonb_build_object(
              'event_type', scoped.event_type,
              'path', scoped.path,
              'locale', scoped.locale,
              'device_type', scoped.device_type,
              'authenticated', scoped.user_id is not null,
              'created_at', scoped.created_at
            ) as payload
          from scoped
          order by scoped.created_at desc
          limit 20
        ) as recent
      )
    )
  );
end;
$$;

revoke all on function public.super_admin_get_analytics_summary(timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.super_admin_get_analytics_summary(timestamptz, timestamptz) to authenticated;

select pg_notify('pgrst', 'reload schema');
