-- =====================================================================
-- Member profile photos. Target: OWN Supabase (ref oyzzgjrefkppqkxjccot).
-- NOT the BAS project. Apply MANUALLY. Idempotent.
-- Mirrors the community-media bucket pattern (20260710000004 / _13000002).
-- =====================================================================

-- PRE-CHECK (owner): confirm anon column grants before applying.
-- Run this query to see what columns anon already reads on profiles.
-- The avatar_url grant below must match the existing pattern.
--
-- select grantee, string_agg(column_name, ', ' order by column_name) as cols
-- from information_schema.column_privileges
-- where table_schema = 'public' and table_name = 'profiles' and privilege_type = 'SELECT'
-- group by grantee;
--
-- Expected: authenticated has the named column list from 20260714000001.
-- If anon has table-wide SELECT, the grant below is a harmless idempotent superset.

-- 1. column
alter table public.profiles add column if not exists avatar_url text;

-- 2. make avatar_url readable. The account-fields migration re-scoped
-- authenticated SELECT to a named column list; add avatar_url to it. anon
-- renders public profile pages, so it needs the column too.
grant select (avatar_url) on public.profiles to authenticated, anon;

-- 3. bucket
insert into storage.buckets (id, name, public)
values ('member-avatars', 'member-avatars', true)
on conflict (id) do nothing;

-- 4a. public read
drop policy if exists member_avatars_public_read on storage.objects;
create policy member_avatars_public_read
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'member-avatars');

-- 4b. owner-folder write (defense in depth: real uploads use the service role).
-- Own {auth.uid()}/ folder only; raster extensions only (no svg/html).
drop policy if exists member_avatars_owner_write on storage.objects;
create policy member_avatars_owner_write
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'member-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
    and lower(storage.extension(name)) in ('jpg','jpeg','png','webp','gif','avif')
  );

-- 4c. admin delete (moderation)
drop policy if exists member_avatars_admin_delete on storage.objects;
create policy member_avatars_admin_delete
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'member-avatars' and public.is_admin());
