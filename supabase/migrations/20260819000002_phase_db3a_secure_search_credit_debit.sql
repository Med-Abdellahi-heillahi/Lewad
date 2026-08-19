-- Lewad DB3A: authenticated, atomic service search paid with one credit.
-- Product decision for DB3A: every valid, executed search debits one point,
-- including a not-found search. Change the debit block below if not-found
-- searches should become free in a later product iteration.

create table if not exists public.search_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  query text not null check (btrim(query) <> ''),
  normalized_query text not null check (btrim(normalized_query) <> ''),
  status text not null check (status in ('success', 'not_found', 'insufficient_credits', 'invalid_query', 'error')),
  results_count integer not null default 0 check (results_count >= 0),
  debited_points integer not null default 0 check (debited_points >= 0),
  wallet_id uuid references public.wallets (id) on delete set null,
  ledger_id uuid references public.credit_ledger (id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists search_logs_user_id_idx on public.search_logs (user_id);
create index if not exists search_logs_created_at_idx on public.search_logs (created_at desc);
create index if not exists search_logs_status_idx on public.search_logs (status);
create index if not exists search_logs_normalized_query_idx on public.search_logs (normalized_query);

alter table public.search_logs enable row level security;

drop policy if exists "Users can read their own search logs" on public.search_logs;
create policy "Users can read their own search logs"
on public.search_logs for select
to authenticated
using (auth.uid() = user_id);

-- Search logs are server-managed. Authenticated users only receive SELECT.
revoke all on public.search_logs from anon, authenticated;
grant select on public.search_logs to authenticated;

create or replace function public.search_services_with_credit(p_query text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
declare
  v_user_id uuid := auth.uid();
  v_query text := btrim(coalesce(p_query, ''));
  v_normalized_query text;
  v_wallet public.wallets%rowtype;
  v_balance integer;
  v_ledger_id uuid;
  v_log_id uuid;
  v_results jsonb := '[]'::jsonb;
  v_results_count integer := 0;
  v_status text;
begin
  v_normalized_query := lower(
    regexp_replace(v_query, '\s+', ' ', 'g')
  );

  if v_user_id is null then
    return jsonb_build_object(
      'ok', false,
      'status', 'unauthenticated',
      'message', 'Authentication required.',
      'debited_points', 0,
      'results', '[]'::jsonb
    );
  end if;

  if char_length(v_normalized_query) < 2 then
    return jsonb_build_object(
      'ok', false,
      'status', 'invalid_query',
      'message', 'Search query must contain at least 2 characters.',
      'debited_points', 0,
      'results', '[]'::jsonb
    );
  end if;

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
      jsonb_build_object('reason', 'insufficient_credits', 'query', v_query)
    );

    return jsonb_build_object(
      'ok', false,
      'status', 'insufficient_credits',
      'message', 'Insufficient credits',
      'balance', v_wallet.balance,
      'debited_points', 0,
      'results', '[]'::jsonb
    );
  end if;

  -- This debit, ledger write, DB2 search and search log are atomic in this RPC.
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
        establishment.name ilike '%' || v_normalized_query || '%'
        or establishment.slug ilike '%' || v_normalized_query || '%'
        or coalesce(establishment.description, '') ilike '%' || v_normalized_query || '%'
      )
    order by
      case
        when lower(establishment.name) = v_normalized_query
          or lower(establishment.slug) = v_normalized_query then 0
        else 1
      end,
      establishment.is_verified desc,
      establishment.name asc
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
        from public.branches as branch
        where branch.establishment_id = establishment.id
          and branch.status = 'active'
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
    v_user_id, v_query, v_normalized_query, v_status, v_results_count, 1, v_wallet.id, v_ledger_id,
    jsonb_build_object('search_cost', 1, 'query', v_query, 'normalized_query', v_normalized_query)
  )
  returning id into v_log_id;

  update public.credit_ledger
  set reference_id = v_log_id
  where id = v_ledger_id;

  return jsonb_build_object(
    'ok', true,
    'status', v_status,
    'debited_points', 1,
    'balance', v_balance,
    'query', v_normalized_query,
    'results_count', v_results_count,
    'results', v_results
  );
end;
$$;

revoke all on function public.search_services_with_credit(text) from public, anon;
grant execute on function public.search_services_with_credit(text) to authenticated;
