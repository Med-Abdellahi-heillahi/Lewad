-- Admin-only review actions for map-discovered places.
--
-- Client map search remains pending_review-only. A directory listing is created
-- exclusively by the explicit, authenticated administrator import RPC below.

alter table public.external_place_discoveries
  add column if not exists imported_establishment_id uuid
  references public.establishments (id) on delete set null;

create unique index if not exists external_place_discoveries_imported_establishment_uidx
  on public.external_place_discoveries (imported_establishment_id)
  where imported_establishment_id is not null;

create or replace function public.admin_import_external_place_discovery_as_establishment(
  p_discovery_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin_id uuid := auth.uid();
  v_discovery public.external_place_discoveries%rowtype;
  v_existing_establishment_id uuid;
  v_establishment_id uuid;
  v_branch_id uuid;
  v_slug_base text;
  v_slug text;
  v_slug_suffix integer := 2;
  v_location text;
begin
  if v_admin_id is null then
    return jsonb_build_object('ok', false, 'status', 'unauthenticated');
  end if;

  if not public.is_admin() then
    return jsonb_build_object('ok', false, 'status', 'forbidden');
  end if;

  if p_discovery_id is null then
    return jsonb_build_object('ok', false, 'status', 'invalid_discovery');
  end if;

  select * into v_discovery
  from public.external_place_discoveries as discovery
  where discovery.id = p_discovery_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'status', 'not_found');
  end if;

  if v_discovery.source_status = 'imported' then
    return jsonb_build_object(
      'ok', false,
      'status', 'already_imported',
      'discovery_id', v_discovery.id,
      'establishment_id', v_discovery.imported_establishment_id
    );
  end if;

  if v_discovery.source_status <> 'pending_review' then
    return jsonb_build_object('ok', false, 'status', 'not_pending');
  end if;

  if pg_catalog.btrim(v_discovery.display_name) = ''
    or pg_catalog.btrim(v_discovery.country) = ''
    or v_discovery.latitude is null or v_discovery.longitude is null
    or v_discovery.latitude = 'NaN'::numeric or v_discovery.longitude = 'NaN'::numeric
    or v_discovery.latitude < -90 or v_discovery.latitude > 90
    or v_discovery.longitude < -180 or v_discovery.longitude > 180 then
    return jsonb_build_object('ok', false, 'status', 'invalid_discovery');
  end if;

  -- Serialise imports of the same provider result before checking coordinates,
  -- so two admins cannot create two official listings for one map place.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtext(
      'admin_import_external_place_discovery:'
      || v_discovery.provider || ':' || v_discovery.provider_place_id
    )::bigint
  );

  select branch.establishment_id into v_existing_establishment_id
  from public.branches as branch
  join public.establishments as establishment
    on establishment.id = branch.establishment_id
  where establishment.status = 'approved'
    and branch.latitude = v_discovery.latitude
    and branch.longitude = v_discovery.longitude
  order by branch.is_main desc, branch.created_at asc
  limit 1;

  if v_existing_establishment_id is not null then
    update public.external_place_discoveries as discovery
    set source_status = 'imported',
        imported_establishment_id = v_existing_establishment_id
    where discovery.id = v_discovery.id;

    insert into public.admin_audit_events (actor_id, action, target_table, target_id, before_data, after_data, metadata)
    values (
      v_admin_id,
      'external_place_discovery.linked_to_existing_establishment',
      'external_place_discoveries',
      v_discovery.id,
      jsonb_build_object('status', v_discovery.source_status),
      jsonb_build_object('status', 'imported', 'imported_establishment_id', v_existing_establishment_id),
      jsonb_build_object('provider', v_discovery.provider, 'provider_place_id', v_discovery.provider_place_id)
    );

    return jsonb_build_object(
      'ok', true,
      'status', 'imported_existing',
      'discovery_id', v_discovery.id,
      'establishment_id', v_existing_establishment_id
    );
  end if;

  v_slug_base := btrim(
    pg_catalog.regexp_replace(
      pg_catalog.lower(v_discovery.display_name),
      '[^a-z0-9]+',
      '-',
      'g'
    ),
    '-'
  );
  if v_slug_base = '' then
    v_slug_base := 'establishment';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtext('admin_create_establishment:' || v_slug_base)::bigint
  );
  v_slug := v_slug_base;
  while exists (select 1 from public.establishments as establishment where establishment.slug = v_slug) loop
    v_slug := v_slug_base || '-' || v_slug_suffix;
    v_slug_suffix := v_slug_suffix + 1;
  end loop;

  v_location := pg_catalog.concat_ws(', ', v_discovery.wilaya, v_discovery.country);

  insert into public.establishments (
    name,
    slug,
    status,
    is_verified,
    created_by,
    verified_at,
    establishment_type
  )
  values (
    v_discovery.display_name,
    v_slug,
    'approved',
    true,
    v_admin_id,
    now(),
    'public'
  )
  returning id into v_establishment_id;

  insert into public.branches (
    establishment_id,
    name,
    address,
    city,
    neighborhood,
    latitude,
    longitude,
    is_main,
    status
  )
  values (
    v_establishment_id,
    v_discovery.display_name,
    v_location,
    v_discovery.wilaya,
    v_discovery.searched_query,
    v_discovery.latitude,
    v_discovery.longitude,
    true,
    'active'
  )
  returning id into v_branch_id;

  update public.external_place_discoveries as discovery
  set source_status = 'imported',
      imported_establishment_id = v_establishment_id
  where discovery.id = v_discovery.id;

  insert into public.admin_audit_events (actor_id, action, target_table, target_id, before_data, after_data, metadata)
  values (
    v_admin_id,
    'external_place_discovery.imported_as_establishment',
    'external_place_discoveries',
    v_discovery.id,
    jsonb_build_object('status', v_discovery.source_status),
    jsonb_build_object('status', 'imported', 'imported_establishment_id', v_establishment_id),
    jsonb_build_object(
      'provider', v_discovery.provider,
      'provider_place_id', v_discovery.provider_place_id,
      'establishment_id', v_establishment_id,
      'branch_id', v_branch_id
    )
  );

  return jsonb_build_object(
    'ok', true,
    'status', 'imported',
    'discovery_id', v_discovery.id,
    'establishment_id', v_establishment_id,
    'branch_id', v_branch_id
  );
