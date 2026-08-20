-- Lewad Security 2B: Medium-finding hardening.
--
-- This migration intentionally leaves the historical duplicate migration
-- version untouched because the remote migration history is not available in
-- this workspace. It adds only forward-compatible safeguards.

-- SEC-003: bounded searches need an index for the per-account throttle.
create index if not exists search_logs_user_created_at_idx
on public.search_logs (user_id, created_at desc);

-- SEC-005: request throttling is scoped to the requesting account.
create index if not exists missing_service_requests_user_created_at_idx
on public.missing_service_requests (user_id, created_at desc);

-- SEC-007: privileged database operations append a compact, immutable event.
-- Browser roles receive no table privileges or policies, so audit rows can be
-- written only from the reviewed SECURITY DEFINER transactions below.
create table if not exists public.admin_audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null,
  action text not null check (btrim(action) <> ''),
  target_table text not null check (btrim(target_table) <> ''),
  target_id uuid not null,
  before_data jsonb,
  after_data jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_events_actor_created_at_idx
on public.admin_audit_events (actor_id, created_at desc);

create index if not exists admin_audit_events_target_idx
on public.admin_audit_events (target_table, target_id, created_at desc);

alter table public.admin_audit_events enable row level security;
revoke all on public.admin_audit_events from anon, authenticated;

