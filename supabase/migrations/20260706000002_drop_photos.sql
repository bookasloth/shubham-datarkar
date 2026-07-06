-- Drop the photos feature entirely.
-- Target: your OWN Supabase project. Run manually in the SQL editor.

-- Storage policies
drop policy if exists "photos_admin_delete" on storage.objects;
drop policy if exists "photos_admin_write" on storage.objects;
drop policy if exists "photos_public_read" on storage.objects;

-- Storage bucket (delete all objects first via Supabase dashboard, then run this)
delete from storage.buckets where id = 'photos';

-- Table policies
drop policy if exists photos_admin_write on public.photos;
drop policy if exists photos_admin_read on public.photos;
drop policy if exists photos_public_read on public.photos;

-- Trigger
drop trigger if exists photos_touch_updated_at on public.photos;

-- Table
drop table if exists public.photos;
