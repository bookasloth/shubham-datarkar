-- Gallery albums: group images into named, ordered, publishable collections.
-- Target: OWN Supabase (ref oyzzgjrefkppqkxjccot). Apply MANUALLY. Idempotent.
-- Depends on: 20260819000001_gallery.sql, public.is_admin(), public.touch_updated_at().

-- ---------------------------------------------------------------------------
-- Albums table
-- ---------------------------------------------------------------------------
create table if not exists public.gallery_albums (
  id             uuid primary key default gen_random_uuid(),
  title          text not null,
  slug           text not null unique,
  description    text,
  cover_image_id uuid,
  is_published   boolean not null default true,
  display_order  integer not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists gallery_albums_public_idx
  on public.gallery_albums (is_published, display_order, created_at desc);

drop trigger if exists gallery_albums_touch on public.gallery_albums;
create trigger gallery_albums_touch
  before update on public.gallery_albums
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Link images to an album. Unfiled images (album_id null) stay allowed, and
-- deleting an album orphans its images rather than destroying them.
-- ---------------------------------------------------------------------------
alter table public.gallery_images
  add column if not exists album_id uuid;

do $$ begin
  alter table public.gallery_images
    add constraint gallery_images_album_fk
    foreign key (album_id) references public.gallery_albums(id) on delete set null;
exception when duplicate_object then null;
end $$;

-- cover_image_id points back at an image; clear it if that image is deleted.
do $$ begin
  alter table public.gallery_albums
    add constraint gallery_albums_cover_fk
    foreign key (cover_image_id) references public.gallery_images(id) on delete set null;
exception when duplicate_object then null;
end $$;

create index if not exists gallery_images_album_idx
  on public.gallery_images (album_id, is_published, display_order, created_at desc);

-- ---------------------------------------------------------------------------
-- RLS: public reads published albums; admin full access. App writes go through
-- the service role — the admin policy is defense in depth.
-- ---------------------------------------------------------------------------
alter table public.gallery_albums enable row level security;

drop policy if exists gallery_albums_public_read on public.gallery_albums;
create policy gallery_albums_public_read on public.gallery_albums
  for select to anon, authenticated
  using (is_published = true);

drop policy if exists gallery_albums_admin_all on public.gallery_albums;
create policy gallery_albums_admin_all on public.gallery_albums
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select on public.gallery_albums to anon, authenticated;