-- SEC-003 and SEC-004: cap and throttle search work, treat wildcard characters
-- literally, and only exempt active administrators from the credit debit.
create or replace function public.search_services_with_credit(p_query text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_query text := btrim(coalesce(p_query, ''));
  v_normalized_query text;
  v_search_pattern text;
  v_role text;
  v_profile_status text;
  v_unlimited boolean := false;
  v_wallet public.wallets%rowtype;
  v_balance integer;
  v_ledger_id uuid;
  v_log_id uuid;
  v_results jsonb := '[]'::jsonb;
  v_results_count integer := 0;
  v_status text;
begin
  v_normalized_query := lower(regexp_replace(v_query, '\s+', ' ', 'g'));

  if v_user_id is null then
    return jsonb_build_object(
      'ok', false,
      'status', 'unauthenticated',
      'message', 'Authentication required.',
      'unlimited', false,
      'debited_points', 0,
      'results', '[]'::jsonb
    );
  end if;

  if char_length(v_normalized_query) < 2 or char_length(v_normalized_query) > 80 then
    return jsonb_build_object(
      'ok', false,
      'status', 'invalid_query',
      'message', 'Search query must contain between 2 and 80 characters.',
      'unlimited', false,
      'debited_points', 0,
      'results', '[]'::jsonb
    );
  end if;

  -- Serialize each account's valid searches so concurrent requests cannot
  -- race the rolling-window count below.
  perform pg_advisory_xact_lock(hashtext('search_services_with_credit:' || v_user_id::text));

  if (
    select count(*)
    from public.search_logs as search_log
    where search_log.user_id = v_user_id
      and search_log.created_at >= now() - interval '1 minute'
  ) >= 20 then
    return jsonb_build_object(
      'ok', false,
      'status', 'error',
      'message', 'Too many searches. Please wait a moment before trying again.',
      'unlimited', false,
      'debited_points', 0,
      'results', '[]'::jsonb
    );
  end if;

  select profile.role, profile.status
  into v_role, v_profile_status
  from public.profiles as profile
  where profile.id = v_user_id;

  v_unlimited := coalesce(
    v_profile_status = 'active' and v_role in ('admin', 'super_admin'),
    false
  );

  -- Escape ILIKE wildcards so a user query remains literal search text.
  v_search_pattern := replace(
    replace(
      replace(v_normalized_query, E'\\', E'\\\\'),
      '%', E'\\%'
    ),
    '_', E'\\_'
  );

  if v_unlimited then
    select *
    into v_wallet
    from public.wallets
    where user_id = v_user_id;
  else
    select *
    into v_wallet
    from public.wallets
    where user_id = v_user_id
    for update;

    if not found then
      return jsonb_build_object(
        'ok', false,
        'status', 'error',
        'message', 'Wallet not found.',
        'unlimited', false,
        'debited_points', 0,
        'results', '[]'::jsonb
      );
    end if;

    if v_wallet.balance < 1 then
      insert into public.search_logs (
        user_id, query, normalized_query, status, results_count, debited_points, wallet_id, metadata
      )
      values (
        v_user_id, v_query, v_normalized_query, 'insufficient_credits', 0, 0, v_wallet.id,
        jsonb_build_object('reason', 'insufficient_credits', 'query', v_query, 'role', coalesce(v_role, 'user'), 'unlimited', false)
      );

      return jsonb_build_object(
        'ok', false,
        'status', 'insufficient_credits',
        'message', 'Insufficient credits',
        'balance', v_wallet.balance,
        'unlimited', false,
        'debited_points', 0,
        'results', '[]'::jsonb
      );
    end if;

    update public.wallets
    set balance = balance - 1
    where id = v_wallet.id
    returning balance into v_balance;

    insert into public.credit_ledger (
      user_id, wallet_id, amount, type, reason, reference_type, metadata
    )
    values (
      v_user_id, v_wallet.id, -1, 'search_debit', 'Service search', 'search_logs',
      jsonb_build_object('query', v_query, 'normalized_query', v_normalized_query)
    )
    returning id into v_ledger_id;
  end if;

  with matching_establishments as (
    select
      establishment.id,
      establishment.name,
      establishment.slug,
      establishment.description,
      establishment.phone,
      establishment.whatsapp,
      establishment.website,
      establishment.is_verified,
      category.id as category_id,
      category.name as category_name,
      category.slug as category_slug,
      category.icon as category_icon
    from public.establishments as establishment
    left join public.categories as category
      on category.id = establishment.category_id
      and category.status = 'active'
    where establishment.status = 'approved'
      and (
        establishment.name ilike '%' || v_search_pattern || '%' escape E'\\'
        or establishment.slug ilike '%' || v_search_pattern || '%' escape E'\\'
        or coalesce(establishment.description, '') ilike '%' || v_search_pattern || '%' escape E'\\'
      )
    order by
      case
        when lower(establishment.name) = v_normalized_query
          or lower(establishment.slug) = v_normalized_query then 0
        else 1
      end,
      establishment.is_verified desc,
      establishment.name asc
    limit 20
  ), result_rows as (
    select jsonb_build_object(
      'id', establishment.id,
      'name', establishment.name,
      'slug', establishment.slug,
      'description', establishment.description,
      'phone', establishment.phone,
      'whatsapp', establishment.whatsapp,
      'website', establishment.website,
      'is_verified', establishment.is_verified,
      'category', case
        when establishment.category_id is null then null
        else jsonb_build_object(
          'id', establishment.category_id,
          'name', establishment.category_name,
          'slug', establishment.category_slug,
          'icon', establishment.category_icon
        )
      end,
      'branches', coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'id', branch.id,
            'name', branch.name,
            'phone', branch.phone,
            'whatsapp', branch.whatsapp,
            'address', branch.address,
            'city', branch.city,
            'neighborhood', branch.neighborhood,
            'latitude', branch.latitude,
            'longitude', branch.longitude,
            'is_main', branch.is_main
          )
          order by branch.is_main desc, branch.name asc
        )
        from (
          select *
          from public.branches as branch
          where branch.establishment_id = establishment.id
            and branch.status = 'active'
          order by branch.is_main desc, branch.name asc
          limit 10
        ) as branch
      ), '[]'::jsonb)
    ) as result
    from matching_establishments as establishment
  )
  select coalesce(jsonb_agg(result), '[]'::jsonb), count(*)
  into v_results, v_results_count
  from result_rows;

  v_status := case when v_results_count > 0 then 'success' else 'not_found' end;

  insert into public.search_logs (
    user_id, query, normalized_query, status, results_count, debited_points, wallet_id, ledger_id, metadata
  )
  values (
    v_user_id,
    v_query,
    v_normalized_query,
    v_status,
    v_results_count,
    case when v_unlimited then 0 else 1 end,
    v_wallet.id,
    v_ledger_id,
    jsonb_build_object(
      'search_cost', case when v_unlimited then 0 else 1 end,
      'query', v_query,
      'normalized_query', v_normalized_query,
      'role', coalesce(v_role, 'user'),
      'unlimited', v_unlimited
    )
  )
  returning id into v_log_id;

  update public.credit_ledger
  set reference_id = v_log_id
  where id = v_ledger_id;

  return jsonb_build_object(
    'ok', true,
    'status', v_status,
    'debited_points', case when v_unlimited then 0 else 1 end,
    'balance', case when v_unlimited then v_wallet.balance else v_balance end,
    'unlimited', v_unlimited,
    'query', v_normalized_query,
    'search_log_id', v_log_id,
    'results_count', v_results_count,
    'results', v_results
  );
