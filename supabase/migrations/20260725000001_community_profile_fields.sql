-- =====================================================================
-- /community — public profile fields (headline, cover) + cover bucket.
-- Target: OWN Supabase (ref oyzzgjrefkppqkxjccot). Apply MANUALLY. Idempotent.
-- Depends on 20260710000001_community_schema.sql (profiles) and
-- 20260713000001_security_hardening.sql (column-allowlisted UPDATE).
-- headline/cover_url are PUBLIC. location is intentionally NOT surfaced here
-- (it is private PII in 20260714000001_member_account_fields.sql).
-- =====================================================================

alter table public.profiles add column if not exists headline  text;
alter table public.profiles add column if not exists cover_url text;

-- Public read: the existing profiles select grant is column-scoped, so the
-- new public columns need their own grant for anon + authenticated to read.
grant select (headline, cover_url) on public.profiles to anon, authenticated;

-- Writes happen via the service role in a server action, so no UPDATE grant
-- is added here (matches how avatar_url is written).

-- Cover images bucket, mirroring member-avatars.
insert into storage.buckets (id, name, public)
values ('member-covers', 'member-covers', true)
on conflict (id) do nothing;

drop policy if exists member_covers_public_read on storage.objects;
create policy member_covers_public_read
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'member-covers');

-- Defense in depth: the server action uploads with the service role, but a
-- direct client upload must still be a signed-in member writing their own folder.
drop policy if exists member_covers_member_write on storage.objects;
create policy member_covers_member_write
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'member-covers' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists member_covers_member_delete on storage.objects;
create policy member_covers_member_delete
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'member-covers' and (storage.foldername(name))[1] = auth.uid()::text);
