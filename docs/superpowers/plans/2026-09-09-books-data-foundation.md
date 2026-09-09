# Books Data Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the database schema, Google Books metadata service, TypeScript data-access scaffold, and seed data for a personal Books/Reading section — no routes or UI.

**Architecture:** Mirror the existing Movies module (`src/lib/movies/*`, `supabase/migrations/20260908000001_movies.sql`) exactly, with `book_`-prefixed tables to avoid clashing with movies' `collections`/`genres`/`homepage_sections`. Public reads use the RLS-bound anon client and fail soft; admin reads/writes use the service-role client and re-check `getAdminUser()`. Google Books replaces TMDB as the metadata provider behind an equivalent service surface.

**Tech Stack:** Next.js 16 App Router, React 19, Supabase (Postgres + RLS), Tailwind v4, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-09-books-data-foundation-design.md`

## Global Constraints

- Migrations are **hand-run** — write the file, do NOT apply it. The SQL is handed to the user to run in the Supabase SQL editor.
- Migration must be **idempotent / re-runnable**: `create table if not exists`, `create index if not exists`, `drop policy if exists` before each `create policy`, `create or replace function`, guard triggers with `drop trigger if exists`.
- Depends on pre-existing `public.is_admin()` and `public.touch_updated_at()` (from `20260614000002` / `20260614000003`).
- Server-only modules (`queries.ts`, `google-books.ts`) start with `import "server-only";`. `actions.ts` starts with `"use server";`.
- Const vocab (`RECOMMENDATION_TYPES`, `READING_STATUSES`, `MOODS`) lives in TS, not DB enums.
- Slug is generated once on create and never re-slugged on update.
- Attribution footer on commits: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- Branch: `feat/books-data-foundation` (already created off `origin/main`).

---

### Task 1: Database migration

**Files:**
- Create: `supabase/migrations/20260909000001_books.sql`

**Interfaces:**
- Consumes: `public.is_admin()`, `public.touch_updated_at()`, `auth.users`.
- Produces: tables `books`, `book_reading`, `book_reviews`, `book_notes`, `book_genres_ref`, `book_genres`, `book_collections`, `book_collection_items`, `book_homepage_sections`, `book_pages`, `user_book_list` — consumed by Tasks 4/5 via PostgREST embeds.

- [ ] **Step 1: Write the migration file**

Model it on `supabase/migrations/20260908000001_movies.sql` (open it and follow its exact structure/ordering). Full DDL:

```sql
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
create policy book_reading_public_read on public.book_reading for select to anon, authenticated using (true);
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
```

- [ ] **Step 2: Verify idempotency by static review**

Re-read the file. Confirm every `create table` has `if not exists`, every `create index` has `if not exists`, every `create policy` is preceded by `drop policy if exists`, every `create trigger` is preceded by `drop trigger if exists`, and the genre insert uses `on conflict do nothing`. This file will be run twice by the user (safety); a second run must be a no-op.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260909000001_books.sql
git commit -m "feat(books): data-foundation migration (slice 1)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Types, vocab, mappers, pure helpers

**Files:**
- Create: `src/lib/books/types.ts`
- Test: `src/lib/books/types.test.ts`

**Interfaces:**
- Produces:
  - `slugify(input: string): string`
  - `computePercentage(currentPage: number | null, totalPages: number | null, status: string): number | null` — returns 100 when status is `'finished'`; else `round(currentPage/totalPages*100)` clamped 0–100; `null` when inputs missing or `totalPages<=0`.
  - `RECOMMENDATION_TYPES: readonly string[]`, `READING_STATUSES: readonly string[]`, `MOODS: readonly string[]`
  - App types `Book`, `BookReading`, `BookReview`, `BookNote`, `BookCollection`, `BookPage`, `BookWithRelations`
  - Row types + mappers `mapBookRow`, `mapReadingRow`, `mapReviewRow`, `mapNoteRow`, `mapCollectionRow`, `mapPageRow`
  - `*_SELECT` column-string constants used by Task 4.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/books/types.test.ts
import { describe, it, expect } from "vitest";
import { slugify, computePercentage } from "./types";

describe("slugify", () => {
  it("lowercases, strips punctuation, hyphenates", () => {
    expect(slugify("The Psychology of Money!")).toBe("the-psychology-of-money");
  });
  it("collapses whitespace and trims hyphens", () => {
    expect(slugify("  Deep   Work  ")).toBe("deep-work");
  });
});

describe("computePercentage", () => {
  it("computes and rounds", () => {
    expect(computePercentage(180, 300, "currently_reading")).toBe(60);
  });
  it("forces 100 when finished regardless of pages", () => {
    expect(computePercentage(10, 300, "finished")).toBe(100);
    expect(computePercentage(null, null, "finished")).toBe(100);
  });
  it("clamps above 100", () => {
    expect(computePercentage(400, 300, "currently_reading")).toBe(100);
  });
  it("returns null when pages missing or zero", () => {
    expect(computePercentage(50, null, "currently_reading")).toBeNull();
    expect(computePercentage(50, 0, "currently_reading")).toBeNull();
    expect(computePercentage(null, 300, "want_to_read")).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/books/types.test.ts`