end;
$$;

revoke all on function public.search_services_with_credit(text) from public, anon;
grant execute on function public.search_services_with_credit(text) to authenticated;

-- SEC-005: every missing-service request derives from a recent, matching
-- not-found search and each member can create at most five per hour.
create or replace function public.create_missing_service_request(
  p_query text,
  p_message text default null,
  p_search_log_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_query text := btrim(coalesce(p_query, ''));
  v_normalized_query text;
  v_message text := nullif(btrim(p_message), '');
  v_search_log_id uuid;
  v_request_id uuid;
begin
  if v_user_id is null then
    return jsonb_build_object('ok', false, 'status', 'unauthenticated', 'message', 'Authentication required.');
  end if;

  v_normalized_query := lower(regexp_replace(v_query, '\s+', ' ', 'g'));

  if char_length(v_normalized_query) < 2 or char_length(v_normalized_query) > 80 then
    return jsonb_build_object('ok', false, 'status', 'invalid_query', 'message', 'Query must contain between 2 and 80 characters.');
  end if;

  if v_message is not null and char_length(v_message) > 1000 then
    return jsonb_build_object('ok', false, 'status', 'error', 'message', 'Message is too long.');
  end if;

  if p_search_log_id is null then
    return jsonb_build_object('ok', false, 'status', 'error', 'message', 'A recent not-found search is required.');
  end if;

  -- Serialize request creation per account so the rolling limit is effective
  -- under concurrent browser requests as well.
  perform pg_advisory_xact_lock(hashtext('create_missing_service_request:' || v_user_id::text));

  select search_log.id
  into v_search_log_id
  from public.search_logs as search_log
  where search_log.id = p_search_log_id
    and search_log.user_id = v_user_id
    and search_log.status = 'not_found'
    and search_log.normalized_query = v_normalized_query
    and search_log.created_at >= now() - interval '24 hours';

  if not found then
    return jsonb_build_object('ok', false, 'status', 'error', 'message', 'A matching recent not-found search is required.');
  end if;

  if (
    select count(*)
    from public.missing_service_requests as request
    where request.user_id = v_user_id
      and request.created_at >= now() - interval '1 hour'
  ) >= 5 then
    return jsonb_build_object('ok', false, 'status', 'error', 'message', 'Too many requests. Please try again later.');
  end if;

  insert into public.missing_service_requests (
    user_id, query, normalized_query, message, status, search_log_id
  )
  values (
    v_user_id, v_query, v_normalized_query, v_message, 'pending', v_search_log_id
  )
  on conflict (user_id, normalized_query) where status = 'pending' do nothing
  returning id into v_request_id;

  if v_request_id is null then
    return jsonb_build_object('ok', true, 'status', 'duplicate', 'message', 'A pending request already exists for this service.');
  end if;

  return jsonb_build_object('ok', true, 'status', 'created', 'message', 'Request created', 'request_id', v_request_id);
end;
$$;

revoke all on function public.create_missing_service_request(text, text, uuid) from public, anon;
grant execute on function public.create_missing_service_request(text, text, uuid) to authenticated;

-- SEC-006: request reviews are RPC-only; direct PostgREST UPDATE is removed.
revoke update on public.missing_service_requests from anon, authenticated;
drop policy if exists "Admins can review missing service requests" on public.missing_service_requests;

-- SEC-007: record user-status changes without storing profile PII.
create or replace function public.admin_update_user_status(
  p_user_id uuid,
  p_status text
)
returns setof public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller public.profiles%rowtype;
  v_target public.profiles%rowtype;
  v_updated public.profiles%rowtype;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'Authentication is required.';
  end if;

  if p_status not in ('active', 'suspended') then
    raise exception using errcode = '22023', message = 'Only active and suspended statuses are allowed.';
  end if;

  select * into v_caller from public.profiles where id = auth.uid();
  if not found or v_caller.status <> 'active' or v_caller.role not in ('admin', 'super_admin') then
    raise exception using errcode = '42501', message = 'An active admin account is required.';
  end if;

  if p_user_id = auth.uid() then
    raise exception using errcode = '42501', message = 'You cannot change your own status.';
  end if;

  select * into v_target from public.profiles where id = p_user_id;
  if not found then
    raise exception using errcode = 'P0002', message = 'User profile not found.';
  end if;

  if v_target.status = 'deleted' then
    raise exception using errcode = '42501', message = 'Deleted accounts cannot be changed in V1.';
  end if;

  if (v_caller.role = 'admin' and v_target.role <> 'user')
    or (v_caller.role = 'super_admin' and v_target.role = 'super_admin') then
    raise exception using errcode = '42501', message = 'This account status cannot be changed by the current caller.';
  end if;

  update public.profiles as profile
  set status = p_status
  where profile.id = p_user_id
  returning profile.* into v_updated;

  insert into public.admin_audit_events (actor_id, action, target_table, target_id, before_data, after_data)
  values (
    auth.uid(), 'profile.status_updated', 'profiles', p_user_id,
    jsonb_build_object('status', v_target.status),
    jsonb_build_object('status', v_updated.status)
  );

  return next v_updated;
end;
$$;

revoke all on function public.admin_update_user_status(uuid, text) from public, anon;
grant execute on function public.admin_update_user_status(uuid, text) to authenticated;

-- SEC-007: record super-admin role changes without storing profile PII.
create or replace function public.super_admin_update_user_role(
  p_user_id uuid,
  p_role text
)
returns setof public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller public.profiles%rowtype;
  v_target public.profiles%rowtype;
  v_updated public.profiles%rowtype;
  v_super_admin_count integer;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'Authentication is required.';
  end if;

  if p_role not in ('user', 'admin', 'super_admin') then
    raise exception using errcode = '22023', message = 'The requested role is not allowed.';
  end if;

  select * into v_caller from public.profiles where id = auth.uid();
  if not found or v_caller.role <> 'super_admin' or v_caller.status <> 'active' then
    raise exception using errcode = '42501', message = 'An active super admin account is required.';
  end if;

  if p_user_id = auth.uid() then
    raise exception using errcode = '42501', message = 'You cannot change your own role.';
  end if;

  select * into v_target from public.profiles where id = p_user_id;
  if not found then
    raise exception using errcode = 'P0002', message = 'User profile not found.';
  end if;

  if v_target.role = 'super_admin' and p_role <> 'super_admin' then
    select count(*) into v_super_admin_count from public.profiles where role = 'super_admin';
    if v_super_admin_count <= 1 then
      raise exception using errcode = '42501', message = 'The last super admin cannot be demoted.';
    end if;
  end if;

  update public.profiles as profile
  set role = p_role
  where profile.id = p_user_id
  returning profile.* into v_updated;

  insert into public.admin_audit_events (actor_id, action, target_table, target_id, before_data, after_data)
  values (
    auth.uid(), 'profile.role_updated', 'profiles', p_user_id,
    jsonb_build_object('role', v_target.role),
    jsonb_build_object('role', v_updated.role)
  );

  return next v_updated;
end;
$$;

revoke all on function public.super_admin_update_user_role(uuid, text) from public, anon;
grant execute on function public.super_admin_update_user_role(uuid, text) to authenticated;

-- SEC-007: request updates keep their locking and validation while recording
-- the actor and only the three mutable review fields.
create or replace function public.admin_update_missing_service_request(
  p_request_id uuid,
  p_status text default null,
  p_admin_note text default null,
  p_resolved_establishment_id uuid default null
)
returns setof public.missing_service_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request public.missing_service_requests%rowtype;
  v_updated public.missing_service_requests%rowtype;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'Authentication is required.';
  end if;

  if not public.is_admin() then
    raise exception using errcode = '42501', message = 'An active admin account is required.';
  end if;

  select * into v_request
  from public.missing_service_requests as request
  where request.id = p_request_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Missing service request not found.';
  end if;

  if p_status is not null and p_status not in ('pending', 'reviewed', 'added', 'rejected', 'duplicate') then
    raise exception using errcode = '22023', message = 'The requested status is not allowed.';
  end if;

  if p_resolved_establishment_id is not null and not exists (
    select 1 from public.establishments as establishment where establishment.id = p_resolved_establishment_id
  ) then
    raise exception using errcode = 'P0002', message = 'Resolved establishment not found.';
  end if;

  update public.missing_service_requests as request
  set
    status = coalesce(p_status, v_request.status),
    admin_note = case when p_admin_note is null then v_request.admin_note else nullif(btrim(p_admin_note), '') end,
    resolved_establishment_id = coalesce(p_resolved_establishment_id, v_request.resolved_establishment_id)
  where request.id = p_request_id
  returning request.* into v_updated;

  insert into public.admin_audit_events (actor_id, action, target_table, target_id, before_data, after_data)
  values (
    auth.uid(), 'missing_service_request.updated', 'missing_service_requests', p_request_id,
    jsonb_build_object('status', v_request.status, 'admin_note', v_request.admin_note, 'resolved_establishment_id', v_request.resolved_establishment_id),
    jsonb_build_object('status', v_updated.status, 'admin_note', v_updated.admin_note, 'resolved_establishment_id', v_updated.resolved_establishment_id)
  );

  return next v_updated;
end;
$$;

revoke all on function public.admin_update_missing_service_request(uuid, text, text, uuid) from public, anon;
grant execute on function public.admin_update_missing_service_request(uuid, text, text, uuid) to authenticated;

-- SEC-007: service creation and optional source-request resolution share one
-- transaction with their audit events.
create or replace function public.admin_create_establishment(
  p_name_fr text,
  p_name_ar text,
  p_phone text,
  p_image_url text default null,
  p_location text default null,
  p_nearest_place text default null,
  p_opening_date date default null,
  p_closing_date date default null,
  p_source_request_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name_fr text := btrim(coalesce(p_name_fr, ''));
  v_name_ar text := btrim(coalesce(p_name_ar, ''));
  v_phone text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  v_image_url text := nullif(btrim(coalesce(p_image_url, '')), '');
  v_location text := nullif(btrim(coalesce(p_location, '')), '');
  v_nearest_place text := nullif(btrim(coalesce(p_nearest_place, '')), '');
  v_slug_base text;
  v_slug text;
  v_slug_suffix integer := 2;
  v_establishment_id uuid;
  v_branch_id uuid;
  v_source_request public.missing_service_requests%rowtype;
  v_updated_request public.missing_service_requests%rowtype;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'status', 'unauthenticated', 'message', 'Authentication required.');
  end if;

  if not public.is_admin() then
    return jsonb_build_object('ok', false, 'status', 'forbidden', 'message', 'An active admin account is required.');
  end if;

  if v_name_fr = '' then
    return jsonb_build_object('ok', false, 'status', 'invalid_name_fr', 'message', 'French name is required.');
  end if;

  if v_name_ar = '' or v_name_ar !~ '^[؀-ۿ[:space:]]+$' then
    return jsonb_build_object('ok', false, 'status', 'invalid_name_ar', 'message', 'Arabic name is required.');
  end if;

  if char_length(v_phone) = 11 and v_phone like '222%' then
    v_phone := substring(v_phone from 4);
  end if;

  if v_phone !~ '^[234][0-9]{7}$' then
    return jsonb_build_object('ok', false, 'status', 'invalid_phone', 'message', 'Invalid phone.');
  end if;

  if v_image_url is not null and lower(v_image_url) !~ '\.(png|jpg|jpeg)(\?.*)?$' then
    return jsonb_build_object('ok', false, 'status', 'invalid_image_url', 'message', 'Invalid image format.');
  end if;

  if p_opening_date is not null and p_closing_date is not null and p_closing_date < p_opening_date then
    return jsonb_build_object('ok', false, 'status', 'invalid_dates', 'message', 'Closing date cannot precede opening date.');
  end if;

  if p_source_request_id is not null then
    select * into v_source_request
    from public.missing_service_requests as request
    where request.id = p_source_request_id
    for update;

    if not found then
      return jsonb_build_object('ok', false, 'status', 'request_not_found', 'message', 'Missing service request not found.');
    end if;
  end if;

  v_slug_base := trim(both '-' from regexp_replace(lower(v_name_fr), '[^a-z0-9]+', '-', 'g'));
  if v_slug_base = '' then
    v_slug_base := 'establishment';
  end if;

  perform pg_advisory_xact_lock(hashtext('admin_create_establishment:' || v_slug_base));
  v_slug := v_slug_base;
  while exists (select 1 from public.establishments where slug = v_slug) loop
    v_slug := v_slug_base || '-' || v_slug_suffix;
    v_slug_suffix := v_slug_suffix + 1;
  end loop;

  insert into public.establishments (
    name, name_ar, slug, phone, whatsapp, image_url, opening_date, closing_date,
    status, is_verified, created_by, verified_at
  )
  values (
    v_name_fr, v_name_ar, v_slug, v_phone, v_phone, v_image_url, p_opening_date, p_closing_date,
    'approved', true, auth.uid(), now()
  )
  returning id into v_establishment_id;

  insert into public.branches (
    establishment_id, name, phone, whatsapp, address, neighborhood, is_main, status
  )
  values (
    v_establishment_id, v_name_fr, v_phone, v_phone, v_location, v_nearest_place, true, 'active'
  )
  returning id into v_branch_id;

  if p_source_request_id is not null then
    update public.missing_service_requests as request
    set
      status = 'added',
      resolved_establishment_id = v_establishment_id,
      admin_note = case
        when nullif(btrim(v_source_request.admin_note), '') is null then 'Établissement créé depuis cette demande.'
        when position('Établissement créé depuis cette demande.' in v_source_request.admin_note) > 0 then v_source_request.admin_note
        else btrim(v_source_request.admin_note) || E'\n\nÉtablissement créé depuis cette demande.'
      end
    where request.id = p_source_request_id
    returning request.* into v_updated_request;

    insert into public.admin_audit_events (actor_id, action, target_table, target_id, before_data, after_data, metadata)
    values (
      auth.uid(), 'missing_service_request.added_from_establishment', 'missing_service_requests', p_source_request_id,
      jsonb_build_object('status', v_source_request.status, 'admin_note', v_source_request.admin_note, 'resolved_establishment_id', v_source_request.resolved_establishment_id),
      jsonb_build_object('status', v_updated_request.status, 'admin_note', v_updated_request.admin_note, 'resolved_establishment_id', v_updated_request.resolved_establishment_id),
      jsonb_build_object('establishment_id', v_establishment_id)
    );
  end if;

  insert into public.admin_audit_events (actor_id, action, target_table, target_id, after_data, metadata)
  values (
    auth.uid(), 'establishment.created', 'establishments', v_establishment_id,
    jsonb_build_object('name', v_name_fr, 'slug', v_slug, 'status', 'approved', 'is_verified', true),
    jsonb_build_object('branch_id', v_branch_id, 'source_request_id', p_source_request_id)
  );

  return jsonb_build_object(
    'ok', true,
    'status', 'created',
    'establishment_id', v_establishment_id,
    'branch_id', v_branch_id,
    'slug', v_slug,
    'source_request_id', p_source_request_id
  );
end;
$$;

revoke all on function public.admin_create_establishment(text, text, text, text, text, text, date, date, uuid) from public, anon;
grant execute on function public.admin_create_establishment(text, text, text, text, text, text, date, date, uuid) to authenticated;

-- SEC-007: recharge approvals are already atomic; append the actor/action in
-- that same transaction without changing the stored-offer invariant.
create or replace function public.admin_approve_recharge_request(p_recharge_request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller uuid := auth.uid();
  v_request public.recharge_requests%rowtype;
  v_wallet public.wallets%rowtype;
  v_ledger_id uuid;
begin
  if v_caller is null then
    raise exception using errcode = '42501', message = 'Authentication is required.';
  end if;

  if not public.is_admin() then
    raise exception using errcode = '42501', message = 'Administrator access is required.';
  end if;

  select * into v_request
  from public.recharge_requests
  where id = p_recharge_request_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'status', 'not_found');
  end if;

  if v_request.status <> 'pending' then
    return jsonb_build_object('ok', false, 'status', 'not_pending', 'request_status', v_request.status);
  end if;

  if (v_request.requested_points, v_request.amount_mro) not in ((10, 50), (30, 100), (100, 500)) then
    return jsonb_build_object('ok', false, 'status', 'invalid_offer');
  end if;

  select * into v_wallet
  from public.wallets
  where user_id = v_request.user_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'status', 'wallet_missing');
  end if;

  update public.wallets
  set balance = balance + v_request.requested_points,
      updated_at = now()
  where id = v_wallet.id;

  insert into public.credit_ledger (user_id, wallet_id, amount, type, reason, reference_type, reference_id, metadata)
  values (
    v_request.user_id,
    v_wallet.id,
    v_request.requested_points,
    'recharge_credit',
    'Approved fixed recharge offer',
    'recharge_request',
    v_request.id,
    jsonb_build_object('amount_mro', v_request.amount_mro, 'approved_by', v_caller)
  )
  returning id into v_ledger_id;

  update public.recharge_requests
  set status = 'approved',
      approved_by = v_caller,
      approved_at = now(),
      ledger_id = v_ledger_id,
      updated_at = now()
  where id = v_request.id;

  insert into public.admin_audit_events (actor_id, action, target_table, target_id, before_data, after_data, metadata)
  values (
    v_caller, 'recharge_request.approved', 'recharge_requests', v_request.id,
    jsonb_build_object('status', v_request.status, 'requested_points', v_request.requested_points, 'amount_mro', v_request.amount_mro),
    jsonb_build_object('status', 'approved', 'approved_by', v_caller, 'ledger_id', v_ledger_id),
    jsonb_build_object('user_id', v_request.user_id)
  );

  return jsonb_build_object(
    'ok', true,
    'status', 'approved',
    'request_id', v_request.id,
    'credited_points', v_request.requested_points,
    'balance', v_wallet.balance + v_request.requested_points,
    'ledger_id', v_ledger_id
  );
