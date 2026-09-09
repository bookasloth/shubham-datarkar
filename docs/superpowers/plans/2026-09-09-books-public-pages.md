# Books Public Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the public, crawlable Books pages (`/books` index, `/books/[slug]`, `/books/shelf/[slug]`, `/books/genre/[slug]`, `/books/[slug]/notes`, `/books/search`, `/books/my-list`) with SSR, ISR, JSON-LD, and sitemap — the SEO substrate Slice 4 will enhance.

**Architecture:** Thin App Router server components (ISR `revalidate=300`, except `force-dynamic` search/my-list) that call existing `src/lib/books/queries.ts` reads; a `BooksProvider` fetches the viewer's My List client-side so pages stay statically renderable. UI mirrors `src/components/movies/*` with `Book`-typed equivalents; the generic `Poster` and the primitive-prop `RecommendationBadge`/`MovieRating` are reused as-is. SEO via a new `bookSchema` in `src/lib/seo.ts` + `<JsonLd>`.

**Tech Stack:** Next.js 16 App Router, React 19, Supabase, Tailwind v4, Vitest, lucide-react, schema.org JSON-LD.

**Spec:** `docs/superpowers/specs/2026-09-09-books-public-pages-design.md`

## Global Constraints

- Branch `feat/books-public-pages` off `main` (already created). PR to `main`, `no-announce`... EXCEPT: this slice ships a real user-facing feature (public Books pages), so it MAY announce — read `docs/PR-TWEET.md` and add a `Tweet:` line, OR label `no-announce` if the owner prefers silence. Do NOT merge; do NOT apply SQL (none in this slice).
- Public reads use the existing anon-client fail-soft queries (return `[]`/`null`, never throw — pages must prerender). My List uses the session/cookie client under RLS.
- Pages must stay statically renderable under ISR: never pass per-user data into the server render; the provider fetches My List on mount (mirror movies).
- Reuse `@/components/movies/poster` (`Poster`), and reuse `RecommendationBadge` + `MovieRating` from `@/components/movies/*` (their props are primitives: `type: string|null`, `rating: number|null` — confirmed). Do NOT duplicate these.
- `revalidate = 300` on index/detail/shelf/genre/notes; `dynamic = "force-dynamic"` + `noIndex` on search/my-list.
- Every `[slug]` route: `generateStaticParams` + async `generateMetadata` ({ params }: { params: Promise<{slug}> }, awaited). OG images injected via `{ ...base.openGraph, images:[{url}] }` (buildMetadata omits OG images by design).
- Attribution trailer on commits: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- Ignore any `src/app/playlists/*` or `.next/types` errors from other work — verify books files in isolation.

### Existing to consume
- Queries (slice 1, anon fail-soft): `getPublishedBooks`, `getBookBySlug`, `getPublishedBookSlugs` (→ `string[]`), `getBooksByGenre(slug)`, `getAutoFeed(feed)`, `getPublishedCollections`, `getCollectionBySlug(slug)` (`{collection, books}`), `getPublicNotes(bookId)`, `getHomepageSections()` (→ `ResolvedBookHomepageSection[]` = `{ section, hero, collectionSlug, books }` — CONFIRM the field is `books` not `movies`).
- Actions: `getBookListState()`, `toggleBookList(bookId, status)`.
- Types: `Book`, `BookWithRelations`, `BookCollection`, `BookNote`, `RECOMMENDATION_TYPES`, `READING_STATUSES`, `MOODS` from `@/lib/books/types`.
- SEO: `buildMetadata`, `breadcrumbSchema`, `collectionSchema` from `@/lib/seo`; `<JsonLd>` from `@/components/seo/json-ld`; `isLoggedIn()` shared helper (find via grep — used by `src/app/movies/my-list/page.tsx`).

---

### Task 1: SEO `bookSchema` + new public queries + sitemap wiring

**Files:**
- Modify: `src/lib/seo.ts` (add `bookSchema`)
- Modify: `src/lib/books/queries.ts` (add public queries)
- Modify: `src/app/sitemap.ts`, `src/lib/seo/routes.ts`
- Create: `src/lib/books/public-queries.test.ts`