end;
$$;

revoke all on function public.admin_import_external_place_discovery_as_establishment(uuid) from public, anon;
grant execute on function public.admin_import_external_place_discovery_as_establishment(uuid) to authenticated;

create or replace function public.admin_reject_external_place_discovery(
  p_discovery_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin_id uuid := auth.uid();
  v_discovery public.external_place_discoveries%rowtype;
begin
  if v_admin_id is null then
    return jsonb_build_object('ok', false, 'status', 'unauthenticated');
  end if;

  if not public.is_admin() then
    return jsonb_build_object('ok', false, 'status', 'forbidden');
  end if;

  if p_discovery_id is null then
    return jsonb_build_object('ok', false, 'status', 'not_found');
  end if;

  select * into v_discovery
  from public.external_place_discoveries as discovery
  where discovery.id = p_discovery_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'status', 'not_found');
  end if;

  if v_discovery.source_status <> 'pending_review' then
    return jsonb_build_object('ok', false, 'status', 'not_pending');
  end if;

  update public.external_place_discoveries as discovery
  set source_status = 'rejected'
  where discovery.id = v_discovery.id;

  insert into public.admin_audit_events (actor_id, action, target_table, target_id, before_data, after_data, metadata)
  values (
    v_admin_id,
    'external_place_discovery.rejected',
    'external_place_discoveries',
    v_discovery.id,
    jsonb_build_object('status', v_discovery.source_status),
    jsonb_build_object('status', 'rejected'),
    jsonb_build_object('provider', v_discovery.provider, 'provider_place_id', v_discovery.provider_place_id)
  );

  return jsonb_build_object('ok', true, 'status', 'rejected', 'discovery_id', v_discovery.id);
end;
$$;

revoke all on function public.admin_reject_external_place_discovery(uuid) from public, anon;
grant execute on function public.admin_reject_external_place_discovery(uuid) to authenticated;

-- New RPC signatures must be visible to the generated PostgREST schema.
select pg_notify('pgrst', 'reload schema');
