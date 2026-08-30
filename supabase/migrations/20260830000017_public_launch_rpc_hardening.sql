-- Public-launch RPC hardening.
-- Imported discoveries must go through the atomic import RPC, which creates or
-- links the establishment and branch and records the administrative audit.
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
  v_source_status text := pg_catalog.btrim(pg_catalog.coalesce(p_source_status, ''));
begin
  if v_source_status <> 'rejected' then
    return jsonb_build_object('ok', false, 'status', 'invalid_input');
  end if;

  return public.admin_reject_external_place_discovery(p_discovery_id);
end;
$$;

-- The dedicated audited reject RPC replaces this legacy browser entry point.
revoke all on function public.admin_review_external_place_discovery(uuid, text) from public, anon, authenticated;

-- Keep the supported browser RPC uniquely named and retire the obsolete typed
-- overload without dropping either implementation signature.
revoke all on function public.admin_import_external_place_discovery_as_establishment(uuid, text[]) from public, anon, authenticated;
revoke all on function public.admin_import_external_place_discovery_as_establishment(uuid) from public, anon, authenticated;

-- The typed admin-create overload delegates private establishments to the
-- mature private overload. Coordinate validation below therefore applies only
-- to the simplified public and administrative path.
create or replace function public.admin_create_establishment(
  p_establishment_type text,
  p_name_fr text,
  p_name_ar text default null,
  p_phone text default null,
  p_image_url text default null,
  p_location text default null,
  p_nearest_place text default null,
  p_opening_date date default null,
  p_closing_date date default null,
  p_source_request_id uuid default null,
  p_latitude numeric default null,
  p_longitude numeric default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin_id uuid := auth.uid();
  v_type text := pg_catalog.lower(pg_catalog.btrim(coalesce(p_establishment_type, '')));
  v_name_fr text := pg_catalog.btrim(coalesce(p_name_fr, ''));
  v_name_ar text := nullif(pg_catalog.btrim(coalesce(p_name_ar, '')), '');
  v_phone text := nullif(public.normalize_profile_phone(pg_catalog.btrim(coalesce(p_phone, ''))), '');
  v_image_url text := nullif(pg_catalog.btrim(coalesce(p_image_url, '')), '');
  v_location text := nullif(pg_catalog.btrim(coalesce(p_location, '')), '');
  v_nearest_place text := nullif(pg_catalog.btrim(coalesce(p_nearest_place, '')), '');
  v_slug_base text;
  v_slug text;
  v_slug_suffix integer := 2;
  v_establishment_id uuid;
  v_branch_id uuid;
  v_response jsonb;
begin
  if v_admin_id is null or not public.is_admin() then
    return jsonb_build_object('ok', false, 'status', 'forbidden', 'message', 'An active admin account is required.');
  end if;

  if v_type not in ('private', 'public', 'administrative') then
    return jsonb_build_object('ok', false, 'status', 'invalid_type', 'message', 'Establishment type is required.');
  end if;
  if v_name_fr = '' then
    return jsonb_build_object('ok', false, 'status', 'invalid_name_fr', 'message', 'Establishment name is required.');
  end if;
  if v_type = 'private' then
    v_response := public.admin_create_establishment(
      p_name_fr, coalesce(v_name_ar, ''), coalesce(v_phone, ''), p_image_url,
      p_location, p_nearest_place, p_opening_date, p_closing_date,
      p_source_request_id, p_latitude, p_longitude
    );
    return v_response;
  end if;

  if (p_latitude is null) <> (p_longitude is null) then
    return jsonb_build_object('ok', false, 'status', 'invalid_coordinates', 'message', 'Latitude and longitude must be provided together.');
  end if;

  if p_latitude is not null and (
    p_latitude = 'NaN'::numeric or p_longitude = 'NaN'::numeric
    or p_latitude < -90 or p_latitude > 90
    or p_longitude < -180 or p_longitude > 180
  ) then
    return jsonb_build_object('ok', false, 'status', 'invalid_coordinates', 'message', 'Coordinates are outside the supported range.');
  end if;

  if v_image_url is not null and lower(v_image_url) !~ '\.(png|jpg|jpeg)(\?.*)?$' then
    return jsonb_build_object('ok', false, 'status', 'invalid_image_url', 'message', 'Invalid image format.');
  end if;
  if v_type = 'public' or v_type = 'administrative' then
    if v_location is null then
      return jsonb_build_object('ok', false, 'status', 'invalid_location', 'message', 'Location is required.');
    end if;
  end if;

  v_slug_base := btrim(
    regexp_replace(lower(v_name_fr), '[^a-z0-9]+', '-', 'g'),
    '-'
  );
  if v_slug_base = '' then v_slug_base := 'establishment'; end if;
  perform pg_advisory_xact_lock(hashtext('admin_create_establishment:' || v_slug_base));
  v_slug := v_slug_base;
  while exists (select 1 from public.establishments where slug = v_slug) loop
    v_slug := v_slug_base || '-' || v_slug_suffix;
    v_slug_suffix := v_slug_suffix + 1;
  end loop;

  insert into public.establishments (
    name, name_ar, slug, image_url, status, is_verified, created_by, verified_at, establishment_type
  ) values (
    v_name_fr, v_name_ar, v_slug, v_image_url, 'approved', true, v_admin_id, now(), v_type
  ) returning id into v_establishment_id;

  insert into public.branches (establishment_id, name, address, neighborhood, latitude, longitude, is_main, status)
  values (v_establishment_id, v_name_fr, v_location, v_nearest_place, p_latitude, p_longitude, true, 'active')
  returning id into v_branch_id;

  if p_source_request_id is not null then
    update public.missing_service_requests
    set status = 'added', resolved_establishment_id = v_establishment_id
    where id = p_source_request_id;
  end if;

  return jsonb_build_object('ok', true, 'status', 'created', 'establishment_id', v_establishment_id, 'branch_id', v_branch_id, 'slug', v_slug, 'source_request_id', p_source_request_id);
end;
$$;

revoke all on function public.admin_create_establishment(text, text, text, text, text, text, text, date, date, uuid, numeric, numeric) from public, anon;
grant execute on function public.admin_create_establishment(text, text, text, text, text, text, text, date, date, uuid, numeric, numeric) to authenticated;

select pg_notify('pgrst', 'reload schema');
