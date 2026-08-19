-- Lewad Users CRUD V1: protected profile status and role transitions.
-- Apply after DB1 and the Admin V1 policy migration. This migration adds no
-- tables or RLS policies: privileged writes are intentionally RPC-only.

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles as profile
    where profile.id = auth.uid()
      and profile.role = 'super_admin'
      and profile.status = 'active'
  );
$$;

revoke all on function public.is_super_admin() from public, anon;
grant execute on function public.is_super_admin() to authenticated;

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
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'Authentication is required.';
  end if;

  if p_status not in ('active', 'suspended') then
    raise exception using errcode = '22023', message = 'Only active and suspended statuses are allowed.';
  end if;

  select *
  into v_caller
  from public.profiles
  where id = auth.uid();

  if not found or v_caller.status <> 'active' or v_caller.role not in ('admin', 'super_admin') then
    raise exception using errcode = '42501', message = 'An active admin account is required.';
  end if;

  if p_user_id = auth.uid() then
    raise exception using errcode = '42501', message = 'You cannot change your own status.';
  end if;

  select *
  into v_target
  from public.profiles
  where id = p_user_id;

  if not found then
    raise exception using errcode = 'P0002', message = 'User profile not found.';
  end if;

  if v_target.status = 'deleted' then
    raise exception using errcode = '42501', message = 'Deleted accounts cannot be changed in V1.';
  end if;

  -- An admin may handle regular accounts only. Super admins may also handle
  -- admins, but never another super admin through this V1 status action.
  if (v_caller.role = 'admin' and v_target.role <> 'user')
    or (v_caller.role = 'super_admin' and v_target.role = 'super_admin') then
    raise exception using errcode = '42501', message = 'This account status cannot be changed by the current caller.';
  end if;

  return query
  update public.profiles as profile
  set status = p_status
  where profile.id = p_user_id
  returning profile.*;
end;
$$;

revoke all on function public.admin_update_user_status(uuid, text) from public, anon;
grant execute on function public.admin_update_user_status(uuid, text) to authenticated;

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
  v_super_admin_count integer;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'Authentication is required.';
  end if;

  if p_role not in ('user', 'admin', 'super_admin') then
    raise exception using errcode = '22023', message = 'The requested role is not allowed.';
  end if;

  select *
  into v_caller
  from public.profiles
  where id = auth.uid();

  if not found or v_caller.role <> 'super_admin' or v_caller.status <> 'active' then
    raise exception using errcode = '42501', message = 'An active super admin account is required.';
  end if;

  if p_user_id = auth.uid() then
    raise exception using errcode = '42501', message = 'You cannot change your own role.';
  end if;

  select *
  into v_target
  from public.profiles
  where id = p_user_id;

  if not found then
    raise exception using errcode = 'P0002', message = 'User profile not found.';
  end if;

  -- Keep at least one super-admin profile. Audit logging is intentionally a
  -- later phase and must be added before these operations are production-ready.
  if v_target.role = 'super_admin' and p_role <> 'super_admin' then
    select count(*)
    into v_super_admin_count
    from public.profiles
    where role = 'super_admin';

    if v_super_admin_count <= 1 then
      raise exception using errcode = '42501', message = 'The last super admin cannot be demoted.';
    end if;
  end if;

  return query
  update public.profiles as profile
  set role = p_role
  where profile.id = p_user_id
  returning profile.*;
end;
$$;

revoke all on function public.super_admin_update_user_role(uuid, text) from public, anon;
grant execute on function public.super_admin_update_user_role(uuid, text) to authenticated;
