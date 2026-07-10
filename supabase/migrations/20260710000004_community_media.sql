-- =====================================================================
-- /community — media bucket for post images.
-- Target: OWN Supabase (ref oyzzgjrefkppqkxjccot). Apply MANUALLY. Idempotent.
-- Depends on 20260710000001_community_schema.sql (community_can_post).
-- =====================================================================

insert into storage.buckets (id, name, public)
values ('community-media', 'community-media', true)
on conflict (id) do nothing;

drop policy if exists community_media_public_read on storage.objects;
create policy community_media_public_read
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'community-media');

-- Defense in depth: the server action uploads with the service role, but a
-- direct client upload must still pass the post gate.
drop policy if exists community_media_member_write on storage.objects;
create policy community_media_member_write
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'community-media' and public.community_can_post());

drop policy if exists community_media_admin_delete on storage.objects;
create policy community_media_admin_delete
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'community-media' and public.is_admin());
