-- DB4 business-submission branch declaration.
--
-- The submitted count is informational until administrators add verified
-- branch records with real addresses and coordinates. Approval intentionally
-- remains owned by 20260821000003_db4_maps_location_support.sql and continues
-- to create only the single main branch represented by the submitted point.

alter table public.business_submissions
  add column if not exists requested_branch_count integer;

update public.business_submissions
set requested_branch_count = 1
where requested_branch_count is null;

alter table public.business_submissions
  alter column requested_branch_count set default 1,
  alter column requested_branch_count set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'business_submissions_requested_branch_count_range'
      and conrelid = 'public.business_submissions'::regclass
  ) then
    alter table public.business_submissions
      add constraint business_submissions_requested_branch_count_range
      check (requested_branch_count between 1 and 20);
  end if;
end;
$$;

comment on column public.business_submissions.requested_branch_count is
  'Number of branches declared by the client. Only verified rows in branches represent searchable branch locations.';

-- Replace the current coordinate-aware creation contract with one additional
-- defaulted argument. Removing the old overload keeps PostgREST resolution
-- unambiguous while calls that omit the new argument continue to default to 1.
drop function if exists public.create_business_submission(
  text, text, text, text, text, text, numeric, numeric, text, text, uuid, text, text
);

create or replace function public.create_business_submission(
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
  p_nearest_place text default null,
  p_requested_branch_count integer default 1
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
  v_requested_branch_count integer := coalesce(p_requested_branch_count, 1);
  v_amount_mro constant integer := 200;
  v_period_months constant integer := 3;
  v_pending_count integer;
  v_submission_id uuid;
begin
  if v_user_id is null then
    return jsonb_build_object('ok', false, 'status', 'unauthenticated');
  end if;

  if v_requested_branch_count < 1 or v_requested_branch_count > 20 then
    return jsonb_build_object(
      'ok', false,
      'status', 'invalid_input',
      'message', 'Requested branch count must be between 1 and 20.'
    );
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
    requested_branch_count,
    amount_mro,
    period_months,
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
    v_requested_branch_count,
    v_amount_mro,
    v_period_months,
    'pending_review'
  )
  returning id into v_submission_id;

  return jsonb_build_object(
    'ok', true,
    'status', 'pending_review',
    'submission_id', v_submission_id,
    'amount_mro', v_amount_mro,
    'period_months', v_period_months,
    'requested_branch_count', v_requested_branch_count
  );
end;
$$;

revoke all on function public.create_business_submission(text, text, text, text, text, text, numeric, numeric, text, text, uuid, text, text, integer) from public, anon;
grant execute on function public.create_business_submission(text, text, text, text, text, text, numeric, numeric, text, text, uuid, text, text, integer) to authenticated;

