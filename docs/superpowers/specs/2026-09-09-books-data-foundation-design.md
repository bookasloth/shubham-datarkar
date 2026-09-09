# Books / Reading — Data Foundation (Slice 1)

A personal book-discovery + reading-journal section for the site. The
experience is a cinematic personal library (bookshelf → open book →
page-turn), where the value is *my* perspective — what I'm reading, what I
think, what I learned — not generic book metadata.

This document specs **Slice 1: the data foundation only**. No routes, no UI.
It mirrors the existing Movies module (`src/lib/movies/*`, `supabase/migrations/20260908000001_movies.sql`) so later slices are largely a scaffold-copy + Google Books swap + the novel open-book UI.

## Full roadmap (context — later slices get their own spec)

1. **Data foundation** — this doc. Migration + Google Books service + lib scaffold + seed.
2. **Admin CMS** — `/admin/books` list, fast add-book workflow, reading dashboard, shelves admin, notes, page-builder.
3. **Public content layer (SEO-first)** — `/books`, `/books/[slug]`, `/books/shelf/[slug]`, `/books/genre/[slug]`, `/books/[slug]/notes`, `/books/search`, `/books/my-list`. Semantic HTML + JSON-LD.
4. **Bookshelf + open-book experience** — cinematic shelves, hover-lift, open-book page-turn (full 3D fold with reduced-motion + crawlable fallback), close-to-shelf.

Decisions locked in brainstorming: slice-by-slice in the order above; full page-turn with fallback in slice 4; **Google Books** as metadata provider (service architected so it can be swapped); lessons stored as a **text field** on the review (not a separate table); mirror Movies' per-visitor list as `user_book_list`; **per-note `published` flag**; shelf routes nested under `/books`.

## Scope of this slice

Deliverable = **data + service + lib scaffold + seed**, no rendered routes.
Nothing renders after this slice; nothing existing breaks. It unblocks slices 2–4.

Files:
- `supabase/migrations/20260909000001_books.sql` (idempotent; hand-run via the manual SQL workflow)
- `supabase/seed/books_seed.sql`
- `src/lib/books/types.ts`
- `src/lib/books/google-books.ts` (`import "server-only"`)
- `src/lib/books/queries.ts` (`import "server-only"`)
- `src/lib/books/actions.ts` (`"use server"`)

## Database

All tables get the Movies RLS pattern:
- `alter table … enable row level security;`
- public read policy `… for select to anon, authenticated using (<visibility>)`
- admin-all policy `… for all to authenticated using (public.is_admin()) with check (public.is_admin())`
- `grant select … to anon, authenticated;`
- `create trigger <t>_touch before update … execute function public.touch_updated_at();` on tables with `updated_at`.

Reference/join tables use `using (true)` for public read (parent book visibility gates content), matching `movie_genres` / `collection_movies`.

### `books` (metadata)
`id uuid pk default gen_random_uuid()`, `title text not null`, `slug text unique not null`, `subtitle text`, `description text`, `author text`, `authors jsonb default '[]'` (co-authors `[{name}]`), `cover_url text`, `backdrop_url text`, `isbn text`, `publisher text`, `publication_date date`, `publication_year int`, `page_count int`, `language text`, `country text`, `moods text[] default '{}'`, `google_id text`, `external_source text default 'google_books'`, `is_published bool default false`, `created_at timestamptz default now()`, `updated_at timestamptz default now()`.
Indexes: `(is_published, created_at desc)`; partial unique `(google_id) where google_id is not null`.
Public read: `using (is_published = true)`.

