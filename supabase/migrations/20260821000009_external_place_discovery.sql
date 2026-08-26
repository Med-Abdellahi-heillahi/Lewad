-- External map discoveries are deliberately separate from approved Lewad
-- establishments. A successful geocoding response is useful review evidence,
-- not validation that the place belongs in the directory.

create table if not exists public.external_place_lookup_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  query text not null check (btrim(query) <> ''),
  normalized_query text not null check (btrim(normalized_query) <> ''),
  created_at timestamptz not null default now()
);

create index if not exists external_place_lookup_attempts_user_created_idx
  on public.external_place_lookup_attempts (user_id, created_at desc);
create index if not exists external_place_lookup_attempts_created_idx
  on public.external_place_lookup_attempts (created_at desc);

alter table public.external_place_lookup_attempts enable row level security;
revoke all on table public.external_place_lookup_attempts from public, anon, authenticated;

create table if not exists public.external_place_discoveries (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users (id) on delete cascade,
  searched_query text not null check (btrim(searched_query) <> ''),
  provider text not null check (provider = 'nominatim'),
  provider_place_id text not null check (btrim(provider_place_id) <> ''),
  display_name text not null check (btrim(display_name) <> ''),
  normalized_name text not null check (btrim(normalized_name) <> ''),
  latitude numeric(9, 6) not null check (latitude between -90 and 90),
  longitude numeric(9, 6) not null check (longitude between -180 and 180),
  country text not null check (country = 'Mauritania'),
  wilaya text check (
    wilaya is null or wilaya in (
      'Adrar', 'Assaba', 'Brakna', 'Dakhlet Nouadhibou', 'Gorgol',
      'Guidimaka', 'Hodh Ech Chargui', 'Hodh El Gharbi', 'Inchiri',
      'Nouakchott Nord', 'Nouakchott Ouest', 'Nouakchott Sud', 'Tagant',
      'Tiris Zemmour', 'Trarza'
    )
  ),
  source_status text not null default 'pending_review'
    check (source_status in ('pending_review', 'imported', 'rejected')),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create unique index if not exists external_place_discoveries_provider_place_uidx
  on public.external_place_discoveries (provider, provider_place_id);
create unique index if not exists external_place_discoveries_provider_coordinates_uidx
  on public.external_place_discoveries (provider, normalized_name, latitude, longitude);
create index if not exists external_place_discoveries_created_by_created_idx
  on public.external_place_discoveries (created_by, created_at desc);
create index if not exists external_place_discoveries_pending_review_idx
  on public.external_place_discoveries (source_status, created_at desc)
  where source_status = 'pending_review';

alter table public.external_place_discoveries enable row level security;

drop policy if exists "Users can read their own external place discoveries" on public.external_place_discoveries;
create policy "Users can read their own external place discoveries"
on public.external_place_discoveries for select
to authenticated
using (auth.uid() = created_by);

drop policy if exists "Admins can read external place discoveries" on public.external_place_discoveries;
create policy "Admins can read external place discoveries"
on public.external_place_discoveries for select
to authenticated
using ((select public.is_admin()));

revoke all on table public.external_place_discoveries from public, anon, authenticated;
grant select on table public.external_place_discoveries to authenticated;

create or replace function public.reserve_external_place_lookup(p_query text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_query text := pg_catalog.btrim(pg_catalog.coalesce(p_query, ''));
  v_normalized_query text;
begin
  if v_user_id is null then
    return jsonb_build_object('ok', false, 'status', 'unauthenticated');
  end if;

  v_normalized_query := pg_catalog.lower(pg_catalog.regexp_replace(v_query, '\s+', ' ', 'g'));
  if pg_catalog.char_length(v_normalized_query) < 2 or pg_catalog.char_length(v_normalized_query) > 80 then
    return jsonb_build_object('ok', false, 'status', 'invalid_query');
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('reserve_external_place_lookup:' || v_user_id::text));
  -- The public Nominatim service permits at most one request per second. This
  -- global transaction lock makes that limit hold across users too, while the
  -- per-user lock below preserves the rolling abuse limits.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('reserve_external_place_lookup:global'));

  if (
    select pg_catalog.count(*)
    from public.external_place_lookup_attempts as attempt
    where attempt.created_at >= now() - interval '1 second'
  ) >= 1 then
    return jsonb_build_object('ok', false, 'status', 'rate_limited');
  end if;

  if (
    select pg_catalog.count(*)
    from public.external_place_lookup_attempts as attempt
    where attempt.user_id = v_user_id
      and attempt.created_at >= now() - interval '1 minute'
  ) >= 4 then
    return jsonb_build_object('ok', false, 'status', 'rate_limited');
  end if;

  if (
    select pg_catalog.count(*)
    from public.external_place_lookup_attempts as attempt
    where attempt.user_id = v_user_id
      and attempt.created_at >= now() - interval '1 hour'
  ) >= 30 then
    return jsonb_build_object('ok', false, 'status', 'rate_limited');
  end if;

  insert into public.external_place_lookup_attempts (user_id, query, normalized_query)
  values (v_user_id, v_query, v_normalized_query);

  return jsonb_build_object('ok', true, 'status', 'allowed');
end;
$$;

revoke all on function public.reserve_external_place_lookup(text) from public, anon;
grant execute on function public.reserve_external_place_lookup(text) to authenticated;

