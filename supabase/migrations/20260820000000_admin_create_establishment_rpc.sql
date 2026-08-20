-- Lewad Admin: controlled creation of an approved establishment and its main branch.
-- This is intentionally RPC-only: DB2 keeps direct table writes unavailable to clients.

alter table public.establishments
  add column if not exists name_ar text,
  add column if not exists image_url text,
  add column if not exists opening_date date,
  add column if not exists closing_date date;

create or replace function public.admin_create_establishment(
  p_name_fr text,
  p_name_ar text,
  p_phone text,
  p_image_url text default null,
  p_location text default null,
  p_nearest_place text default null,
  p_opening_date date default null,
  p_closing_date date default null,
  p_source_request_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name_fr text := btrim(coalesce(p_name_fr, ''));
  v_name_ar text := btrim(coalesce(p_name_ar, ''));
  v_phone text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  v_image_url text := nullif(btrim(coalesce(p_image_url, '')), '');
  v_location text := nullif(btrim(coalesce(p_location, '')), '');
  v_nearest_place text := nullif(btrim(coalesce(p_nearest_place, '')), '');
  v_slug_base text;
  v_slug text;
  v_slug_suffix integer := 2;
  v_establishment_id uuid;
  v_branch_id uuid;
  v_request_note text;
begin
  if auth.uid() is null then
    return jsonb_build_object(
      'ok', false,
      'status', 'unauthenticated',
      'message', 'Authentication required.'
    );
  end if;

  if not public.is_admin() then
    return jsonb_build_object(
      'ok', false,
      'status', 'forbidden',
      'message', 'An active admin account is required.'
    );
  end if;

  if v_name_fr = '' then
    return jsonb_build_object('ok', false, 'status', 'invalid_name_fr', 'message', 'French name is required.');
  end if;

  -- The Arabic Unicode block plus whitespace is accepted; the field remains
  -- readable in all three locales without accepting a Latin-only value.
  if v_name_ar = '' or v_name_ar !~ '^[؀-ۿ[:space:]]+$' then
    return jsonb_build_object('ok', false, 'status', 'invalid_name_ar', 'message', 'Arabic name is required.');
  end if;

  -- The UI may accept +222 for convenience, but the stored value is the
  -- canonical eight-digit Mauritanian local number.
  if char_length(v_phone) = 11 and v_phone like '222%' then
    v_phone := substring(v_phone from 4);
  end if;

  if v_phone !~ '^[234][0-9]{7}$' then
    return jsonb_build_object('ok', false, 'status', 'invalid_phone', 'message', 'Invalid phone.');
  end if;

  if v_image_url is not null and lower(v_image_url) !~ '\.(png|jpg|jpeg)(\?.*)?$' then
    return jsonb_build_object('ok', false, 'status', 'invalid_image_url', 'message', 'Invalid image format.');
  end if;

  if p_opening_date is not null and p_closing_date is not null and p_closing_date < p_opening_date then
    return jsonb_build_object('ok', false, 'status', 'invalid_dates', 'message', 'Closing date cannot precede opening date.');
  end if;

  if p_source_request_id is not null then
    select request.admin_note
    into v_request_note
    from public.missing_service_requests as request
    where request.id = p_source_request_id
    for update;

    if not found then
      return jsonb_build_object('ok', false, 'status', 'request_not_found', 'message', 'Missing service request not found.');
    end if;
  end if;

  v_slug_base := trim(both '-' from regexp_replace(lower(v_name_fr), '[^a-z0-9]+', '-', 'g'));
  if v_slug_base = '' then
    v_slug_base := 'establishment';
  end if;

  -- A transaction-scoped lock makes the simple numeric suffix deterministic
  -- even when two admins submit the same name at the same time.
  perform pg_advisory_xact_lock(hashtext('admin_create_establishment:' || v_slug_base));

  v_slug := v_slug_base;
  while exists (select 1 from public.establishments where slug = v_slug) loop
    v_slug := v_slug_base || '-' || v_slug_suffix;
    v_slug_suffix := v_slug_suffix + 1;
  end loop;

  insert into public.establishments (
    name, name_ar, slug, phone, whatsapp, image_url, opening_date, closing_date,
    status, is_verified, created_by, verified_at
  )
  values (
    v_name_fr, v_name_ar, v_slug, v_phone, v_phone, v_image_url, p_opening_date, p_closing_date,
    'approved', true, auth.uid(), now()
  )
  returning id into v_establishment_id;

  insert into public.branches (
    establishment_id, name, phone, whatsapp, address, neighborhood, is_main, status
  )
  values (
    v_establishment_id, v_name_fr, v_phone, v_phone, v_location, v_nearest_place, true, 'active'
  )
  returning id into v_branch_id;

  if p_source_request_id is not null then
    update public.missing_service_requests as request
    set
      status = 'added',
      resolved_establishment_id = v_establishment_id,
      admin_note = case
        when nullif(btrim(v_request_note), '') is null then 'Établissement créé depuis cette demande.'
        when position('Établissement créé depuis cette demande.' in v_request_note) > 0 then v_request_note
        else btrim(v_request_note) || E'\n\nÉtablissement créé depuis cette demande.'
      end
    where request.id = p_source_request_id;
  end if;

  return jsonb_build_object(
    'ok', true,
    'status', 'created',
    'establishment_id', v_establishment_id,
    'branch_id', v_branch_id,
    'slug', v_slug,
    'source_request_id', p_source_request_id
  );
end;
$$;

revoke all on function public.admin_create_establishment(text, text, text, text, text, text, date, date, uuid) from public, anon;
grant execute on function public.admin_create_establishment(text, text, text, text, text, text, date, date, uuid) to authenticated;

-- Admin review actions are RPC-only. The database validates both the caller and
-- each accepted status; no broad UPDATE policy is introduced for this workflow.
create or replace function public.admin_update_missing_service_request(
  p_request_id uuid,
  p_status text default null,
  p_admin_note text default null,
  p_resolved_establishment_id uuid default null
)
returns setof public.missing_service_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request public.missing_service_requests%rowtype;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'Authentication is required.';
  end if;

  if not public.is_admin() then
    raise exception using errcode = '42501', message = 'An active admin account is required.';
  end if;

  select *
  into v_request
  from public.missing_service_requests as request
  where request.id = p_request_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Missing service request not found.';
  end if;

  if p_status is not null and p_status not in ('pending', 'reviewed', 'added', 'rejected', 'duplicate') then
    raise exception using errcode = '22023', message = 'The requested status is not allowed.';
  end if;

  if p_resolved_establishment_id is not null and not exists (
    select 1
    from public.establishments as establishment
    where establishment.id = p_resolved_establishment_id
  ) then
    raise exception using errcode = 'P0002', message = 'Resolved establishment not found.';
  end if;

  return query
  update public.missing_service_requests as request
  set
    status = coalesce(p_status, v_request.status),
    admin_note = case
      when p_admin_note is null then v_request.admin_note
      else nullif(btrim(p_admin_note), '')
    end,
    resolved_establishment_id = coalesce(p_resolved_establishment_id, v_request.resolved_establishment_id)
  where request.id = p_request_id
  returning request.*;
end;
$$;

revoke all on function public.admin_update_missing_service_request(uuid, text, text, uuid) from public, anon;
grant execute on function public.admin_update_missing_service_request(uuid, text, text, uuid) to authenticated;
