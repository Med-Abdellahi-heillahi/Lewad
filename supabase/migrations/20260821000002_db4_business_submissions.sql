-- Lewad DB4: owner-submitted business proposals with manual admin review.
--
-- This migration intentionally exposes no direct client write policy. The
-- fixed 500 MRO amount and every state transition are decided inside reviewed
-- SECURITY DEFINER RPCs, after the caller has been authenticated.

create table if not exists public.business_submissions (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users (id) on delete cascade,
  owner_first_name text not null check (pg_catalog.btrim(owner_first_name) <> ''),
  owner_last_name text not null check (pg_catalog.btrim(owner_last_name) <> ''),
  owner_phone text not null check (pg_catalog.btrim(owner_phone) <> ''),
  business_name_fr text not null check (pg_catalog.btrim(business_name_fr) <> ''),
  business_name_ar text not null check (pg_catalog.btrim(business_name_ar) <> ''),
  business_phone text not null check (pg_catalog.btrim(business_phone) <> ''),
  whatsapp text,
  website text,
  category_id uuid references public.categories (id) on delete set null,
  location text,
  nearest_place text,
  amount_mro integer not null default 500 check (amount_mro = 500),
  status text not null default 'pending_review'
    check (status in ('pending_review', 'approved', 'rejected', 'cancelled')),
  admin_note text,
  rejection_reason text,
  resolved_establishment_id uuid references public.establishments (id) on delete set null,
  approved_by uuid references auth.users (id) on delete set null,
  approved_at timestamptz,
  rejected_by uuid references auth.users (id) on delete set null,
  rejected_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists business_submissions_created_by_status_created_at_idx
on public.business_submissions (created_by, status, created_at desc);

create index if not exists business_submissions_status_created_at_idx
on public.business_submissions (status, created_at desc);

create index if not exists business_submissions_category_id_idx
on public.business_submissions (category_id);

drop trigger if exists business_submissions_set_updated_at on public.business_submissions;
create trigger business_submissions_set_updated_at
before update on public.business_submissions
for each row execute function public.set_updated_at();

alter table public.business_submissions enable row level security;

-- A member may read only their own proposal. Administrators may review all
-- rows, but neither role receives table INSERT, UPDATE, or DELETE privileges.
drop policy if exists "Users can read their own business submissions" on public.business_submissions;
create policy "Users can read their own business submissions"
on public.business_submissions for select
to authenticated
using ((select auth.uid()) = created_by);

drop policy if exists "Admins can read all business submissions" on public.business_submissions;
create policy "Admins can read all business submissions"
on public.business_submissions for select
to authenticated
using ((select public.is_admin()));

revoke all on public.business_submissions from anon, authenticated;
grant select on public.business_submissions to authenticated;

create or replace function public.create_business_submission(
  p_owner_first_name text,
  p_owner_last_name text,
  p_owner_phone text,
  p_business_name_fr text,
  p_business_name_ar text,
  p_business_phone text,
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

  if v_owner_first_name = '' or char_length(v_owner_first_name) > 120
    or v_owner_last_name = '' or char_length(v_owner_last_name) > 120 then
    return jsonb_build_object('ok', false, 'status', 'invalid_input', 'message', 'Owner names must contain at most 120 characters.');
  end if;

  if v_business_name_fr = '' or char_length(v_business_name_fr) > 160 then
    return jsonb_build_object('ok', false, 'status', 'invalid_input', 'message', 'A French business name of at most 160 characters is required.');
  end if;

  if v_business_name_ar = '' or char_length(v_business_name_ar) > 160
    or v_business_name_ar !~ '^[؀-ۿ[:space:]]+$' then
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

  -- Serialise one account's pending-submission check, so concurrent browser
  -- requests cannot bypass the small anti-spam limit.
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

revoke all on function public.create_business_submission(text, text, text, text, text, text, text, text, uuid, text, text) from public, anon;
grant execute on function public.create_business_submission(text, text, text, text, text, text, text, text, uuid, text, text) to authenticated;

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
    limit v_page_size offset v_offset
  ) as row_data;

  return jsonb_build_object(
    'items', v_items,
    'total_count', coalesce(v_total_count, 0),
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

create or replace function public.admin_reject_business_submission(
  p_submission_id uuid,
  p_rejection_reason text,
  p_admin_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin_id uuid := auth.uid();
  v_rejection_reason text := pg_catalog.btrim(coalesce(p_rejection_reason, ''));
  v_admin_note text := nullif(pg_catalog.btrim(coalesce(p_admin_note, '')), '');
  v_submission public.business_submissions%rowtype;
begin
  if v_admin_id is null or not public.is_admin() then
    raise exception using errcode = '42501', message = 'An active admin account is required.';
  end if;

  if p_submission_id is null then
    raise exception using errcode = '22023', message = 'A business submission id is required.';
  end if;

  if v_rejection_reason = '' or char_length(v_rejection_reason) > 500 then
    raise exception using errcode = '22023', message = 'A rejection reason of at most 500 characters is required.';
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

  update public.business_submissions as submission
  set
    status = 'rejected',
    rejection_reason = v_rejection_reason,
    admin_note = coalesce(v_admin_note, submission.admin_note),
    rejected_by = v_admin_id,
    rejected_at = now()
  where submission.id = v_submission.id;

  insert into public.admin_audit_events (actor_id, action, target_table, target_id, before_data, after_data, metadata)
  values (
    v_admin_id,
    'business_submission_rejected',
    'business_submissions',
    v_submission.id,
    jsonb_build_object('status', v_submission.status),
    jsonb_build_object('status', 'rejected'),
    jsonb_build_object(
      'submission_id', v_submission.id,
      'business_name_fr', v_submission.business_name_fr,
      'business_phone', v_submission.business_phone
    )
  );

  return jsonb_build_object('ok', true, 'status', 'rejected', 'submission_id', v_submission.id);
end;
$$;

revoke all on function public.admin_reject_business_submission(uuid, text, text) from public, anon;
grant execute on function public.admin_reject_business_submission(uuid, text, text) to authenticated;