create or replace function public.create_external_place_discovery(
  p_searched_query text,
  p_provider text,
  p_provider_place_id text,
  p_display_name text,
  p_latitude numeric,
  p_longitude numeric,
  p_country text,
  p_wilaya text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_query text := pg_catalog.btrim(pg_catalog.coalesce(p_searched_query, ''));
  v_provider text := pg_catalog.lower(pg_catalog.btrim(pg_catalog.coalesce(p_provider, '')));
  v_provider_place_id text := pg_catalog.btrim(pg_catalog.coalesce(p_provider_place_id, ''));
  v_display_name text := pg_catalog.btrim(pg_catalog.coalesce(p_display_name, ''));
  v_normalized_name text;
  v_country text := pg_catalog.btrim(pg_catalog.coalesce(p_country, ''));
  v_wilaya text := pg_catalog.nullif(pg_catalog.btrim(pg_catalog.coalesce(p_wilaya, '')), '');
  v_discovery_id uuid;
begin
  if v_user_id is null then
    return jsonb_build_object('ok', false, 'status', 'unauthenticated');
  end if;

  if pg_catalog.char_length(v_query) < 2 or pg_catalog.char_length(v_query) > 80
    or v_provider <> 'nominatim'
    or pg_catalog.char_length(v_provider_place_id) < 1 or pg_catalog.char_length(v_provider_place_id) > 160
    or pg_catalog.char_length(v_display_name) < 1 or pg_catalog.char_length(v_display_name) > 320
    or v_country <> 'Mauritania'
    or p_latitude is null or p_longitude is null
    or p_latitude = 'NaN'::numeric or p_longitude = 'NaN'::numeric
    or p_latitude < -90 or p_latitude > 90
    or p_longitude < -180 or p_longitude > 180
    or (v_wilaya is not null and v_wilaya not in (
      'Adrar', 'Assaba', 'Brakna', 'Dakhlet Nouadhibou', 'Gorgol',
      'Guidimaka', 'Hodh Ech Chargui', 'Hodh El Gharbi', 'Inchiri',
      'Nouakchott Nord', 'Nouakchott Ouest', 'Nouakchott Sud', 'Tagant',
      'Tiris Zemmour', 'Trarza'
    )) then
    return jsonb_build_object('ok', false, 'status', 'invalid_input');
  end if;

  v_normalized_name := pg_catalog.lower(pg_catalog.regexp_replace(v_display_name, '\s+', ' ', 'g'));
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('create_external_place_discovery:' || v_user_id::text));

  if (
    select pg_catalog.count(*)
    from public.external_place_discoveries as discovery
    where discovery.created_by = v_user_id
      and discovery.created_at >= now() - interval '1 hour'
  ) >= 20 then
    return jsonb_build_object('ok', false, 'status', 'rate_limited');
  end if;

  insert into public.external_place_discoveries (
    created_by,
    searched_query,
    provider,
    provider_place_id,
    display_name,
    normalized_name,
    latitude,
    longitude,
    country,
    wilaya,
    source_status
  )
  values (
    v_user_id,
    v_query,
    v_provider,
    v_provider_place_id,
    v_display_name,
    v_normalized_name,
    p_latitude,
    p_longitude,
    v_country,
    v_wilaya,
    'pending_review'
  )
  on conflict do nothing
  returning id into v_discovery_id;

  if v_discovery_id is not null then
    return jsonb_build_object('ok', true, 'status', 'created', 'discovery_id', v_discovery_id);
  end if;

  update public.external_place_discoveries as discovery
  set last_seen_at = now()
  where discovery.provider = v_provider
    and (
      discovery.provider_place_id = v_provider_place_id
      or (
        discovery.normalized_name = v_normalized_name
        and discovery.latitude = p_latitude
        and discovery.longitude = p_longitude
      )
    )
  returning discovery.id into v_discovery_id;

  return jsonb_build_object('ok', true, 'status', 'duplicate', 'discovery_id', v_discovery_id);
end;
$$;

revoke all on function public.create_external_place_discovery(text, text, text, text, numeric, numeric, text, text) from public, anon;
grant execute on function public.create_external_place_discovery(text, text, text, text, numeric, numeric, text, text) to authenticated;

-- Review only changes the discovery's evidence state. Importing a discovery
-- never creates an establishment; the existing, separately reviewed admin
-- establishment workflow remains the only path to an approved directory row.
create or replace function public.admin_review_external_place_discovery(
  p_discovery_id uuid,
  p_source_status text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin_id uuid := auth.uid();
  v_source_status text := pg_catalog.btrim(pg_catalog.coalesce(p_source_status, ''));
  v_discovery_id uuid;
begin
  if v_admin_id is null then
    return jsonb_build_object('ok', false, 'status', 'unauthenticated');
  end if;

  if not public.is_admin() then
    return jsonb_build_object('ok', false, 'status', 'forbidden');
  end if;

  if p_discovery_id is null or v_source_status not in ('imported', 'rejected') then
    return jsonb_build_object('ok', false, 'status', 'invalid_input');
  end if;

  update public.external_place_discoveries as discovery
  set source_status = v_source_status
  where discovery.id = p_discovery_id
    and discovery.source_status = 'pending_review'
  returning discovery.id into v_discovery_id;

  if v_discovery_id is null then
    return jsonb_build_object('ok', false, 'status', 'not_found');
  end if;

  return jsonb_build_object(
    'ok', true,
    'status', v_source_status,
    'discovery_id', v_discovery_id
  );
end;
$$;

revoke all on function public.admin_review_external_place_discovery(uuid, text) from public, anon;
grant execute on function public.admin_review_external_place_discovery(uuid, text) to authenticated;
