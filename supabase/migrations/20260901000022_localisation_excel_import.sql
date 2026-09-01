-- Super-admin localisation spreadsheet imports.
--
-- The inspected source corpus contains establishment/place rows with generic
-- spreadsheet headings, plus title-only wilaya sources. It does not provide a
-- dependable hierarchy, row-coordinate pair, or language-column convention.
-- The final table therefore preserves the exact mapped proper name and keeps
-- optional typed fields without guessing translations or administrative links.
--
-- Browser roles have no direct table privileges or RLS policies. All staging,
-- validation, application, and inspection goes through active-super-admin RPCs.

create table if not exists public.localisation_import_batches (
  id uuid primary key default gen_random_uuid(),
  uploaded_by uuid not null references auth.users (id) on delete restrict,
  file_name text not null,
  file_type text not null,
  sheet_name text,
  entity_type text not null default 'establishment',
  column_mapping jsonb not null default '{}'::jsonb,
  status text not null default 'created',
  total_rows integer not null default 0,
  staged_rows integer not null default 0,
  valid_rows integer not null default 0,
  invalid_rows integer not null default 0,
  duplicate_rows integer not null default 0,
  applied_rows integer not null default 0,
  inserted_rows integer not null default 0,
  updated_rows integer not null default 0,
  skipped_rows integer not null default 0,
  created_at timestamptz not null default now(),
  validated_at timestamptz,
  completed_at timestamptz,
  staging_purged_at timestamptz,
  constraint localisation_import_batches_file_name_check check (
    file_name = pg_catalog.btrim(file_name)
    and pg_catalog.char_length(file_name) between 1 and 255
    and pg_catalog.octet_length(file_name) <= 1024
    and file_name !~ '[\\/]'
    and file_name !~ '[[:cntrl:]]'
  ),
  constraint localisation_import_batches_file_type_check
    check (file_type in ('xlsx', 'csv')),
  constraint localisation_import_batches_sheet_name_check check (
    sheet_name is null
    or (
      sheet_name = pg_catalog.btrim(sheet_name)
      and pg_catalog.char_length(sheet_name) between 1 and 160
      and pg_catalog.octet_length(sheet_name) <= 640
      and sheet_name !~ '[[:cntrl:]]'
    )
  ),
  constraint localisation_import_batches_entity_type_check check (
    entity_type in ('establishment', 'wilaya', 'moughataa', 'commune', 'locality')
  ),
  constraint localisation_import_batches_column_mapping_check check (
    pg_catalog.jsonb_typeof(column_mapping) = 'object'
    and pg_catalog.pg_column_size(column_mapping) <= 8192
  ),
  constraint localisation_import_batches_status_check check (
    status in ('created', 'staging', 'validated', 'invalid', 'applied', 'expired')
  ),
  constraint localisation_import_batches_row_counts_check check (
    total_rows between 0 and 10000
    and staged_rows between 0 and 10000
    and valid_rows between 0 and 10000
    and invalid_rows between 0 and 10000
    and duplicate_rows between 0 and 10000
    and applied_rows between 0 and 10000
    and inserted_rows between 0 and 10000
    and updated_rows between 0 and 10000
    and skipped_rows between 0 and 10000
    and staged_rows <= total_rows
    and valid_rows <= total_rows
    and invalid_rows <= total_rows
    and duplicate_rows <= valid_rows
    and applied_rows = inserted_rows + updated_rows
  )
);

create table if not exists public.localisation_import_rows (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.localisation_import_batches (id) on delete cascade,
  row_number integer not null,
  sheet_name text,
  raw_data jsonb not null,
  normalized_data jsonb not null,
  validation_errors jsonb not null default '[]'::jsonb,
  status text not null default 'pending',
  dedupe_key text,
  duplicate_kind text,
  duplicate_of_row_id uuid references public.localisation_import_rows (id) on delete set null,
  matched_place_id uuid,
  created_at timestamptz not null default now(),
  validated_at timestamptz,
  applied_at timestamptz,
  constraint localisation_import_rows_batch_row_unique unique (batch_id, row_number),
  constraint localisation_import_rows_row_number_check
    check (row_number between 1 and 1000000),
  constraint localisation_import_rows_sheet_name_check check (
    sheet_name is null
    or (
      sheet_name = pg_catalog.btrim(sheet_name)
      and pg_catalog.char_length(sheet_name) between 1 and 160
      and pg_catalog.octet_length(sheet_name) <= 640
      and sheet_name !~ '[[:cntrl:]]'
    )
  ),
  constraint localisation_import_rows_raw_data_check check (
    pg_catalog.jsonb_typeof(raw_data) = 'object'
    and pg_catalog.pg_column_size(raw_data) <= 65536
  ),
  constraint localisation_import_rows_normalized_data_check check (
    pg_catalog.jsonb_typeof(normalized_data) = 'object'
    and pg_catalog.pg_column_size(normalized_data) <= 16384
  ),
  constraint localisation_import_rows_validation_errors_check check (
    pg_catalog.jsonb_typeof(validation_errors) = 'array'
    and pg_catalog.pg_column_size(validation_errors) <= 16384
  ),
  constraint localisation_import_rows_status_check check (
    status in ('pending', 'valid', 'invalid', 'duplicate', 'applied')
  ),
  constraint localisation_import_rows_dedupe_key_check check (
    dedupe_key is null or dedupe_key ~ '^[0-9a-f]{32}$'
  ),
  constraint localisation_import_rows_duplicate_kind_check check (
    duplicate_kind is null or duplicate_kind in ('batch', 'final')
  )
);

