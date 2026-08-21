-- CA-1: bounded, read-only admin dashboard and recharge summary contracts.
--
-- This migration depends on the existing DB1/DB2/DB3/recharge migrations and
-- the active-admin helper. It does not alter wallet, ledger, recharge approval,
-- RLS policy, or role-management behaviour.

create index if not exists credit_ledger_user_created_at_idx
  on public.credit_ledger (user_id, created_at desc);

create index if not exists recharge_requests_user_created_at_idx
  on public.recharge_requests (user_id, created_at desc);

create or replace function public.admin_get_overview_summary()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'Authentication is required.';
  end if;

  if not public.is_admin() then
    raise exception using errcode = '42501', message = 'An active admin account is required.';
  end if;

  return jsonb_build_object(
    'pending_requests', (select count(*) from public.missing_service_requests where status = 'pending'),
    'total_users', (select count(*) from public.profiles),
    'active_users', (select count(*) from public.profiles where status = 'active'),
    'total_wallets', (select count(*) from public.wallets),
    'total_points', (select coalesce(sum(balance), 0) from public.wallets),
    'empty_wallets', (select count(*) from public.wallets where balance = 0),
    'total_searches', (select count(*) from public.search_logs),
    'successful_searches', (select count(*) from public.search_logs where status = 'success'),
    'not_found_searches', (select count(*) from public.search_logs where status = 'not_found'),
    'error_searches', (select count(*) from public.search_logs where status = 'error'),
    'approved_establishments', (select count(*) from public.establishments where status = 'approved'),
    'active_categories', (select count(*) from public.categories where status = 'active'),
    'active_branches', (select count(*) from public.branches where status = 'active')
  );
end;
$$;

revoke all on function public.admin_get_overview_summary() from public, anon;
grant execute on function public.admin_get_overview_summary() to authenticated;

