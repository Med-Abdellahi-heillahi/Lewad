-- External-place imports require one or more stable administrative type keys.
-- Existing establishments retain an empty array until an administrator imports
-- a discovery with explicitly selected types.

alter table public.establishments
  add column if not exists place_types text[] not null default '{}'::text[];

alter table public.establishments
  drop constraint if exists establishments_place_types_allowed_check;

alter table public.establishments
  add constraint establishments_place_types_allowed_check
  check (
    place_types <@ array[
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

-- Keep the former one-argument implementation available only to this new
-- security-definer wrapper. Browser callers cannot bypass the required type
-- selection through the older signature.
revoke all on function public.admin_import_external_place_discovery_as_establishment(uuid) from public, anon, authenticated;

create or replace function public.admin_import_external_place_discovery_as_establishment(
  p_discovery_id uuid,
  p_selected_types text[]
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin_id uuid := auth.uid();
  v_selected_types text[];
  v_response jsonb;
  v_establishment_id uuid;
begin
  if v_admin_id is null then
    return jsonb_build_object('ok', false, 'status', 'unauthenticated');
  end if;

  if not public.is_admin() then
    return jsonb_build_object('ok', false, 'status', 'forbidden');
  end if;

  select coalesce(array_agg(distinct type_key order by type_key), '{}'::text[])
  into v_selected_types
  from (
    select pg_catalog.btrim(type_key) as type_key
    from pg_catalog.unnest(pg_catalog.coalesce(p_selected_types, '{}'::text[])) as type_key
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

  -- Migration 20260826000013 owns the atomic discovery lock, duplicate check,
  -- establishment/branch creation, status update, and original audit event.
  select public.admin_import_external_place_discovery_as_establishment(p_discovery_id)
  into v_response;

  if coalesce(v_response ->> 'ok', 'false') <> 'true' then
    return v_response;
  end if;

  v_establishment_id := nullif(v_response ->> 'establishment_id', '')::uuid;
  if v_establishment_id is null then
    return jsonb_build_object('ok', false, 'status', 'import_missing_establishment');
  end if;

  update public.establishments as establishment
  set place_types = (
    select coalesce(array_agg(distinct type_key order by type_key), '{}'::text[])
    from pg_catalog.unnest(coalesce(establishment.place_types, '{}'::text[]) || v_selected_types) as type_key
  )
  where establishment.id = v_establishment_id;

  insert into public.admin_audit_events (actor_id, action, target_table, target_id, after_data, metadata)
  values (
    v_admin_id,
    'external_place_discovery.import_types_assigned',
    'external_place_discoveries',
    p_discovery_id,
    jsonb_build_object('place_types', v_selected_types),
    jsonb_build_object('establishment_id', v_establishment_id)
  );

  return v_response || jsonb_build_object('place_types', v_selected_types);
end;
$$;

revoke all on function public.admin_import_external_place_discovery_as_establishment(uuid, text[]) from public, anon;
grant execute on function public.admin_import_external_place_discovery_as_establishment(uuid, text[]) to authenticated;

select pg_notify('pgrst', 'reload schema');
