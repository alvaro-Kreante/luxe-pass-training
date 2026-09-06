-- Story 1.1 — bucket "profile-photos" (declarado en config.toml), foto
-- opcional del paso ProfileBasic. Cada objeto vive bajo "{auth.uid()}/...".
create policy "select own profile photo"
on storage.objects for select
to authenticated
using (
  bucket_id = 'profile-photos'
  and (select auth.uid()) = (storage.foldername(name))[1]::uuid
);

create policy "insert own profile photo"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'profile-photos'
  and (select auth.uid()) = (storage.foldername(name))[1]::uuid
);

create policy "update own profile photo"
on storage.objects for update
to authenticated
using (
  bucket_id = 'profile-photos'
  and (select auth.uid()) = (storage.foldername(name))[1]::uuid
)
with check (
  bucket_id = 'profile-photos'
  and (select auth.uid()) = (storage.foldername(name))[1]::uuid
);
