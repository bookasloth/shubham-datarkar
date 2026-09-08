-- Movie recommendation + review module.
-- Public cinematic discovery (/movies, /movies/[slug], /collections/[slug]) +
-- admin manager (/admin/movies, /admin/collections).
-- Target: OWN Supabase. Apply MANUALLY. Idempotent.
-- Depends on: public.is_admin() (20260614000002), public.touch_updated_at() (20260614000003).
--
-- Design: movie METADATA (movies) is kept separate from the EDITORIAL
-- recommendation (reviews, 1:1). A movie is reusable across many collections
-- without duplicating data (collection_movies join). TMDB is a metadata source,
-- never the source of truth for editorial content.

-- ===========================================================================
-- GENRES  (reference data; standard film genres)
-- ===========================================================================
create table if not exists public.genres (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  slug       text not null unique,
  created_at timestamptz not null default now()
);

-- ===========================================================================
-- MOVIES  (metadata — populated from TMDB, editable by admin)
-- ===========================================================================
create table if not exists public.movies (
  id                uuid primary key default gen_random_uuid(),
  title             text not null,
  slug              text not null unique,
  overview          text,
  tagline           text,
  poster_url        text,            -- full URL (TMDB CDN or custom upload)
  backdrop_url      text,
  trailer_url       text,
  release_date      date,
  release_year      integer,
  runtime           integer,         -- minutes
  original_language text,
  country           text,
  director          text,
  movie_cast        jsonb not null default '[]',  -- [{name, character, profilePath}]
  moods             text[] not null default '{}', -- editorial discovery tags
  age_rating        text,
  tmdb_id           integer,         -- external_id
  external_source   text not null default 'tmdb',
  is_published      boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Public list query: published, newest first.
create index if not exists movies_public_idx
  on public.movies (is_published, created_at desc);
-- One row per imported TMDB title (only enforced when tmdb_id is set).
create unique index if not exists movies_tmdb_id_key
  on public.movies (tmdb_id) where tmdb_id is not null;

drop trigger if exists movies_touch on public.movies;
create trigger movies_touch
  before update on public.movies
  for each row execute function public.touch_updated_at();

-- ===========================================================================
-- MOVIE_GENRES  (many-to-many)
-- ===========================================================================
create table if not exists public.movie_genres (
  movie_id uuid not null references public.movies (id) on delete cascade,
  genre_id uuid not null references public.genres (id) on delete cascade,
  primary key (movie_id, genre_id)
);
create index if not exists movie_genres_genre_idx on public.movie_genres (genre_id);

-- ===========================================================================
-- REVIEWS  (editorial — the recommendation. 1:1 with a movie.)
-- ===========================================================================
create table if not exists public.reviews (
  id                  uuid primary key default gen_random_uuid(),
  movie_id            uuid not null unique references public.movies (id) on delete cascade,
  rating              numeric(3,1) check (rating >= 0 and rating <= 10),
  verdict             text,           -- one-line punchy verdict
  recommendation_type text,           -- "Must Watch" etc. (validated in TS, configurable)
  short_review        text,
  full_review         text,
  why_recommend       text,
  best_for            text,           -- "Who should watch it?"
  watch_if            text,           -- "Watch if you..."
  not_for             text,           -- "Who might not like it?"
  spoiler_free        boolean not null default true,
  published           boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

drop trigger if exists reviews_touch on public.reviews;
create trigger reviews_touch
  before update on public.reviews
  for each row execute function public.touch_updated_at();

-- ===========================================================================
-- COLLECTIONS  (editorial groupings, e.g. "My Favourite Thrillers")
-- ===========================================================================
create table if not exists public.collections (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  slug          text not null unique,
  description   text,
  cover_url     text,
  is_published  boolean not null default true,
  display_order integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists collections_public_idx
  on public.collections (is_published, display_order, created_at desc);

drop trigger if exists collections_touch on public.collections;
create trigger collections_touch
  before update on public.collections
  for each row execute function public.touch_updated_at();

-- ===========================================================================
-- COLLECTION_MOVIES  (ordered membership; a movie can be in many collections)
-- ===========================================================================
create table if not exists public.collection_movies (
  collection_id uuid not null references public.collections (id) on delete cascade,
  movie_id      uuid not null references public.movies (id) on delete cascade,
  sort_order    integer not null default 0,
  primary key (collection_id, movie_id)
);
create index if not exists collection_movies_order_idx
  on public.collection_movies (collection_id, sort_order);

-- ===========================================================================
-- HOMEPAGE_SECTIONS  (data-driven /movies homepage; never hard-coded)
-- kind: 'hero' (featured movie_id), 'collection' (collection_id),
--       'auto' (auto_feed key: recently_added | top_rated | must_watch)
-- ===========================================================================
create table if not exists public.homepage_sections (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  kind          text not null check (kind in ('hero', 'collection', 'auto')),
  collection_id uuid references public.collections (id) on delete set null,
  movie_id      uuid references public.movies (id) on delete set null,
  auto_feed     text,
  is_enabled    boolean not null default true,
  display_order integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists homepage_sections_order_idx
  on public.homepage_sections (is_enabled, display_order);

drop trigger if exists homepage_sections_touch on public.homepage_sections;
create trigger homepage_sections_touch
  before update on public.homepage_sections
  for each row execute function public.touch_updated_at();

-- ===========================================================================
-- USER_MOVIE_LIST  (My List — per-user saves; users manage only their own)
-- ===========================================================================
create table if not exists public.user_movie_list (
  user_id    uuid not null references auth.users (id) on delete cascade,
  movie_id   uuid not null references public.movies (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, movie_id)
);
create index if not exists user_movie_list_user_idx
  on public.user_movie_list (user_id, created_at desc);

-- ===========================================================================
-- RLS
-- Content tables: anon/authed read the published rows; admin full access
-- (all app writes go through the service role — admin policy is defense in depth).
-- Join/reference tables: public read; admin writes.
-- My List: each user reads/writes only their own rows (no service role).
-- ===========================================================================

-- genres
alter table public.genres enable row level security;
drop policy if exists genres_public_read on public.genres;
create policy genres_public_read on public.genres
  for select to anon, authenticated using (true);
drop policy if exists genres_admin_all on public.genres;
create policy genres_admin_all on public.genres
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
grant select on public.genres to anon, authenticated;

-- movies
alter table public.movies enable row level security;
drop policy if exists movies_public_read on public.movies;
create policy movies_public_read on public.movies
  for select to anon, authenticated using (is_published = true);
drop policy if exists movies_admin_all on public.movies;
create policy movies_admin_all on public.movies
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
grant select on public.movies to anon, authenticated;

-- movie_genres (link rows — safe to expose; movie visibility gates content)
alter table public.movie_genres enable row level security;
drop policy if exists movie_genres_public_read on public.movie_genres;
create policy movie_genres_public_read on public.movie_genres
  for select to anon, authenticated using (true);
drop policy if exists movie_genres_admin_all on public.movie_genres;
create policy movie_genres_admin_all on public.movie_genres
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
grant select on public.movie_genres to anon, authenticated;

-- reviews (public sees only published editorial)
alter table public.reviews enable row level security;
drop policy if exists reviews_public_read on public.reviews;
create policy reviews_public_read on public.reviews
  for select to anon, authenticated using (published = true);
drop policy if exists reviews_admin_all on public.reviews;
create policy reviews_admin_all on public.reviews
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
grant select on public.reviews to anon, authenticated;

-- collections
alter table public.collections enable row level security;
drop policy if exists collections_public_read on public.collections;
create policy collections_public_read on public.collections
  for select to anon, authenticated using (is_published = true);
drop policy if exists collections_admin_all on public.collections;
create policy collections_admin_all on public.collections
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
grant select on public.collections to anon, authenticated;

-- collection_movies
alter table public.collection_movies enable row level security;
drop policy if exists collection_movies_public_read on public.collection_movies;
create policy collection_movies_public_read on public.collection_movies
  for select to anon, authenticated using (true);
drop policy if exists collection_movies_admin_all on public.collection_movies;
create policy collection_movies_admin_all on public.collection_movies
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
grant select on public.collection_movies to anon, authenticated;

-- homepage_sections
alter table public.homepage_sections enable row level security;
drop policy if exists homepage_sections_public_read on public.homepage_sections;
create policy homepage_sections_public_read on public.homepage_sections
  for select to anon, authenticated using (is_enabled = true);
drop policy if exists homepage_sections_admin_all on public.homepage_sections;
create policy homepage_sections_admin_all on public.homepage_sections
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
grant select on public.homepage_sections to anon, authenticated;

-- user_movie_list (own rows only; no anon, no service-role dependency)
alter table public.user_movie_list enable row level security;
drop policy if exists user_movie_list_own on public.user_movie_list;
create policy user_movie_list_own on public.user_movie_list
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
grant select, insert, delete on public.user_movie_list to authenticated;

-- ===========================================================================
-- Seed: standard genres (idempotent). Editorial/demo content ships in the
-- companion seed file (supabase/seed/movies_seed.sql).
-- ===========================================================================
insert into public.genres (name, slug) values
  ('Action', 'action'),
  ('Adventure', 'adventure'),
  ('Animation', 'animation'),
  ('Comedy', 'comedy'),
  ('Crime', 'crime'),
  ('Documentary', 'documentary'),
  ('Drama', 'drama'),
  ('Fantasy', 'fantasy'),
  ('Horror', 'horror'),
  ('Mystery', 'mystery'),
  ('Romance', 'romance'),
  ('Sci-Fi', 'sci-fi'),
  ('Thriller', 'thriller'),
  ('War', 'war'),
  ('Western', 'western')
on conflict (slug) do nothing;
