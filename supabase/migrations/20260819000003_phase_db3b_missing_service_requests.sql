-- Lewad DB3B: authenticated requests for services missing from the directory.

create table if not exists public.missing_service_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  query text not null check (btrim(query) <> ''),
  normalized_query text not null check (btrim(normalized_query) <> ''),
  message text,
  status text not null default 'pending' check (status in ('pending', 'reviewed', 'added', 'rejected', 'duplicate')),
  search_log_id uuid references public.search_logs (id) on delete set null,
  admin_note text,
  resolved_establishment_id uuid references public.establishments (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists missing_service_requests_user_id_idx on public.missing_service_requests (user_id);
create index if not exists missing_service_requests_normalized_query_idx on public.missing_service_requests (normalized_query);
create index if not exists missing_service_requests_status_idx on public.missing_service_requests (status);
create index if not exists missing_service_requests_created_at_idx on public.missing_service_requests (created_at desc);
create index if not exists missing_service_requests_search_log_id_idx on public.missing_service_requests (search_log_id);

-- One user can have only one active request for a given normalized service name.
create unique index if not exists missing_service_requests_user_pending_query_uidx
on public.missing_service_requests (user_id, normalized_query)
where status = 'pending';

drop trigger if exists missing_service_requests_set_updated_at on public.missing_service_requests;
create trigger missing_service_requests_set_updated_at
before update on public.missing_service_requests
for each row execute function public.set_updated_at();

alter table public.missing_service_requests enable row level security;

drop policy if exists "Users can read their own missing service requests" on public.missing_service_requests;
create policy "Users can read their own missing service requests"
on public.missing_service_requests for select
to authenticated
using (auth.uid() = user_id);

-- Requests are created exclusively by the RPC below. There are no user write policies.
revoke all on public.missing_service_requests from anon, authenticated;
grant select on public.missing_service_requests to authenticated;

create or replace function public.create_missing_service_request(
  p_query text,
  p_message text default null,
  p_search_log_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, auth
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
    select id
    into v_search_log_id
    from public.search_logs
    where id = p_search_log_id
      and user_id = v_user_id;

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

revoke all on function public.create_missing_service_request(text, text, uuid) from public, anon;
grant execute on function public.create_missing_service_request(text, text, uuid) to authenticated;
