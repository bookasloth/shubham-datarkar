-- Admin-curated playlist directory.
-- Public discovery (/playlists, /playlists/[slug]) + admin manager
-- (/admin/playlists). NOT a streaming service — every playlist links out to
-- Spotify / YouTube / Apple Music etc. This site hosts no audio.
-- Target: OWN Supabase. Apply MANUALLY. Idempotent.
-- Depends on: public.is_admin() (20260614000002), public.touch_updated_at() (20260614000003).
--
-- Design: one flat table. Category drives the public section grouping; mood is a
-- single editorial discovery tag. Both are validated in TS (configurable vocab,
-- no DB enum) so new values ship without a migration. Cover art is a full URL —
-- either a Supabase-hosted upload / re-hosted oEmbed thumbnail (storage_path set)
-- or a pasted external URL (storage_path null).

create table if not exists public.playlists (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  slug          text not null unique,
  description   text,
  platform      text not null default 'other',   -- spotify|youtube|apple_music|soundcloud|other (validated in TS)
  external_url  text not null,                    -- canonical destination (opened on the platform)
  embed_url     text,                             -- optional official embed src (derived; admin can override)
  allow_embed   boolean not null default true,    -- show the embedded player on the detail page
  cover_url     text,                             -- full URL (Supabase upload / re-hosted thumbnail / pasted)
  storage_path  text,                             -- set only when cover lives in our bucket (for cleanup)
  creator_name  text,                             -- who made the playlist (editorial)
  category      text,                             -- primary grouping (Focus, Workout, …)
  mood          text,                             -- single editorial mood tag
  is_featured   boolean not null default false,
  is_published  boolean not null default false,
  position      integer not null default 0,       -- manual ordering (lower = earlier)
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Public list query: published, by manual position then newest.
create index if not exists playlists_public_idx
  on public.playlists (is_published, position, created_at desc);

drop trigger if exists playlists_touch on public.playlists;
create trigger playlists_touch
  before update on public.playlists
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- RLS: anon/authed read published only; admin full access. All app writes go
-- through the service role — the admin policy is defense in depth.
-- ---------------------------------------------------------------------------
alter table public.playlists enable row level security;

drop policy if exists playlists_public_read on public.playlists;
create policy playlists_public_read on public.playlists
  for select to anon, authenticated
  using (is_published = true);

drop policy if exists playlists_admin_all on public.playlists;
create policy playlists_admin_all on public.playlists
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select on public.playlists to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Storage bucket for cover art: public read; NO client write policy on purpose —
-- uploads/deletes happen only via the service role in admin-gated server actions.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('playlists', 'playlists', true)
on conflict (id) do nothing;

drop policy if exists playlists_bucket_public_read on storage.objects;
create policy playlists_bucket_public_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'playlists');
