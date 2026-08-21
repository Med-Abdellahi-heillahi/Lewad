-- Super-admin admin-management: narrowly scoped RPCs, invitation records and
-- audit reads. Browser roles keep no direct access to the sensitive tables.
-- This migration depends on the Security 2B audit table and is_super_admin().

create table if not exists public.admin_invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  full_name text not null check (pg_catalog.btrim(full_name) <> ''),
  full_name_ar text,
  phone text not null check (pg_catalog.btrim(phone) <> ''),
  role text not null default 'admin' check (role = 'admin'),
  status text not null default 'pending' check (status in ('pending', 'expired', 'cancelled')),
  created_by uuid not null references auth.users (id) on delete restrict,
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz not null default now(),
  constraint admin_invitations_expiry_after_creation check (expires_at > created_at)
);

create index if not exists admin_invitations_created_by_created_at_idx
on public.admin_invitations (created_by, created_at desc);

-- One actionable invitation per email prevents duplicate onboarding records.
create unique index if not exists admin_invitations_one_pending_email_idx
on public.admin_invitations (lower(email))
where status = 'pending';

alter table public.admin_invitations enable row level security;
revoke all on public.admin_invitations from anon, authenticated;

create or replace function public.super_admin_get_admin_stats()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_total_admins integer;
  v_active_admins integer;
  v_suspended_admins integer;
  v_establishments_added integer;
  v_actions_this_week integer;
begin
  if auth.uid() is null or not public.is_super_admin() then
    raise exception using errcode = '42501', message = 'An active super admin account is required.';
  end if;

  select count(*) into v_total_admins
  from public.profiles
  where role = 'admin';

  select count(*) into v_active_admins
  from public.profiles
  where role = 'admin' and status = 'active';

  select count(*) into v_suspended_admins
  from public.profiles
  where role = 'admin' and status = 'suspended';

  select count(*) into v_establishments_added
  from public.establishments as establishment
  join public.profiles as profile on profile.id = establishment.created_by
  where profile.role = 'admin';

  select count(*) into v_actions_this_week
  from public.admin_audit_events as event
  join public.profiles as profile on profile.id = event.actor_id
  where profile.role = 'admin'
    and event.created_at >= date_trunc('week', now());

  return jsonb_build_object(
    'total_admins', coalesce(v_total_admins, 0),
    'active_admins', coalesce(v_active_admins, 0),
    'suspended_admins', coalesce(v_suspended_admins, 0),
    'establishments_added', coalesce(v_establishments_added, 0),
    'admin_actions_this_week', coalesce(v_actions_this_week, 0)
  );
end;
$$;

revoke all on function public.super_admin_get_admin_stats() from public, anon;
grant execute on function public.super_admin_get_admin_stats() to authenticated;