-- Keep the existing bounded admin list contract and expose both the client
-- declaration and the number of real active branch records currently present.
create or replace function public.admin_list_business_submissions(
  p_status text default null,
  p_search text default null,
  p_page integer default 1,
  p_page_size integer default 10
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status text := nullif(pg_catalog.btrim(coalesce(p_status, '')), '');
  v_search text := nullif(pg_catalog.btrim(coalesce(p_search, '')), '');
  v_pattern text;
  v_page integer := coalesce(p_page, 1);
  v_page_size integer := coalesce(p_page_size, 10);
  v_offset integer;
  v_total_count integer;
  v_items jsonb;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception using errcode = '42501', message = 'An active admin account is required.';
  end if;

  if v_status is not null and v_status not in ('pending_review', 'approved', 'rejected', 'cancelled') then
    raise exception using errcode = '22023', message = 'The requested status is not allowed.';
  end if;

  if v_page < 1 then
    raise exception using errcode = '22023', message = 'Page must be greater than zero.';
  end if;

  if v_page_size < 1 or v_page_size > 100 then
    raise exception using errcode = '22023', message = 'Page size must be between 1 and 100.';
  end if;

  if v_search is not null and char_length(v_search) > 120 then
    raise exception using errcode = '22023', message = 'Search text is too long.';
  end if;

  if v_search is not null then
    v_pattern := '%' || replace(replace(replace(v_search, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%';
  end if;

  v_offset := (v_page - 1) * v_page_size;

  select count(*) into v_total_count
  from public.business_submissions as submission
  where (v_status is null or submission.status = v_status)
    and (
      v_pattern is null
      or submission.owner_first_name ilike v_pattern escape E'\\'
      or submission.owner_last_name ilike v_pattern escape E'\\'
      or (submission.owner_first_name || ' ' || submission.owner_last_name) ilike v_pattern escape E'\\'
      or submission.owner_phone ilike v_pattern escape E'\\'
      or submission.business_name_fr ilike v_pattern escape E'\\'
      or submission.business_name_ar ilike v_pattern escape E'\\'
      or submission.business_phone ilike v_pattern escape E'\\'
      or coalesce(submission.whatsapp, '') ilike v_pattern escape E'\\'
    );

  select coalesce(jsonb_agg(row_data.payload order by row_data.created_at desc, row_data.id desc), '[]'::jsonb)
  into v_items
  from (
    select
      submission.id,
      submission.created_at,
      jsonb_build_object(
        'id', submission.id,
        'created_by', submission.created_by,
        'owner_first_name', submission.owner_first_name,
        'owner_last_name', submission.owner_last_name,
        'owner_phone', submission.owner_phone,
        'business_name_fr', submission.business_name_fr,
        'business_name_ar', submission.business_name_ar,
        'business_phone', submission.business_phone,
        'whatsapp', submission.whatsapp,
        'category_id', submission.category_id,
        'category_name', category.name,
        'status', submission.status,
        'amount_mro', submission.amount_mro,
        'period_months', submission.period_months,
        'requested_branch_count', submission.requested_branch_count,
        'actual_branch_count', case
          when submission.resolved_establishment_id is null then 0
          else (
            select count(*)::integer
            from public.branches as branch
            where branch.establishment_id = submission.resolved_establishment_id
              and branch.status = 'active'
          )
        end,
        'resolved_establishment_id', submission.resolved_establishment_id,
        'approved_at', submission.approved_at,
        'rejected_at', submission.rejected_at,
        'created_at', submission.created_at,
        'updated_at', submission.updated_at
      ) as payload
    from public.business_submissions as submission
    left join public.categories as category on category.id = submission.category_id
    where (v_status is null or submission.status = v_status)
      and (
        v_pattern is null
        or submission.owner_first_name ilike v_pattern escape E'\\'
        or submission.owner_last_name ilike v_pattern escape E'\\'
        or (submission.owner_first_name || ' ' || submission.owner_last_name) ilike v_pattern escape E'\\'
        or submission.owner_phone ilike v_pattern escape E'\\'
        or submission.business_name_fr ilike v_pattern escape E'\\'
        or submission.business_name_ar ilike v_pattern escape E'\\'
        or submission.business_phone ilike v_pattern escape E'\\'
        or coalesce(submission.whatsapp, '') ilike v_pattern escape E'\\'
      )
    order by submission.created_at desc, submission.id desc
    limit v_page_size
    offset v_offset
  ) as row_data;

  return jsonb_build_object(
    'items', v_items,
    'total_count', v_total_count,
    'page', v_page,
    'page_size', v_page_size
  );
end;
$$;

revoke all on function public.admin_list_business_submissions(text, text, integer, integer) from public, anon;
grant execute on function public.admin_list_business_submissions(text, text, integer, integer) to authenticated;

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
  v_actual_branch_count integer := 0;
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

  if v_submission.resolved_establishment_id is not null then
    select count(*)::integer into v_actual_branch_count
    from public.branches as branch
    where branch.establishment_id = v_submission.resolved_establishment_id
      and branch.status = 'active';
  end if;

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
    'category_name', v_category.name,
    'category', case when v_category.id is null then null else jsonb_build_object(
      'id', v_category.id,
      'name', v_category.name,
      'slug', v_category.slug,
      'status', v_category.status
    ) end,
    'amount_mro', v_submission.amount_mro,
    'period_months', v_submission.period_months,
    'requested_branch_count', v_submission.requested_branch_count,
    'actual_branch_count', v_actual_branch_count,
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
