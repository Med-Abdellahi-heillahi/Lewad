-- Privacy-minimised product analytics.
--
-- Raw events are write-only from browser roles. Public readers receive one
-- thresholded, bucketed estimate, while the detailed aggregate is restricted
-- to an active super admin. No IP address, user agent, referrer, search query, coordinates,
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
  session_id uuid not null check (
    session_id::text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  ),
  locale text not null default 'unknown' check (locale in ('fr', 'ar', 'en', 'unknown')),
  device_type text not null default 'unknown' check (device_type in ('mobile', 'tablet', 'desktop', 'unknown')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint analytics_events_event_type_size_check
    check (pg_catalog.octet_length(event_type) <= 32),
  constraint analytics_events_path_size_check
    check (pg_catalog.octet_length(path) <= 64),
  constraint analytics_events_metadata_object_check
    check (pg_catalog.jsonb_typeof(metadata) = 'object'),
  constraint analytics_events_metadata_size_check
    check (pg_catalog.pg_column_size(metadata) <= 512),
  constraint analytics_events_metadata_keys_check
    check (
      metadata - array['query_length', 'result_count', 'result_status']::text[] = '{}'::jsonb
    ),
  constraint analytics_events_metadata_event_shape_check
    check (
      case event_type
        when 'search_started' then
          metadata ? 'query_length'
          and metadata - 'query_length' = '{}'::jsonb
        when 'search_completed' then
          metadata ?& array['result_count', 'result_status']::text[]
          and metadata - array['result_count', 'result_status']::text[] = '{}'::jsonb
        else metadata = '{}'::jsonb
      end
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
          'success', 'not_found', 'insufficient_credits', 'invalid_query', 'error'
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

create index if not exists analytics_events_session_created_at_idx
  on public.analytics_events (session_id, created_at desc);

create index if not exists analytics_events_user_created_at_idx
  on public.analytics_events (user_id, created_at desc)
  where user_id is not null;

create index if not exists analytics_events_event_created_session_idx
  on public.analytics_events (event_type, created_at desc, session_id);

alter table public.analytics_events enable row level security;

comment on table public.analytics_events is
  'Privacy-minimised product telemetry retained for at most 90 days; raw rows are RPC-only.';
comment on column public.analytics_events.session_id is
  'Client-generated UUID used only for duplicate suppression and coarse aggregate counts.';
comment on column public.analytics_events.metadata is
  'Bounded scalar search outcome metadata; queries and other identifying values are forbidden.';

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
  v_event_type text;
  v_path text;
  v_session_text text;
  v_session_id uuid;
  v_locale text;
  v_device_type text;
  v_metadata_input jsonb := coalesce(p_metadata, '{}'::jsonb);
  v_metadata jsonb := '{}'::jsonb;
  v_result_status text;
  v_user_id uuid := auth.uid();
  v_now timestamptz;
  v_recent_ten_minute_count integer;
  v_recent_day_count integer;
  v_recent_user_day_count integer;
begin
  -- Bound text inputs before normalising them so oversized unauthenticated
  -- payloads cannot force unnecessary copies or regex work in this definer.
  if p_event_type is null or pg_catalog.octet_length(p_event_type) > 32
    or p_path is null or pg_catalog.octet_length(p_path) > 64
    or p_session_id is null or pg_catalog.octet_length(p_session_id) > 64
    or (p_locale is not null and pg_catalog.octet_length(p_locale) > 8)
    or (p_device_type is not null and pg_catalog.octet_length(p_device_type) > 16) then
    return jsonb_build_object('ok', false, 'status', 'invalid_input');
  end if;

  v_event_type := pg_catalog.lower(pg_catalog.btrim(p_event_type));
  v_path := pg_catalog.btrim(p_path);
  v_session_text := pg_catalog.lower(pg_catalog.btrim(p_session_id));
  v_locale := pg_catalog.lower(pg_catalog.btrim(coalesce(p_locale, 'unknown')));
  v_device_type := pg_catalog.lower(pg_catalog.btrim(coalesce(p_device_type, 'unknown')));

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

  if v_session_text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    return jsonb_build_object('ok', false, 'status', 'invalid_input');
  end if;

  -- The explicit cast is kept behind the canonical check and its own handler:
  -- malformed UUID input receives a stable rejection instead of a database error.
  begin
    v_session_id := v_session_text::uuid;
  exception
    when invalid_text_representation then
      return jsonb_build_object('ok', false, 'status', 'invalid_input');
  end;

  if v_locale not in ('fr', 'ar', 'en', 'unknown')
    or v_device_type not in ('mobile', 'tablet', 'desktop', 'unknown') then
    return jsonb_build_object('ok', false, 'status', 'invalid_input');
  end if;

  if pg_catalog.jsonb_typeof(v_metadata_input) <> 'object'
    or pg_catalog.pg_column_size(v_metadata_input) > 512
    or pg_catalog.octet_length(v_metadata_input::text) > 512 then
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
      'latitude', 'longitude', 'lat', 'long', 'coordinates',
      'user_agent', 'referrer',
      'payment', 'amount', 'amount_mro', 'price', 'payment_reference',
      'transaction_id', 'bank_account', 'card', 'offer_code',
      'sender_phone', 'banking_app'
    )
  ) then
    return jsonb_build_object('ok', false, 'status', 'invalid_metadata');
  end if;

  if (v_event_type = 'search_started' and not (
      v_metadata_input ? 'query_length'
      and v_metadata_input - 'query_length' = '{}'::jsonb
    ))
    or (v_event_type = 'search_completed' and not (
      v_metadata_input ?& array['result_count', 'result_status']::text[]
      and v_metadata_input - array['result_count', 'result_status']::text[] = '{}'::jsonb
    ))
    or (v_event_type not in ('search_started', 'search_completed')
      and v_metadata_input <> '{}'::jsonb) then
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
      'success', 'not_found', 'insufficient_credits', 'invalid_query', 'error'
    ) then
      return jsonb_build_object('ok', false, 'status', 'invalid_metadata');
    end if;
    v_metadata := v_metadata || jsonb_build_object('result_status', v_result_status);
  end if;

  -- Serialize one client session so the duplicate and rolling-limit decisions
  -- cannot be bypassed by concurrent calls carrying the same session token.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('analytics_session:' || v_session_id::text, 0)
  );
  if v_user_id is not null then
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended('analytics_user:' || v_user_id::text, 0)
    );
  end if;
  v_now := pg_catalog.clock_timestamp();

  if exists (
    select 1
    from public.analytics_events as event
    where event.session_id = v_session_id
      and event.event_type = v_event_type
      and event.path = v_path
      and event.created_at >= v_now - interval '10 seconds'
  ) then
    return jsonb_build_object('ok', true, 'status', 'duplicate');
  end if;

  select count(*)::integer
  into v_recent_ten_minute_count
  from public.analytics_events as event
  where event.session_id = v_session_id
    and event.created_at >= v_now - interval '10 minutes';

  if v_recent_ten_minute_count >= 60 then
    return jsonb_build_object('ok', false, 'status', 'rate_limited');
  end if;

  select count(*)::integer
  into v_recent_day_count
  from public.analytics_events as event
  where event.session_id = v_session_id
    and event.created_at >= v_now - interval '24 hours';

  if v_recent_day_count >= 300 then
    return jsonb_build_object('ok', false, 'status', 'rate_limited');
  end if;

  if v_user_id is not null then
    select count(*)::integer
    into v_recent_user_day_count
    from public.analytics_events as event
    where event.user_id = v_user_id
      and event.created_at >= v_now - interval '24 hours';

    if v_recent_user_day_count >= 600 then
      return jsonb_build_object('ok', false, 'status', 'rate_limited');
    end if;
  end if;

  -- Anonymous client UUIDs are untrusted, so these database limits are only a
  -- best-effort backstop. Strong IP/server-derived abuse control belongs at a
  -- future Edge Function, server, or reverse proxy. analytics_events
  -- intentionally stores no IP address or equivalent network identifier.

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
    v_user_id,
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