create table if not exists public.localisation_places (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  name text not null,
  name_fr text,
  name_ar text,
  name_en text,
  category text,
  address text,
  wilaya text,
  phone text,
  opening_status text,
  amenities text[] not null default '{}'::text[],
  source_url text,
  latitude numeric(9, 6),
  longitude numeric(10, 6),
  status text not null default 'active',
  dedupe_key text not null,
  source_batch_id uuid references public.localisation_import_batches (id) on delete set null,
  source_file_name text not null,
  source_sheet_name text,
  source_row_number integer not null,
  last_source_batch_id uuid references public.localisation_import_batches (id) on delete set null,
  last_source_file_name text not null,
  last_source_sheet_name text,
  last_source_row_number integer not null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint localisation_places_entity_type_check check (
    entity_type in ('establishment', 'wilaya', 'moughataa', 'commune', 'locality')
  ),
  constraint localisation_places_name_check check (
    name = pg_catalog.btrim(name)
    and pg_catalog.char_length(name) between 1 and 240
    and pg_catalog.octet_length(name) <= 960
    and name !~ '[[:cntrl:]]'
  ),
  constraint localisation_places_name_fr_check check (
    name_fr is null or (
      name_fr = pg_catalog.btrim(name_fr)
      and pg_catalog.char_length(name_fr) between 1 and 240
      and pg_catalog.octet_length(name_fr) <= 960
      and name_fr !~ '[[:cntrl:]]'
    )
  ),
  constraint localisation_places_name_ar_check check (
    name_ar is null or (
      name_ar = pg_catalog.btrim(name_ar)
      and pg_catalog.char_length(name_ar) between 1 and 240
      and pg_catalog.octet_length(name_ar) <= 960
      and name_ar !~ '[[:cntrl:]]'
    )
  ),
  constraint localisation_places_name_en_check check (
    name_en is null or (
      name_en = pg_catalog.btrim(name_en)
      and pg_catalog.char_length(name_en) between 1 and 240
      and pg_catalog.octet_length(name_en) <= 960
      and name_en !~ '[[:cntrl:]]'
    )
  ),
  constraint localisation_places_category_check check (
    category is null or (
      category = pg_catalog.btrim(category)
      and pg_catalog.char_length(category) between 1 and 160
      and pg_catalog.octet_length(category) <= 640
      and category !~ '[[:cntrl:]]'
    )
  ),
  constraint localisation_places_address_check check (
    address is null or (
      address = pg_catalog.btrim(address)
      and pg_catalog.char_length(address) between 1 and 500
      and pg_catalog.octet_length(address) <= 2000
      and address !~ '[[:cntrl:]]'
    )
  ),
  constraint localisation_places_wilaya_check check (
    wilaya is null or (
      wilaya = pg_catalog.btrim(wilaya)
      and pg_catalog.char_length(wilaya) between 1 and 160
      and pg_catalog.octet_length(wilaya) <= 640
      and wilaya !~ '[[:cntrl:]]'
    )
  ),
  constraint localisation_places_phone_check check (
    phone is null or (
      phone = pg_catalog.btrim(phone)
      and pg_catalog.char_length(phone) between 1 and 64
      and phone ~ '^[0-9+(). /-]+$'
    )
  ),
  constraint localisation_places_opening_status_check check (
    opening_status is null or (
      opening_status = pg_catalog.btrim(opening_status)
      and pg_catalog.char_length(opening_status) between 1 and 160
      and pg_catalog.octet_length(opening_status) <= 640
      and opening_status !~ '[[:cntrl:]]'
    )
  ),
  constraint localisation_places_amenities_check check (
    pg_catalog.cardinality(amenities) <= 32
    and pg_catalog.pg_column_size(amenities) <= 8192
  ),
  constraint localisation_places_source_url_check check (
    source_url is null or (
      source_url = pg_catalog.btrim(source_url)
      and pg_catalog.char_length(source_url) between 1 and 4096
      and source_url ~* '^https?://[^/[:space:]]+[^[:space:]]*$'
      and source_url !~ '[[:cntrl:]]'
    )
  ),
  constraint localisation_places_coordinate_pair_check check (
    (latitude is null and longitude is null)
    or (latitude is not null and longitude is not null)
  ),
  constraint localisation_places_latitude_check
    check (latitude is null or latitude between -90 and 90),
  constraint localisation_places_longitude_check
    check (longitude is null or longitude between -180 and 180),
  constraint localisation_places_status_check check (status in ('active', 'inactive')),
  constraint localisation_places_dedupe_key_unique unique (dedupe_key),
  constraint localisation_places_dedupe_key_check
    check (dedupe_key ~ '^[0-9a-f]{32}$'),
  constraint localisation_places_source_row_check
    check (source_row_number between 1 and 1000000),
  constraint localisation_places_last_source_row_check
    check (last_source_row_number between 1 and 1000000)
);

alter table public.localisation_import_rows
  add constraint localisation_import_rows_matched_place_fk
  foreign key (matched_place_id)
  references public.localisation_places (id)
  on delete set null;

create index if not exists localisation_import_batches_created_at_idx
  on public.localisation_import_batches (created_at desc, id desc);
create index if not exists localisation_import_batches_uploaded_by_idx
  on public.localisation_import_batches (uploaded_by, created_at desc);
create index if not exists localisation_import_rows_batch_status_row_idx
  on public.localisation_import_rows (batch_id, status, row_number);
create index if not exists localisation_import_rows_batch_dedupe_idx
  on public.localisation_import_rows (batch_id, dedupe_key)
  where dedupe_key is not null;
create index if not exists localisation_places_entity_type_name_idx
  on public.localisation_places (entity_type, lower(name));
create index if not exists localisation_places_wilaya_idx
  on public.localisation_places (lower(wilaya))
  where wilaya is not null;
create index if not exists localisation_places_category_idx
  on public.localisation_places (lower(category))
  where category is not null;

alter table public.localisation_import_batches enable row level security;
alter table public.localisation_import_rows enable row level security;
alter table public.localisation_places enable row level security;

-- No direct browser policies are intentionally created, including for the
-- final table. A future public selector must be a separate narrow RPC.
revoke all on table public.localisation_import_batches from public, anon, authenticated;
revoke all on table public.localisation_import_rows from public, anon, authenticated;
revoke all on table public.localisation_places from public, anon, authenticated;

comment on table public.localisation_import_batches is
  'Super-admin-only spreadsheet import history and aggregate validation counts.';
comment on table public.localisation_import_rows is
  'Bounded, temporary, super-admin-only staging rows with transparent validation and duplicate state.';
comment on table public.localisation_places is
  'Typed final localisation records preserving mapped proper names and source provenance; RPC-only in V1.';
comment on column public.localisation_places.name is
  'Exact trimmed proper name from the mapped source cell; never translated, lower-cased, or script-split.';
comment on column public.localisation_places.dedupe_key is
  'Stable key over entity type, case-folded whitespace-normalised name/location text, and coordinates.';

