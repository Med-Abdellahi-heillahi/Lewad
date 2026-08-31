-- Optional data captured while an administrator imports a map discovery.
-- This forward-only replacement also supersedes the faulty COALESCE body from
-- 00015 and keeps the supported PostgREST entry point uniquely named.

alter table public.establishments
  add column if not exists label text,
  add column if not exists parent_ministry text,
  add column if not exists parent_administration text;

-- A discovery records the administrator's reviewed types independently from a
-- canonical establishment. Exact-coordinate duplicates can therefore link to
-- an existing listing without overwriting that listing's data.
alter table public.external_place_discoveries
  add column if not exists reviewed_place_types text[] not null default '{}'::text[];

alter table public.external_place_discoveries
  drop constraint if exists external_place_discoveries_reviewed_place_types_allowed_check;

alter table public.external_place_discoveries
  add constraint external_place_discoveries_reviewed_place_types_allowed_check
  check (
    reviewed_place_types <@ array[
      'establishment',
      'company',
      'region',
      'moughataa',
      'wilaya',
      'sports_hall',
      'restaurant',
      'hall',
      'administration',
      'private',
      'public'
    ]::text[]
  );

-- Many provider discoveries may legitimately resolve to one establishment.
drop index if exists public.external_place_discoveries_imported_establishment_uidx;

create index if not exists external_place_discoveries_imported_establishment_idx
  on public.external_place_discoveries (imported_establishment_id)
  where imported_establishment_id is not null;

drop function if exists public.admin_import_external_place_discovery_with_types(uuid, text[]);