end;
$$;

revoke all on function public.admin_approve_recharge_request(uuid) from public, anon;
grant execute on function public.admin_approve_recharge_request(uuid) to authenticated;

create or replace function public.admin_reject_recharge_request(
  p_recharge_request_id uuid,
  p_admin_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller uuid := auth.uid();
  v_request public.recharge_requests%rowtype;
  v_updated public.recharge_requests%rowtype;
begin
  if v_caller is null then
    raise exception using errcode = '42501', message = 'Authentication is required.';
  end if;

  if not public.is_admin() then
    raise exception using errcode = '42501', message = 'Administrator access is required.';
  end if;

  select * into v_request
  from public.recharge_requests
  where id = p_recharge_request_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'status', 'not_found');
  end if;

  if v_request.status <> 'pending' then
    return jsonb_build_object('ok', false, 'status', 'not_pending', 'request_status', v_request.status);
  end if;

  update public.recharge_requests
  set status = 'rejected',
      rejected_by = v_caller,
      rejected_at = now(),
      admin_note = coalesce(nullif(btrim(coalesce(p_admin_note, '')), ''), admin_note),
      updated_at = now()
  where id = v_request.id
  returning * into v_updated;

  insert into public.admin_audit_events (actor_id, action, target_table, target_id, before_data, after_data, metadata)
  values (
    v_caller, 'recharge_request.rejected', 'recharge_requests', v_request.id,
    jsonb_build_object('status', v_request.status, 'admin_note', v_request.admin_note),
    jsonb_build_object('status', v_updated.status, 'admin_note', v_updated.admin_note, 'rejected_by', v_caller),
    jsonb_build_object('user_id', v_request.user_id)
  );

  return jsonb_build_object('ok', true, 'status', 'rejected', 'request_id', v_request.id);
end;
$$;

revoke all on function public.admin_reject_recharge_request(uuid, text) from public, anon;
grant execute on function public.admin_reject_recharge_request(uuid, text) to authenticated;
