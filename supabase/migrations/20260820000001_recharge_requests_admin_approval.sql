-- Lewad: manual recharge requests and their secure admin approval.
--
-- Scope: a user records that they want N points; a member of the team approves
-- that exact request. There is no payment gateway here and no free-form credit
-- grant: the only way a wallet gains points through this file is by approving a
-- pending request that already states its own amount.
--
-- Apply after DB1, DB2, DB3A, DB3B and the Admin V1 policies.

create table if not exists public.recharge_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  offer_label text,
  requested_points integer not null check (requested_points > 0),
  amount_mro integer not null check (amount_mro >= 0),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  admin_note text,
  approved_by uuid references auth.users (id) on delete set null,
  approved_at timestamptz,
  rejected_by uuid references auth.users (id) on delete set null,
  rejected_at timestamptz,
  ledger_id uuid references public.credit_ledger (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists recharge_requests_user_id_idx on public.recharge_requests (user_id);
create index if not exists recharge_requests_status_idx on public.recharge_requests (status);
create index if not exists recharge_requests_created_at_idx on public.recharge_requests (created_at desc);

-- One open request per account at a time. Without this an approval race could
-- credit the same intent twice through two separate rows.
create unique index if not exists recharge_requests_one_pending_per_user_idx
  on public.recharge_requests (user_id)
  where status = 'pending';

alter table public.recharge_requests enable row level security;

drop policy if exists "Users can read their own recharge requests" on public.recharge_requests;
create policy "Users can read their own recharge requests"
on public.recharge_requests for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can open their own recharge request" on public.recharge_requests;
create policy "Users can open their own recharge request"
on public.recharge_requests for insert
to authenticated
with check (
  auth.uid() = user_id
  and status = 'pending'
  and approved_by is null
  and approved_at is null
  and rejected_by is null
  and rejected_at is null
  and ledger_id is null
);

drop policy if exists "Admins can read all recharge requests" on public.recharge_requests;
create policy "Admins can read all recharge requests"
on public.recharge_requests for select
to authenticated
using ((select public.is_admin()));

-- Deliberately no UPDATE or DELETE policy for any client role: a request only
-- ever changes state through the SECURITY DEFINER functions below, so the
-- wallet write and the status write cannot be separated.
revoke all on public.recharge_requests from anon, authenticated;
grant select, insert on public.recharge_requests to authenticated;

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

  if not (select public.is_admin()) then
    raise exception using errcode = '42501', message = 'Administrator access is required.';
  end if;

  -- Lock the request first. A second concurrent approval blocks here and then
  -- fails the pending check below, so the same request can never credit twice.
  select *
  into v_request
  from public.recharge_requests
  where id = p_recharge_request_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'status', 'not_found');
  end if;

  if v_request.status <> 'pending' then
    return jsonb_build_object('ok', false, 'status', 'not_pending', 'request_status', v_request.status);
  end if;

  select *
  into v_wallet
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
    v_request.offer_label,
    'recharge_request',
    v_request.id,
    jsonb_build_object(
      'amount_mro', v_request.amount_mro,
      'offer_label', v_request.offer_label,
      'approved_by', v_caller
    )
  )
  returning id into v_ledger_id;

  update public.recharge_requests
  set status = 'approved',
      approved_by = v_caller,
      approved_at = now(),
      ledger_id = v_ledger_id,
      updated_at = now()
  where id = v_request.id;

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
begin
  if v_caller is null then
    raise exception using errcode = '42501', message = 'Authentication is required.';
  end if;

  if not (select public.is_admin()) then
    raise exception using errcode = '42501', message = 'Administrator access is required.';
  end if;

  select *
  into v_request
  from public.recharge_requests
  where id = p_recharge_request_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'status', 'not_found');
  end if;

  if v_request.status <> 'pending' then
    return jsonb_build_object('ok', false, 'status', 'not_pending', 'request_status', v_request.status);
  end if;

  -- A rejection touches neither the wallet nor the ledger.
  update public.recharge_requests
  set status = 'rejected',
      rejected_by = v_caller,
      rejected_at = now(),
      admin_note = coalesce(nullif(btrim(coalesce(p_admin_note, '')), ''), admin_note),
      updated_at = now()
  where id = v_request.id;

  return jsonb_build_object('ok', true, 'status', 'rejected', 'request_id', v_request.id);
end;
$$;

revoke all on function public.admin_reject_recharge_request(uuid, text) from public, anon;
grant execute on function public.admin_reject_recharge_request(uuid, text) to authenticated;
