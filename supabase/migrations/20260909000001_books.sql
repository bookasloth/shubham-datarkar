-- Books / Reading section. Idempotent. Depends on public.is_admin()
-- (20260614000002) and public.touch_updated_at() (20260614000003).

-- ============ books ============
create table if not exists public.books (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique not null,
  subtitle text,
  description text,
  author text,
  authors jsonb not null default '[]',
  cover_url text,
  backdrop_url text,
  isbn text,
  publisher text,
  publication_date date,
  publication_year int,
  page_count int,
  language text,
  country text,
  moods text[] not null default '{}',
  google_id text,
  external_source text not null default 'google_books',
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists books_published_idx on public.books (is_published, created_at desc);
create unique index if not exists books_google_id_key on public.books (google_id) where google_id is not null;
drop trigger if exists books_touch on public.books;
create trigger books_touch before update on public.books
  for each row execute function public.touch_updated_at();

-- ============ book_reading (my status, 1:1) ============
create table if not exists public.book_reading (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null unique references public.books(id) on delete cascade,
  status text not null default 'want_to_read'
    check (status in ('want_to_read','currently_reading','paused','finished','abandoned')),
  current_page int,
  total_pages int,
  percentage int check (percentage between 0 and 100),
  started_at date,
  last_read_at date,
  finished_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists book_reading_touch on public.book_reading;
create trigger book_reading_touch before update on public.book_reading
  for each row execute function public.touch_updated_at();

-- ============ book_reviews (editorial, 1:1) ============
create table if not exists public.book_reviews (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null unique references public.books(id) on delete cascade,
  rating numeric(3,1) check (rating >= 0 and rating <= 10),
  verdict text,
  recommendation_type text,
  short_review text,
  full_review text,
  why_read text,
  why_recommend text,
  what_i_learned text,
  who_should_read text,
  who_should_not_read text,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists book_reviews_touch on public.book_reviews;
create trigger book_reviews_touch before update on public.book_reviews
  for each row execute function public.touch_updated_at();

-- ============ book_notes ============
create table if not exists public.book_notes (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books(id) on delete cascade,
  chapter text,
  page int,
  quote text,
  note text,
  tags text[] not null default '{}',
  position int not null default 0,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists book_notes_book_idx on public.book_notes (book_id, published, position);
drop trigger if exists book_notes_touch on public.book_notes;
create trigger book_notes_touch before update on public.book_notes
  for each row execute function public.touch_updated_at();

-- ============ book_genres_ref + book_genres ============
create table if not exists public.book_genres_ref (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  slug text unique not null,
  created_at timestamptz not null default now()
);
create table if not exists public.book_genres (
  book_id uuid not null references public.books(id) on delete cascade,
  genre_id uuid not null references public.book_genres_ref(id) on delete cascade,
  primary key (book_id, genre_id)
);
create index if not exists book_genres_genre_idx on public.book_genres (genre_id);

-- ============ book_collections + items ============
create table if not exists public.book_collections (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique not null,
  description text,
  cover_url text,
  is_published boolean not null default true,
  display_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists book_collections_pub_idx on public.book_collections (is_published, display_order, created_at desc);
drop trigger if exists book_collections_touch on public.book_collections;
create trigger book_collections_touch before update on public.book_collections
  for each row execute function public.touch_updated_at();
create table if not exists public.book_collection_items (
  collection_id uuid not null references public.book_collections(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  sort_order int not null default 0,
  primary key (collection_id, book_id)
);
create index if not exists book_collection_items_order_idx on public.book_collection_items (collection_id, sort_order);

-- ============ book_homepage_sections ============
create table if not exists public.book_homepage_sections (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  kind text not null check (kind in ('hero','collection','auto')),
  collection_id uuid references public.book_collections(id) on delete set null,
  book_id uuid references public.books(id) on delete set null,
  auto_feed text check (auto_feed in ('currently_reading','recently_finished','recommended','want_to_read','favourites')),
  is_enabled boolean not null default true,
  display_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists book_homepage_sections_touch on public.book_homepage_sections;
create trigger book_homepage_sections_touch before update on public.book_homepage_sections
  for each row execute function public.touch_updated_at();

-- ============ book_pages (open-book builder) ============
create table if not exists public.book_pages (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books(id) on delete cascade,
  position int not null default 0,
  page_type text not null check (page_type in ('cover','text','review','notes','lessons','quote','image','book_info','recommendations')),
  title text,
  content text,
  metadata jsonb not null default '{}',
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists book_pages_book_idx on public.book_pages (book_id, position);
drop trigger if exists book_pages_touch on public.book_pages;
create trigger book_pages_touch before update on public.book_pages
  for each row execute function public.touch_updated_at();

-- ============ user_book_list (visitor list) ============
create table if not exists public.user_book_list (
  user_id uuid not null references auth.users(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  status text not null default 'want_to_read'
    check (status in ('want_to_read','currently_reading','finished')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, book_id)
);
drop trigger if exists user_book_list_touch on public.user_book_list;
create trigger user_book_list_touch before update on public.user_book_list
  for each row execute function public.touch_updated_at();

-- ============ RLS ============
-- content tables: public read gated by visibility, admin full
alter table public.books enable row level security;
drop policy if exists books_public_read on public.books;
create policy books_public_read on public.books for select to anon, authenticated using (is_published = true);
drop policy if exists books_admin_all on public.books;
create policy books_admin_all on public.books for all to authenticated using (public.is_admin()) with check (public.is_admin());
grant select on public.books to anon, authenticated;

alter table public.book_reading enable row level security;
drop policy if exists book_reading_public_read on public.book_reading;
create policy book_reading_public_read on public.book_reading for select to anon, authenticated
  using (exists (select 1 from public.books b where b.id = book_reading.book_id and b.is_published = true));
drop policy if exists book_reading_admin_all on public.book_reading;
create policy book_reading_admin_all on public.book_reading for all to authenticated using (public.is_admin()) with check (public.is_admin());
grant select on public.book_reading to anon, authenticated;

alter table public.book_reviews enable row level security;
drop policy if exists book_reviews_public_read on public.book_reviews;
create policy book_reviews_public_read on public.book_reviews for select to anon, authenticated using (published = true);
drop policy if exists book_reviews_admin_all on public.book_reviews;
create policy book_reviews_admin_all on public.book_reviews for all to authenticated using (public.is_admin()) with check (public.is_admin());
grant select on public.book_reviews to anon, authenticated;

alter table public.book_notes enable row level security;
drop policy if exists book_notes_public_read on public.book_notes;
create policy book_notes_public_read on public.book_notes for select to anon, authenticated using (published = true);
drop policy if exists book_notes_admin_all on public.book_notes;
create policy book_notes_admin_all on public.book_notes for all to authenticated using (public.is_admin()) with check (public.is_admin());
grant select on public.book_notes to anon, authenticated;

alter table public.book_genres_ref enable row level security;
drop policy if exists book_genres_ref_public_read on public.book_genres_ref;
create policy book_genres_ref_public_read on public.book_genres_ref for select to anon, authenticated using (true);
drop policy if exists book_genres_ref_admin_all on public.book_genres_ref;
create policy book_genres_ref_admin_all on public.book_genres_ref for all to authenticated using (public.is_admin()) with check (public.is_admin());
grant select on public.book_genres_ref to anon, authenticated;

alter table public.book_genres enable row level security;
drop policy if exists book_genres_public_read on public.book_genres;
create policy book_genres_public_read on public.book_genres for select to anon, authenticated using (true);
drop policy if exists book_genres_admin_all on public.book_genres;
create policy book_genres_admin_all on public.book_genres for all to authenticated using (public.is_admin()) with check (public.is_admin());
grant select on public.book_genres to anon, authenticated;

alter table public.book_collections enable row level security;
drop policy if exists book_collections_public_read on public.book_collections;
create policy book_collections_public_read on public.book_collections for select to anon, authenticated using (is_published = true);
drop policy if exists book_collections_admin_all on public.book_collections;
create policy book_collections_admin_all on public.book_collections for all to authenticated using (public.is_admin()) with check (public.is_admin());
grant select on public.book_collections to anon, authenticated;

alter table public.book_collection_items enable row level security;
drop policy if exists book_collection_items_public_read on public.book_collection_items;
create policy book_collection_items_public_read on public.book_collection_items for select to anon, authenticated using (true);
drop policy if exists book_collection_items_admin_all on public.book_collection_items;
create policy book_collection_items_admin_all on public.book_collection_items for all to authenticated using (public.is_admin()) with check (public.is_admin());
grant select on public.book_collection_items to anon, authenticated;

alter table public.book_homepage_sections enable row level security;
drop policy if exists book_homepage_sections_public_read on public.book_homepage_sections;
create policy book_homepage_sections_public_read on public.book_homepage_sections for select to anon, authenticated using (is_enabled = true);
drop policy if exists book_homepage_sections_admin_all on public.book_homepage_sections;
create policy book_homepage_sections_admin_all on public.book_homepage_sections for all to authenticated using (public.is_admin()) with check (public.is_admin());
grant select on public.book_homepage_sections to anon, authenticated;

alter table public.book_pages enable row level security;
drop policy if exists book_pages_public_read on public.book_pages;
create policy book_pages_public_read on public.book_pages for select to anon, authenticated using (published = true);
drop policy if exists book_pages_admin_all on public.book_pages;
create policy book_pages_admin_all on public.book_pages for all to authenticated using (public.is_admin()) with check (public.is_admin());
grant select on public.book_pages to anon, authenticated;

-- user_book_list: own rows only
alter table public.user_book_list enable row level security;
drop policy if exists user_book_list_own on public.user_book_list;
create policy user_book_list_own on public.user_book_list for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
grant select, insert, update, delete on public.user_book_list to authenticated;

-- ============ seed genres ============
insert into public.book_genres_ref (name, slug) values
  ('Business','business'), ('Marketing','marketing'), ('Psychology','psychology'),
  ('Finance','finance'), ('Biography','biography'), ('History','history'),
  ('Science','science'), ('Technology','technology'), ('Leadership','leadership'),
  ('Self-Help','self-help'), ('Philosophy','philosophy'), ('Productivity','productivity'),
  ('Economics','economics'), ('Design','design'), ('Fiction','fiction')
on conflict (slug) do nothing;
