-- DB3B fix: keep request creation in one authenticated, narrowly scoped RPC.
-- SECURITY DEFINER is intentional: normal users receive no table INSERT grant.

alter table public.missing_service_requests enable row level security;

-- Normal users can read their own requests, but never write table rows directly.
revoke insert, update, delete on public.missing_service_requests from anon, authenticated;
grant select on public.missing_service_requests to authenticated;

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
    return jsonb_build_object(
      'ok', false,
      'status', 'unauthenticated',
      'message', 'Authentication required.'
    );
  end if;

  v_normalized_query := lower(regexp_replace(v_query, '\s+', ' ', 'g'));

  if char_length(v_normalized_query) < 2 then
    return jsonb_build_object(
      'ok', false,
      'status', 'invalid_query',
      'message', 'Query must contain at least 2 characters.'
    );
  end if;

  if p_search_log_id is not null then
    select search_log.id
    into v_search_log_id
    from public.search_logs as search_log
    where search_log.id = p_search_log_id
      and search_log.user_id = v_user_id;

    if not found then
      return jsonb_build_object(
        'ok', false,
        'status', 'error',
        'message', 'Search log is not available for this user.'
      );
    end if;
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
    return jsonb_build_object(
      'ok', true,
      'status', 'duplicate',
      'message', 'A pending request already exists for this service.'
    );
  end if;

  return jsonb_build_object(
    'ok', true,
    'status', 'created',
    'message', 'Request created',
    'request_id', v_request_id
  );
end;
$$;

revoke all on function public.create_missing_service_request(text, text, uuid) from public;
revoke all on function public.create_missing_service_request(text, text, uuid) from anon;
grant execute on function public.create_missing_service_request(text, text, uuid) to authenticated;