comment on function public.track_analytics_event(text, text, text, text, text, jsonb) is
  'Records allowlisted, bounded telemetry; rejects malformed UUIDs and enforces duplicate and rolling abuse limits.';

-- The previous draft returned raw counts. Drop it explicitly because PostgreSQL
-- cannot change a function's OUT row shape with CREATE OR REPLACE.
drop function if exists public.get_public_activity_stats();

create or replace function public.get_public_activity_stats()
returns table (
  estimated_activity bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  with metric as (
    select count(distinct event.session_id)::bigint as visits_today
    from public.analytics_events as event
    where event.event_type = 'page_view'
      and event.created_at >= (
        pg_catalog.date_trunc('day', now() at time zone 'UTC') at time zone 'UTC'
      )
      and event.created_at <= now()
  )
  select case
    -- k=3 suppression avoids exposing very small launch-day counts. Above the
    -- threshold, *30 is rounded down to 100, so every published value maps to
    -- several possible real counts (3-6 all publish as 100). The cap limits
    -- both abuse-driven inflation and numeric growth.
    when metric.visits_today < 3 then 0::bigint
    else least(
      1000000::bigint,
      greatest(
        100::bigint,
        (
          pg_catalog.floor((metric.visits_today::numeric * 30) / 100) * 100
        )::bigint
      )
    )
  end as estimated_activity
  from metric;
$$;

revoke all on function public.get_public_activity_stats() from public, anon, authenticated;
grant execute on function public.get_public_activity_stats() to anon, authenticated;

comment on function public.get_public_activity_stats() is
  'Public k-thresholded activity estimate only: fewer than 3 visits => 0; otherwise visits*30 rounded down to 100 and capped at 1,000,000.';

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
    or p_from < v_now - interval '90 days'
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
          jsonb_agg(
            recent.payload
            order by recent.created_minute desc,
              recent.event_type,
              recent.path,
              recent.locale,
              recent.device_type
          ),
          '[]'::jsonb
        )
        from (
          select
            recent_group.event_type,
            recent_group.path,
            recent_group.locale,
            recent_group.device_type,
            recent_group.created_minute,
            jsonb_build_object(
              'event_type', recent_group.event_type,
              'path', recent_group.path,
              'locale', recent_group.locale,
              'device_type', recent_group.device_type,
              'created_minute', recent_group.created_minute
            ) as payload
          from (
            -- Collapse identical low-cardinality events inside each five-minute
            -- UTC bucket. The response cannot reveal exact order or timestamps.
            select
              scoped.event_type,
              scoped.path,
              scoped.locale,
              scoped.device_type,
              pg_catalog.date_bin(
                interval '5 minutes',
                scoped.created_at,
                timestamptz '2000-01-01 00:00:00+00'
              ) as created_minute,
              max(scoped.created_at) as last_seen_at
            from scoped
            group by
              scoped.event_type,
              scoped.path,
              scoped.locale,
              scoped.device_type,
              pg_catalog.date_bin(
                interval '5 minutes',
                scoped.created_at,
                timestamptz '2000-01-01 00:00:00+00'
              )
          ) as recent_group
          order by recent_group.last_seen_at desc
          limit 20
        ) as recent
      )
    )
  );
end;
$$;

revoke all on function public.super_admin_get_analytics_summary(timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.super_admin_get_analytics_summary(timestamptz, timestamptz) to authenticated;

comment on function public.super_admin_get_analytics_summary(timestamptz, timestamptz) is
  'Active-super-admin aggregate over at most 90 retained days; recent rows omit identity and use five-minute UTC buckets.';

create or replace function public.purge_old_analytics_events()
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cutoff timestamptz := now() - interval '90 days';
  v_deleted_count bigint;
begin
  if auth.uid() is null or not public.is_super_admin() then
    raise exception using errcode = '42501', message = 'An active super admin account is required.';
  end if;

  delete from public.analytics_events as event
  where event.created_at < v_cutoff;

  get diagnostics v_deleted_count = row_count;
  return v_deleted_count;
end;
$$;

revoke all on function public.purge_old_analytics_events() from public, anon, authenticated;
grant execute on function public.purge_old_analytics_events() to authenticated;

comment on function public.purge_old_analytics_events() is
  'Deletes analytics events older than 90 days. Invoke from a trusted active-super-admin retention job.';

select pg_notify('pgrst', 'reload schema');
