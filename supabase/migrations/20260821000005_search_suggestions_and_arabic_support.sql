-- Search suggestions and Arabic search support.
--
-- Two problems are fixed here:
--
-- 1. `establishments.name_ar` has existed since
--    20260820000000_admin_create_establishment_rpc.sql and is populated on every
--    approval, but `search_services_with_credit` never matched against it. An
--    Arabic query could only ever hit a Latin name, so searching بنكيلي returned
--    nothing for an establishment stored with that exact Arabic name.
-- 2. Typing had no server-backed autocomplete, so the browser could only suggest
--    from a local demo catalogue.
--
-- Forward-only. This migration does not change the search price, the debit path,
-- the rolling rate limit, wildcard escaping, result limits, RLS policies, or any
-- direct-table privilege.

-- Shared normalisation for every search surface. Arabic is written with optional
-- diacritics and with several interchangeable letter forms, so a literal
-- comparison fails for reasons a user cannot see. Folding both the query and the
-- stored value through one immutable function keeps the two sides comparable:
--
--   * harakat (U+064B–U+065F), superscript alef (U+0670) and tatweel (U+0640)
--     are removed — they are optional marks a typist rarely enters;
--   * أ إ آ ٱ collapse to ا, ى collapses to ي, ة collapses to ه;
--   * Latin text is lower-cased, which leaves Arabic unchanged because Arabic is
--     caseless;
--   * runs of whitespace collapse to one space.
--
-- It is IMMUTABLE so PostgreSQL may fold it into a plan, and pins search_path
-- like every other reviewed function here.
create or replace function public.normalize_arabic_search(p_value text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select pg_catalog.btrim(
    pg_catalog.regexp_replace(
      pg_catalog.translate(
        pg_catalog.regexp_replace(
          pg_catalog.lower(coalesce(p_value, '')),
          '[\u064B-\u065F\u0670\u0640]',
          '',
          'g'
        ),
        'أإآٱىة',
        'اااايه'
      ),
      '\s+',
      ' ',
      'g'
    )
  );
$$;

comment on function public.normalize_arabic_search(text) is
  'Folds Arabic diacritics and interchangeable letter forms so a typed query and a stored name compare equal. Used by search_services_with_credit and suggest_services.';

revoke all on function public.normalize_arabic_search(text) from public, anon;
grant execute on function public.normalize_arabic_search(text) to authenticated;

-- Replaces the 20260820000004 definition. Every guard from that version is kept
-- verbatim: authentication, the 2–80 character bound, the per-account advisory
-- lock, the 20-searches-per-minute window, wildcard escaping, the wallet debit,
-- the ledger entry, the search_logs row, and the 20-result cap. Only the
-- matching and ranking now understand Arabic, and the payload carries name_ar.
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
  v_normalized_query := public.normalize_arabic_search(v_query);

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
      establishment.name_ar,
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
        public.normalize_arabic_search(establishment.name) like '%' || v_search_pattern || '%' escape E'\\'
        or public.normalize_arabic_search(coalesce(establishment.name_ar, '')) like '%' || v_search_pattern || '%' escape E'\\'
        or public.normalize_arabic_search(establishment.slug) like '%' || v_search_pattern || '%' escape E'\\'
        or public.normalize_arabic_search(coalesce(establishment.description, '')) like '%' || v_search_pattern || '%' escape E'\\'
      )
    order by
      case
        when public.normalize_arabic_search(establishment.name) = v_normalized_query
          or public.normalize_arabic_search(coalesce(establishment.name_ar, '')) = v_normalized_query
          or public.normalize_arabic_search(establishment.slug) = v_normalized_query then 0
        else 1
      end,
      establishment.is_verified desc,
      establishment.name asc
    limit 20
  ), result_rows as (
    select jsonb_build_object(
      'id', establishment.id,
      'name', establishment.name,
      'name_ar', establishment.name_ar,
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

-- Read-only autocomplete. This RPC exists so a member can pick a name that is
-- known to exist instead of paying a credit to discover a typo.
--
-- What it deliberately does NOT do:
--   * it never touches wallets or credit_ledger, and debits nothing;
--   * it never inserts into search_logs, so it cannot consume the rolling
--     search window or pollute admin search analytics;
--   * it never returns phone, whatsapp, website or description. Contact details
--     are exactly what a paid search buys, so autocomplete must not leak them.
--     A suggestion reveals only what a directory listing already shows: the
--     name, its category, and the neighbourhood of the main branch.
--
-- Bounds: authenticated callers only, 1–80 characters, wildcards escaped, and
-- at most 8 rows. The browser debounces on top of this.
create or replace function public.suggest_services(p_query text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_query text := pg_catalog.btrim(coalesce(p_query, ''));
  v_normalized_query text;
  v_search_pattern text;
  v_items jsonb;
begin
  if v_user_id is null then
    return jsonb_build_object('ok', false, 'status', 'unauthenticated', 'items', '[]'::jsonb);
  end if;

  v_normalized_query := public.normalize_arabic_search(v_query);

  -- One character is enough to suggest, unlike a paid search which requires two.
  if char_length(v_normalized_query) < 1 or char_length(v_normalized_query) > 80 then
    return jsonb_build_object('ok', false, 'status', 'invalid_query', 'items', '[]'::jsonb);
  end if;

  -- Same escaping as the paid search: a query stays literal search text.
  v_search_pattern := replace(
    replace(
      replace(v_normalized_query, E'\\', E'\\\\'),
      '%', E'\\%'
    ),
    '_', E'\\_'
  );

  select coalesce(jsonb_agg(suggestion.payload order by suggestion.match_rank, suggestion.is_verified desc, suggestion.name asc), '[]'::jsonb)
  into v_items
  from (
    select
      establishment.name,
      establishment.is_verified,
      case
        when public.normalize_arabic_search(establishment.name) like v_search_pattern || '%' escape E'\\'
          or public.normalize_arabic_search(coalesce(establishment.name_ar, '')) like v_search_pattern || '%' escape E'\\'
          then 0
        else 1
      end as match_rank,
      jsonb_build_object(
        'id', establishment.id,
        'name', establishment.name,
        'name_ar', establishment.name_ar,
        'slug', establishment.slug,
        'category_name', category.name,
        'neighborhood', (
          select coalesce(nullif(pg_catalog.btrim(coalesce(branch.neighborhood, '')), ''), nullif(pg_catalog.btrim(coalesce(branch.city, '')), ''))
          from public.branches as branch
          where branch.establishment_id = establishment.id
            and branch.status = 'active'
          order by branch.is_main desc, branch.name asc
          limit 1
        )
      ) as payload
    from public.establishments as establishment
    left join public.categories as category
      on category.id = establishment.category_id
      and category.status = 'active'
    where establishment.status = 'approved'
      and (
        public.normalize_arabic_search(establishment.name) like '%' || v_search_pattern || '%' escape E'\\'
        or public.normalize_arabic_search(coalesce(establishment.name_ar, '')) like '%' || v_search_pattern || '%' escape E'\\'
        or public.normalize_arabic_search(establishment.slug) like '%' || v_search_pattern || '%' escape E'\\'
      )
    order by
      case
        when public.normalize_arabic_search(establishment.name) like v_search_pattern || '%' escape E'\\'
          or public.normalize_arabic_search(coalesce(establishment.name_ar, '')) like v_search_pattern || '%' escape E'\\'
          then 0
        else 1
      end,
      establishment.is_verified desc,
      establishment.name asc
    limit 8
  ) as suggestion;

  return jsonb_build_object(
    'ok', true,
    'status', 'success',
    'query', v_normalized_query,
    'items', v_items
  );
end;
$$;

comment on function public.suggest_services(text) is
  'Read-only autocomplete over approved establishments. Debits nothing, writes nothing, and never returns contact details.';

revoke all on function public.suggest_services(text) from public, anon;
grant execute on function public.suggest_services(text) to authenticated;
