-- Super-admin establishment management.
--
-- Direct table writes remain unavailable to browser roles. Every read and
-- state transition below is scoped to an active super-admin account, and the
-- destructive-looking action is deliberately an approved -> suspended soft
-- transition. No DELETE path is introduced.

create index if not exists establishments_establishment_type_idx
on public.establishments (establishment_type, created_at desc, id desc);

create index if not exists establishments_created_at_id_idx
on public.establishments (created_at desc, id desc);

create index if not exists establishments_place_types_gin_idx
on public.establishments using gin (place_types);

create index if not exists business_submissions_resolved_establishment_id_idx
on public.business_submissions (resolved_establishment_id)
where resolved_establishment_id is not null;

create index if not exists admin_audit_events_map_import_establishment_idx
on public.admin_audit_events ((coalesce(
  metadata ->> 'establishment_id',
  after_data ->> 'imported_establishment_id'
)))
where action = 'external_place_discovery.imported_as_establishment'
  and target_table = 'external_place_discoveries';

create or replace function public.super_admin_get_establishment_options()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_categories jsonb;
begin
  if auth.uid() is null or not public.is_super_admin() then
    raise exception using errcode = '42501', message = 'An active super admin account is required.';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', category.id,
        'name', category.name,
        'slug', category.slug,
        'status', category.status
      )
      order by category.sort_order, category.name, category.id
    ),
    '[]'::jsonb
  )
  into v_categories
  from public.categories as category;

  return jsonb_build_object(
    'categories', v_categories,
    'establishment_types', array['private', 'public', 'administrative']::text[],
    'place_types', array[
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
end;
$$;

create or replace function public.super_admin_list_establishments(
  p_search text default null,
  p_status text default null,
  p_establishment_type text default null,
  p_place_type text default null,
  p_verified boolean default null,
  p_source text default null,
  p_category_id uuid default null,
  p_page integer default 1,
  p_page_size integer default 10
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_search text := nullif(pg_catalog.btrim(coalesce(p_search, '')), '');
  v_pattern text;
  v_status text := nullif(pg_catalog.btrim(coalesce(p_status, '')), '');
  v_establishment_type text := nullif(pg_catalog.btrim(coalesce(p_establishment_type, '')), '');
  v_place_type text := nullif(pg_catalog.btrim(coalesce(p_place_type, '')), '');
  v_source text := nullif(pg_catalog.btrim(coalesce(p_source, '')), '');
  v_page integer := coalesce(p_page, 1);
  v_page_size integer := coalesce(p_page_size, 10);
  v_offset bigint;
  v_total_count bigint;
  v_items jsonb;
begin
  if auth.uid() is null or not public.is_super_admin() then
    raise exception using errcode = '42501', message = 'An active super admin account is required.';
  end if;

  if v_page < 1 or v_page > 100000 then
    raise exception using errcode = '22023', message = 'Page is outside the supported range.';
  end if;

  if v_page_size not in (10, 20) then
    raise exception using errcode = '22023', message = 'Page size must be 10 or 20.';
  end if;

  if v_search is not null and char_length(v_search) > 120 then
    raise exception using errcode = '22023', message = 'Search text is too long.';
  end if;

  if v_status is not null and v_status not in ('draft', 'pending', 'approved', 'rejected', 'suspended') then
    raise exception using errcode = '22023', message = 'Establishment status is not allowed.';
  end if;

  if v_establishment_type is not null and v_establishment_type not in ('private', 'public', 'administrative') then
    raise exception using errcode = '22023', message = 'Establishment type is not allowed.';
  end if;

  if v_place_type is not null and v_place_type not in (
    'establishment', 'company', 'region', 'moughataa', 'wilaya',
    'sports_hall', 'restaurant', 'hall', 'administration', 'private', 'public'
  ) then
    raise exception using errcode = '22023', message = 'Place type is not allowed.';
  end if;

  if v_source is not null and v_source not in ('admin_created', 'client_submission', 'map_discovery', 'unknown') then
    raise exception using errcode = '22023', message = 'Establishment source is not allowed.';
  end if;

  if p_category_id is not null and not exists (
    select 1 from public.categories as category where category.id = p_category_id
  ) then
    raise exception using errcode = 'P0002', message = 'Category not found.';
  end if;

  if v_search is not null then
    v_pattern := '%' || replace(replace(replace(v_search, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%';
  end if;

  v_offset := (v_page::bigint - 1) * v_page_size;

  select count(*)
  into v_total_count
  from public.establishments as establishment
  cross join lateral (
    select case
      when exists (
        select 1
        from public.admin_audit_events as event
        where event.action = 'external_place_discovery.imported_as_establishment'
          and event.target_table = 'external_place_discoveries'
          and coalesce(
            event.metadata ->> 'establishment_id',
            event.after_data ->> 'imported_establishment_id'
          ) = establishment.id::text
      ) then 'map_discovery'
      when exists (
        select 1
        from public.business_submissions as submission
        where submission.resolved_establishment_id = establishment.id
          and submission.status = 'approved'
      ) then 'client_submission'
      when establishment.created_by is not null then 'admin_created'
      else 'unknown'
    end as source_value
  ) as source_info
  where (v_pattern is null
      or establishment.name ilike v_pattern escape E'\\'
      or coalesce(establishment.name_ar, '') ilike v_pattern escape E'\\')
    and (v_status is null or establishment.status = v_status)
    and (v_establishment_type is null or establishment.establishment_type = v_establishment_type)
    and (v_place_type is null or establishment.place_types @> array[v_place_type]::text[])
    and (p_verified is null or establishment.is_verified = p_verified)
    and (v_source is null or source_info.source_value = v_source)
    and (p_category_id is null or establishment.category_id = p_category_id);

  select coalesce(
    jsonb_agg(row_data.payload order by row_data.created_at desc, row_data.id desc),
    '[]'::jsonb
  )
  into v_items
  from (
    select
      establishment.id,
      establishment.created_at,
      jsonb_build_object(
        'id', establishment.id,
        'name', establishment.name,
        'name_ar', establishment.name_ar,
        'category_id', establishment.category_id,
        'category_name', category.name,
        'category_slug', category.slug,
        'establishment_type', establishment.establishment_type,
        'place_types', establishment.place_types,
        'status', establishment.status,
        'is_verified', establishment.is_verified,
        'phone', coalesce(nullif(establishment.phone, ''), primary_branch.phone),
        'whatsapp', coalesce(nullif(establishment.whatsapp, ''), primary_branch.whatsapp),
        'location', coalesce(primary_branch.address, primary_branch.neighborhood, primary_branch.city),
        'wilaya', primary_branch.city,
        'branch_count', branch_stats.branch_count,
        'created_at', establishment.created_at,
        'source', source_info.source_value
      ) as payload
    from public.establishments as establishment
    left join public.categories as category on category.id = establishment.category_id
    left join lateral (
      select
        branch.phone,
        branch.whatsapp,
        branch.address,
        branch.city,
        branch.neighborhood
      from public.branches as branch
      where branch.establishment_id = establishment.id
      order by branch.is_main desc, (branch.status = 'active') desc, branch.created_at, branch.id
      limit 1
    ) as primary_branch on true
    cross join lateral (
      select count(*) as branch_count
      from public.branches as branch
      where branch.establishment_id = establishment.id
    ) as branch_stats
    cross join lateral (
      select case
        when exists (
          select 1
          from public.admin_audit_events as event
          where event.action = 'external_place_discovery.imported_as_establishment'
            and event.target_table = 'external_place_discoveries'
            and coalesce(
              event.metadata ->> 'establishment_id',
              event.after_data ->> 'imported_establishment_id'
            ) = establishment.id::text
        ) then 'map_discovery'
        when exists (
          select 1
          from public.business_submissions as submission
          where submission.resolved_establishment_id = establishment.id
            and submission.status = 'approved'
        ) then 'client_submission'
        when establishment.created_by is not null then 'admin_created'
        else 'unknown'
      end as source_value
    ) as source_info
    where (v_pattern is null
        or establishment.name ilike v_pattern escape E'\\'
        or coalesce(establishment.name_ar, '') ilike v_pattern escape E'\\')
      and (v_status is null or establishment.status = v_status)
      and (v_establishment_type is null or establishment.establishment_type = v_establishment_type)
      and (v_place_type is null or establishment.place_types @> array[v_place_type]::text[])
      and (p_verified is null or establishment.is_verified = p_verified)
      and (v_source is null or source_info.source_value = v_source)
      and (p_category_id is null or establishment.category_id = p_category_id)
    order by establishment.created_at desc, establishment.id desc
    limit v_page_size offset v_offset
  ) as row_data;

  return jsonb_build_object(
    'items', v_items,
    'total_count', coalesce(v_total_count, 0),
    'page', v_page,
    'page_size', v_page_size
  );
end;
$$;

create or replace function public.super_admin_get_establishment_details(p_establishment_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_establishment public.establishments%rowtype;
  v_category public.categories%rowtype;
  v_primary_branch public.branches%rowtype;
  v_branches jsonb;
  v_branch_count bigint;
  v_source text;
begin
  if auth.uid() is null or not public.is_super_admin() then
    raise exception using errcode = '42501', message = 'An active super admin account is required.';
  end if;

  if p_establishment_id is null then
    raise exception using errcode = '22023', message = 'An establishment id is required.';
  end if;

  select * into v_establishment
  from public.establishments as establishment
  where establishment.id = p_establishment_id;

  if not found then
    raise exception using errcode = 'P0002', message = 'Establishment not found.';
  end if;

  if v_establishment.category_id is not null then
    select * into v_category
    from public.categories as category
    where category.id = v_establishment.category_id;
  end if;

  select * into v_primary_branch
  from public.branches as branch
  where branch.establishment_id = v_establishment.id
  order by branch.is_main desc, (branch.status = 'active') desc, branch.created_at, branch.id
  limit 1;

  select count(*) into v_branch_count
  from public.branches as branch
  where branch.establishment_id = v_establishment.id;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', branch.id,
        'name', branch.name,
        'phone', branch.phone,
        'whatsapp', branch.whatsapp,
        'address', branch.address,
        'wilaya', branch.city,
        'neighborhood', branch.neighborhood,
        'latitude', branch.latitude,
        'longitude', branch.longitude,
        'is_main', branch.is_main,
        'status', branch.status,
        'created_at', branch.created_at
      )
      order by branch.is_main desc, (branch.status = 'active') desc, branch.created_at, branch.id
    ),
    '[]'::jsonb
  )
  into v_branches
  from (
    select branch.*
    from public.branches as branch
    where branch.establishment_id = v_establishment.id
    order by branch.is_main desc, (branch.status = 'active') desc, branch.created_at, branch.id
    limit 50
  ) as branch;

  v_source := case
    when exists (
      select 1
      from public.admin_audit_events as event
      where event.action = 'external_place_discovery.imported_as_establishment'
        and event.target_table = 'external_place_discoveries'
        and coalesce(
          event.metadata ->> 'establishment_id',
          event.after_data ->> 'imported_establishment_id'
        ) = v_establishment.id::text
    ) then 'map_discovery'
    when exists (
      select 1
      from public.business_submissions as submission
      where submission.resolved_establishment_id = v_establishment.id
        and submission.status = 'approved'
    ) then 'client_submission'
    when v_establishment.created_by is not null then 'admin_created'
    else 'unknown'
  end;

  return jsonb_build_object(
    'id', v_establishment.id,
    'name', v_establishment.name,
    'name_ar', v_establishment.name_ar,
    'category_id', v_establishment.category_id,
    'category_name', v_category.name,
    'category_slug', v_category.slug,
    'establishment_type', v_establishment.establishment_type,
    'place_types', v_establishment.place_types,
    'status', v_establishment.status,
    'is_verified', v_establishment.is_verified,
    'phone', coalesce(nullif(v_establishment.phone, ''), v_primary_branch.phone),
    'whatsapp', coalesce(nullif(v_establishment.whatsapp, ''), v_primary_branch.whatsapp),
    'location', coalesce(v_primary_branch.address, v_primary_branch.neighborhood, v_primary_branch.city),
    'wilaya', v_primary_branch.city,
    'branch_count', v_branch_count,
    'created_at', v_establishment.created_at,
    'source', v_source,
    'description', v_establishment.description,
    'website', v_establishment.website,
    'image_url', v_establishment.image_url,
    'opening_date', v_establishment.opening_date,
    'closing_date', v_establishment.closing_date,
    'updated_at', v_establishment.updated_at,
    'branches', v_branches
  );
end;
$$;

create or replace function public.super_admin_create_establishment(
  p_name text,
  p_name_ar text default null,
  p_category_id uuid default null,
  p_establishment_type text default 'private',
  p_place_types text[] default '{}'::text[],
  p_description text default null,
  p_phone text default null,
  p_whatsapp text default null,
  p_website text default null,
  p_image_url text default null,
  p_is_verified boolean default true,
  p_opening_date date default null,
  p_closing_date date default null,
  p_branch_name text default null,
  p_location text default null,
  p_wilaya text default null,
  p_neighborhood text default null,
  p_latitude numeric default null,
  p_longitude numeric default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := auth.uid();
  v_name text := pg_catalog.btrim(coalesce(p_name, ''));
  v_name_ar text := nullif(pg_catalog.btrim(coalesce(p_name_ar, '')), '');
  v_establishment_type text := pg_catalog.btrim(coalesce(p_establishment_type, ''));
  v_place_types text[];
  v_description text := nullif(pg_catalog.btrim(coalesce(p_description, '')), '');
  v_phone text := nullif(public.normalize_profile_phone(pg_catalog.btrim(coalesce(p_phone, ''))), '');
  v_whatsapp text := nullif(public.normalize_profile_phone(pg_catalog.btrim(coalesce(p_whatsapp, ''))), '');
  v_website text := nullif(pg_catalog.btrim(coalesce(p_website, '')), '');
  v_image_url text := nullif(pg_catalog.btrim(coalesce(p_image_url, '')), '');
  v_branch_name text := nullif(pg_catalog.btrim(coalesce(p_branch_name, '')), '');
  v_location text := nullif(pg_catalog.btrim(coalesce(p_location, '')), '');
  v_wilaya text := nullif(pg_catalog.btrim(coalesce(p_wilaya, '')), '');
  v_neighborhood text := nullif(pg_catalog.btrim(coalesce(p_neighborhood, '')), '');
  v_slug_base text;
  v_slug text;
  v_slug_suffix integer := 2;
  v_establishment_id uuid;
  v_branch_id uuid;
begin
  if v_actor_id is null or not public.is_super_admin() then
    raise exception using errcode = '42501', message = 'An active super admin account is required.';
  end if;

  if v_name = '' or char_length(v_name) > 160 then
    raise exception using errcode = '22023', message = 'A name of at most 160 characters is required.';
  end if;

  if v_name_ar is not null and char_length(v_name_ar) > 160 then
    raise exception using errcode = '22023', message = 'Arabic name must be at most 160 characters.';
  end if;

  if v_establishment_type not in ('private', 'public', 'administrative') then
    raise exception using errcode = '22023', message = 'Establishment type is not allowed.';
  end if;

  if exists (
    select 1
    from pg_catalog.unnest(coalesce(p_place_types, '{}'::text[])) as selected(type_key)
    where selected.type_key is null
      or pg_catalog.btrim(selected.type_key) = ''
      or pg_catalog.btrim(selected.type_key) not in (
        'establishment', 'company', 'region', 'moughataa', 'wilaya',
        'sports_hall', 'restaurant', 'hall', 'administration', 'private', 'public'
      )
  ) then
    raise exception using errcode = '22023', message = 'One or more place types are not allowed.';
  end if;

  select coalesce(array_agg(distinct pg_catalog.btrim(selected.type_key) order by pg_catalog.btrim(selected.type_key)), '{}'::text[])
  into v_place_types
  from pg_catalog.unnest(coalesce(p_place_types, '{}'::text[])) as selected(type_key);

  if pg_catalog.cardinality(v_place_types) = 0 then
    raise exception using errcode = '22023', message = 'At least one place type is required.';
  end if;

  if p_category_id is not null and not exists (
    select 1 from public.categories as category where category.id = p_category_id
  ) then
    raise exception using errcode = 'P0002', message = 'Category not found.';
  end if;

  if v_description is not null and char_length(v_description) > 2000 then
    raise exception using errcode = '22023', message = 'Description must be at most 2000 characters.';
  end if;

  if (v_phone is not null and v_phone !~ '^[234][0-9]{7}$')
    or (v_whatsapp is not null and v_whatsapp !~ '^[234][0-9]{7}$') then
    raise exception using errcode = '22023', message = 'Phone and WhatsApp must be valid Mauritanian numbers.';
  end if;

  if v_website is not null and (char_length(v_website) > 2048 or pg_catalog.lower(v_website) !~ '^https?://[^[:space:]]+$') then
    raise exception using errcode = '22023', message = 'Website must be a valid HTTP or HTTPS URL.';
  end if;

  if v_image_url is not null and (char_length(v_image_url) > 2048 or pg_catalog.lower(v_image_url) !~ '\.(png|jpg|jpeg)(\?.*)?$') then
    raise exception using errcode = '22023', message = 'Image URL must identify a PNG or JPEG image.';
  end if;

  if p_is_verified is null then
    raise exception using errcode = '22023', message = 'Verified status is required.';
  end if;

  if p_opening_date is not null and p_closing_date is not null and p_closing_date < p_opening_date then
    raise exception using errcode = '22023', message = 'Closing date cannot precede opening date.';
  end if;

  if (p_latitude is null) <> (p_longitude is null)
    or (p_latitude is not null and (
      p_latitude = 'NaN'::numeric or p_longitude = 'NaN'::numeric
      or p_latitude < -90 or p_latitude > 90
      or p_longitude < -180 or p_longitude > 180
    )) then
    raise exception using errcode = '22023', message = 'Coordinates must be a valid latitude/longitude pair.';
  end if;

  v_branch_name := coalesce(v_branch_name, v_name);
  if char_length(v_branch_name) > 160
    or (v_location is not null and char_length(v_location) > 240)
    or (v_wilaya is not null and char_length(v_wilaya) > 120)
    or (v_neighborhood is not null and char_length(v_neighborhood) > 160) then
    raise exception using errcode = '22023', message = 'Branch location fields are too long.';
  end if;

  v_slug_base := pg_catalog.btrim(
    pg_catalog.regexp_replace(pg_catalog.lower(v_name), '[^a-z0-9]+', '-', 'g'),
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

  insert into public.establishments (
    category_id,
    name,
    name_ar,
    slug,
    description,
    phone,
    whatsapp,
    website,
    status,
    is_verified,
    created_by,
    verified_at,
    image_url,
    opening_date,
    closing_date,
    establishment_type,
    place_types
  )
  values (
    p_category_id,
    v_name,
    v_name_ar,
    v_slug,
    v_description,
    v_phone,
    v_whatsapp,
    v_website,
    'approved',
    p_is_verified,
    v_actor_id,
    case when p_is_verified then now() else null end,
    v_image_url,
    p_opening_date,
    p_closing_date,
    v_establishment_type,
    v_place_types
  )
  returning id into v_establishment_id;

  insert into public.branches (
    establishment_id,
    name,
    phone,
    whatsapp,
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
    v_branch_name,
    v_phone,
    v_whatsapp,
    v_location,
    v_wilaya,
    v_neighborhood,
    p_latitude,
    p_longitude,
    true,
    'active'
  )
  returning id into v_branch_id;

  insert into public.admin_audit_events (
    actor_id, action, target_table, target_id, after_data, metadata
  )
  values (
    v_actor_id,
    'establishment.created_by_super_admin',
    'establishments',
    v_establishment_id,
    jsonb_build_object(
      'status', 'approved',
      'category_id', p_category_id,
      'establishment_type', v_establishment_type,
      'place_types', v_place_types,
      'is_verified', p_is_verified
    ),
    jsonb_build_object('branch_id', v_branch_id, 'source', 'admin_created')
  );

  return jsonb_build_object(
    'ok', true,
    'status', 'created',
    'establishment_id', v_establishment_id,
    'branch_id', v_branch_id
  );
end;
$$;

create or replace function public.super_admin_update_establishment(
  p_establishment_id uuid,
  p_name text,
  p_name_ar text default null,
  p_category_id uuid default null,
  p_establishment_type text default 'private',
  p_place_types text[] default '{}'::text[],
  p_description text default null,
  p_phone text default null,
  p_whatsapp text default null,
  p_website text default null,
  p_image_url text default null,
  p_is_verified boolean default true,
  p_opening_date date default null,
  p_closing_date date default null,
  p_branch_name text default null,
  p_location text default null,
  p_wilaya text default null,
  p_neighborhood text default null,
  p_latitude numeric default null,
  p_longitude numeric default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := auth.uid();
  v_establishment public.establishments%rowtype;
  v_updated public.establishments%rowtype;
  v_branch public.branches%rowtype;
  v_name text := pg_catalog.btrim(coalesce(p_name, ''));
  v_name_ar text := nullif(pg_catalog.btrim(coalesce(p_name_ar, '')), '');
  v_establishment_type text := pg_catalog.btrim(coalesce(p_establishment_type, ''));
  v_place_types text[];
  v_description text := nullif(pg_catalog.btrim(coalesce(p_description, '')), '');
  v_phone text := nullif(public.normalize_profile_phone(pg_catalog.btrim(coalesce(p_phone, ''))), '');
  v_whatsapp text := nullif(public.normalize_profile_phone(pg_catalog.btrim(coalesce(p_whatsapp, ''))), '');
  v_website text := nullif(pg_catalog.btrim(coalesce(p_website, '')), '');
  v_image_url text := nullif(pg_catalog.btrim(coalesce(p_image_url, '')), '');
  v_branch_name text := nullif(pg_catalog.btrim(coalesce(p_branch_name, '')), '');
  v_location text := nullif(pg_catalog.btrim(coalesce(p_location, '')), '');
  v_wilaya text := nullif(pg_catalog.btrim(coalesce(p_wilaya, '')), '');
  v_neighborhood text := nullif(pg_catalog.btrim(coalesce(p_neighborhood, '')), '');
  v_before_data jsonb;
begin
  if v_actor_id is null or not public.is_super_admin() then
    raise exception using errcode = '42501', message = 'An active super admin account is required.';
  end if;

  if p_establishment_id is null then
    raise exception using errcode = '22023', message = 'An establishment id is required.';
  end if;

  if v_name = '' or char_length(v_name) > 160 then
    raise exception using errcode = '22023', message = 'A name of at most 160 characters is required.';
  end if;

  if v_name_ar is not null and char_length(v_name_ar) > 160 then
    raise exception using errcode = '22023', message = 'Arabic name must be at most 160 characters.';
  end if;

  if v_establishment_type not in ('private', 'public', 'administrative') then
    raise exception using errcode = '22023', message = 'Establishment type is not allowed.';
  end if;

  if exists (
    select 1
    from pg_catalog.unnest(coalesce(p_place_types, '{}'::text[])) as selected(type_key)
    where selected.type_key is null
      or pg_catalog.btrim(selected.type_key) = ''
      or pg_catalog.btrim(selected.type_key) not in (
        'establishment', 'company', 'region', 'moughataa', 'wilaya',
        'sports_hall', 'restaurant', 'hall', 'administration', 'private', 'public'
      )
  ) then
    raise exception using errcode = '22023', message = 'One or more place types are not allowed.';
  end if;

  select coalesce(array_agg(distinct pg_catalog.btrim(selected.type_key) order by pg_catalog.btrim(selected.type_key)), '{}'::text[])
  into v_place_types
  from pg_catalog.unnest(coalesce(p_place_types, '{}'::text[])) as selected(type_key);

  if pg_catalog.cardinality(v_place_types) = 0 then
    raise exception using errcode = '22023', message = 'At least one place type is required.';
  end if;

  if p_category_id is not null and not exists (
    select 1 from public.categories as category where category.id = p_category_id
  ) then
    raise exception using errcode = 'P0002', message = 'Category not found.';
  end if;

  if v_description is not null and char_length(v_description) > 2000 then
    raise exception using errcode = '22023', message = 'Description must be at most 2000 characters.';
  end if;

  if (v_phone is not null and v_phone !~ '^[234][0-9]{7}$')
    or (v_whatsapp is not null and v_whatsapp !~ '^[234][0-9]{7}$') then
    raise exception using errcode = '22023', message = 'Phone and WhatsApp must be valid Mauritanian numbers.';
  end if;

  if v_website is not null and (char_length(v_website) > 2048 or pg_catalog.lower(v_website) !~ '^https?://[^[:space:]]+$') then
    raise exception using errcode = '22023', message = 'Website must be a valid HTTP or HTTPS URL.';
  end if;

  if v_image_url is not null and (char_length(v_image_url) > 2048 or pg_catalog.lower(v_image_url) !~ '\.(png|jpg|jpeg)(\?.*)?$') then
    raise exception using errcode = '22023', message = 'Image URL must identify a PNG or JPEG image.';
  end if;

  if p_is_verified is null then
    raise exception using errcode = '22023', message = 'Verified status is required.';
  end if;

  if p_opening_date is not null and p_closing_date is not null and p_closing_date < p_opening_date then
    raise exception using errcode = '22023', message = 'Closing date cannot precede opening date.';
  end if;

  if (p_latitude is null) <> (p_longitude is null)
    or (p_latitude is not null and (
      p_latitude = 'NaN'::numeric or p_longitude = 'NaN'::numeric
      or p_latitude < -90 or p_latitude > 90
      or p_longitude < -180 or p_longitude > 180
    )) then
    raise exception using errcode = '22023', message = 'Coordinates must be a valid latitude/longitude pair.';
  end if;

  v_branch_name := coalesce(v_branch_name, v_name);
  if char_length(v_branch_name) > 160
    or (v_location is not null and char_length(v_location) > 240)
    or (v_wilaya is not null and char_length(v_wilaya) > 120)
    or (v_neighborhood is not null and char_length(v_neighborhood) > 160) then
    raise exception using errcode = '22023', message = 'Branch location fields are too long.';
  end if;

  select * into v_establishment
  from public.establishments as establishment
  where establishment.id = p_establishment_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Establishment not found.';
  end if;

  select * into v_branch
  from public.branches as branch
  where branch.establishment_id = v_establishment.id
  order by branch.is_main desc, (branch.status = 'active') desc, branch.created_at, branch.id
  limit 1
  for update;

  v_before_data := jsonb_build_object(
    'name', v_establishment.name,
    'name_ar', v_establishment.name_ar,
    'category_id', v_establishment.category_id,
    'establishment_type', v_establishment.establishment_type,
    'place_types', v_establishment.place_types,
    'is_verified', v_establishment.is_verified,
    'branch_id', v_branch.id,
    'location', v_branch.address,
    'wilaya', v_branch.city,
    'neighborhood', v_branch.neighborhood,
    'latitude', v_branch.latitude,
    'longitude', v_branch.longitude
  );

  update public.establishments as establishment
  set
    category_id = p_category_id,
    name = v_name,
    name_ar = v_name_ar,
    description = v_description,
    phone = v_phone,
    whatsapp = v_whatsapp,
    website = v_website,
    is_verified = p_is_verified,
    verified_at = case
      when p_is_verified then coalesce(establishment.verified_at, now())
      else null
    end,
    image_url = v_image_url,
    opening_date = p_opening_date,
    closing_date = p_closing_date,
    establishment_type = v_establishment_type,
    place_types = v_place_types
  where establishment.id = v_establishment.id
  returning establishment.* into v_updated;

  if v_branch.id is null then
    insert into public.branches (
      establishment_id, name, phone, whatsapp, address, city, neighborhood,
      latitude, longitude, is_main, status
    )
    values (
      v_establishment.id, v_branch_name, v_phone, v_whatsapp, v_location,
      v_wilaya, v_neighborhood, p_latitude, p_longitude, true, 'active'
    )
    returning * into v_branch;
  else
    update public.branches as branch
    set
      name = v_branch_name,
      phone = v_phone,
      whatsapp = v_whatsapp,
      address = v_location,
      city = v_wilaya,
      neighborhood = v_neighborhood,
      latitude = p_latitude,
      longitude = p_longitude,
      is_main = true
    where branch.id = v_branch.id
    returning branch.* into v_branch;
  end if;

  insert into public.admin_audit_events (
    actor_id, action, target_table, target_id, before_data, after_data, metadata
  )
  values (
    v_actor_id,
    'establishment.updated_by_super_admin',
    'establishments',
    v_establishment.id,
    v_before_data,
    jsonb_build_object(
      'name', v_updated.name,
      'name_ar', v_updated.name_ar,
      'category_id', v_updated.category_id,
      'establishment_type', v_updated.establishment_type,
      'place_types', v_updated.place_types,
      'is_verified', v_updated.is_verified,
      'branch_id', v_branch.id,
      'location', v_branch.address,
      'wilaya', v_branch.city,
      'neighborhood', v_branch.neighborhood,
      'latitude', v_branch.latitude,
      'longitude', v_branch.longitude
    ),
    jsonb_build_object('safe_fields_only', true)
  );

  return jsonb_build_object(
    'ok', true,
    'status', 'updated',
    'establishment_id', v_establishment.id,
    'branch_id', v_branch.id
  );
end;
$$;

create or replace function public.super_admin_archive_establishment(p_establishment_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := auth.uid();
  v_establishment public.establishments%rowtype;
begin
  if v_actor_id is null or not public.is_super_admin() then
    raise exception using errcode = '42501', message = 'An active super admin account is required.';
  end if;

  if p_establishment_id is null then
    raise exception using errcode = '22023', message = 'An establishment id is required.';
  end if;

  select * into v_establishment
  from public.establishments as establishment
  where establishment.id = p_establishment_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Establishment not found.';
  end if;

  if v_establishment.status = 'suspended' then
    return jsonb_build_object('ok', true, 'status', 'archived', 'establishment_id', v_establishment.id);
  end if;

  if v_establishment.status <> 'approved' then
    raise exception using errcode = '22023', message = 'Only an approved establishment can be archived.';
  end if;

  update public.establishments as establishment
  set status = 'suspended'
  where establishment.id = v_establishment.id;

  insert into public.admin_audit_events (
    actor_id, action, target_table, target_id, before_data, after_data
  )
  values (
    v_actor_id,
    'establishment.archived_by_super_admin',
    'establishments',
    v_establishment.id,
    jsonb_build_object('status', v_establishment.status),
    jsonb_build_object('status', 'suspended')
  );

  return jsonb_build_object('ok', true, 'status', 'archived', 'establishment_id', v_establishment.id);
end;
$$;

create or replace function public.super_admin_reactivate_establishment(p_establishment_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := auth.uid();
  v_establishment public.establishments%rowtype;
begin
  if v_actor_id is null or not public.is_super_admin() then
    raise exception using errcode = '42501', message = 'An active super admin account is required.';
  end if;

  if p_establishment_id is null then
    raise exception using errcode = '22023', message = 'An establishment id is required.';
  end if;

  select * into v_establishment
  from public.establishments as establishment
  where establishment.id = p_establishment_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Establishment not found.';
  end if;

  if v_establishment.status <> 'suspended' then
    raise exception using errcode = '22023', message = 'Only a suspended establishment can be reactivated.';
  end if;

  update public.establishments as establishment
  set status = 'approved'
  where establishment.id = v_establishment.id;

  insert into public.admin_audit_events (
    actor_id, action, target_table, target_id, before_data, after_data
  )
  values (
    v_actor_id,
    'establishment.reactivated_by_super_admin',
    'establishments',
    v_establishment.id,
    jsonb_build_object('status', v_establishment.status),
    jsonb_build_object('status', 'approved')
  );

  return jsonb_build_object('ok', true, 'status', 'reactivated', 'establishment_id', v_establishment.id);
end;
$$;

revoke all on function public.super_admin_get_establishment_options() from public, anon, authenticated;
grant execute on function public.super_admin_get_establishment_options() to authenticated;

revoke all on function public.super_admin_list_establishments(text, text, text, text, boolean, text, uuid, integer, integer) from public, anon, authenticated;
grant execute on function public.super_admin_list_establishments(text, text, text, text, boolean, text, uuid, integer, integer) to authenticated;

revoke all on function public.super_admin_get_establishment_details(uuid) from public, anon, authenticated;
grant execute on function public.super_admin_get_establishment_details(uuid) to authenticated;

revoke all on function public.super_admin_create_establishment(text, text, uuid, text, text[], text, text, text, text, text, boolean, date, date, text, text, text, text, numeric, numeric) from public, anon, authenticated;
grant execute on function public.super_admin_create_establishment(text, text, uuid, text, text[], text, text, text, text, text, boolean, date, date, text, text, text, text, numeric, numeric) to authenticated;

revoke all on function public.super_admin_update_establishment(uuid, text, text, uuid, text, text[], text, text, text, text, text, boolean, date, date, text, text, text, text, numeric, numeric) from public, anon, authenticated;
grant execute on function public.super_admin_update_establishment(uuid, text, text, uuid, text, text[], text, text, text, text, text, boolean, date, date, text, text, text, text, numeric, numeric) to authenticated;

revoke all on function public.super_admin_archive_establishment(uuid) from public, anon, authenticated;
grant execute on function public.super_admin_archive_establishment(uuid) to authenticated;

revoke all on function public.super_admin_reactivate_establishment(uuid) from public, anon, authenticated;
grant execute on function public.super_admin_reactivate_establishment(uuid) to authenticated;

select pg_notify('pgrst', 'reload schema');
