-- Lewad Security 2A: server-authoritative recharge offers.
--
-- Apply after 20260820000001_recharge_requests_admin_approval.sql. The
-- existing migration may already be deployed, so this is deliberately an
-- additive hardening migration rather than an edit to its history.

-- These are the only V1 offers represented in the current recharge UI. New
-- rows are constrained immediately; NOT VALID avoids failing deployment on a
-- historical row while the approval RPC below rejects any legacy invalid row.
alter table public.recharge_requests
  add constraint recharge_requests_allowed_offer_check
  check (
    (requested_points, amount_mro) in (
      (10, 50),
      (30, 100),
      (100, 500)
    )
  ) not valid;

-- A member can request only a pending offer for their own account. Internal
-- notes are reserved for the team; the client cannot make a request appear
-- already reviewed or approved.
drop policy if exists "Users can open their own recharge request" on public.recharge_requests;
create policy "Users can open their own recharge request"
on public.recharge_requests for insert
to authenticated
with check (
  auth.uid() = user_id
  and status = 'pending'
  and offer_label is null
  and admin_note is null
  and approved_by is null
  and approved_at is null
  and rejected_by is null
  and rejected_at is null
  and ledger_id is null
);

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

  -- Lock before checking the request so concurrent approvals cannot credit it twice.
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

  -- Never approve historical or forged point/price combinations. The browser
  -- supplies neither value to this RPC; the locked row is the only source.
  if (v_request.requested_points, v_request.amount_mro) not in ((10, 50), (30, 100), (100, 500)) then
    return jsonb_build_object('ok', false, 'status', 'invalid_offer');
  end if;

  select *
  into v_wallet
  from public.wallets
  where user_id = v_request.user_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'status', 'wallet_missing');
  end if;

  -- The locked request, wallet update, append-only ledger row and approval
  -- state change share the same database transaction.
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
    jsonb_build_object(
      'amount_mro', v_request.amount_mro,
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