create or replace function public.admin_import_external_place_discovery_with_types(
  p_discovery_id uuid,
  p_selected_types text[],
  p_details jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin_id uuid := auth.uid();
  v_selected_types text[];
  v_details jsonb := coalesce(p_details, '{}'::jsonb);
  v_corrected_name text;
  v_verification_place text;
  v_phone text;
  v_whatsapp text;
  v_label text;
  v_parent_ministry text;
  v_parent_administration text;
  v_notes text;
  v_establishment_type text;
  v_response jsonb;
  v_establishment_id uuid;
  v_branch_id uuid;
  v_latitude numeric;
  v_longitude numeric;
  v_details_applied boolean := false;
begin
  if v_admin_id is null then
    return jsonb_build_object('ok', false, 'status', 'unauthenticated');
  end if;

  if not public.is_admin() then
    return jsonb_build_object('ok', false, 'status', 'forbidden');
  end if;

  if pg_catalog.jsonb_typeof(v_details) <> 'object' then
    return jsonb_build_object('ok', false, 'status', 'invalid_details');
  end if;

  if exists (
    select 1
    from pg_catalog.jsonb_object_keys(v_details) as detail(detail_key)
    where detail.detail_key not in (
      'corrected_name',
      'verification_place',
      'phone',
      'whatsapp',
      'label',
      'parent_ministry',
      'parent_administration',
      'notes'
    )
  ) then
    return jsonb_build_object('ok', false, 'status', 'invalid_details');
  end if;

  if exists (
    select 1
    from pg_catalog.jsonb_each(v_details) as detail(detail_key, detail_value)
    where pg_catalog.jsonb_typeof(detail.detail_value) not in ('string', 'null')
  ) then
    return jsonb_build_object('ok', false, 'status', 'invalid_details');
  end if;

  select coalesce(array_agg(distinct type_key order by type_key), '{}'::text[])
  into v_selected_types
  from (
    select pg_catalog.btrim(type_key) as type_key
    from pg_catalog.unnest(coalesce(p_selected_types, '{}'::text[])) as type_key
    where pg_catalog.btrim(type_key) <> ''
  ) as selected_type;

  if pg_catalog.cardinality(v_selected_types) = 0
    or not (
      v_selected_types <@ array[
        'establishment',
        'company',
        'region',
        'moughataa',
        'wilaya',
        'sports_hall',
        'restaurant',
        'hall',
        'administration',
        'private',
        'public'
      ]::text[]
    ) then
    return jsonb_build_object('ok', false, 'status', 'invalid_types');
  end if;

  if v_selected_types && array['private', 'company', 'sports_hall', 'restaurant', 'hall']::text[]
    and v_selected_types && array['public', 'region', 'moughataa', 'wilaya', 'administration']::text[] then
    return jsonb_build_object('ok', false, 'status', 'conflicting_natures');
  end if;

  if not (v_selected_types && array['private', 'company', 'sports_hall', 'restaurant', 'hall']::text[])
    and v_details ? 'phone' then
    return jsonb_build_object('ok', false, 'status', 'invalid_details');
  end if;

  if not (v_selected_types && array['public', 'region', 'moughataa', 'wilaya', 'administration']::text[])
    and (v_details ? 'parent_ministry' or v_details ? 'parent_administration') then
    return jsonb_build_object('ok', false, 'status', 'invalid_details');
  end if;

  v_corrected_name := nullif(pg_catalog.btrim(coalesce(v_details ->> 'corrected_name', '')), '');
  v_verification_place := nullif(pg_catalog.btrim(coalesce(v_details ->> 'verification_place', '')), '');
  v_phone := nullif(pg_catalog.btrim(coalesce(v_details ->> 'phone', '')), '');
  v_whatsapp := nullif(pg_catalog.btrim(coalesce(v_details ->> 'whatsapp', '')), '');
  v_label := nullif(pg_catalog.btrim(coalesce(v_details ->> 'label', '')), '');
  v_parent_ministry := nullif(pg_catalog.btrim(coalesce(v_details ->> 'parent_ministry', '')), '');
  v_parent_administration := nullif(pg_catalog.btrim(coalesce(v_details ->> 'parent_administration', '')), '');
  v_notes := nullif(pg_catalog.btrim(coalesce(v_details ->> 'notes', '')), '');

  if pg_catalog.length(coalesce(v_corrected_name, '')) > 320
    or pg_catalog.length(coalesce(v_verification_place, '')) > 500
    or pg_catalog.length(coalesce(v_phone, '')) > 32
    or pg_catalog.length(coalesce(v_whatsapp, '')) > 32
    or pg_catalog.length(coalesce(v_label, '')) > 160
    or pg_catalog.length(coalesce(v_parent_ministry, '')) > 160
    or pg_catalog.length(coalesce(v_parent_administration, '')) > 160
    or pg_catalog.length(coalesce(v_notes, '')) > 2000 then
    return jsonb_build_object('ok', false, 'status', 'invalid_details');
  end if;

  if v_phone is not null then
    v_phone := pg_catalog.regexp_replace(v_phone, '[^0-9]', '', 'g');
    if pg_catalog.length(v_phone) = 11 and pg_catalog.left(v_phone, 3) = '222' then
      v_phone := pg_catalog.right(v_phone, 8);
    end if;
    if v_phone !~ '^[234][0-9]{7}$' then
      return jsonb_build_object('ok', false, 'status', 'invalid_phone');
    end if;
  end if;

  if v_whatsapp is not null then
    v_whatsapp := pg_catalog.regexp_replace(v_whatsapp, '[^0-9]', '', 'g');
    if pg_catalog.length(v_whatsapp) = 11 and pg_catalog.left(v_whatsapp, 3) = '222' then
      v_whatsapp := pg_catalog.right(v_whatsapp, 8);
    end if;
    if v_whatsapp !~ '^[234][0-9]{7}$' then
      return jsonb_build_object('ok', false, 'status', 'invalid_whatsapp');
    end if;
  end if;

  v_establishment_type := case
    when 'administration' = any(v_selected_types) then 'administrative'
    when v_selected_types && array['public', 'region', 'moughataa', 'wilaya']::text[] then 'public'
    when v_selected_types && array['private', 'company', 'sports_hall', 'restaurant', 'hall']::text[] then 'private'
    else 'public'
  end;

  -- Serialise different providers that point to the exact same coordinates.
  -- The internal helper separately retains its provider-result and row locks.
  select discovery.latitude, discovery.longitude
  into v_latitude, v_longitude
  from public.external_place_discoveries as discovery
  where discovery.id = p_discovery_id;

  if v_latitude is not null and v_longitude is not null then
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtext(
        'admin_import_external_place_coordinates:'
        || v_latitude::text || ':' || v_longitude::text
      )::bigint
    );
  end if;

  -- The internal one-argument function owns discovery validation, duplicate
  -- detection, creation/linking, status transition, and its original audit.
  select public.admin_import_external_place_discovery_as_establishment(p_discovery_id)
  into v_response;

  if coalesce(v_response ->> 'ok', 'false') <> 'true' then
    return v_response;
  end if;

  v_establishment_id := nullif(v_response ->> 'establishment_id', '')::uuid;
  v_branch_id := nullif(v_response ->> 'branch_id', '')::uuid;
  if v_establishment_id is null then
    return jsonb_build_object('ok', false, 'status', 'import_missing_establishment');
  end if;

  update public.external_place_discoveries as discovery
  set reviewed_place_types = v_selected_types
  where discovery.id = p_discovery_id;

  -- Optional values apply only to the establishment created by this review.
  -- A coordinate match links the discovery but never overwrites canonical data.
  if v_response ->> 'status' = 'imported' then
    update public.establishments as establishment
    set name = coalesce(v_corrected_name, establishment.name),
        description = coalesce(v_notes, establishment.description),
        phone = coalesce(v_phone, establishment.phone),
        whatsapp = coalesce(v_whatsapp, establishment.whatsapp),
        label = coalesce(v_label, establishment.label),
        parent_ministry = coalesce(v_parent_ministry, establishment.parent_ministry),
        parent_administration = coalesce(v_parent_administration, establishment.parent_administration),
        establishment_type = v_establishment_type,
        place_types = v_selected_types
    where establishment.id = v_establishment_id;

    update public.branches as branch
    set name = coalesce(v_corrected_name, branch.name),
        phone = coalesce(v_phone, branch.phone),
        whatsapp = coalesce(v_whatsapp, branch.whatsapp),
        address = coalesce(v_verification_place, branch.address)
    where branch.id = v_branch_id;

    v_details_applied := v_corrected_name is not null
      or v_verification_place is not null
      or v_phone is not null
      or v_whatsapp is not null
      or v_label is not null
      or v_parent_ministry is not null
      or v_parent_administration is not null
      or v_notes is not null;
  end if;

  insert into public.admin_audit_events (actor_id, action, target_table, target_id, after_data, metadata)
  values (
    v_admin_id,
    'external_place_discovery.import_review_completed',
    'external_place_discoveries',
    p_discovery_id,
    jsonb_build_object(
      'reviewed_place_types', v_selected_types,
      'details_applied', v_details_applied,
      'proposed_establishment_type', v_establishment_type
    ),
    jsonb_build_object(
      'establishment_id', v_establishment_id,
      'branch_id', v_branch_id,
      'provided_detail_keys', (
        select coalesce(jsonb_agg(detail.detail_key order by detail.detail_key), '[]'::jsonb)
        from pg_catalog.jsonb_object_keys(v_details) as detail(detail_key)
      )
    )
  );

  return v_response || jsonb_build_object(
    -- `place_types` is retained for existing callers; the explicit key avoids
    -- implying that a duplicate-linked establishment was overwritten.
    'place_types', v_selected_types,
    'reviewed_place_types', v_selected_types,
    'details_applied', v_details_applied,
    'proposed_establishment_type', v_establishment_type
  ) || case
    when v_response ->> 'status' = 'imported'
      then jsonb_build_object('establishment_type', v_establishment_type)
    else '{}'::jsonb
  end;
end;
$$;

revoke all on function public.admin_import_external_place_discovery_with_types(uuid, text[], jsonb) from public, anon;
grant execute on function public.admin_import_external_place_discovery_with_types(uuid, text[], jsonb) to authenticated;

-- The helper remains callable only from trusted security-definer functions.
revoke all on function public.admin_import_external_place_discovery_as_establishment(uuid) from public, anon, authenticated;

select pg_notify('pgrst', 'reload schema');