### `book_reading` (my reading status — 1:1)
`book_id uuid unique references books on delete cascade`, `status text not null default 'want_to_read' check (status in ('want_to_read','currently_reading','paused','finished','abandoned'))`, `current_page int`, `total_pages int`, `percentage int check (percentage between 0 and 100)`, `started_at date`, `last_read_at date`, `finished_at date`, timestamps.
Percentage is **computed in the server action** (`round(current_page/total_pages*100)`, clamped 0–100; `finished` → 100), not a DB trigger — `total_pages` may be null and the spec asks for calculation on write. Public read `using (true)` (a book's own `is_published` gates it via join).

### `book_reviews` (editorial — 1:1)
`book_id uuid unique references books on delete cascade`, `rating numeric(3,1) check (rating >= 0 and rating <= 10)`, `verdict text`, `recommendation_type text`, `short_review text`, `full_review text`, `why_read text`, `why_recommend text`, `what_i_learned text`, `who_should_read text`, `who_should_not_read text`, `published bool default false`, timestamps.
Public read: `using (published = true)`.
`what_i_learned` renders as the "01/02/03" lessons spread by splitting on newlines/bullets in the UI (slice 3/4).

### `book_notes` (many)
`id uuid pk`, `book_id uuid references books on delete cascade`, `chapter text`, `page int`, `quote text`, `note text`, `tags text[] default '{}'`, `position int default 0`, `published bool default false`, timestamps.
Index `(book_id, published, position)`. Public read: `using (published = true)`.

### `book_genres_ref` + `book_genres`
`book_genres_ref`: `id uuid pk`, `name text unique`, `slug text unique`, `created_at`. Seeded ~15 (Business, Marketing, Psychology, Finance, Biography, History, Science, Technology, Leadership, Self-Help, Philosophy, Productivity, Economics, Design, Fiction). No admin CRUD (managed via editor chips, mirroring movies genres).
`book_genres`: join, pk `(book_id, genre_id)`, both `on delete cascade`; index on `genre_id`. Public read `using (true)`.

### `book_collections` + `book_collection_items` (shelves)
`book_collections`: `id uuid pk`, `title text not null`, `slug text unique not null`, `description text`, `cover_url text`, `is_published bool default true`, `display_order int default 0`, timestamps. Index `(is_published, display_order, created_at desc)`. Public read `using (is_published = true)`.
`book_collection_items`: pk `(collection_id, book_id)` both `on delete cascade`, `sort_order int default 0`; index `(collection_id, sort_order)`. Public read `using (true)`.

### `book_homepage_sections` (library builder)
`id uuid pk`, `title text not null`, `kind text not null check (kind in ('hero','collection','auto'))`, `collection_id uuid references book_collections on delete set null`, `book_id uuid references books on delete set null`, `auto_feed text check (auto_feed in ('currently_reading','recently_finished','recommended','want_to_read','favourites'))`, `is_enabled bool default true`, `display_order int default 0`, timestamps. Public read `using (is_enabled = true)`.

### `book_pages` (open-book page builder — architecture-ready)
`id uuid pk`, `book_id uuid references books on delete cascade`, `position int default 0`, `page_type text not null check (page_type in ('cover','text','review','notes','lessons','quote','image','book_info','recommendations'))`, `title text`, `content text`, `metadata jsonb default '{}'`, `published bool default true`, timestamps. Index `(book_id, position)`. Public read `using (published = true)`. Table only in this slice; builder UI + rendering come in slices 2/4.

### `user_book_list` (visitor list)
pk `(user_id, book_id)`, `user_id uuid references auth.users on delete cascade`, `book_id uuid references books on delete cascade`, `status text not null default 'want_to_read' check (status in ('want_to_read','currently_reading','finished'))`, `created_at`, `updated_at`.
Own-rows RLS: `using (auth.uid() = user_id)` for select/insert/update/delete; grant `select, insert, update, delete` to authenticated. This is the **visitor's** list — distinct from `book_reading` (my editorial status).

## Metadata service — `src/lib/books/google-books.ts`

`import "server-only"`. Env `GOOGLE_BOOKS_API_KEY` (optional; the Volumes API works keyless at lower quota — append `&key=` only when set). Base `https://www.googleapis.com/books/v1`. `fetch` with `next: { revalidate: 86400 }`.
- `searchBooks(query)` → up to 12 normalized results `{ googleId, title, subtitle, authors[], description, cover, isbn, publisher, publishedDate, pageCount, language, categories[] }` (cover from `imageLinks.thumbnail`, https-upgraded; isbn picks ISBN_13).
- `getBookDetails(googleId)` → full normalized volume.
- `googleBooksConfigured()` (always true; key only affects quota).

## Data access — `src/lib/books/{types,queries,actions}.ts`

Mirror `src/lib/movies/*`:
- **types.ts**: camelCase app types (`Book`, `BookReading`, `BookReview`, `BookNote`, `BookCollection`, `BookPage`, `BookWithRelations`), snake_case `*Row` + `map*Row()`, exported `*_SELECT` column strings, const vocab `RECOMMENDATION_TYPES` (Must Read, Highly Recommended, Recommended, Worth Reading, Hidden Gem, Underrated, Re-read Worthy, Read If Interested, Not For Me), `READING_STATUSES`, `MOODS` (Thought-Provoking, Practical, Easy Read, Dense, Inspirational, Challenging, Emotional, Technical, Entertaining, Life-Changing), `slugify()`.
- **queries.ts**: `BOOK_WITH_RELATIONS` select embedding `book_genres(genre:book_genres_ref(...))`, `book_reviews(...)`, `book_reading(...)`; `mapBookWithRelations`. Public reads via `supabaseAnon()`, fail-soft to `[]`/`null`. Auto feeds (`currently_reading`, `recently_finished`, `recommended`, `want_to_read`, `favourites`) filtered in memory. Admin reads via `supabaseAdmin()`. Sections mirror movies queries.
- **actions.ts** (`"use server"`): each re-checks `getAdminUser()`. `createBook`/`updateBook` (handle book + 1:1 review + 1:1 reading together, roll back on failure, `upsert onConflict`), `setBookPublished`, `deleteBook`, `duplicateBook`, `setBookGenres`, `setBookCollections`, book_collections CRUD + `setCollectionBooks`, `setBookNotes`/note CRUD, `book_pages` CRUD, homepage-section CRUD, `searchGoogleBooks`/`importFromGoogleBooks` (editorial-preserving)/`refreshCoversFromGoogleBooks` (bulk, batches of 8). Visitor `toggleBookList`/`getBookListState` via the cookie-aware `createClient()`. `uniqueSlug()` (stable after create). `revalidateBooks(slug?)` after every mutation.

Actions and query functions are added in this slice but only exercised by the admin/public slices; a small self-check for the percentage calc + slugify ships with the lib.

## Seed — `supabase/seed/books_seed.sql`

15 real books across genres/statuses (some currently_reading with page progress, some finished with ratings/reviews/notes, some want_to_read), 5+ shelves ("Currently Reading", "Books I'd Recommend", "Books That Changed My Thinking", "Business & Marketing", "My Favourites", "Want to Read"), genre links, a hero + several auto/collection homepage sections. Clearly-mine editorial voice.

## Non-goals (deferred to later slices)

Any route, page, or React component; the admin editor; the bookshelf and open-book UI; the page-builder UI; the visitor-list UI; structured lesson/idea aggregation (the future knowledge graph — the schema stays extensible but we don't build it).

## Testing / verification

- Migration applies cleanly on top of the movies schema (re-runnable / idempotent).
- `supabase gen types` (or the project's typegen) succeeds; `tsc` clean.
- `next build` exits 0 (server-only imports don't leak to client).
- One runnable self-check for `computePercentage()` (clamp + finished→100) and `slugify()`.
