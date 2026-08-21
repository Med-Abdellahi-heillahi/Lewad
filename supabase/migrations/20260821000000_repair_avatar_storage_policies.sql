-- Repair avatar Storage provisioning and owner-only object access.
--
-- The historical avatar migration checked `storage.foldername(name)[2]`
-- against the filename. `storage.foldername` only returns directory segments,
-- so an object named `{user_id}/avatar-123.jpg` has no second segment and
-- the INSERT policy rejects the upload. Keep that historical migration intact:
-- its version is already part of the migration history.

-- Avatar URLs are saved in `profiles.avatar_url` and rendered throughout the
-- application, so this bucket is intentionally public-read. Writes are still
-- limited to the authenticated owner and a single user-id directory.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  2097152,
  array['image/jpeg', 'image/png']::text[]
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
  and coalesce(array_length(storage.foldername(name), 1), 0) = 1
  and storage.filename(name) ~ '^avatar-[0-9]+\.(jpg|jpeg|png)$'
);

drop policy if exists "Users can update their own avatars" on storage.objects;
create policy "Users can update their own avatars"
on storage.objects for update
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
  and coalesce(array_length(storage.foldername(name), 1), 0) = 1
  and storage.filename(name) ~ '^avatar-[0-9]+\.(jpg|jpeg|png)$'
)
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
  and coalesce(array_length(storage.foldername(name), 1), 0) = 1
  and storage.filename(name) ~ '^avatar-[0-9]+\.(jpg|jpeg|png)$'
);

drop policy if exists "Users can delete their own avatars" on storage.objects;
create policy "Users can delete their own avatars"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
  and coalesce(array_length(storage.foldername(name), 1), 0) = 1
  and storage.filename(name) ~ '^avatar-[0-9]+\.(jpg|jpeg|png)$'
);