create or replace function public.super_admin_list_admins(
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
  v_search text := nullif(pg_catalog.btrim(coalesce(p_search, '')), '');
  v_pattern text;
  v_page integer := coalesce(p_page, 1);
  v_page_size integer := coalesce(p_page_size, 10);
  v_offset integer;
  v_total_count integer;
  v_items jsonb;
begin
  if auth.uid() is null or not public.is_super_admin() then
    raise exception using errcode = '42501', message = 'An active super admin account is required.';
  end if;

  if v_page < 1 then
    raise exception using errcode = '22023', message = 'Page must be greater than zero.';
  end if;

  -- The UI and the API deliberately share this fixed, bounded page size.
  if v_page_size <> 10 then
    raise exception using errcode = '22023', message = 'Page size must be 10.';
  end if;

  if v_search is not null and char_length(v_search) > 120 then
    raise exception using errcode = '22023', message = 'Search text is too long.';
  end if;

  if v_search is not null then
    v_pattern := '%' || replace(replace(replace(v_search, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%';
  end if;

  v_offset := (v_page - 1) * v_page_size;

  select count(*) into v_total_count
  from public.profiles as profile
  where profile.role = 'admin'
    and (
      v_pattern is null
      or coalesce(profile.full_name, '') ilike v_pattern escape E'\\'
      or coalesce(profile.full_name_ar, '') ilike v_pattern escape E'\\'
      or coalesce(profile.email, '') ilike v_pattern escape E'\\'
      or coalesce(profile.phone, '') ilike v_pattern escape E'\\'
    );

  select coalesce(jsonb_agg(row_data.payload order by row_data.created_at desc), '[]'::jsonb)
  into v_items
  from (
    select
      profile.created_at,
      jsonb_build_object(
        'id', profile.id,
        'full_name', profile.full_name,
        'full_name_ar', profile.full_name_ar,
        'email', profile.email,
        'phone', profile.phone,
        'avatar_url', profile.avatar_url,
        'role', profile.role,
        'status', profile.status,
        'created_at', profile.created_at,
        'updated_at', profile.updated_at,
        'establishments_added', (
          select count(*)
          from public.establishments as establishment
          where establishment.created_by = profile.id
        )
      ) as payload
    from public.profiles as profile
    where profile.role = 'admin'
      and (
        v_pattern is null
        or coalesce(profile.full_name, '') ilike v_pattern escape E'\\'
        or coalesce(profile.full_name_ar, '') ilike v_pattern escape E'\\'
        or coalesce(profile.email, '') ilike v_pattern escape E'\\'
        or coalesce(profile.phone, '') ilike v_pattern escape E'\\'
      )
    order by profile.created_at desc
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

revoke all on function public.super_admin_list_admins(text, integer, integer) from public, anon;
grant execute on function public.super_admin_list_admins(text, integer, integer) to authenticated;

create or replace function public.super_admin_get_admin_details(p_admin_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin public.profiles%rowtype;
  v_establishments_added integer;
  v_recent_actions jsonb;
begin
  if auth.uid() is null or not public.is_super_admin() then
    raise exception using errcode = '42501', message = 'An active super admin account is required.';
  end if;

  if p_admin_id is null then
    raise exception using errcode = '22023', message = 'An admin id is required.';
  end if;

  select * into v_admin
  from public.profiles
  where id = p_admin_id and role = 'admin';

  if not found then
    raise exception using errcode = 'P0002', message = 'Admin profile not found.';
  end if;

  select count(*) into v_establishments_added
  from public.establishments
  where created_by = p_admin_id;

  select coalesce(jsonb_agg(action_row.payload order by action_row.created_at desc), '[]'::jsonb)
  into v_recent_actions
  from (
    select
      event.created_at,
      jsonb_build_object(
        'id', event.id,
        'action', event.action,
        'target_type', event.target_table,
        'target_id', event.target_id,
        'metadata', event.metadata,
        'created_at', event.created_at
      ) as payload
    from public.admin_audit_events as event
    where event.actor_id = p_admin_id
    order by event.created_at desc
    limit 8
  ) as action_row;

  return jsonb_build_object(
    'id', v_admin.id,
    'full_name', v_admin.full_name,
    'full_name_ar', v_admin.full_name_ar,
    'email', v_admin.email,
    'phone', v_admin.phone,
    'avatar_url', v_admin.avatar_url,
    'role', v_admin.role,
    'status', v_admin.status,
    'created_at', v_admin.created_at,
    'updated_at', v_admin.updated_at,
    'establishments_added', coalesce(v_establishments_added, 0),
    'recent_actions', v_recent_actions
  );
end;
$$;

revoke all on function public.super_admin_get_admin_details(uuid) from public, anon;
grant execute on function public.super_admin_get_admin_details(uuid) to authenticated;

create or replace function public.super_admin_update_admin_profile(
  p_admin_id uuid,
  p_full_name text,
  p_full_name_ar text default null,
  p_phone text default null
)
returns setof public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_target public.profiles%rowtype;
  v_updated public.profiles%rowtype;
  v_full_name text := pg_catalog.btrim(coalesce(p_full_name, ''));
  v_full_name_ar text := nullif(pg_catalog.btrim(coalesce(p_full_name_ar, '')), '');
  v_phone text := nullif(pg_catalog.btrim(coalesce(p_phone, '')), '');
begin
  if auth.uid() is null or not public.is_super_admin() then
    raise exception using errcode = '42501', message = 'An active super admin account is required.';
  end if;

  if p_admin_id is null or v_full_name = '' or char_length(v_full_name) > 120 then
    raise exception using errcode = '22023', message = 'A full name of at most 120 characters is required.';
  end if;

  if v_full_name_ar is not null and char_length(v_full_name_ar) > 120 then
    raise exception using errcode = '22023', message = 'Arabic full name must be at most 120 characters.';
  end if;

  if v_phone is not null then
    v_phone := public.normalize_profile_phone(v_phone);
    if v_phone !~ '^[234][0-9]{7}$' then
      raise exception using errcode = '22023', message = 'Phone must be a valid Mauritanian number.';
    end if;
  end if;

  select * into v_target
  from public.profiles
  where id = p_admin_id and role = 'admin'
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Admin profile not found.';
  end if;

  update public.profiles as profile
  set
    full_name = v_full_name,
    full_name_ar = v_full_name_ar,
    phone = v_phone
  where profile.id = p_admin_id
  returning profile.* into v_updated;

  -- The audit retains the transition without duplicating names, email or phone.
  insert into public.admin_audit_events (actor_id, action, target_table, target_id, before_data, after_data)
  values (
    auth.uid(), 'admin.profile_updated', 'profiles', p_admin_id,
    jsonb_build_object('fields', jsonb_build_array('full_name', 'full_name_ar', 'phone')),
    jsonb_build_object('fields', jsonb_build_array('full_name', 'full_name_ar', 'phone'))
  );

  return next v_updated;
end;
$$;

revoke all on function public.super_admin_update_admin_profile(uuid, text, text, text) from public, anon;
grant execute on function public.super_admin_update_admin_profile(uuid, text, text, text) to authenticated;

create or replace function public.super_admin_create_admin_invitation(
  p_email text,
  p_full_name text,
  p_phone text,
  p_full_name_ar text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(pg_catalog.btrim(coalesce(p_email, '')));
  v_full_name text := pg_catalog.btrim(coalesce(p_full_name, ''));
  v_full_name_ar text := nullif(pg_catalog.btrim(coalesce(p_full_name_ar, '')), '');
  v_phone text := public.normalize_profile_phone(pg_catalog.btrim(coalesce(p_phone, '')));
  v_invitation public.admin_invitations%rowtype;
begin
  if auth.uid() is null or not public.is_super_admin() then
    raise exception using errcode = '42501', message = 'An active super admin account is required.';
  end if;

  if v_email = '' or char_length(v_email) > 254 or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\\.[^[:space:]@]+$' then
    raise exception using errcode = '22023', message = 'A valid email is required.';
  end if;

  if v_full_name = '' or char_length(v_full_name) > 120 then
    raise exception using errcode = '22023', message = 'A full name of at most 120 characters is required.';
  end if;

  if v_full_name_ar is not null and char_length(v_full_name_ar) > 120 then
    raise exception using errcode = '22023', message = 'Arabic full name must be at most 120 characters.';
  end if;

  if v_phone !~ '^[234][0-9]{7}$' then
    raise exception using errcode = '22023', message = 'Phone must be a valid Mauritanian number.';
  end if;

  -- Expired invites no longer block a new invitation for the same address.
  update public.admin_invitations
  set status = 'expired'
  where status = 'pending' and expires_at <= now();

  if exists (
    select 1 from public.profiles
    where lower(email) = v_email and status <> 'deleted'
  ) then
    raise exception using errcode = '23505', message = 'An active account already uses this email.';
  end if;

  if exists (
    select 1 from public.admin_invitations
    where lower(email) = v_email and status = 'pending'
  ) then
    raise exception using errcode = '23505', message = 'A pending admin invitation already exists for this email.';
  end if;

  insert into public.admin_invitations (email, full_name, full_name_ar, phone, created_by)
  values (v_email, v_full_name, v_full_name_ar, v_phone, auth.uid())
  returning * into v_invitation;

  insert into public.admin_audit_events (actor_id, action, target_table, target_id, after_data, metadata)
  values (
    auth.uid(), 'admin.invitation_created', 'admin_invitations', v_invitation.id,
    jsonb_build_object('role', 'admin', 'status', 'pending'),
    jsonb_build_object('expires_at', v_invitation.expires_at)
  );

  return jsonb_build_object(
    'id', v_invitation.id,
    'email', v_invitation.email,
    'full_name', v_invitation.full_name,
    'phone', v_invitation.phone,
    'role', v_invitation.role,
    'status', v_invitation.status,
    'expires_at', v_invitation.expires_at,
    'created_at', v_invitation.created_at
  );
end;
$$;

revoke all on function public.super_admin_create_admin_invitation(text, text, text, text) from public, anon;
grant execute on function public.super_admin_create_admin_invitation(text, text, text, text) to authenticated;

create or replace function public.super_admin_list_audit_events(
  p_target_id uuid default null,
  p_page integer default 1,
  p_page_size integer default 10
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_page integer := coalesce(p_page, 1);
  v_page_size integer := coalesce(p_page_size, 10);
  v_offset integer;
  v_total_count integer;
  v_items jsonb;
begin
  if auth.uid() is null or not public.is_super_admin() then
    raise exception using errcode = '42501', message = 'An active super admin account is required.';
  end if;

  if v_page < 1 or v_page_size <> 10 then
    raise exception using errcode = '22023', message = 'Invalid audit pagination.';
  end if;

  v_offset := (v_page - 1) * v_page_size;

  select count(*) into v_total_count
  from public.admin_audit_events as event
  where p_target_id is null or event.target_id = p_target_id;

  select coalesce(jsonb_agg(row_data.payload order by row_data.created_at desc), '[]'::jsonb)
  into v_items
  from (
    select
      event.created_at,
      jsonb_build_object(
        'id', event.id,
        'actor_id', event.actor_id,
        'actor_name', coalesce(actor.full_name, actor.full_name_ar, actor.email, ''),
        'actor_role', actor.role,
        'action', event.action,
        'target_type', event.target_table,
        'target_id', event.target_id,
        'metadata', event.metadata,
        'created_at', event.created_at
      ) as payload
    from public.admin_audit_events as event
    left join public.profiles as actor on actor.id = event.actor_id
    where p_target_id is null or event.target_id = p_target_id
    order by event.created_at desc
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

revoke all on function public.super_admin_list_audit_events(uuid, integer, integer) from public, anon;
grant execute on function public.super_admin_list_audit_events(uuid, integer, integer) to authenticated;
