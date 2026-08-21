-- DB4 maps: require a selected map point for new business submissions while
-- preserving nullable coordinates on pre-existing submission rows.
--
-- Apply after 20260821000002_db4_business_submissions.sql. This migration does
-- not alter payments, wallet/ledger logic, direct-table privileges, or search
-- debit behaviour.

alter table public.business_submissions
  add column if not exists latitude numeric,
  add column if not exists longitude numeric;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'business_submissions_coordinates_in_range'
      and conrelid = 'public.business_submissions'::regclass
  ) then
    alter table public.business_submissions
      add constraint business_submissions_coordinates_in_range
      check (
        (latitude is null or (latitude <> 'NaN'::numeric and latitude between -90 and 90))
        and (longitude is null or (longitude <> 'NaN'::numeric and longitude between -180 and 180))
      ) not valid;
  end if;
end;
$$;

-- The original 11-argument contract cannot accept a map point. Replace it so
-- an old browser cannot create a coordinate-free submission through the stale
-- RPC signature.
drop function if exists public.create_business_submission(
  text, text, text, text, text, text, text, text, uuid, text, text
);

create function public.create_business_submission(
  p_owner_first_name text,
  p_owner_last_name text,
  p_owner_phone text,
  p_business_name_fr text,
  p_business_name_ar text,
  p_business_phone text,
  p_latitude numeric,
  p_longitude numeric,
  p_whatsapp text default null,
  p_website text default null,
  p_category_id uuid default null,
  p_location text default null,
  p_nearest_place text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_owner_first_name text := pg_catalog.btrim(coalesce(p_owner_first_name, ''));
  v_owner_last_name text := pg_catalog.btrim(coalesce(p_owner_last_name, ''));
  v_owner_phone text := public.normalize_profile_phone(pg_catalog.btrim(coalesce(p_owner_phone, '')));
  v_business_name_fr text := pg_catalog.btrim(coalesce(p_business_name_fr, ''));
  v_business_name_ar text := pg_catalog.btrim(coalesce(p_business_name_ar, ''));
  v_business_phone text := public.normalize_profile_phone(pg_catalog.btrim(coalesce(p_business_phone, '')));
  v_whatsapp text := public.normalize_profile_phone(pg_catalog.btrim(coalesce(p_whatsapp, '')));
  v_website text := nullif(pg_catalog.btrim(coalesce(p_website, '')), '');
  v_location text := nullif(pg_catalog.btrim(coalesce(p_location, '')), '');
  v_nearest_place text := nullif(pg_catalog.btrim(coalesce(p_nearest_place, '')), '');
  v_amount_mro constant integer := 500;
  v_pending_count integer;
  v_submission_id uuid;
begin
  if v_user_id is null then
    return jsonb_build_object('ok', false, 'status', 'unauthenticated');
  end if;

  if p_latitude is null or p_longitude is null then
    return jsonb_build_object('ok', false, 'status', 'invalid_coordinates', 'message', 'Select a location on the map.');
  end if;

  if p_latitude = 'NaN'::numeric or p_longitude = 'NaN'::numeric
    or p_latitude < -90 or p_latitude > 90
    or p_longitude < -180 or p_longitude > 180 then
    return jsonb_build_object('ok', false, 'status', 'invalid_coordinates', 'message', 'Coordinates are outside the supported range.');
  end if;

  if v_owner_first_name = '' or char_length(v_owner_first_name) > 120
    or v_owner_last_name = '' or char_length(v_owner_last_name) > 120 then
    return jsonb_build_object('ok', false, 'status', 'invalid_input', 'message', 'Owner names must contain at most 120 characters.');
  end if;

  if v_business_name_fr = '' or char_length(v_business_name_fr) > 160 then
    return jsonb_build_object('ok', false, 'status', 'invalid_input', 'message', 'A French business name of at most 160 characters is required.');
  end if;

  if v_business_name_ar = '' or char_length(v_business_name_ar) > 160
    or v_business_name_ar !~ '^[ء-ۿ[:space:]]+$' then
    return jsonb_build_object('ok', false, 'status', 'invalid_input', 'message', 'An Arabic business name of at most 160 characters is required.');
  end if;

  if v_owner_phone !~ '^[234][0-9]{7}$'
    or v_business_phone !~ '^[234][0-9]{7}$'
    or (v_whatsapp is not null and v_whatsapp !~ '^[234][0-9]{7}$') then
    return jsonb_build_object('ok', false, 'status', 'invalid_input', 'message', 'A valid Mauritanian phone number is required.');
  end if;

  if v_website is not null and (char_length(v_website) > 2048 or lower(v_website) !~ '^https?://[^[:space:]]+$') then
    return jsonb_build_object('ok', false, 'status', 'invalid_input', 'message', 'Website must be a valid HTTP or HTTPS URL.');
  end if;

  if (v_location is not null and char_length(v_location) > 240)
    or (v_nearest_place is not null and char_length(v_nearest_place) > 240) then
    return jsonb_build_object('ok', false, 'status', 'invalid_input', 'message', 'Location fields must contain at most 240 characters.');
  end if;

  if p_category_id is not null and not exists (
    select 1
    from public.categories as category
    where category.id = p_category_id
      and category.status = 'active'
  ) then
    return jsonb_build_object('ok', false, 'status', 'invalid_category');
  end if;

  perform pg_advisory_xact_lock(hashtext('create_business_submission:' || v_user_id::text));

  select count(*) into v_pending_count
  from public.business_submissions as submission
  where submission.created_by = v_user_id
    and submission.status = 'pending_review';

  if v_pending_count >= 3 then
    return jsonb_build_object('ok', false, 'status', 'rate_limited', 'message', 'At most three business submissions may be pending review.');
  end if;

  insert into public.business_submissions (
    created_by,
    owner_first_name,
    owner_last_name,
    owner_phone,
    business_name_fr,
    business_name_ar,
    business_phone,
    whatsapp,
    website,
    category_id,
    location,
    nearest_place,
    latitude,
    longitude,
    amount_mro,
    status
  )
  values (
    v_user_id,
    v_owner_first_name,
    v_owner_last_name,
    v_owner_phone,
    v_business_name_fr,
    v_business_name_ar,
    v_business_phone,
    v_whatsapp,
    v_website,
    p_category_id,
    v_location,
    v_nearest_place,
    p_latitude,
    p_longitude,
    v_amount_mro,
    'pending_review'
  )
  returning id into v_submission_id;

  return jsonb_build_object(
    'ok', true,
    'status', 'pending_review',
    'submission_id', v_submission_id,
    'amount_mro', v_amount_mro
  );
end;
$$;

revoke all on function public.create_business_submission(text, text, text, text, text, text, numeric, numeric, text, text, uuid, text, text) from public, anon;
grant execute on function public.create_business_submission(text, text, text, text, text, text, numeric, numeric, text, text, uuid, text, text) to authenticated;

create or replace function public.admin_get_business_submission_details(p_submission_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_submission public.business_submissions%rowtype;
  v_category public.categories%rowtype;
  v_creator public.profiles%rowtype;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception using errcode = '42501', message = 'An active admin account is required.';
  end if;

  if p_submission_id is null then
    raise exception using errcode = '22023', message = 'A business submission id is required.';
  end if;

  select * into v_submission
  from public.business_submissions as submission
  where submission.id = p_submission_id;

  if not found then
    raise exception using errcode = 'P0002', message = 'Business submission not found.';
  end if;

  if v_submission.category_id is not null then
    select * into v_category
    from public.categories as category
    where category.id = v_submission.category_id;
  end if;

  select * into v_creator
  from public.profiles as profile
  where profile.id = v_submission.created_by;

  return jsonb_build_object(
    'id', v_submission.id,
    'created_by', v_submission.created_by,
    'owner_first_name', v_submission.owner_first_name,
    'owner_last_name', v_submission.owner_last_name,
    'owner_phone', v_submission.owner_phone,
    'business_name_fr', v_submission.business_name_fr,
    'business_name_ar', v_submission.business_name_ar,
    'business_phone', v_submission.business_phone,
    'whatsapp', v_submission.whatsapp,
    'website', v_submission.website,
    'location', v_submission.location,
    'nearest_place', v_submission.nearest_place,
    'latitude', v_submission.latitude,
    'longitude', v_submission.longitude,
    'category_id', v_submission.category_id,
    'category', case when v_category.id is null then null else jsonb_build_object(
      'id', v_category.id,
      'name', v_category.name,
      'slug', v_category.slug,
      'status', v_category.status
    ) end,
    'amount_mro', v_submission.amount_mro,
    'status', v_submission.status,
    'admin_note', v_submission.admin_note,
    'rejection_reason', v_submission.rejection_reason,
    'resolved_establishment_id', v_submission.resolved_establishment_id,
    'approved_by', v_submission.approved_by,
    'approved_at', v_submission.approved_at,
    'rejected_by', v_submission.rejected_by,
    'rejected_at', v_submission.rejected_at,
    'created_at', v_submission.created_at,
    'updated_at', v_submission.updated_at,
    'creator', case when v_creator.id is null then null else jsonb_build_object(
      'id', v_creator.id,
      'full_name', v_creator.full_name,
      'full_name_ar', v_creator.full_name_ar,
      'email', v_creator.email,
      'phone', v_creator.phone
    ) end
  );
end;
$$;

revoke all on function public.admin_get_business_submission_details(uuid) from public, anon;
grant execute on function public.admin_get_business_submission_details(uuid) to authenticated;

create or replace function public.admin_approve_business_submission(
  p_submission_id uuid,
  p_admin_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin_id uuid := auth.uid();
  v_admin_note text := nullif(pg_catalog.btrim(coalesce(p_admin_note, '')), '');
  v_submission public.business_submissions%rowtype;
  v_slug_base text;
  v_slug text;
  v_slug_suffix integer := 2;
  v_establishment_id uuid;
  v_branch_id uuid;
begin
  if v_admin_id is null or not public.is_admin() then
    raise exception using errcode = '42501', message = 'An active admin account is required.';
  end if;

  if p_submission_id is null then
    raise exception using errcode = '22023', message = 'A business submission id is required.';
  end if;

  if v_admin_note is not null and char_length(v_admin_note) > 1000 then
    raise exception using errcode = '22023', message = 'Admin note must contain at most 1000 characters.';
  end if;

  select * into v_submission
  from public.business_submissions as submission
  where submission.id = p_submission_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'status', 'not_found');
  end if;

  if v_submission.status <> 'pending_review' then
    return jsonb_build_object('ok', false, 'status', 'not_pending', 'submission_status', v_submission.status);
  end if;

  if v_submission.latitude is null or v_submission.longitude is null
    or v_submission.latitude = 'NaN'::numeric or v_submission.longitude = 'NaN'::numeric
    or v_submission.latitude < -90 or v_submission.latitude > 90
    or v_submission.longitude < -180 or v_submission.longitude > 180 then
    return jsonb_build_object(
      'ok', false,
      'status', 'invalid_coordinates',
      'submission_id', v_submission.id,
      'establishment_id', null,
      'branch_id', null
    );
  end if;

  if v_submission.category_id is not null and not exists (
    select 1
    from public.categories as category
    where category.id = v_submission.category_id
      and category.status = 'active'
  ) then
    return jsonb_build_object('ok', false, 'status', 'invalid_category');
  end if;

  v_slug_base := trim(both '-' from regexp_replace(lower(v_submission.business_name_fr), '[^a-z0-9]+', '-', 'g'));
  if v_slug_base = '' then
    v_slug_base := 'establishment';
  end if;

  perform pg_advisory_xact_lock(hashtext('admin_approve_business_submission:' || v_slug_base));
  v_slug := v_slug_base;
  while exists (select 1 from public.establishments as establishment where establishment.slug = v_slug) loop
    v_slug := v_slug_base || '-' || v_slug_suffix;
    v_slug_suffix := v_slug_suffix + 1;
  end loop;

  insert into public.establishments (
    category_id,
    name,
    name_ar,
    slug,
    phone,
    whatsapp,
    website,
    status,
    is_verified,
    created_by,
    verified_at
  )
  values (
    v_submission.category_id,
    v_submission.business_name_fr,
    v_submission.business_name_ar,
    v_slug,
    v_submission.business_phone,
    coalesce(v_submission.whatsapp, v_submission.business_phone),
    v_submission.website,
    'approved',
    true,
    v_admin_id,
    now()
  )
  returning id into v_establishment_id;

  insert into public.branches (
    establishment_id,
    name,
    phone,
    whatsapp,
    address,
    neighborhood,
    latitude,
    longitude,
    is_main,
    status
  )
  values (
    v_establishment_id,
    v_submission.business_name_fr,
    v_submission.business_phone,
    coalesce(v_submission.whatsapp, v_submission.business_phone),
    v_submission.location,
    v_submission.nearest_place,
    v_submission.latitude,
    v_submission.longitude,
    true,
    'active'
  )
  returning id into v_branch_id;

  update public.business_submissions as submission
  set
    status = 'approved',
    admin_note = coalesce(v_admin_note, submission.admin_note),
    resolved_establishment_id = v_establishment_id,
    approved_by = v_admin_id,
    approved_at = now()
  where submission.id = v_submission.id;

  insert into public.admin_audit_events (actor_id, action, target_table, target_id, before_data, after_data, metadata)
  values (
    v_admin_id,
    'business_submission_approved',
    'business_submissions',
    v_submission.id,
    jsonb_build_object('status', v_submission.status),
    jsonb_build_object('status', 'approved', 'resolved_establishment_id', v_establishment_id),
    jsonb_build_object(
      'submission_id', v_submission.id,
      'establishment_id', v_establishment_id,
      'branch_id', v_branch_id,
      'business_name_fr', v_submission.business_name_fr,
      'business_phone', v_submission.business_phone
    )
  );

  return jsonb_build_object(
    'ok', true,
    'status', 'approved',
    'submission_id', v_submission.id,
    'establishment_id', v_establishment_id,
    'branch_id', v_branch_id
  );
end;
$$;

revoke all on function public.admin_approve_business_submission(uuid, text) from public, anon;
grant execute on function public.admin_approve_business_submission(uuid, text) to authenticated;

-- Preserve the mature establishment-validation flow internally, then expose a
-- compatible public RPC that optionally writes a validated coordinate pair.
do $$
begin
  if to_regprocedure('public.admin_create_establishment_legacy(text,text,text,text,text,text,date,date,uuid)') is null
    and to_regprocedure('public.admin_create_establishment(text,text,text,text,text,text,date,date,uuid)') is not null then
    alter function public.admin_create_establishment(text, text, text, text, text, text, date, date, uuid)
      rename to admin_create_establishment_legacy;
  end if;
end;
$$;

revoke all on function public.admin_create_establishment_legacy(text, text, text, text, text, text, date, date, uuid) from public, anon, authenticated;

create or replace function public.admin_create_establishment(
  p_name_fr text,
  p_name_ar text,
  p_phone text,
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
  v_response jsonb;
  v_branch_id uuid;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'status', 'unauthenticated', 'message', 'Authentication required.');
  end if;

  if not public.is_admin() then
    return jsonb_build_object('ok', false, 'status', 'forbidden', 'message', 'An active admin account is required.');
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

  select public.admin_create_establishment_legacy(
    p_name_fr,
    p_name_ar,
    p_phone,
    p_image_url,
    p_location,
    p_nearest_place,
    p_opening_date,
    p_closing_date,
    p_source_request_id
  ) into v_response;

  if v_response ->> 'ok' <> 'true' or p_latitude is null then
    return v_response;
  end if;

  v_branch_id := nullif(v_response ->> 'branch_id', '')::uuid;
  if v_branch_id is null then
    return jsonb_build_object('ok', false, 'status', 'error', 'message', 'Created branch was not returned.');
  end if;

  update public.branches as branch
  set latitude = p_latitude,
      longitude = p_longitude
  where branch.id = v_branch_id;

  return v_response;
end;
$$;

revoke all on function public.admin_create_establishment(text, text, text, text, text, text, date, date, uuid, numeric, numeric) from public, anon;
grant execute on function public.admin_create_establishment(text, text, text, text, text, text, date, date, uuid, numeric, numeric) to authenticated;