create or replace function public.super_admin_create_localisation_import_batch(
  p_file_name text,
  p_file_type text,
  p_sheet_name text default null,
  p_entity_type text default 'establishment',
  p_column_mapping jsonb default '{}'::jsonb,
  p_total_rows integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_file_name text;
  v_file_type text;
  v_sheet_name text;
  v_entity_type text;
  v_mapping jsonb := coalesce(p_column_mapping, '{}'::jsonb);
  v_mapping_key_count integer;
  v_mapping_entry record;
  v_batch public.localisation_import_batches%rowtype;
begin
  if auth.uid() is null or not public.is_super_admin() then
    raise exception using errcode = '42501', message = 'An active super admin account is required.';
  end if;

  if p_file_name is null or pg_catalog.octet_length(p_file_name) > 1024
    or p_file_type is null or pg_catalog.octet_length(p_file_type) > 16
    or (p_sheet_name is not null and pg_catalog.octet_length(p_sheet_name) > 640)
    or p_entity_type is null or pg_catalog.octet_length(p_entity_type) > 32 then
    raise exception using errcode = '22023', message = 'Import batch text input is missing or too large.';
  end if;

  v_file_name := pg_catalog.btrim(p_file_name);
  v_file_type := pg_catalog.lower(pg_catalog.btrim(p_file_type));
  v_file_type := pg_catalog.ltrim(v_file_type, '.');
  v_sheet_name := nullif(pg_catalog.btrim(coalesce(p_sheet_name, '')), '');
  v_entity_type := pg_catalog.lower(pg_catalog.btrim(p_entity_type));

  if v_file_name = '' or pg_catalog.char_length(v_file_name) > 255
    or v_file_name ~ '[\\/]' or v_file_name ~ '[[:cntrl:]]' then
    raise exception using errcode = '22023', message = 'File name is invalid.';
  end if;

  if v_file_type not in ('xlsx', 'csv') then
    raise exception using errcode = '22023', message = 'File type must be xlsx or csv.';
  end if;

  if v_sheet_name is not null and (
    pg_catalog.char_length(v_sheet_name) > 160 or v_sheet_name ~ '[[:cntrl:]]'
  ) then
    raise exception using errcode = '22023', message = 'Sheet name is invalid.';
  end if;

  if v_entity_type not in ('establishment', 'wilaya', 'moughataa', 'commune', 'locality') then
    raise exception using errcode = '22023', message = 'Entity type is not supported.';
  end if;

  if p_total_rows is null or p_total_rows < 0 or p_total_rows > 10000 then
    raise exception using errcode = '22023', message = 'Total rows must be between 0 and 10000.';
  end if;

  if pg_catalog.jsonb_typeof(v_mapping) <> 'object'
    or pg_catalog.pg_column_size(v_mapping) > 8192 then
    raise exception using errcode = '22023', message = 'Column mapping must be a bounded JSON object.';
  end if;

  select count(*)
  into v_mapping_key_count
  from pg_catalog.jsonb_object_keys(v_mapping);

  if v_mapping_key_count > 32 then
    raise exception using errcode = '22023', message = 'Column mapping must be a bounded JSON object.';
  end if;

  for v_mapping_entry in
    select mapping.key, mapping.value
    from pg_catalog.jsonb_each(v_mapping) as mapping
  loop
    if v_mapping_entry.key not in (
        'name', 'name_fr', 'name_ar', 'name_en', 'category', 'address', 'wilaya',
        'phone', 'opening_status', 'amenities', 'source_url', 'latitude', 'longitude'
      )
      or pg_catalog.char_length(v_mapping_entry.key) > 160
      or v_mapping_entry.key ~ '[[:cntrl:]]'
      or (
        pg_catalog.jsonb_typeof(v_mapping_entry.value) <> 'null'
        and (
          pg_catalog.jsonb_typeof(v_mapping_entry.value) <> 'string'
          or pg_catalog.btrim(v_mapping_entry.value #>> '{}') = ''
          or pg_catalog.char_length(v_mapping_entry.value #>> '{}') > 240
          or (v_mapping_entry.value #>> '{}') ~ '[[:cntrl:]]'
        )
      ) then
      raise exception using errcode = '22023', message = 'Column mapping contains an invalid key or value.';
    end if;
  end loop;

  if not (v_mapping ? 'name')
    or pg_catalog.jsonb_typeof(v_mapping -> 'name') <> 'string'
    or pg_catalog.btrim(v_mapping ->> 'name') = '' then
    raise exception using errcode = '22023', message = 'Column mapping must include a non-empty name field.';
  end if;

  insert into public.localisation_import_batches (
    uploaded_by,
    file_name,
    file_type,
    sheet_name,
    entity_type,
    column_mapping,
    total_rows
  )
  values (
    auth.uid(),
    v_file_name,
    v_file_type,
    v_sheet_name,
    v_entity_type,
    v_mapping,
    p_total_rows
  )
  returning * into v_batch;

  return jsonb_build_object(
    'id', v_batch.id,
    'file_name', v_batch.file_name,
    'file_type', v_batch.file_type,
    'sheet_name', v_batch.sheet_name,
    'entity_type', v_batch.entity_type,
    'column_mapping', v_batch.column_mapping,
    'status', v_batch.status,
    'total_rows', v_batch.total_rows,
    'staged_rows', v_batch.staged_rows,
    'valid_rows', v_batch.valid_rows,
    'invalid_rows', v_batch.invalid_rows,
    'duplicate_rows', v_batch.duplicate_rows,
    'applied_rows', v_batch.applied_rows,
    'created_at', v_batch.created_at,
    'validated_at', v_batch.validated_at,
    'completed_at', v_batch.completed_at
  );
end;
$$;

create or replace function public.super_admin_stage_localisation_import_rows(
  p_batch_id uuid,
  p_rows jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_batch public.localisation_import_batches%rowtype;
  v_input_count integer;
  v_distinct_input_count integer;
  v_result_count integer;
  v_row jsonb;
  v_row_number integer;
  v_sheet_name text;
  v_raw_data jsonb;
  v_raw_entry record;
  v_normalized_data jsonb;
begin
  if auth.uid() is null or not public.is_super_admin() then
    raise exception using errcode = '42501', message = 'An active super admin account is required.';
  end if;

  if p_batch_id is null then
    raise exception using errcode = '22023', message = 'Batch id is required.';
  end if;

  if p_rows is null
    or pg_catalog.jsonb_typeof(p_rows) <> 'array'
    or pg_catalog.pg_column_size(p_rows) > 8388608 then
    raise exception using errcode = '22023', message = 'Rows must be a JSON array.';
  end if;

  v_input_count := pg_catalog.jsonb_array_length(p_rows);
  if v_input_count < 1 or v_input_count > 250 then
    raise exception using errcode = '22023', message = 'Each staging request must contain between 1 and 250 rows.';
  end if;

  select *
  into v_batch
  from public.localisation_import_batches
  where id = p_batch_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Localisation import batch not found.';
  end if;

  if v_batch.status in ('applied', 'expired') then
    raise exception using errcode = '55000', message = 'An applied or expired import batch cannot be changed.';
  end if;

  select count(distinct (item.value ->> 'row_number'))
  into v_distinct_input_count
  from pg_catalog.jsonb_array_elements(p_rows) as item
  where pg_catalog.jsonb_typeof(item.value) = 'object'
    and pg_catalog.jsonb_typeof(item.value -> 'row_number') = 'number'
    and item.value ->> 'row_number' ~ '^[0-9]{1,7}$';

  if v_distinct_input_count <> v_input_count then
    raise exception using errcode = '22023', message = 'Every staged row needs a distinct positive integer row_number.';
  end if;

  for v_row in
    select item.value
    from pg_catalog.jsonb_array_elements(p_rows) with ordinality as item(value, position)
    order by item.position
  loop
    if pg_catalog.jsonb_typeof(v_row) <> 'object'
      or v_row - array['row_number', 'sheet_name', 'raw_data', 'normalized_data']::text[] <> '{}'::jsonb then
      raise exception using errcode = '22023', message = 'A staged row has an invalid envelope.';
    end if;

    v_row_number := (v_row ->> 'row_number')::integer;
    if v_row_number < 1 or v_row_number > 1000000 then
      raise exception using errcode = '22023', message = 'Spreadsheet row number is outside the supported range.';
    end if;

    if v_row ? 'sheet_name'
      and v_row -> 'sheet_name' <> 'null'::jsonb
      and pg_catalog.jsonb_typeof(v_row -> 'sheet_name') <> 'string' then
      raise exception using errcode = '22023', message = 'Row sheet_name must be text.';
    end if;

    v_sheet_name := nullif(pg_catalog.btrim(coalesce(v_row ->> 'sheet_name', v_batch.sheet_name, '')), '');
    if v_sheet_name is not null and (
      pg_catalog.char_length(v_sheet_name) > 160
      or pg_catalog.octet_length(v_sheet_name) > 640
      or v_sheet_name ~ '[[:cntrl:]]'
    ) then
      raise exception using errcode = '22023', message = 'Row sheet name is invalid.';
    end if;

    v_raw_data := v_row -> 'raw_data';
    v_normalized_data := v_row -> 'normalized_data';

    if v_raw_data is null
      or pg_catalog.jsonb_typeof(v_raw_data) <> 'object'
      or pg_catalog.pg_column_size(v_raw_data) > 65536
      or v_raw_data - array[
        'name', 'name_fr', 'name_ar', 'name_en', 'category', 'address', 'wilaya',
        'phone', 'opening_status', 'amenities', 'source_url', 'latitude', 'longitude'
      ]::text[] <> '{}'::jsonb then
      raise exception using errcode = '22023', message = 'raw_data must be a bounded JSON object.';
    end if;

    for v_raw_entry in
      select raw.key, raw.value
      from pg_catalog.jsonb_each(v_raw_data) as raw
    loop
      if pg_catalog.jsonb_typeof(v_raw_entry.value) not in ('null', 'string', 'number', 'boolean')
        or (
          pg_catalog.jsonb_typeof(v_raw_entry.value) = 'string'
          and pg_catalog.char_length(v_raw_entry.value #>> '{}') > 4096
        ) then
        raise exception using errcode = '22023', message = 'raw_data contains an unsupported value.';
      end if;
    end loop;

    if v_normalized_data is null
      or pg_catalog.jsonb_typeof(v_normalized_data) <> 'object'
      or pg_catalog.pg_column_size(v_normalized_data) > 16384 then
      raise exception using errcode = '22023', message = 'normalized_data must be a bounded JSON object.';
    end if;

    insert into public.localisation_import_rows (
      batch_id,
      row_number,
      sheet_name,
      raw_data,
      normalized_data
    )
    values (
      p_batch_id,
      v_row_number,
      v_sheet_name,
      v_raw_data,
      v_normalized_data
    )
    on conflict (batch_id, row_number) do update
    set sheet_name = excluded.sheet_name,
        raw_data = excluded.raw_data,
        normalized_data = excluded.normalized_data,
        validation_errors = '[]'::jsonb,
        status = 'pending',
        dedupe_key = null,
        duplicate_kind = null,
        duplicate_of_row_id = null,
        matched_place_id = null,
        validated_at = null,
        applied_at = null;
  end loop;

  select count(*)
  into v_result_count
  from public.localisation_import_rows
  where batch_id = p_batch_id;

  if v_result_count > 10000
    or (v_batch.total_rows > 0 and v_result_count > v_batch.total_rows) then
    raise exception using errcode = '22023', message = 'Staged rows exceed the declared or maximum batch size.';
  end if;

  -- Replacing rows after a completed dry run can alter duplicate ordering, so
  -- only then reset validation state for the whole batch. During an ordinary
  -- 40-chunk upload, existing rows are already pending and need no rewrite.
  if v_batch.status in ('validated', 'invalid') then
    update public.localisation_import_rows
    set validation_errors = '[]'::jsonb,
        status = 'pending',
        dedupe_key = null,
        duplicate_kind = null,
        duplicate_of_row_id = null,
        matched_place_id = null,
        validated_at = null,
        applied_at = null
    where batch_id = p_batch_id;
  end if;

  update public.localisation_import_batches
  set status = 'staging',
      total_rows = case when total_rows = 0 then v_result_count else total_rows end,
      staged_rows = v_result_count,
      valid_rows = 0,
      invalid_rows = 0,
      duplicate_rows = 0,
      applied_rows = 0,
      inserted_rows = 0,
      updated_rows = 0,
      skipped_rows = 0,
      validated_at = null,
      completed_at = null,
      staging_purged_at = null
  where id = p_batch_id
  returning * into v_batch;

  return jsonb_build_object(
    'batch_id', v_batch.id,
    'status', v_batch.status,
    'staged_rows', v_batch.staged_rows,
    'total_rows', v_batch.total_rows
  );
end;
$$;

create or replace function public.super_admin_validate_localisation_import_batch(
  p_batch_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_batch public.localisation_import_batches%rowtype;
  v_staged_count integer;
  v_row public.localisation_import_rows%rowtype;
  v_data jsonb;
  v_errors jsonb;
  v_field text;
  v_text_value text;
  v_max_length integer;
  v_entity_type text;
  v_name text;
  v_name_fr text;
  v_name_ar text;
  v_name_en text;
  v_category text;
  v_address text;
  v_wilaya text;
  v_phone text;
  v_opening_status text;
  v_source_url text;
  v_amenities text[];
  v_amenity jsonb;
  v_amenity_text text;
  v_latitude_text text;
  v_longitude_text text;
  v_latitude numeric;
  v_longitude numeric;
  v_dedupe_key text;
  v_duplicate_row_id uuid;
  v_matched_place_id uuid;
  v_valid_rows integer;
  v_invalid_rows integer;
  v_duplicate_rows integer;
  v_batch_status text;
  v_validated_at timestamptz := pg_catalog.now();
begin
  if auth.uid() is null or not public.is_super_admin() then
    raise exception using errcode = '42501', message = 'An active super admin account is required.';
  end if;

  if p_batch_id is null then
    raise exception using errcode = '22023', message = 'Batch id is required.';
  end if;

  select *
  into v_batch
  from public.localisation_import_batches
  where id = p_batch_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Localisation import batch not found.';
  end if;

  if v_batch.status in ('applied', 'expired') then
    raise exception using errcode = '55000', message = 'An applied or expired import batch cannot be revalidated.';
  end if;

  select count(*)
  into v_staged_count
  from public.localisation_import_rows
  where batch_id = p_batch_id;

  if v_staged_count < 1 then
    raise exception using errcode = '22023', message = 'The import batch has no staged rows.';
  end if;

  if v_staged_count > 10000
    or (v_batch.total_rows > 0 and v_staged_count <> v_batch.total_rows) then
    raise exception using errcode = '22023', message = 'All declared rows must be staged before validation.';
  end if;

  update public.localisation_import_rows
  set validation_errors = '[]'::jsonb,
      status = 'pending',
      dedupe_key = null,
      duplicate_kind = null,
      duplicate_of_row_id = null,
      matched_place_id = null,
      validated_at = null,
      applied_at = null
  where batch_id = p_batch_id;

  for v_row in
    select staged.*
    from public.localisation_import_rows as staged
    where staged.batch_id = p_batch_id
    order by staged.row_number, staged.id
    for update
  loop
    v_data := v_row.normalized_data;
    v_errors := '[]'::jsonb;
    v_entity_type := null;
    v_name := null;
    v_name_fr := null;
    v_name_ar := null;
    v_name_en := null;
    v_category := null;
    v_address := null;
    v_wilaya := null;
    v_phone := null;
    v_opening_status := null;
    v_source_url := null;
    v_amenities := '{}'::text[];
    v_latitude_text := null;
    v_longitude_text := null;
    v_latitude := null;
    v_longitude := null;
    v_dedupe_key := null;
    v_duplicate_row_id := null;
    v_matched_place_id := null;

    if v_data - array[
      'entity_type',
      'name',
      'name_fr',
      'name_ar',
      'name_en',
      'category',
      'address',
      'wilaya',
      'phone',
      'opening_status',
      'amenities',
      'source_url',
      'latitude',
      'longitude'
    ]::text[] <> '{}'::jsonb then
      v_errors := v_errors || jsonb_build_array(jsonb_build_object(
        'code', 'unknown_field',
        'field', 'normalized_data',
        'message', 'Normalized data contains a field that is not accepted.'
      ));
    end if;

    if v_data ? 'entity_type'
      and v_data -> 'entity_type' <> 'null'::jsonb
      and pg_catalog.jsonb_typeof(v_data -> 'entity_type') <> 'string' then
      v_errors := v_errors || jsonb_build_array(jsonb_build_object(
        'code', 'invalid_type',
        'field', 'entity_type',
        'message', 'Entity type must be text.'
      ));
    else
      v_entity_type := pg_catalog.lower(nullif(pg_catalog.btrim(coalesce(v_data ->> 'entity_type', v_batch.entity_type)), ''));
      if v_entity_type is null
        or v_entity_type not in ('establishment', 'wilaya', 'moughataa', 'commune', 'locality') then
        v_errors := v_errors || jsonb_build_array(jsonb_build_object(
          'code', 'unsupported_value',
          'field', 'entity_type',
          'message', 'Entity type must be establishment, wilaya, moughataa, commune, or locality.'
        ));
      elsif v_entity_type <> v_batch.entity_type then
        v_errors := v_errors || jsonb_build_array(jsonb_build_object(
          'code', 'batch_mismatch',
          'field', 'entity_type',
          'message', 'Row entity type must match the import batch.'
        ));
      end if;
    end if;

    -- Optional empty text cells become null. Proper names are edge-trimmed
    -- only: mixed Arabic/French text, casing, accents, and word order remain exact.
    foreach v_field in array array[
      'name', 'name_fr', 'name_ar', 'name_en', 'category', 'address',
      'wilaya', 'phone', 'opening_status', 'source_url'
    ]::text[]
    loop
      if v_data ? v_field and v_data -> v_field <> 'null'::jsonb then
        if pg_catalog.jsonb_typeof(v_data -> v_field) <> 'string' then
          v_errors := v_errors || jsonb_build_array(jsonb_build_object(
            'code', 'invalid_type',
            'field', v_field,
            'message', 'Mapped text fields must contain text values.'
          ));
        else
          v_text_value := nullif(pg_catalog.btrim(v_data ->> v_field), '');
          v_max_length := case v_field
            when 'name' then 240
            when 'name_fr' then 240
            when 'name_ar' then 240
            when 'name_en' then 240
            when 'category' then 160
            when 'address' then 500
            when 'wilaya' then 160
            when 'phone' then 64
            when 'opening_status' then 160
            when 'source_url' then 4096
            else 0
          end;

          if v_text_value is not null and (
            pg_catalog.char_length(v_text_value) > v_max_length
            or pg_catalog.octet_length(v_text_value) > v_max_length * 4
          ) then
            v_errors := v_errors || jsonb_build_array(jsonb_build_object(
              'code', 'too_long',
              'field', v_field,
              'message', 'Mapped text exceeds the supported length.'
            ));
          end if;

          if v_text_value is not null and v_text_value ~ '[[:cntrl:]]' then
            v_errors := v_errors || jsonb_build_array(jsonb_build_object(
              'code', 'control_character',
              'field', v_field,
              'message', 'Mapped text contains a control character.'
            ));
          end if;

          if v_field in ('name', 'name_fr', 'name_ar', 'name_en', 'category', 'address', 'wilaya')
            and v_text_value ~ '^[=+@]' then
            v_errors := v_errors || jsonb_build_array(jsonb_build_object(
              'code', 'formula_like_value',
              'field', v_field,
              'message', 'Formula-like mapped text is not accepted.'
            ));
          end if;
        end if;
      end if;
    end loop;

    v_name := nullif(pg_catalog.btrim(coalesce(v_data ->> 'name', '')), '');
    v_name_fr := nullif(pg_catalog.btrim(coalesce(v_data ->> 'name_fr', '')), '');
    v_name_ar := nullif(pg_catalog.btrim(coalesce(v_data ->> 'name_ar', '')), '');
    v_name_en := nullif(pg_catalog.btrim(coalesce(v_data ->> 'name_en', '')), '');
    v_category := nullif(pg_catalog.btrim(coalesce(v_data ->> 'category', '')), '');
    v_address := nullif(pg_catalog.btrim(coalesce(v_data ->> 'address', '')), '');
    v_wilaya := nullif(pg_catalog.btrim(coalesce(v_data ->> 'wilaya', '')), '');
    v_phone := nullif(pg_catalog.btrim(coalesce(v_data ->> 'phone', '')), '');
    v_opening_status := nullif(pg_catalog.btrim(coalesce(v_data ->> 'opening_status', '')), '');
    v_source_url := nullif(pg_catalog.btrim(coalesce(v_data ->> 'source_url', '')), '');

    if v_name is null then
      v_errors := v_errors || jsonb_build_array(jsonb_build_object(
        'code', 'required',
        'field', 'name',
        'message', 'A mapped proper name is required.'
      ));
    end if;

    if v_phone is not null and v_phone !~ '^[0-9+(). /-]+$' then
      v_errors := v_errors || jsonb_build_array(jsonb_build_object(
        'code', 'invalid_phone',
        'field', 'phone',
        'message', 'Phone contains unsupported characters.'
      ));
    end if;

    if v_source_url is not null and v_source_url !~* '^https?://[^/[:space:]]+[^[:space:]]*$' then
      v_errors := v_errors || jsonb_build_array(jsonb_build_object(
        'code', 'invalid_url',
        'field', 'source_url',
        'message', 'Source URL must use http or https.'
      ));
    end if;

    if v_data ? 'amenities' and v_data -> 'amenities' <> 'null'::jsonb then
      if pg_catalog.jsonb_typeof(v_data -> 'amenities') = 'string' then
        v_amenity_text := nullif(pg_catalog.btrim(v_data ->> 'amenities'), '');
        if v_amenity_text is not null then
          v_amenities := pg_catalog.array_append(v_amenities, v_amenity_text);
        end if;
      elsif pg_catalog.jsonb_typeof(v_data -> 'amenities') = 'array' then
        if pg_catalog.jsonb_array_length(v_data -> 'amenities') > 32 then
          v_errors := v_errors || jsonb_build_array(jsonb_build_object(
            'code', 'too_many_items',
            'field', 'amenities',
            'message', 'Amenities cannot contain more than 32 items.'
          ));
        else
          for v_amenity in
            select item.value
            from pg_catalog.jsonb_array_elements(v_data -> 'amenities') as item
          loop
            if pg_catalog.jsonb_typeof(v_amenity) <> 'string' then
              v_errors := v_errors || jsonb_build_array(jsonb_build_object(
                'code', 'invalid_type',
                'field', 'amenities',
                'message', 'Every amenity must be text.'
              ));
            else
              v_amenity_text := nullif(pg_catalog.btrim(v_amenity #>> '{}'), '');
              if v_amenity_text is not null then
                v_amenities := pg_catalog.array_append(v_amenities, v_amenity_text);
              end if;
            end if;
          end loop;
        end if;
      else
        v_errors := v_errors || jsonb_build_array(jsonb_build_object(
          'code', 'invalid_type',
          'field', 'amenities',
          'message', 'Amenities must be text or an array of text.'
        ));
      end if;
    end if;

    foreach v_amenity_text in array v_amenities
    loop
      if pg_catalog.char_length(v_amenity_text) > 160
        or pg_catalog.octet_length(v_amenity_text) > 640
        or v_amenity_text ~ '[[:cntrl:]]'
        or v_amenity_text ~ '^[=+@]' then
        v_errors := v_errors || jsonb_build_array(jsonb_build_object(
          'code', 'invalid_item',
          'field', 'amenities',
          'message', 'An amenity is too long or contains unsafe text.'
        ));
      end if;
    end loop;

    if pg_catalog.pg_column_size(v_amenities) > 8192 then
      v_errors := v_errors || jsonb_build_array(jsonb_build_object(
        'code', 'amenities_too_large',
        'field', 'amenities',
        'message', 'Amenities exceed the aggregate storage limit.'
      ));
    end if;

    if v_data ? 'latitude' and v_data -> 'latitude' <> 'null'::jsonb then
      if pg_catalog.jsonb_typeof(v_data -> 'latitude') not in ('number', 'string') then
        v_errors := v_errors || jsonb_build_array(jsonb_build_object(
          'code', 'invalid_type', 'field', 'latitude', 'message', 'Latitude must be numeric.'
        ));
      else
        v_latitude_text := nullif(pg_catalog.btrim(v_data ->> 'latitude'), '');
        if v_latitude_text is not null then
          if pg_catalog.char_length(v_latitude_text) > 32
            or v_latitude_text !~ '^-?[0-9]+([.][0-9]+)?$' then
            v_errors := v_errors || jsonb_build_array(jsonb_build_object(
              'code', 'invalid_coordinate', 'field', 'latitude', 'message', 'Latitude must be a decimal number.'
            ));
          else
            v_latitude := v_latitude_text::numeric;
            if v_latitude < -90 or v_latitude > 90 then
              v_errors := v_errors || jsonb_build_array(jsonb_build_object(
                'code', 'out_of_range', 'field', 'latitude', 'message', 'Latitude must be between -90 and 90.'
              ));
            end if;
          end if;
        end if;
      end if;
    end if;

    if v_data ? 'longitude' and v_data -> 'longitude' <> 'null'::jsonb then
      if pg_catalog.jsonb_typeof(v_data -> 'longitude') not in ('number', 'string') then
        v_errors := v_errors || jsonb_build_array(jsonb_build_object(
          'code', 'invalid_type', 'field', 'longitude', 'message', 'Longitude must be numeric.'
        ));
      else
        v_longitude_text := nullif(pg_catalog.btrim(v_data ->> 'longitude'), '');
        if v_longitude_text is not null then
          if pg_catalog.char_length(v_longitude_text) > 32
            or v_longitude_text !~ '^-?[0-9]+([.][0-9]+)?$' then
            v_errors := v_errors || jsonb_build_array(jsonb_build_object(
              'code', 'invalid_coordinate', 'field', 'longitude', 'message', 'Longitude must be a decimal number.'
            ));
          else
            v_longitude := v_longitude_text::numeric;
            if v_longitude < -180 or v_longitude > 180 then
              v_errors := v_errors || jsonb_build_array(jsonb_build_object(
                'code', 'out_of_range', 'field', 'longitude', 'message', 'Longitude must be between -180 and 180.'
              ));
            end if;
          end if;
        end if;
      end if;
    end if;

    if (v_latitude is null) <> (v_longitude is null) then
      v_errors := v_errors || jsonb_build_array(jsonb_build_object(
        'code', 'coordinate_pair_required',
        'field', 'coordinates',
        'message', 'Latitude and longitude must be supplied together.'
      ));
    end if;

    -- The final numeric columns store six decimal places. Canonicalising here
    -- keeps the dedupe key identical to the values that will actually be stored.
    if v_latitude is not null then
      v_latitude := pg_catalog.round(v_latitude, 6);
    end if;
    if v_longitude is not null then
      v_longitude := pg_catalog.round(v_longitude, 6);
    end if;

    if pg_catalog.jsonb_array_length(v_errors) > 0 then
      update public.localisation_import_rows
      set validation_errors = v_errors,
          status = 'invalid',
          validated_at = v_validated_at
      where id = v_row.id;
      continue;
    end if;

    -- Keep explicit nulls so the typed RPC response has a stable shape.
    v_data := jsonb_build_object(
      'entity_type', v_entity_type,
      'name', v_name,
      'name_fr', v_name_fr,
      'name_ar', v_name_ar,
      'name_en', v_name_en,
      'category', v_category,
      'address', v_address,
      'wilaya', v_wilaya,
      'phone', v_phone,
      'opening_status', v_opening_status,
      'amenities', to_jsonb(v_amenities),
      'source_url', v_source_url,
      'latitude', v_latitude,
      'longitude', v_longitude
    );

    if pg_catalog.pg_column_size(v_data) > 16384 then
      update public.localisation_import_rows
      set validation_errors = jsonb_build_array(jsonb_build_object(
            'code', 'normalized_data_too_large',
            'field', null,
            'message', 'The normalized row exceeds the supported storage limit.'
          )),
          status = 'invalid',
          validated_at = v_validated_at
      where id = v_row.id;
      continue;
    end if;

    v_dedupe_key := pg_catalog.md5(jsonb_build_array(
      v_entity_type,
      pg_catalog.lower(pg_catalog.regexp_replace(v_name, '[[:space:]]+', ' ', 'g')),
      pg_catalog.lower(pg_catalog.regexp_replace(coalesce(v_wilaya, ''), '[[:space:]]+', ' ', 'g')),
      pg_catalog.lower(pg_catalog.regexp_replace(coalesce(v_address, ''), '[[:space:]]+', ' ', 'g')),
      coalesce(v_latitude::text, ''),
      coalesce(v_longitude::text, '')
    )::text);

    select prior.id
    into v_duplicate_row_id
    from public.localisation_import_rows as prior
    where prior.batch_id = p_batch_id
      and prior.dedupe_key = v_dedupe_key
      and prior.row_number < v_row.row_number
      and prior.status in ('valid', 'duplicate')
    order by prior.row_number, prior.id
    limit 1;

    if v_duplicate_row_id is not null then
      update public.localisation_import_rows
      set normalized_data = v_data,
          validation_errors = '[]'::jsonb,
          status = 'duplicate',
          dedupe_key = v_dedupe_key,
          duplicate_kind = 'batch',
          duplicate_of_row_id = v_duplicate_row_id,
          matched_place_id = null,
          validated_at = v_validated_at
      where id = v_row.id;
      continue;
    end if;

    select place.id
    into v_matched_place_id
    from public.localisation_places as place
    where place.dedupe_key = v_dedupe_key;

    update public.localisation_import_rows
    set normalized_data = v_data,
        validation_errors = '[]'::jsonb,
        status = case when v_matched_place_id is null then 'valid' else 'duplicate' end,
        dedupe_key = v_dedupe_key,
        duplicate_kind = case when v_matched_place_id is null then null else 'final' end,
        duplicate_of_row_id = null,
        matched_place_id = v_matched_place_id,
        validated_at = v_validated_at
    where id = v_row.id;
  end loop;

  select
    count(*) filter (where status <> 'invalid'),
    count(*) filter (where status = 'invalid'),
    count(*) filter (where status = 'duplicate')
  into v_valid_rows, v_invalid_rows, v_duplicate_rows
  from public.localisation_import_rows
  where batch_id = p_batch_id;

  v_batch_status := case when v_invalid_rows = 0 then 'validated' else 'invalid' end;

  update public.localisation_import_batches
  set status = v_batch_status,
      total_rows = v_staged_count,
      staged_rows = v_staged_count,
      valid_rows = v_valid_rows,
      invalid_rows = v_invalid_rows,
      duplicate_rows = v_duplicate_rows,
      validated_at = v_validated_at,
      completed_at = null
  where id = p_batch_id
  returning * into v_batch;

  return jsonb_build_object(
    'batch_id', v_batch.id,
    'status', v_batch.status,
    'total_rows', v_batch.total_rows,
    'valid_rows', v_batch.valid_rows,
    'invalid_rows', v_batch.invalid_rows,
    'duplicate_rows', v_batch.duplicate_rows,
    'validated_at', v_batch.validated_at
  );
end;
$$;

create or replace function public.super_admin_apply_localisation_import_batch(
  p_batch_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_batch public.localisation_import_batches%rowtype;
  v_row public.localisation_import_rows%rowtype;
  v_data jsonb;
  v_place_id uuid;
  v_updated_place_id uuid;
  v_name_fr text;
  v_name_ar text;
  v_name_en text;
  v_category text;
  v_address text;
  v_wilaya text;
  v_phone text;
  v_opening_status text;
  v_amenities text[];
  v_source_url text;
  v_latitude numeric;
  v_longitude numeric;
  v_inserted_rows integer := 0;
  v_updated_rows integer := 0;
  v_skipped_rows integer := 0;
  v_applied_at timestamptz := pg_catalog.now();
  v_processable_count integer;
begin
  if auth.uid() is null or not public.is_super_admin() then
    raise exception using errcode = '42501', message = 'An active super admin account is required.';
  end if;

  if p_batch_id is null then
    raise exception using errcode = '22023', message = 'Batch id is required.';
  end if;

  select *
  into v_batch
  from public.localisation_import_batches
  where id = p_batch_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Localisation import batch not found.';
  end if;

  -- A completed batch is an idempotent success. Its recorded counts are
  -- returned without touching final rows or timestamps again.
  if v_batch.status = 'applied' then
    return jsonb_build_object(
      'batch_id', v_batch.id,
      'status', v_batch.status,
      'inserted_rows', v_batch.inserted_rows,
      'updated_rows', v_batch.updated_rows,
      'skipped_rows', v_batch.skipped_rows,
      'completed_at', v_batch.completed_at,
      'already_applied', true
    );
  end if;

  if v_batch.status <> 'validated' or v_batch.invalid_rows <> 0 then
    raise exception using errcode = '55000', message = 'The batch must pass validation with no invalid rows before apply.';
  end if;

  select count(*)
  into v_processable_count
  from public.localisation_import_rows
  where batch_id = p_batch_id
    and status in ('valid', 'duplicate');

  if v_processable_count <> v_batch.total_rows
    or exists (
      select 1
      from public.localisation_import_rows
      where batch_id = p_batch_id
        and (
          status not in ('valid', 'duplicate')
          or dedupe_key is null
          or pg_catalog.jsonb_typeof(normalized_data) <> 'object'
        )
    ) then
    raise exception using errcode = '55000', message = 'Staging state changed after validation; validate the batch again.';
  end if;

  for v_row in
    select staged.*
    from public.localisation_import_rows as staged
    where staged.batch_id = p_batch_id
    -- A global key order prevents two concurrent batches that contain the same
    -- keys in opposite spreadsheet order from deadlocking on advisory locks.
    order by staged.dedupe_key, staged.row_number, staged.id
    for update
  loop
    v_data := v_row.normalized_data;
    v_place_id := null;
    v_updated_place_id := null;
    v_name_fr := nullif(v_data ->> 'name_fr', '');
    v_name_ar := nullif(v_data ->> 'name_ar', '');
    v_name_en := nullif(v_data ->> 'name_en', '');
    v_category := nullif(v_data ->> 'category', '');
    v_address := nullif(v_data ->> 'address', '');
    v_wilaya := nullif(v_data ->> 'wilaya', '');
    v_phone := nullif(v_data ->> 'phone', '');
    v_opening_status := nullif(v_data ->> 'opening_status', '');
    v_source_url := nullif(v_data ->> 'source_url', '');
    v_latitude := case when v_data ? 'latitude' then (v_data ->> 'latitude')::numeric else null end;
    v_longitude := case when v_data ? 'longitude' then (v_data ->> 'longitude')::numeric else null end;

    select coalesce(pg_catalog.array_agg(item.value order by item.position), '{}'::text[])
    into v_amenities
    from pg_catalog.jsonb_array_elements_text(coalesce(v_data -> 'amenities', '[]'::jsonb))
      with ordinality as item(value, position);

    -- Serialise identical upserts while retaining the unique constraint as the
    -- final guard. The key comes only from server validation, never raw SQL.
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_row.dedupe_key, 0));

    insert into public.localisation_places (
      entity_type,
      name,
      name_fr,
      name_ar,
      name_en,
      category,
      address,
      wilaya,
      phone,
      opening_status,
      amenities,
      source_url,
      latitude,
      longitude,
      dedupe_key,
      source_batch_id,
      source_file_name,
      source_sheet_name,
      source_row_number,
      last_source_batch_id,
      last_source_file_name,
      last_source_sheet_name,
      last_source_row_number,
      created_by
    )
    values (
      v_data ->> 'entity_type',
      v_data ->> 'name',
      v_name_fr,
      v_name_ar,
      v_name_en,
      v_category,
      v_address,
      v_wilaya,
      v_phone,
      v_opening_status,
      v_amenities,
      v_source_url,
      v_latitude,
      v_longitude,
      v_row.dedupe_key,
      v_batch.id,
      v_batch.file_name,
      coalesce(v_row.sheet_name, v_batch.sheet_name),
      v_row.row_number,
      v_batch.id,
      v_batch.file_name,
      coalesce(v_row.sheet_name, v_batch.sheet_name),
      v_row.row_number,
      auth.uid()
    )
    on conflict (dedupe_key) do nothing
    returning id into v_place_id;

    if v_place_id is not null then
      v_inserted_rows := v_inserted_rows + 1;
    else
      select place.id
      into v_place_id
      from public.localisation_places as place
      where place.dedupe_key = v_row.dedupe_key
      for update;

      -- Non-destructive upsert: an import can fill missing optional data, but
      -- it never overwrites an exact proper name or an existing curated value.
      update public.localisation_places as place
      set name_fr = coalesce(place.name_fr, v_name_fr),
          name_ar = coalesce(place.name_ar, v_name_ar),
          name_en = coalesce(place.name_en, v_name_en),
          category = coalesce(place.category, v_category),
          address = coalesce(place.address, v_address),
          wilaya = coalesce(place.wilaya, v_wilaya),
          phone = coalesce(place.phone, v_phone),
          opening_status = coalesce(place.opening_status, v_opening_status),
          amenities = case
            when pg_catalog.cardinality(place.amenities) = 0 and pg_catalog.cardinality(v_amenities) > 0
              then v_amenities
            else place.amenities
          end,
          source_url = coalesce(place.source_url, v_source_url),
          latitude = case when place.latitude is null then v_latitude else place.latitude end,
          longitude = case when place.longitude is null then v_longitude else place.longitude end,
          last_source_batch_id = v_batch.id,
          last_source_file_name = v_batch.file_name,
          last_source_sheet_name = coalesce(v_row.sheet_name, v_batch.sheet_name),
          last_source_row_number = v_row.row_number,
          updated_at = v_applied_at
      where place.id = v_place_id
        and (
          (place.name_fr is null and v_name_fr is not null)
          or (place.name_ar is null and v_name_ar is not null)
          or (place.name_en is null and v_name_en is not null)
          or (place.category is null and v_category is not null)
          or (place.address is null and v_address is not null)
          or (place.wilaya is null and v_wilaya is not null)
          or (place.phone is null and v_phone is not null)
          or (place.opening_status is null and v_opening_status is not null)
          or (pg_catalog.cardinality(place.amenities) = 0 and pg_catalog.cardinality(v_amenities) > 0)
          or (place.source_url is null and v_source_url is not null)
          or (place.latitude is null and v_latitude is not null)
        )
      returning place.id into v_updated_place_id;

      if v_updated_place_id is not null then
        v_updated_rows := v_updated_rows + 1;
      else
        v_skipped_rows := v_skipped_rows + 1;
      end if;
    end if;

    update public.localisation_import_rows
    set status = 'applied',
        matched_place_id = v_place_id,
        applied_at = v_applied_at
    where id = v_row.id;
  end loop;

  update public.localisation_import_batches
  set status = 'applied',
      applied_rows = v_inserted_rows + v_updated_rows,
      inserted_rows = v_inserted_rows,
      updated_rows = v_updated_rows,
      skipped_rows = v_skipped_rows,
      completed_at = v_applied_at
  where id = p_batch_id
  returning * into v_batch;

  return jsonb_build_object(
    'batch_id', v_batch.id,
    'status', v_batch.status,
    'inserted_rows', v_batch.inserted_rows,
    'updated_rows', v_batch.updated_rows,
    'skipped_rows', v_batch.skipped_rows,
    'completed_at', v_batch.completed_at,
    'already_applied', false
  );
end;
$$;

create or replace function public.super_admin_get_localisation_import_batches(
  p_page integer default 1,
  p_page_size integer default 20
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_page integer := coalesce(p_page, 1);
  v_page_size integer := coalesce(p_page_size, 20);
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

  if v_page_size not in (10, 20, 50, 100) then
    raise exception using errcode = '22023', message = 'Page size must be 10, 20, 50, or 100.';
  end if;

  v_offset := (v_page::bigint - 1) * v_page_size;

  select count(*)
  into v_total_count
  from public.localisation_import_batches;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', batch.id,
        'file_name', batch.file_name,
        'file_type', batch.file_type,
        'sheet_name', batch.sheet_name,
        'entity_type', batch.entity_type,
        'column_mapping', batch.column_mapping,
        'status', batch.status,
        'total_rows', batch.total_rows,
        'staged_rows', batch.staged_rows,
        'valid_rows', batch.valid_rows,
        'invalid_rows', batch.invalid_rows,
        'duplicate_rows', batch.duplicate_rows,
        'applied_rows', batch.applied_rows,
        'created_at', batch.created_at,
        'validated_at', batch.validated_at,
        'completed_at', batch.completed_at
      )
      order by batch.created_at desc, batch.id desc
    ),
    '[]'::jsonb
  )
  into v_items
  from (
    select history.*
    from public.localisation_import_batches as history
    order by history.created_at desc, history.id desc
    limit v_page_size
    offset v_offset
  ) as batch;

  return jsonb_build_object(
    'items', v_items,
    'page', v_page,
    'page_size', v_page_size,
    'total_count', v_total_count
  );
end;
$$;

create or replace function public.super_admin_get_localisation_import_batch_details(
  p_batch_id uuid,
  p_page integer default 1,
  p_page_size integer default 50
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_batch public.localisation_import_batches%rowtype;
  v_page integer := coalesce(p_page, 1);
  v_page_size integer := coalesce(p_page_size, 50);
  v_offset bigint;
  v_total_count bigint;
  v_items jsonb;
  v_batch_json jsonb;
begin
  if auth.uid() is null or not public.is_super_admin() then
    raise exception using errcode = '42501', message = 'An active super admin account is required.';
  end if;

  if p_batch_id is null then
    raise exception using errcode = '22023', message = 'Batch id is required.';
  end if;

  if v_page < 1 or v_page > 100000 then
    raise exception using errcode = '22023', message = 'Page is outside the supported range.';
  end if;

  if v_page_size not in (10, 20, 50, 100) then
    raise exception using errcode = '22023', message = 'Page size must be 10, 20, 50, or 100.';
  end if;

  select *
  into v_batch
  from public.localisation_import_batches
  where id = p_batch_id;

  if not found then
    raise exception using errcode = 'P0002', message = 'Localisation import batch not found.';
  end if;

  v_offset := (v_page::bigint - 1) * v_page_size;

  select count(*)
  into v_total_count
  from public.localisation_import_rows
  where batch_id = p_batch_id;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', staged.id,
        'row_number', staged.row_number,
        'sheet_name', staged.sheet_name,
        'status', staged.status,
        'validation_errors', staged.validation_errors,
        'duplicate_kind', staged.duplicate_kind,
        'matched_place_id', staged.matched_place_id,
        'normalized_data', staged.normalized_data,
        'raw_data', staged.raw_data,
        'created_at', staged.created_at,
        'validated_at', staged.validated_at
      )
      order by staged.row_number, staged.id
    ),
    '[]'::jsonb
  )
  into v_items
  from (
    select row_data.*
    from public.localisation_import_rows as row_data
    where row_data.batch_id = p_batch_id
    order by row_data.row_number, row_data.id
    limit v_page_size
    offset v_offset
  ) as staged;

  v_batch_json := jsonb_build_object(
    'id', v_batch.id,
    'file_name', v_batch.file_name,
    'file_type', v_batch.file_type,
    'sheet_name', v_batch.sheet_name,
    'entity_type', v_batch.entity_type,
    'column_mapping', v_batch.column_mapping,
    'status', v_batch.status,
    'total_rows', v_batch.total_rows,
    'staged_rows', v_batch.staged_rows,
    'valid_rows', v_batch.valid_rows,
    'invalid_rows', v_batch.invalid_rows,
    'duplicate_rows', v_batch.duplicate_rows,
    'applied_rows', v_batch.applied_rows,
    'created_at', v_batch.created_at,
    'validated_at', v_batch.validated_at,
    'completed_at', v_batch.completed_at
  );

  return jsonb_build_object(
    'batch', v_batch_json,
    'items', v_items,
    'page', v_page,
    'page_size', v_page_size,
    'total_count', v_total_count
  );
end;
$$;

-- Explicit retention control for staging only. Final localisation records are
-- never deleted. Row locks make currently active import calls ineligible.
create or replace function public.super_admin_purge_localisation_import_rows(
  p_older_than_days integer default 30
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cutoff timestamptz;
  v_batch_ids uuid[];
  v_purged_rows integer := 0;
  v_affected_batches integer := 0;
begin
  if auth.uid() is null or not public.is_super_admin() then
    raise exception using errcode = '42501', message = 'An active super admin account is required.';
  end if;

  if p_older_than_days is null or p_older_than_days < 1 or p_older_than_days > 365 then
    raise exception using errcode = '22023', message = 'Retention age must be between 1 and 365 days.';
  end if;

  v_cutoff := pg_catalog.now() - pg_catalog.make_interval(days => p_older_than_days);

  select coalesce(pg_catalog.array_agg(eligible.id), '{}'::uuid[])
  into v_batch_ids
  from (
    select batch.id
    from public.localisation_import_batches as batch
    where batch.status in ('created', 'staging', 'validated', 'invalid', 'applied')
      and coalesce(batch.completed_at, batch.validated_at, batch.created_at) < v_cutoff
      and batch.staging_purged_at is null
    order by batch.id
    for update of batch skip locked
  ) as eligible;

  v_affected_batches := pg_catalog.cardinality(v_batch_ids);

  delete from public.localisation_import_rows
  where batch_id = any(v_batch_ids);
  get diagnostics v_purged_rows = row_count;

  update public.localisation_import_batches
  set status = case when status = 'applied' then status else 'expired' end,
      staging_purged_at = pg_catalog.now()
  where id = any(v_batch_ids);

  return jsonb_build_object(
    'purged_rows', v_purged_rows,
    'affected_batches', v_affected_batches,
    'cutoff', v_cutoff
  );
end;
$$;

revoke all on function public.super_admin_create_localisation_import_batch(
  text, text, text, text, jsonb, integer
) from public, anon, authenticated;
grant execute on function public.super_admin_create_localisation_import_batch(
  text, text, text, text, jsonb, integer
) to authenticated;

revoke all on function public.super_admin_stage_localisation_import_rows(uuid, jsonb)
  from public, anon, authenticated;
grant execute on function public.super_admin_stage_localisation_import_rows(uuid, jsonb)
  to authenticated;

revoke all on function public.super_admin_validate_localisation_import_batch(uuid)
  from public, anon, authenticated;
grant execute on function public.super_admin_validate_localisation_import_batch(uuid)
  to authenticated;

revoke all on function public.super_admin_apply_localisation_import_batch(uuid)
  from public, anon, authenticated;
grant execute on function public.super_admin_apply_localisation_import_batch(uuid)
  to authenticated;

revoke all on function public.super_admin_get_localisation_import_batches(integer, integer)
  from public, anon, authenticated;
grant execute on function public.super_admin_get_localisation_import_batches(integer, integer)
  to authenticated;

revoke all on function public.super_admin_get_localisation_import_batch_details(uuid, integer, integer)
  from public, anon, authenticated;
grant execute on function public.super_admin_get_localisation_import_batch_details(uuid, integer, integer)
  to authenticated;

revoke all on function public.super_admin_purge_localisation_import_rows(integer)
  from public, anon, authenticated;
grant execute on function public.super_admin_purge_localisation_import_rows(integer)
  to authenticated;
