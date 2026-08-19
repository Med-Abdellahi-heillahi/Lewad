-- Lewad Admin V1: least-privilege admin read access and request review updates.
-- Apply after DB1, DB2, DB3A and DB3B migrations.

-- SECURITY DEFINER avoids recursive profile RLS while the function itself only
-- answers whether the currently authenticated account is an active team member.
create or replace function public.is_admin()
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
      and profile.role in ('admin', 'super_admin')
      and profile.status = 'active'
  );
$$;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- Read access remains limited to the user's own rows for normal members.
-- These additive policies only extend the authenticated role when is_admin()
-- resolves true for the current session.
drop policy if exists "Admins can read all profiles" on public.profiles;
create policy "Admins can read all profiles"
on public.profiles for select
to authenticated
using ((select public.is_admin()));

drop policy if exists "Admins can read all wallets" on public.wallets;
create policy "Admins can read all wallets"
on public.wallets for select
to authenticated
using ((select public.is_admin()));

drop policy if exists "Admins can read all credit ledger rows" on public.credit_ledger;
create policy "Admins can read all credit ledger rows"
on public.credit_ledger for select
to authenticated
using ((select public.is_admin()));

drop policy if exists "Admins can read all search logs" on public.search_logs;
create policy "Admins can read all search logs"
on public.search_logs for select
to authenticated
using ((select public.is_admin()));

drop policy if exists "Admins can read all missing service requests" on public.missing_service_requests;
create policy "Admins can read all missing service requests"
on public.missing_service_requests for select
to authenticated
using ((select public.is_admin()));

drop policy if exists "Admins can read all categories" on public.categories;
create policy "Admins can read all categories"
on public.categories for select
to authenticated
using ((select public.is_admin()));

drop policy if exists "Admins can read all establishments" on public.establishments;
create policy "Admins can read all establishments"
on public.establishments for select
to authenticated
using ((select public.is_admin()));

drop policy if exists "Admins can read all branches" on public.branches;
create policy "Admins can read all branches"
on public.branches for select
to authenticated
using ((select public.is_admin()));

-- Request review is the sole Admin V1 mutation. The column grant prevents
-- changes to requester, query and message; the policy denies normal users.
revoke update on public.missing_service_requests from anon, authenticated;
grant update (status, admin_note, resolved_establishment_id)
on public.missing_service_requests to authenticated;

drop policy if exists "Admins can review missing service requests" on public.missing_service_requests;
create policy "Admins can review missing service requests"
on public.missing_service_requests for update
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));
