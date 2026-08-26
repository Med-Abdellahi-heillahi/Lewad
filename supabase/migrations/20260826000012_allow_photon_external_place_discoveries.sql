-- Photon is an OpenStreetMap-based discovery source. Its results remain
-- review evidence only, alongside the existing Nominatim results.

alter table public.external_place_discoveries
  drop constraint if exists external_place_discoveries_provider_check;

alter table public.external_place_discoveries
  add constraint external_place_discoveries_provider_check
  check (provider in ('photon', 'nominatim'));

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
  v_query text := pg_catalog.btrim(coalesce(p_searched_query, ''));
  v_provider text := pg_catalog.lower(pg_catalog.btrim(coalesce(p_provider, '')));
  v_provider_place_id text := pg_catalog.btrim(coalesce(p_provider_place_id, ''));
  v_display_name text := pg_catalog.btrim(coalesce(p_display_name, ''));
  v_normalized_name text;
  v_country text := pg_catalog.btrim(coalesce(p_country, ''));
  v_wilaya text := nullif(pg_catalog.btrim(coalesce(p_wilaya, '')), '');
  v_discovery_id uuid;
begin
  if v_user_id is null then
    return jsonb_build_object('ok', false, 'status', 'unauthenticated');
  end if;

  if pg_catalog.char_length(v_query) < 2 or pg_catalog.char_length(v_query) > 80
    or v_provider not in ('photon', 'nominatim')
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
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtext('create_external_place_discovery:' || v_user_id::text)::bigint
  );

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

notify pgrst, 'reload schema';
