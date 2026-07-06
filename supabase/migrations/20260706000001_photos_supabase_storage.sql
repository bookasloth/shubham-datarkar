-- Rename cloudinary column to storage_path for Supabase Storage migration.
-- Fresh start — no data to backfill.
-- Target: your OWN Supabase project. Run manually in the SQL editor.

alter table public.photos
  rename column cloudinary_public_id to storage_path;

-- Create the photos storage bucket (public).
insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do nothing;

-- Allow public reads on the photos bucket.
create policy "photos_public_read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'photos');

-- Allow authenticated admin uploads/deletes.
create policy "photos_admin_write"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'photos' and public.is_admin());

create policy "photos_admin_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'photos' and public.is_admin());
