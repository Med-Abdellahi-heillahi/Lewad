-- Lewad profile hardening: public avatars with owner-only writes and
-- normalized, unique phone numbers for active profiles.
--
-- Before applying on an existing project, run the preflight query below in the
-- Supabase SQL Editor. Resolve every returned duplicate before applying this
-- migration; it deliberately aborts rather than changing another user's data.
--
-- with normalized as (
--   select id, phone,
--     case
--       when length(regexp_replace(btrim(coalesce(phone, '')), '[^0-9]', '', 'g')) = 11
--         and left(regexp_replace(btrim(coalesce(phone, '')), '[^0-9]', '', 'g'), 3) = '222'
--       then substr(regexp_replace(btrim(coalesce(phone, '')), '[^0-9]', '', 'g'), 4)
--       else nullif(regexp_replace(btrim(coalesce(phone, '')), '[^0-9]', '', 'g'), '')
--     end as phone_normalized
--   from public.profiles
--   where status <> 'deleted'
-- )
-- select phone_normalized, array_agg(id) as profile_ids
-- from normalized
-- where phone_normalized is not null
-- group by phone_normalized
-- having count(*) > 1;

alter table public.profiles
  add column if not exists phone_normalized text;

create or replace function public.normalize_profile_phone(p_phone text)
returns text
language sql
immutable
set search_path = ''
as $$
  with phone_digits as (
    select pg_catalog.regexp_replace(pg_catalog.btrim(p_phone), '[^0-9]', '', 'g') as value
  )
  select case
    when value = '' then null
    when pg_catalog.length(value) = 11 and pg_catalog.left(value, 3) = '222' then pg_catalog.substr(value, 4)
    else value
  end
  from phone_digits;
$$;

-- Empty input is null. Existing data is normalized before the constraint is
-- created, but no duplicate value is silently reassigned or discarded.
update public.profiles
set
  phone = nullif(pg_catalog.btrim(phone), ''),
  phone_normalized = public.normalize_profile_phone(phone)
where phone is distinct from nullif(pg_catalog.btrim(phone), '')
  or phone_normalized is distinct from public.normalize_profile_phone(phone);

do $$
declare
  duplicate_phone text;
begin
  select profile.phone_normalized
  into duplicate_phone
  from public.profiles as profile
  where profile.phone_normalized is not null
    and profile.status <> 'deleted'
  group by profile.phone_normalized
  having count(*) > 1
  limit 1;

  if duplicate_phone is not null then
    raise exception using
      message = format('Duplicate active profile phone detected for normalized value %s. Resolve duplicates before applying this migration.', duplicate_phone),
      errcode = '23505';
  end if;
end;
$$;

create or replace function public.set_profile_phone_normalized()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.phone := nullif(pg_catalog.btrim(new.phone), '');
  new.phone_normalized := public.normalize_profile_phone(new.phone);
  return new;
end;
$$;

drop trigger if exists profiles_set_phone_normalized on public.profiles;
create trigger profiles_set_phone_normalized
before insert or update of phone on public.profiles
for each row execute function public.set_profile_phone_normalized();

create unique index if not exists profiles_active_phone_normalized_uidx
  on public.profiles (phone_normalized)
  where phone_normalized is not null and status <> 'deleted';

-- Public-read avatar bucket: the application stores the immutable public URL
-- in profiles.avatar_url. Writes remain limited to the authenticated owner.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Avatar images are publicly readable" on storage.objects;
create policy "Avatar images are publicly readable"
on storage.objects for select
to public
using (bucket_id = 'avatars');

drop policy if exists "Users can upload their own avatars" on storage.objects;
create policy "Users can upload their own avatars"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
  and (storage.foldername(name))[2] ~ '^avatar-[0-9]+\.(jpg|png|webp)$'
);

drop policy if exists "Users can update their own avatars" on storage.objects;
create policy "Users can update their own avatars"
on storage.objects for update
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
)
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
  and (storage.foldername(name))[2] ~ '^avatar-[0-9]+\.(jpg|png|webp)$'
);

drop policy if exists "Users can delete their own avatars" on storage.objects;
create policy "Users can delete their own avatars"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

revoke all on function public.normalize_profile_phone(text) from public;
revoke all on function public.set_profile_phone_normalized() from public;
