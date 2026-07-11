-- =====================================================================
-- Storage upload hardening (audit L-2). Target: OWN Supabase
-- (ref oyzzgjrefkppqkxjccot). NOT the BAS project. Apply MANUALLY. Idempotent.
--
-- Real uploads run through the service role (src/lib/community/actions.ts,
-- which now enforces a raster-only MIME allowlist + 5MB cap), so the direct
-- client-write RLS policy is defense in depth. This tightens that fallback so a
-- direct upload — if one is ever added — still can't:
--   * write outside the uploader's own {auth.uid()}/ folder (path spoofing), or
--   * store an SVG/HTML file in a public bucket (stored-XSS on the storage host).
-- =====================================================================

drop policy if exists community_media_member_write on storage.objects;
create policy community_media_member_write
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'community-media'
    and public.community_can_post()
    and (storage.foldername(name))[1] = auth.uid()::text          -- own folder only
    and lower(storage.extension(name)) in ('jpg','jpeg','png','webp','gif','avif')  -- no svg/html
  );