**Interfaces:**
- Produces `bookSchema(input: { title; description; path; image?; author?; isbn?; numberOfPages?; datePublished?; genres?; review?: { rating: number|null; body?: string|null } | null })` → schema.org `Book` node (mirror `movieSchema`; `author` → `{ "@type":"Person", name }`; embedded `review` identical to movie's).
- Produces queries (anon, fail-soft): `getPublishedBookSlugsWithDates(): Promise<{slug,updatedAt}[]>`, `getSimilarBooks(book, limit=14): Promise<BookWithRelations[]>`, `getBookGenres(): Promise<{id,name,slug}[]>`, `getGenreBySlug(slug): Promise<{id,name,slug}|null>`, `getPublishedCollectionSlugs(): Promise<string[]>`, `searchPublishedBooks(q): Promise<BookWithRelations[]>`, `getMyBookListBooks(): Promise<BookWithRelations[]>`.

- [ ] **Step 1: Write the failing test** (pure logic: similar + search)

```ts
// src/lib/books/public-queries.test.ts
import { describe, it, expect } from "vitest";
import { rankSimilarBooks, matchBookQuery } from "./public-queries-helpers";

const mk = (o: Partial<{ id: string; title: string; author: string; isbn: string; genres: {id:string;name:string;slug:string}[]; moods: string[] }>) =>
  ({ id: o.id ?? "x", title: o.title ?? "T", author: o.author ?? "A", isbn: o.isbn ?? "", moods: o.moods ?? [], genres: o.genres ?? [] } as any);

describe("rankSimilarBooks", () => {
  const target = mk({ id: "t", author: "Housel", genres: [{id:"g1",name:"Finance",slug:"finance"}] });
  const pool = [
    mk({ id: "t", author: "Housel", genres:[{id:"g1",name:"Finance",slug:"finance"}] }), // self, excluded
    mk({ id: "a", author: "Housel", genres:[{id:"g2",name:"Biz",slug:"biz"}] }),          // author match
    mk({ id: "b", author: "X", genres:[{id:"g1",name:"Finance",slug:"finance"}] }),        // genre match
    mk({ id: "c", author: "Y", genres:[{id:"g9",name:"Sci",slug:"sci"}] }),                // no overlap
  ];
  const out = rankSimilarBooks(target, pool, 10);
  it("excludes self", () => { expect(out.find(b => b.id === "t")).toBeUndefined(); });
  it("ranks overlaps above non-overlaps", () => {
    const ids = out.map(b => b.id);
    expect(ids.indexOf("a")).toBeLessThan(ids.indexOf("c"));
    expect(ids.indexOf("b")).toBeLessThan(ids.indexOf("c"));
  });
});

describe("matchBookQuery", () => {
  const b = mk({ title: "Atomic Habits", author: "James Clear", isbn: "9780735211292", genres:[{id:"g",name:"Self-Help",slug:"self-help"}], moods:["Practical"] });
  it("matches title case-insensitively", () => { expect(matchBookQuery(b, "atomic")).toBe(true); });
  it("matches author", () => { expect(matchBookQuery(b, "clear")).toBe(true); });
  it("matches isbn", () => { expect(matchBookQuery(b, "9780735211292")).toBe(true); });
  it("matches genre + mood", () => { expect(matchBookQuery(b, "self-help")).toBe(true); expect(matchBookQuery(b, "practical")).toBe(true); });
  it("no false match", () => { expect(matchBookQuery(b, "zzz")).toBe(false); });
});
```

- [ ] **Step 2: Run — expect FAIL** (`npm test -- src/lib/books/public-queries.test.ts`; module missing).

- [ ] **Step 3: Implement.**
  - Create `src/lib/books/public-queries-helpers.ts` (PURE, no server-only): `rankSimilarBooks(target, pool, limit)` (filter out `target.id`; score = genre-id overlap count + `author` equality bonus; sort desc; slice) and `matchBookQuery(book, q)` (lowercased substring over title, author, isbn, genre names, moods). Both operate on `BookWithRelations`-ish shapes.
  - In `queries.ts`: `getSimilarBooks` = `rankSimilarBooks(book, await getPublishedBooks(200), limit)`; `searchPublishedBooks(q)` = `q ? (await getPublishedBooks(500)).filter(b => matchBookQuery(b, q.toLowerCase())) : []` (add a `ponytail:` note re FTS). `getPublishedBookSlugsWithDates` selects `slug, updated_at` from published books. `getBookGenres` selects all `book_genres_ref` rows (mapped `{id,name,slug}`). `getGenreBySlug` selects one. `getPublishedCollectionSlugs` selects `slug` from `book_collections where is_published`. `getMyBookListBooks` — mirror `getMyListMovies` in `src/lib/movies/queries.ts` (session client → `user_book_list` rows for the user → hydrate via anon `getBookBySlug`/an id-based fetch). All fail-soft.
  - In `seo.ts`: add `bookSchema` mirroring `movieSchema` (open `movieSchema` to copy the `personRef`/review block; import `personRef` the same way).
  - In `sitemap.ts`: add the three fetches to the `Promise.all`, push `DynamicExpansion`s for `/^\/books\/\[slug\]$/`, `/^\/books\/shelf\/\[slug\]$/`, `/^\/books\/genre\/\[slug\]$/`, add the `lastMod.set` loop for book slugs, add `/books` to `HIGH_PRIORITY_PREFIXES`.
  - In `seo/routes.ts`: add `/books/search`, `/books/my-list` to `APP_ROUTES`.

- [ ] **Step 4: Run — expect PASS.** Then `npx tsc --noEmit` (zero books/seo/sitemap errors).

- [ ] **Step 5: Commit**

```bash
git add src/lib/seo.ts src/lib/books/queries.ts src/lib/books/public-queries-helpers.ts src/lib/books/public-queries.test.ts src/app/sitemap.ts src/lib/seo/routes.ts
git commit -m "feat(books): bookSchema, public queries, sitemap + routes wiring"
```

---

### Task 2: Book UI primitives — provider, nav, card, rail, grid, hero, modal, badges

**Files (create under `src/components/books/`):**
- `books-context.tsx`, `books-provider.tsx`, `book-nav.tsx`, `book-card.tsx`, `book-rail.tsx`, `book-grid.tsx`, `book-hero.tsx`, `book-modal.tsx`, `book-collection-card.tsx`, `reading-status-badge.tsx`, `book-progress.tsx`, `my-book-list-button.tsx`.

**Interfaces:** mirror the movies components (see spec table). Reuse `Poster` from `@/components/movies/poster`; reuse `RecommendationBadge` + `MovieRating` from `@/components/movies/*`. Consume `Book`/`BookWithRelations`/`BookCollection` from `@/lib/books/types`, `getBookListState`/`toggleBookList` from `@/lib/books/actions`, `READING_STATUSES` for labels.

- [ ] **Step 1: Build `books-context.tsx` + `books-provider.tsx`** mirroring `movies-context.tsx`/`movies-provider.tsx`: context `{ open:(book)=>void; isSaved:(id)=>boolean; toggle:(id, status?)=>void; loggedIn:boolean }`; provider fetches `getBookListState()` on mount, optimistic `toggle` → `toggleBookList` (revert + toast on error; sign-in prompt when logged out), renders `<BookModal>` alongside children. `useBooks()` hook throws outside provider.

- [ ] **Step 2: Build the presentational pieces.**
  - `reading-status-badge.tsx` `ReadingStatusBadge` `{ status: string|null }` — map READING_STATUSES → label + tone chip; null → nothing.
  - `book-progress.tsx` `BookProgress` `{ percentage: number|null }` — slim bar + `N%`; null → nothing.
  - `book-card.tsx` `BookCard` (client) — cover `Poster`, click → `useBooks().open(book)` (preventDefault on the wrapping `/books/${slug}` Link), `RecommendationBadge`+`MovieRating`, `ReadingStatusBadge`+`BookProgress` when currently-reading, title+author line.
  - `book-rail.tsx` `BookRail` (client) — snap-scroll row of `BookCard` + arrows + optional "See all" `href`; null if empty.
  - `book-grid.tsx` `BookGrid` (server) — responsive grid of `BookCard`.
  - `book-hero.tsx` `BookHero` (server) — backdrop/cover, badge+rating, title, author, status+progress, blurb (`review.shortReview ?? review.verdict ?? description`), "Read my thoughts" link to `/books/${slug}` + `MyBookListButton`.
  - `book-collection-card.tsx` `BookShelfCard` (server) — cover tile linking `/books/shelf/${slug}`.
  - `book-modal.tsx` `BookModal` (client) — Dialog: cover, title, author, rating, status+progress, verdict, short review, whyRecommend, links to `/books/${slug}` and `/books/${slug}/notes`.
  - `my-book-list-button.tsx` `MyBookListButton` `{ bookId, variant?, size?, iconOnly? }` — `useBooks().isSaved/toggle`.
  - `book-nav.tsx` `BookNav` (client) — tabs Discover(`/books`)/Collections(no dedicated index yet → point at `/books#shelves` or omit)/My List(`/books/my-list`) + GET `<form action="/books/search">` search box; `usePathname` active state.

- [ ] **Step 3: Type-check + lint.** `npx tsc --noEmit`; `npx eslint src/components/books/` — both clean, no `any`.

- [ ] **Step 4: Commit**

```bash
git add src/components/books/
git commit -m "feat(books): public UI components (provider, nav, card, rail, grid, hero, modal, badges)"
```

---

### Task 3: Layout + `/books` homepage

**Files:**
- Create: `src/app/books/layout.tsx`, `src/app/books/page.tsx`

**Interfaces:** Consumes `BooksProvider`/`BookNav` (Task 2), `getHomepageSections`/`getPublishedCollections`/`getPublishedBooks`/`getAutoFeed` (queries), `BookHero`/`BookRail`/`BookShelfCard`.

- [ ] **Step 1: `layout.tsx`** mirror `src/app/movies/layout.tsx`: `<BooksProvider><div class="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8"><BookNav />{children}</div></BooksProvider>`.

- [ ] **Step 2: `page.tsx`** (`revalidate=300`, static `metadata = buildMetadata({ title: "Books I'm Reading & Recommend", description: "...", path: "/books" })`), mirror `movies/page.tsx`: resolve `getHomepageSections()` + `getPublishedCollections()`; `buildFallback()` = `{ recent: await getPublishedBooks(20), hero: recent[0] ?? null }` when no section content; render `BookHero` (from hero section or fallback), then non-empty non-hero sections as `BookRail`s (href → `/books/shelf/${collectionSlug}` when present), a "Currently Reading"/"Recently Finished" rail from `getAutoFeed` if not already covered, then a "Browse shelves" grid of `BookShelfCard`, and an empty state when nothing resolves. CONFIRM the `ResolvedBookHomepageSection` field name (`books` vs `movies`) by reading `queries.ts` and use it.

- [ ] **Step 3: Type-check + lint.** `npx tsc --noEmit`; `npx eslint "src/app/books/layout.tsx" "src/app/books/page.tsx"`.

- [ ] **Step 4: Commit**

```bash
git add src/app/books/layout.tsx src/app/books/page.tsx
git commit -m "feat(books): /books layout + cinematic-ready SSR homepage"
```

---

### Task 4: `/books/[slug]` full book page + JSON-LD

**Files:**
- Create: `src/app/books/[slug]/page.tsx`

**Interfaces:** Consumes `getBookBySlug`, `getSimilarBooks`, `getPublicNotes`, `getPublishedBookSlugs`, `getCollectionBySlug`-adjacent (related shelves optional); `bookSchema`+`breadcrumbSchema`+`<JsonLd>`; `Poster`, `RecommendationBadge`, `MovieRating`, `ReadingStatusBadge`, `BookProgress`, `BookRail`, `MyBookListButton`, `Breadcrumb`.

- [ ] **Step 1: Build the page**, mirroring `src/app/movies/[slug]/page.tsx`:
  - `revalidate=300`; `generateStaticParams` from `getPublishedBookSlugs()` (`.map(slug => ({ slug }))`); async `generateMetadata` (title `\`${book.title} by ${book.author} — My Review\``, description from `review.shortReview ?? review.verdict ?? description`, `type:"article"`, published/modified times, OG image from `backdropUrl ?? coverUrl`, noIndex fallback when missing).
  - Data: `getBookBySlug(slug)` → `notFound()` if null; `Promise.all([getSimilarBooks(book, 14), getPublicNotes(book.id)])`.
  - `<JsonLd data={[ bookSchema({ title, description: description ?? review?.shortReview ?? title, path:`/books/${slug}`, image: backdropUrl ?? coverUrl, author: book.author, isbn: book.isbn, numberOfPages: book.pageCount, datePublished: book.publicationDate, genres: genres.map(g=>g.name), review: review ? { rating: review.rating, body: review.shortReview ?? review.verdict } : null }), breadcrumbSchema([{name:"Home",path:"/"},{name:"Books",path:"/books"},{name:book.title,path:`/books/${slug}`}]) ]} />`.
  - Structure: `<Breadcrumb>`, hero header (cover + backdrop gradient, `RecommendationBadge`+`MovieRating`, `<h1>`, author, `ReadingStatusBadge`+`BookProgress`, meta row [year, pages, language], genre chips → `/books/genre/${slug}`, `MyBookListButton`), two-col `lg:grid-cols-[1fr_320px]`: main = "My Verdict" (rating big + badge + verdict) then `Prose` blocks for `whyRead`, `shortReview`+`fullReview`, `whyRecommend`, `whatILearned` (rendered as a numbered/•-list by splitting on newlines), `whoShouldRead`, `whoShouldNotRead` (each rendered only when present); sidebar `<aside>` = "Book Information" `<dl>` (author, publisher, publication date, pages, language, ISBN, genres, moods) + a "My Notes" preview (first ~3 published notes + a "Read all notes" link to `/books/${slug}/notes` when `notes.length`).
  - Footer: `similar.length && <BookRail title="Related Books" books={similar} />`.
  - Local `Prose`/`Info` components as in the movies page.

- [ ] **Step 2: Type-check + lint.** `npx tsc --noEmit`; `npx eslint "src/app/books/[slug]/page.tsx"`.

- [ ] **Step 3: Commit**

```bash
git add "src/app/books/[slug]/page.tsx"
git commit -m "feat(books): full book page with Book/Review JSON-LD"
```

---

### Task 5: Notes page, shelf page, genre page

**Files:**
- Create: `src/app/books/[slug]/notes/page.tsx`, `src/app/books/shelf/[slug]/page.tsx`, `src/app/books/genre/[slug]/page.tsx`

**Interfaces:** Consumes `getBookBySlug`, `getPublicNotes`, `getCollectionBySlug`, `getPublishedCollectionSlugs`, `getBooksByGenre`, `getGenreBySlug`, `getBookGenres`; `BookGrid`, `Breadcrumb`, `collectionSchema`/`breadcrumbSchema`+`<JsonLd>`, `buildMetadata`.

- [ ] **Step 1: `[slug]/notes/page.tsx`** (`revalidate=300`): `generateMetadata` per-slug (title `\`${book.title} — My Notes\``, noIndex fallback). Data: `getBookBySlug(slug)` → notFound; `getPublicNotes(book.id)`. Breadcrumb JSON-LD. Render `<Breadcrumb>`, `<h1>My Notes — {book.title}</h1>`, notes grouped by `chapter` (fallback "Notes" when null), each: chapter heading, page label, optional quote (blockquote), my-note text, tag chips. Empty state "No notes yet." Link back to `/books/${slug}`.

- [ ] **Step 2: `shelf/[slug]/page.tsx`** (`revalidate=300`): `generateStaticParams` from `getPublishedCollectionSlugs()`; `generateMetadata` (from `getCollectionBySlug` → collection.title/description, OG from coverUrl or first book, noIndex fallback). Data: `getCollectionBySlug(slug)` → notFound if null. JSON-LD `[collectionSchema({ title, description, path:`/books/shelf/${slug}`, movies: books.map(b => ({ title: b.title, path:`/books/${b.slug}` })) }), breadcrumbSchema([...])]`. Render cover header + description + `<BookGrid books={books} />`, empty state.

- [ ] **Step 3: `genre/[slug]/page.tsx`** (`revalidate=300`): `generateStaticParams` from `getBookGenres()`; `generateMetadata` (from `getGenreBySlug` → `\`${genre.name} Books I Recommend\``, noIndex fallback). Data: `getGenreBySlug(slug)` → notFound; `getBooksByGenre(slug)`. Breadcrumb JSON-LD. `<h1>`, `<BookGrid>`, empty state.

- [ ] **Step 4: Type-check + lint.** `npx tsc --noEmit`; `npx eslint "src/app/books/[slug]/notes" "src/app/books/shelf" "src/app/books/genre"`.

- [ ] **Step 5: Commit**

```bash
git add "src/app/books/[slug]/notes" "src/app/books/shelf" "src/app/books/genre"
git commit -m "feat(books): notes, shelf, and genre public pages"
```

---

### Task 6: Search + My List pages

**Files:**
- Create: `src/app/books/search/page.tsx`, `src/app/books/my-list/page.tsx`

**Interfaces:** Consumes `searchPublishedBooks`, `getMyBookListBooks`, `isLoggedIn`; `BookGrid`, `buildMetadata`.

- [ ] **Step 1: `search/page.tsx`** (`dynamic="force-dynamic"`, `metadata = buildMetadata({ title:"Search Books", path:"/books/search", noIndex:true })`): `searchParams: Promise<{q?:string}>`; `const q = (await searchParams).q?.trim() ?? ""; const results = q ? await searchPublishedBooks(q) : [];` Render `<h1>`, count, empty-prompt (no query) / no-results (suggest browsing shelves) / `<BookGrid books={results} />`. Mirror `movies/search/page.tsx`.

- [ ] **Step 2: `my-list/page.tsx`** (`dynamic="force-dynamic"`, `noIndex`): `const [loggedIn, books] = await Promise.all([isLoggedIn(), getMyBookListBooks()]);` three states: signed-out → CTA `/login?returnTo=/books/my-list`; empty → "Nothing on your list yet."; else `<BookGrid books={books} />`. Mirror `movies/my-list/page.tsx`.

- [ ] **Step 3: Type-check + lint.** `npx tsc --noEmit`; `npx eslint "src/app/books/search" "src/app/books/my-list"`.

- [ ] **Step 4: Commit**

```bash
git add "src/app/books/search" "src/app/books/my-list"
git commit -m "feat(books): search + my-list public pages"
```

---

### Task 7: Verify + PR

**Files:** none.

- [ ] **Step 1: Full test suite.** `npm test` — all pass (incl. new public-queries test).
- [ ] **Step 2: Books type-check.** `npx tsc --noEmit 2>&1 | grep -E "books|seo|sitemap" | grep -v playlist || echo NO_BOOKS_TSC_ERRORS`.
- [ ] **Step 3: Lint.** `npx eslint src/lib/books/ src/components/books/ "src/app/books/" src/lib/seo.ts` — clean.
- [ ] **Step 4: Production build.** `npm run build` — exit 0; confirm `/books`, `/books/[slug]`, `/books/shelf/[slug]`, `/books/genre/[slug]`, `/books/[slug]/notes`, `/books/search`, `/books/my-list` all appear in the route manifest.
- [ ] **Step 5: Push + PR to `main`.** `git push -u origin feat/books-public-pages`. Open the PR — this is a user-facing feature, so read `docs/PR-TWEET.md` and add a `Tweet:` line (or `no-announce` if the owner prefers). Body: slice-3 public pages, live-verify steps (validate one book's Book JSON-LD; check `/sitemap.xml` includes book slugs), Slice-4 will enhance `/books` + `/books/[slug]` with the bookshelf/open-book. Do NOT merge.

---

## Self-Review

**Spec coverage:** bookSchema + queries + sitemap + routes → T1; UI components + provider → T2; layout + homepage → T3; full book page + JSON-LD → T4; notes/shelf/genre → T5; search/my-list → T6; verify+PR → T7. All spec routes covered; ISR/force-dynamic/noIndex placement matches spec; My-List client-fetch preserves static render (T2 provider). Reuse of Poster/RecommendationBadge/MovieRating stated (Global Constraints).

**Placeholder scan:** pure logic (T1 `rankSimilarBooks`/`matchBookQuery`) given with full failing test; UI/page tasks name the exact movies files to mirror + the exact queries/props/JSON-LD shape — copy-with-named-changes against in-repo references, as in prior slices. No hand-waving.

**Type consistency:** query return types match consumers (`BookWithRelations` throughout; `getMyBookListBooks`/`getSimilarBooks`/`searchPublishedBooks` all `BookWithRelations[]`). `bookSchema` input matches its call in T4. `ResolvedBookHomepageSection` field name flagged to CONFIRM in T3 (books vs movies) — resolves a real ambiguity from the slice-1 mirror. Reused primitive-prop components confirmed non-`Movie`-typed.

**Risks flagged in-plan:** homepage-section field name (T3 confirm); My-List RLS/session-client correctness (T6/spec); reuse coupling (Global Constraints).