Expected: FAIL — cannot import from `./types` (module not found).

- [ ] **Step 3: Write `src/lib/books/types.ts`**

Open `src/lib/movies/types.ts` and mirror its structure. Implement the two pure helpers exactly:

```ts
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function computePercentage(
  currentPage: number | null,
  totalPages: number | null,
  status: string,
): number | null {
  if (status === "finished") return 100;
  if (!currentPage || !totalPages || totalPages <= 0) return null;
  return Math.min(100, Math.max(0, Math.round((currentPage / totalPages) * 100)));
}
```

Then add the vocab consts (copy the exact label lists from the spec §Data access), the app + row types for every table in Task 1, the `map*Row` functions (snake→camel, mirroring `mapMovieRow`), and the `*_SELECT` column strings. Define `BookWithRelations` as `Book & { reading: BookReading | null; review: BookReview | null; genres: {id,name,slug}[] }`. Match the field names used in Task 4's `BOOK_WITH_RELATIONS`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/books/types.test.ts`
Expected: PASS (7 assertions).

- [ ] **Step 5: Commit**

```bash
git add src/lib/books/types.ts src/lib/books/types.test.ts
git commit -m "feat(books): types, vocab, mappers, percentage/slug helpers

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Google Books metadata service

**Files:**
- Create: `src/lib/books/google-books.ts`
- Test: `src/lib/books/google-books.test.ts`

**Interfaces:**
- Produces:
  - `normalizeVolume(v: GoogleVolume): BookMetadata` — pure; exported for test.
  - `type BookMetadata = { googleId: string; title: string; subtitle: string | null; authors: string[]; description: string | null; cover: string | null; isbn: string | null; publisher: string | null; publishedDate: string | null; pageCount: number | null; language: string | null; categories: string[] }`
  - `searchBooks(query: string): Promise<BookMetadata[]>` (≤12)
  - `getBookDetails(googleId: string): Promise<BookMetadata | null>`
  - `googleBooksConfigured(): boolean`
- Consumes: env `GOOGLE_BOOKS_API_KEY` (optional).

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/books/google-books.test.ts
import { describe, it, expect } from "vitest";
import { normalizeVolume } from "./google-books";

const sample = {
  id: "abc123",
  volumeInfo: {
    title: "The Psychology of Money",
    subtitle: "Timeless lessons on wealth, greed, and happiness",
    authors: ["Morgan Housel"],
    description: "Doing well with money...",
    publisher: "Harriman House",
    publishedDate: "2020-09-08",
    pageCount: 256,
    language: "en",
    categories: ["Business & Economics"],
    imageLinks: { thumbnail: "http://books.google.com/img?id=abc123&zoom=1" },
    industryIdentifiers: [
      { type: "ISBN_10", identifier: "0857197681" },
      { type: "ISBN_13", identifier: "9780857197689" },
    ],
  },
};

describe("normalizeVolume", () => {
  it("maps fields and prefers ISBN_13", () => {
    const b = normalizeVolume(sample as any);
    expect(b.googleId).toBe("abc123");
    expect(b.title).toBe("The Psychology of Money");
    expect(b.authors).toEqual(["Morgan Housel"]);
    expect(b.isbn).toBe("9780857197689");
    expect(b.pageCount).toBe(256);
  });
  it("upgrades cover URL to https", () => {
    const b = normalizeVolume(sample as any);
    expect(b.cover?.startsWith("https://")).toBe(true);
  });
  it("tolerates a bare volume with no volumeInfo fields", () => {
    const b = normalizeVolume({ id: "x", volumeInfo: {} } as any);
    expect(b.googleId).toBe("x");
    expect(b.title).toBe("");
    expect(b.authors).toEqual([]);
    expect(b.isbn).toBeNull();
    expect(b.cover).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/books/google-books.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `src/lib/books/google-books.ts`**

Model on `src/lib/movies/tmdb.ts` (server-only, cached fetch). Implement:

```ts
import "server-only";