create or replace function public.admin_get_analytics_summary(p_days integer default 30)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_today date;
  v_from_day date;
  v_today_start timestamptz;
  v_month_start timestamptz;
  v_from timestamptz;
  v_tomorrow timestamptz;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'Authentication is required.';
  end if;

  if not public.is_admin() then
    raise exception using errcode = '42501', message = 'An active admin account is required.';
  end if;

  if p_days not in (7, 30, 90) then
    raise exception using errcode = '22023', message = 'Analytics days must be 7, 30, or 90.';
  end if;

  v_today := (now() at time zone 'UTC')::date;
  v_from_day := v_today - (p_days - 1);
  v_today_start := v_today::timestamp at time zone 'UTC';
  v_month_start := date_trunc('month', v_today::timestamp) at time zone 'UTC';
  v_from := v_from_day::timestamp at time zone 'UTC';
  v_tomorrow := (v_today + 1)::timestamp at time zone 'UTC';

  return jsonb_build_object(
    'searches_today', (select count(*) from public.search_logs where created_at >= v_today_start),
    'searches_this_month', (select count(*) from public.search_logs where created_at >= v_month_start),
    'users_user', (select count(*) from public.profiles where role = 'user'),
    'users_admin', (select count(*) from public.profiles where role = 'admin'),
    'users_super_admin', (select count(*) from public.profiles where role = 'super_admin'),
    'users_active', (select count(*) from public.profiles where status = 'active'),
    'users_suspended', (select count(*) from public.profiles where status = 'suspended'),
    'requests_pending', (select count(*) from public.missing_service_requests where status = 'pending'),
    'requests_reviewed', (select count(*) from public.missing_service_requests where status = 'reviewed'),
    'requests_added', (select count(*) from public.missing_service_requests where status = 'added'),
    'requests_rejected', (select count(*) from public.missing_service_requests where status = 'rejected'),
    'requests_duplicate', (select count(*) from public.missing_service_requests where status = 'duplicate'),
    'verified_establishments', (select count(*) from public.establishments where is_verified),
    'window_days', p_days,
    'search_series', (
      with days as (
        select v_from_day + day_offset as day from generate_series(0, p_days - 1) as series(day_offset)
      ), buckets as (
        select created_at::date as day, count(*) as total,
          count(*) filter (where status = 'not_found') as secondary
        from public.search_logs
        where created_at >= v_from and created_at < v_tomorrow
        group by created_at::date
      )
      select coalesce(jsonb_agg(jsonb_build_object(
        'date', to_char(days.day, 'YYYY-MM-DD'),
        'total', coalesce(buckets.total, 0),
        'secondary', coalesce(buckets.secondary, 0)
      ) order by days.day), '[]'::jsonb)
      from days left join buckets using (day)
    ),
    'user_series', (
      with days as (
        select v_from_day + day_offset as day from generate_series(0, p_days - 1) as series(day_offset)
      ), buckets as (
        select created_at::date as day, count(*) as total
        from public.profiles
        where created_at >= v_from and created_at < v_tomorrow
        group by created_at::date
      )
      select coalesce(jsonb_agg(jsonb_build_object(
        'date', to_char(days.day, 'YYYY-MM-DD'),
        'total', coalesce(buckets.total, 0),
        'secondary', 0
      ) order by days.day), '[]'::jsonb)
      from days left join buckets using (day)
    ),
    'recharge_series', (
      with days as (
        select v_from_day + day_offset as day from generate_series(0, p_days - 1) as series(day_offset)
      ), created_buckets as (
        select created_at::date as day, count(*) as total
        from public.recharge_requests
        where created_at >= v_from and created_at < v_tomorrow
        group by created_at::date
      ), approved_buckets as (
        select approved_at::date as day, count(*) as total
        from public.recharge_requests
        where created_at >= v_from and created_at < v_tomorrow
          and approved_at >= v_from and approved_at < v_tomorrow
        group by approved_at::date
      )
      select coalesce(jsonb_agg(jsonb_build_object(
        'date', to_char(days.day, 'YYYY-MM-DD'),
        'total', coalesce(created_buckets.total, 0),
        'secondary', coalesce(approved_buckets.total, 0)
      ) order by days.day), '[]'::jsonb)
      from days
      left join created_buckets using (day)
      left join approved_buckets using (day)
    ),
    'recharge_module', 'connected',
    'pending_recharges', (select count(*) from public.recharge_requests where created_at >= v_from and status = 'pending'),
    'approved_recharges', (select count(*) from public.recharge_requests where created_at >= v_from and status = 'approved'),
    'credits_issued', (select coalesce(sum(amount), 0) from public.credit_ledger where created_at >= v_from and amount > 0),
    'series_from', to_char(v_from_day, 'YYYY-MM-DD') || 'T00:00:00.000Z'
  );
end;
$$;

revoke all on function public.admin_get_analytics_summary(integer) from public, anon;
grant execute on function public.admin_get_analytics_summary(integer) to authenticated;

create or replace function public.admin_get_recharge_states(p_user_ids uuid[])
returns table (
  id uuid,
  user_id uuid,
  offer_label text,
  requested_points integer,
  amount_mro integer,
  status text,
  admin_note text,
  approved_at timestamptz,
  rejected_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'Authentication is required.';
  end if;

  if not public.is_admin() then
    raise exception using errcode = '42501', message = 'An active admin account is required.';
  end if;

  if cardinality(coalesce(p_user_ids, '{}'::uuid[])) > 100 then
    raise exception using errcode = '22023', message = 'At most 100 user IDs are allowed.';
  end if;

  return query
  with requested_users as (
    select distinct requested_user_id as id
    from unnest(coalesce(p_user_ids, '{}'::uuid[])) as requested_user_id
  )
  select distinct on (request.user_id)
    request.id,
    request.user_id,
    request.offer_label,
    request.requested_points,
    request.amount_mro,
    request.status,
    request.admin_note,
    request.approved_at,
    request.rejected_at,
    request.created_at,
    request.updated_at
  from public.recharge_requests as request
  join requested_users on requested_users.id = request.user_id
  order by request.user_id, (request.status = 'pending') desc, request.created_at desc, request.id;
end;
$$;

revoke all on function public.admin_get_recharge_states(uuid[]) from public, anon;
grant execute on function public.admin_get_recharge_states(uuid[]) to authenticated;
