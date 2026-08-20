-- Lewad recharge requests: fixed offers are resolved by PostgreSQL, never by
-- browser-provided point or price values. Apply after Security 2A migration.

-- Requests now use the narrowly scoped RPC below. This removes the remaining
-- direct PostgREST insert path while keeping user reads and admin reads intact.
drop policy if exists "Users can open their own recharge request" on public.recharge_requests;
revoke insert on public.recharge_requests from anon, authenticated;

create or replace function public.create_recharge_request(p_offer_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_offer_code text := btrim(coalesce(p_offer_code, ''));
  v_offer_label text;
  v_requested_points integer;
  v_amount_mro integer;
  v_request public.recharge_requests%rowtype;
begin
  if v_user_id is null then
    return jsonb_build_object('ok', false, 'status', 'unauthenticated');
  end if;

  -- This catalogue is the authoritative V1 mapping. Changing offers requires
  -- a reviewed migration, not a client update.
  case v_offer_code
    when 'starter_10' then
      v_offer_label := '10 points · 50 MRO';
      v_requested_points := 10;
      v_amount_mro := 50;
    when 'regular_30' then
      v_offer_label := '30 points · 100 MRO';
      v_requested_points := 30;
      v_amount_mro := 100;
    when 'advanced_100' then
      v_offer_label := '100 points · 500 MRO';
      v_requested_points := 100;
      v_amount_mro := 500;
    else
      return jsonb_build_object('ok', false, 'status', 'invalid_offer');
  end case;

  insert into public.recharge_requests (
    user_id, offer_label, requested_points, amount_mro, status
  )
  values (
    v_user_id, v_offer_label, v_requested_points, v_amount_mro, 'pending'
  )
  on conflict (user_id) where status = 'pending' do nothing
  returning * into v_request;

  if not found then
    select *
    into v_request
    from public.recharge_requests
    where user_id = v_user_id
      and status = 'pending'
    order by created_at desc
    limit 1;

    return jsonb_build_object(
      'ok', true,
      'status', 'duplicate',
      'request_id', v_request.id,
      'offer_label', v_request.offer_label,
      'requested_points', v_request.requested_points,
      'amount_mro', v_request.amount_mro
    );
  end if;

  return jsonb_build_object(
    'ok', true,
    'status', 'created',
    'request_id', v_request.id,
    'offer_label', v_request.offer_label,
    'requested_points', v_request.requested_points,
    'amount_mro', v_request.amount_mro
  );
end;
$$;

revoke all on function public.create_recharge_request(text) from public, anon;
grant execute on function public.create_recharge_request(text) to authenticated;