const BASE = "https://www.googleapis.com/books/v1";
const KEY = process.env.GOOGLE_BOOKS_API_KEY;

export type BookMetadata = {
  googleId: string;
  title: string;
  subtitle: string | null;
  authors: string[];
  description: string | null;
  cover: string | null;
  isbn: string | null;
  publisher: string | null;
  publishedDate: string | null;
  pageCount: number | null;
  language: string | null;
  categories: string[];
};

type GoogleVolume = {
  id: string;
  volumeInfo?: {
    title?: string;
    subtitle?: string;
    authors?: string[];
    description?: string;
    publisher?: string;
    publishedDate?: string;
    pageCount?: number;
    language?: string;
    categories?: string[];
    imageLinks?: { thumbnail?: string; smallThumbnail?: string };
    industryIdentifiers?: { type: string; identifier: string }[];
  };
};

export function googleBooksConfigured(): boolean {
  return true; // keyless works; key only raises quota
}

export function normalizeVolume(v: GoogleVolume): BookMetadata {
  const info = v.volumeInfo ?? {};
  const ids = info.industryIdentifiers ?? [];
  const isbn =
    ids.find((i) => i.type === "ISBN_13")?.identifier ??
    ids.find((i) => i.type === "ISBN_10")?.identifier ??
    null;
  const rawCover = info.imageLinks?.thumbnail ?? info.imageLinks?.smallThumbnail ?? null;
  return {
    googleId: v.id,
    title: info.title ?? "",
    subtitle: info.subtitle ?? null,
    authors: info.authors ?? [],
    description: info.description ?? null,
    cover: rawCover ? rawCover.replace(/^http:\/\//, "https://") : null,
    isbn,
    publisher: info.publisher ?? null,
    publishedDate: info.publishedDate ?? null,
    pageCount: info.pageCount ?? null,
    language: info.language ?? null,
    categories: info.categories ?? [],
  };
}

async function gbFetch(path: string): Promise<any | null> {
  const sep = path.includes("?") ? "&" : "?";
  const url = `${BASE}${path}${KEY ? `${sep}key=${KEY}` : ""}`;
  const res = await fetch(url, { next: { revalidate: 86400 } });
  if (!res.ok) return null;
  return res.json();
}

export async function searchBooks(query: string): Promise<BookMetadata[]> {
  const q = query.trim();
  if (!q) return [];
  const data = await gbFetch(`/volumes?q=${encodeURIComponent(q)}&maxResults=12`);
  const items: GoogleVolume[] = data?.items ?? [];
  return items.map(normalizeVolume);
}

export async function getBookDetails(googleId: string): Promise<BookMetadata | null> {
  const data = await gbFetch(`/volumes/${encodeURIComponent(googleId)}`);
  if (!data?.id) return null;
  return normalizeVolume(data);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/books/google-books.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/books/google-books.ts src/lib/books/google-books.test.ts
git commit -m "feat(books): Google Books metadata service

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: Query layer (read access)

**Files:**
- Create: `src/lib/books/queries.ts`

**Interfaces:**
- Consumes: `supabaseAnon()`, `supabaseAdmin()` from `src/lib/supabase/server.ts`; mappers + `*_SELECT` from `./types`.
- Produces (all `async`, public reads fail soft to `[]`/`null`):
  - `getPublishedBooks(): Promise<BookWithRelations[]>`
  - `getBookBySlug(slug: string): Promise<BookWithRelations | null>`
  - `getPublishedBookSlugs(): Promise<string[]>`
  - `getBooksByGenre(slug: string): Promise<BookWithRelations[]>`
  - `getAutoFeed(feed: string): Promise<BookWithRelations[]>` (`currently_reading`|`recently_finished`|`recommended`|`want_to_read`|`favourites`)
  - `getPublishedCollections(): Promise<BookCollection[]>`, `getCollectionBySlug(slug): Promise<{collection:BookCollection; books:BookWithRelations[]}|null>`
  - `getPublicNotes(bookId: string): Promise<BookNote[]>`
  - `getHomepageSections()` resolver
  - admin (service role): `getAllBooksAdmin()`, `getBookByIdAdmin(id)`, `getBookByGoogleIdAdmin(googleId)`, `getAllCollectionsAdmin()`, `getCollectionByIdAdmin(id)`

- [ ] **Step 1: Write `src/lib/books/queries.ts`**

Open `src/lib/movies/queries.ts` and mirror it function-for-function, swapping table/column names per Task 1 and the mappers from Task 2. Define the relations select:

```ts
import "server-only";
import { supabaseAnon, supabaseAdmin } from "@/lib/supabase/server";
import { /* mappers, types, *_SELECT */ } from "./types";

const BOOK_WITH_RELATIONS = `
  *,
  reading:book_reading(*),
  review:book_reviews(*),
  genres:book_genres(genre:book_genres_ref(id,name,slug))
`;
```

Rules to preserve from the movies version:
- Public reads use `supabaseAnon()`, wrap in try/catch (or check `error`) and return `[]`/`null` on failure so prerender never throws.
- `getBookBySlug` selects `BOOK_WITH_RELATIONS`, then stitches via `mapBookWithRelations` (flatten the `genres` embed to `{id,name,slug}[]`; embed of a 1:1 returns an array from PostgREST — take `[0] ?? null` for `reading`/`review`).
- Auto feeds join `book_reading`: `currently_reading` → status eq; `recently_finished` → status finished order by `finished_at desc`; `recommended` → `review.recommendation_type in ('Must Read','Highly Recommended')`; `favourites` → high `review.rating`; `want_to_read` → status want_to_read. Filter in memory after fetching published books (mirror movies' `getTopRated`/`getMustWatch` in-memory approach — `ponytail:` in-memory is fine at this scale, swap to indexed query when the shelf grows).
- Admin reads use `supabaseAdmin()` and drop the `is_published`/`published` filters.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors in `src/lib/books/*`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/books/queries.ts
git commit -m "feat(books): query layer (public + admin reads)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: Server actions (writes + Google Books import)

**Files:**
- Create: `src/lib/books/actions.ts`

**Interfaces:**
- Consumes: `supabaseAdmin()`, `getAdminUser()` (from `src/lib/auth/session.ts`), `createClient()` (cookie-aware, for visitor list), `computePercentage`/`slugify` from `./types`, `searchBooks`/`getBookDetails`/`normalizeVolume` from `./google-books`, `revalidatePath`.
- Produces (all re-check admin except the visitor-list ones):
  - `createBook(input)`, `updateBook(id, input)`, `setBookPublished(id, published)`, `deleteBook(id)`, `duplicateBook(id)`
  - `setBookGenres(bookId, genreIds)`, `setBookCollections(bookId, collectionIds)`
  - `createCollection`/`updateCollection`/`setCollectionPublished`/`deleteCollection`/`setCollectionBooks`
  - note CRUD: `saveNote`/`deleteNote`
  - page CRUD: `saveBookPage`/`deleteBookPage`/`reorderBookPages`
  - homepage CRUD: `saveHomepageSection`/`deleteHomepageSection`/`reorderHomepageSections`
  - `searchGoogleBooks(query)`, `importFromGoogleBooks(googleId)`, `refreshCoversFromGoogleBooks()`
  - visitor: `toggleBookList(bookId, status)`, `getBookListState()`

- [ ] **Step 1: Write `src/lib/books/actions.ts`**

Open `src/lib/movies/actions.ts` and mirror it. Key rules to carry over verbatim:
- File starts `"use server";`. Every admin action begins `const admin = await getAdminUser(); if (!admin) return { error: "Not authorised." };`.
- Sanitizers `clean()`, `cleanUrl()`, `toInt()` and length caps — copy from movies.
- `uniqueSlug(db, "books", title, excludeId?)` — copy the movies helper; slug set on create, never changed on update.
- `createBook`: insert `books`, then upsert `book_reading` and `book_reviews`; **on review/reading insert failure, delete the book row** (rollback), mirroring movies. On update use `.upsert(row, { onConflict: "book_id" })`.
- **Percentage:** whenever writing `book_reading`, set `percentage = computePercentage(current_page, total_pages, status)`; when `status === 'finished'` and `finished_at` empty, default it to today.
- `setBookGenres` = delete-all-then-insert; `setBookCollections`/`setCollectionBooks` = diff add/remove then append at tail (copy movies `setMovieCollections`).
- `importFromGoogleBooks(googleId)`: `getBookDetails`, map to a book-insert payload, **only fill empty metadata fields — never overwrite editorial fields** (review/reading untouched); if a book with that `google_id` exists, return its id (flag as existing) rather than duplicating.
- `refreshCoversFromGoogleBooks()`: for published books missing `cover_url` (or all, per movies' refresh semantics — match `refreshArtworkFromTmdb`: only fill empty cover/backdrop, plus google_id/isbn when empty), fetch in parallel batches of 8, return `{ updated, skipped, failed }`.
- `toggleBookList`/`getBookListState`: use the cookie-aware `createClient()` (the logged-in user's client), operate on `user_book_list` own-rows; copy movies `toggleMyList`/`getMyListState`, adding the `status` column.
- End every mutation with `revalidatePath(...)` for the affected `/books*` paths (define a local `revalidateBooks(slug?)` helper mirroring `revalidateMovies`).

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/books/actions.ts
git commit -m "feat(books): server actions + Google Books import

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 6: Seed data

**Files:**
- Create: `supabase/seed/books_seed.sql`

**Interfaces:**
- Consumes: tables from Task 1 (genres already seeded by the migration).
- Produces: demo content for slices 2–4 to render.

- [ ] **Step 1: Write `supabase/seed/books_seed.sql`**

Model on `supabase/seed/movies_seed.sql`. Idempotent inserts (`on conflict (slug) do nothing` for books/collections; use CTEs or `insert ... select` joining on slug to wire relations). Include:
- 15 real books (e.g. Psychology of Money, Atomic Habits, Deep Work, Thinking Fast and Slow, Zero to One, Influence, Sapiens, The Almanack of Naval, Shoe Dog, Hooked, Made to Stick, Range, The Hard Thing About Hard Things, Contagious, Building a StoryBrand) with title/slug/author/description/cover_url (real Google Books thumbnail URLs or placeholders)/page_count/publication_year/`is_published = true`.
- `book_reading` rows: ~3 `currently_reading` with `current_page`/`total_pages`/`percentage` (precomputed), several `finished` with `finished_at`, some `want_to_read`.
- `book_reviews` for the finished/currently-reading ones: `rating`, `verdict`, `recommendation_type` (from the vocab), `short_review`, `full_review`, `why_read`, `why_recommend`, `what_i_learned` (3–4 newline-separated lessons), `who_should_read`, `published = true`.
- `book_notes`: 2–3 published notes on a couple of books (chapter/page/quote/note/tags).
- genre links via `book_genres` (join on `book_genres_ref.slug`).
- 6 shelves in `book_collections` ("Currently Reading","Books I'd Recommend","Books That Changed My Thinking","Business & Marketing","My Favourites","Want to Read") with `display_order`; membership in `book_collection_items`.
- `book_homepage_sections`: a `hero` (kind hero, a currently-reading book), then `auto` sections (currently_reading, recently_finished, recommended, want_to_read) and 1–2 `collection` sections, ordered.

- [ ] **Step 2: Static review**

Re-read: confirm every relation insert resolves against a book/collection slug that exists earlier in the file, precomputed percentages match `round(page/total*100)`, and recommendation_type / status / auto_feed / page_type / kind values are all within the migration's CHECK lists.

- [ ] **Step 3: Commit**

```bash
git add supabase/seed/books_seed.sql
git commit -m "feat(books): seed data (15 books, shelves, reviews, notes)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 7: Full verification + PR

**Files:** none (verification only).

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: PASS, including the two new files. Fix any regressions before proceeding.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: clean (fix any new warnings in `src/lib/books/*`).

- [ ] **Step 4: Production build**

Run: `npm run build`
Expected: exit 0. This is the real check that `server-only` imports don't leak into a client boundary (per project rule: trust the exit code). No new routes exist, so the route list should be unchanged plus nothing.

- [ ] **Step 5: Push and open PR (do NOT merge, do NOT apply the migration)**

```bash
git push -u origin feat/books-data-foundation
```

Then open a PR. **Read `docs/PR-TWEET.md` first** and add a `Tweet:` line to the PR body (feat scope auto-announces to /community, or add the `no-announce` label if this internal foundation slice shouldn't post). PR body notes: this slice adds schema + service + lib scaffold + seed, no UI; the migration `20260909000001_books.sql` and `books_seed.sql` are **hand-run by the user** — include the SQL / file paths in the PR description so the user can run them in the Supabase SQL editor after review. Do not merge or apply until the user gives the OK.

---

## Self-Review

**Spec coverage:** books/reading/reviews/notes/genres/collections/homepage_sections/book_pages/user_book_list tables → Task 1 ✓; Google Books service → Task 3 ✓; types/vocab/mappers/percentage → Task 2 ✓; queries → Task 4 ✓; actions incl. import + visitor list → Task 5 ✓; seed → Task 6 ✓; verification/build → Task 7 ✓. Lessons-as-text (`what_i_learned`) ✓. Per-note published flag ✓. Percentage computed in action ✓. No routes/UI (correctly out of scope) ✓.

**Placeholder scan:** Pure/tested code (Tasks 2, 3) is given in full. Tasks 4/5/6 point to a concrete in-repo file to mirror plus exact interface signatures and per-function transformation rules — the reference implementation exists in the repo, so this is copy-with-named-changes, not a "TODO". No "add error handling"-style hand-waving (fail-soft/rollback/revalidate rules are spelled out).

**Type consistency:** `computePercentage(currentPage, totalPages, status)` and `slugify` signatures identical across Tasks 2/5. `normalizeVolume`/`BookMetadata` identical across Tasks 3/5. `BookWithRelations` shape defined in Task 2, produced in Task 4, matches the `BOOK_WITH_RELATIONS` embed aliases (`reading`/`review`/`genres`).
