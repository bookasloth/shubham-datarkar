-- Gallery module: public masonry gallery (/gallery) + admin manager (/admin/gallery).
-- Target: OWN Supabase (ref oyzzgjrefkppqkxjccot). Apply MANUALLY. Idempotent.
-- Depends on: public.is_admin() (20260614000001), public.touch_updated_at() (20260614000003).

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------
create table if not exists public.gallery_images (
  id            uuid primary key default gen_random_uuid(),
  caption       text not null default '',
  description   text,
  location      text,
  photographer  text,
  image_url     text not null,
  storage_path  text not null,
  width         integer not null check (width > 0),
  height        integer not null check (height > 0),
  file_size     bigint not null default 0,
  mime_type     text not null default '',
  is_published  boolean not null default true,
  display_order integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Serves the only public query: published rows in display order.
create index if not exists gallery_images_public_idx
  on public.gallery_images (is_published, display_order, created_at desc);

drop trigger if exists gallery_images_touch on public.gallery_images;
create trigger gallery_images_touch
  before update on public.gallery_images
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- RLS: anon/authed read published only; admin full access. All app writes go
-- through the service role anyway — the admin policy is defense in depth.
-- ---------------------------------------------------------------------------
alter table public.gallery_images enable row level security;

drop policy if exists gallery_public_read on public.gallery_images;
create policy gallery_public_read on public.gallery_images
  for select to anon, authenticated
  using (is_published = true);

drop policy if exists gallery_admin_all on public.gallery_images;
create policy gallery_admin_all on public.gallery_images
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select on public.gallery_images to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Storage bucket: public read; NO client write policy on purpose — uploads and
-- deletes happen only via the service role in server actions (admin-gated).
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('gallery', 'gallery', true)
on conflict (id) do nothing;

drop policy if exists gallery_bucket_public_read on storage.objects;
create policy gallery_bucket_public_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'gallery');
