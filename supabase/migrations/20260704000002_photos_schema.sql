-- Photos gallery. Public reads via RLS (published = true); admin full access
-- via is_admin(). Likes are client-side only — no like_count column here.
-- Target: your OWN Supabase project. Run manually in the SQL editor.

create table if not exists public.photos (
  id                 uuid primary key default gen_random_uuid(),
  cloudinary_public_id text not null,
  title              text not null,
  description        text,
  tags               text[] not null default '{}',
  sort_order         integer not null default 0,
  published          boolean not null default false,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

comment on table public.photos is
  'Photo gallery entries. Public reads via RLS (published = true); admin full access via is_admin().';

create index if not exists photos_sort_order_idx on public.photos (sort_order);
create index if not exists photos_published_idx on public.photos (published);

-- keep updated_at fresh (shared trigger function defined in
-- 20260614000003_create_posts.sql)
drop trigger if exists photos_touch_updated_at on public.photos;
create trigger photos_touch_updated_at
  before update on public.photos
  for each row execute function public.touch_updated_at();

-- RLS
alter table public.photos enable row level security;

-- Public: only published photos.
drop policy if exists photos_public_read on public.photos;
create policy photos_public_read on public.photos
  for select
  to anon, authenticated
  using (published = true);

-- Admin: full read.
drop policy if exists photos_admin_read on public.photos;
create policy photos_admin_read on public.photos
  for select
  to authenticated
  using (public.is_admin());

-- Admin: write (insert/update/delete).
drop policy if exists photos_admin_write on public.photos;
create policy photos_admin_write on public.photos
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select on public.photos to anon, authenticated;
grant insert, update, delete on public.photos to authenticated;
