# Books / Reading — Public Pages (Slice 3)

Third slice: the public, crawlable Books pages — the SEO-first substrate that
Slice 4's cinematic bookshelf + open-book reader will enhance. Mirrors the
public Movies routes (`src/app/movies/*`, `src/app/collections/*`) and their
SEO/JSON-LD patterns. Builds on Slices 1+2 (now on `main`).

Spec of prior slices: `docs/superpowers/specs/2026-09-09-books-{data-foundation,admin-cms}-design.md`.

## Decisions (from brainstorming)

- `/books` landing: a **simple SSR index now** (hero + shelf/rail sections + collections), fully crawlable; Slice 4 swaps its *presentation* for the bookshelf, reusing the same data/SSR content.
- `/books/[slug]`: a **rich crawlable SSR page now** (all editorial + Book/Review JSON-LD); Slice 4 layers the interactive open-book reader on top as progressive enhancement (crawlers + reduced-motion always get the HTML).
- Branches fresh from `main` (`feat/books-public-pages`); no stacking.

## Routes (App Router, server components; ISR `revalidate = 300` except search/my-list)

- `src/app/books/layout.tsx` — wraps `BooksProvider` + `BookNav` in the `max-w-7xl` shell (mirror `movies/layout.tsx`).
- `src/app/books/page.tsx` — homepage: resolve `getHomepageSections()` + `getPublishedCollections()`, `buildFallback()` when unseeded; `BookHero` + `BookRail`s + shelves grid. `revalidate=300`; static `metadata`.
- `src/app/books/[slug]/page.tsx` — full book page. `generateStaticParams` (from `getPublishedBookSlugs()`), async `generateMetadata` (per-slug title/description/OG from cover/backdrop), `JsonLd` with `[bookSchema(...), breadcrumbSchema(...)]`. Structure mirrors the movie detail: hero (cover/backdrop, `RecommendationBadge`+`BookRating`, title, author, meta, reading status + progress, genre chips, `MyBookListButton`), then two-col: main = My Verdict + review prose blocks (`shortReview`+`fullReview`, `whyRead`, `whyRecommend`, `whatILearned` as a lessons list, `whoShouldRead`, `whoShouldNotRead`), sidebar = Book Information `<dl>` (author, publisher, publication date, pages, language, ISBN, genres, moods) + notes preview (link to notes page), then Related Books rail + related shelves.
- `src/app/books/[slug]/notes/page.tsx` — the dedicated notes experience: `getBookBySlug` + `getPublicNotes(bookId)`, grouped by chapter (fallback reading order), each note = chapter/page/quote/my-note/tags. `generateMetadata` per-slug; breadcrumb JSON-LD.
- `src/app/books/shelf/[slug]/page.tsx` — a shelf (book_collection). `generateStaticParams` (`getPublishedCollectionSlugs()`), `generateMetadata`, `[collectionSchema-equivalent, breadcrumb]` JSON-LD, cover header + `BookGrid`.
- `src/app/books/genre/[slug]/page.tsx` — books by genre. `generateStaticParams` (`getBookGenres()`), `generateMetadata` (`getGenreBySlug`), breadcrumb JSON-LD, `BookGrid`.
- `src/app/books/search/page.tsx` — `dynamic="force-dynamic"`, `noIndex`; `searchPublishedBooks(q)` → `BookGrid`; empty/no-result states.
- `src/app/books/my-list/page.tsx` — `dynamic="force-dynamic"`, `noIndex`; `isLoggedIn()` + `getMyBookListBooks()`; three states (signed-out CTA `/login?returnTo=/books/my-list`, empty, grid).

## New public queries — add to `src/lib/books/queries.ts` (anon client, fail-soft)

Slice 1 already provides: `getPublishedBooks`, `getBookBySlug`, `getPublishedBookSlugs` (returns `string[]`), `getBooksByGenre`, `getAutoFeed`, `getPublishedCollections`, `getCollectionBySlug` (`{collection, books}`), `getPublicNotes`, `getHomepageSections`. Add:
- `getPublishedBookSlugsWithDates(): Promise<{ slug: string; updatedAt: string }[]>` — for sitemap lastmod.
- `getSimilarBooks(book: BookWithRelations, limit = 14): Promise<BookWithRelations[]>` — shared genre/author overlap over published books, excluding self (in-memory; `ponytail:` note).
- `getBookGenres(): Promise<{ id: string; name: string; slug: string }[]>` — public genre list (only genres with ≥1 published book, or all; simplest: all rows of `book_genres_ref`).
- `getGenreBySlug(slug: string): Promise<{ id: string; name: string; slug: string } | null>`.
- `getPublishedCollectionSlugs(): Promise<string[]>`.
- `searchPublishedBooks(q: string): Promise<BookWithRelations[]>` — in-memory filter over `getPublishedBooks(500)` across title, author, isbn, genre names, moods (`ponytail:` swap to FTS later).
- `getMyBookListBooks(): Promise<BookWithRelations[]>` — reads `user_book_list` for the logged-in user (session client, RLS), hydrates books via anon client. Mirror `getMyListMovies`.

`isLoggedIn()` shared helper already exists (used by movies my-list) — reuse it.

## SEO — `src/lib/seo.ts`

Add `bookSchema(input)` mirroring `movieSchema`, `@type: "Book"`: `name`, `author: { "@type": "Person", name }`, `isbn`, `numberOfPages`, `datePublished`, `genre`, and the identical embedded `review` block (0–10 `Rating` bestRating 10, `personRef` author, `reviewBody`). Reuse `buildMetadata`, `breadcrumbSchema`, `collectionSchema` (for shelves — its `{title,description,path,movies:{title,path}[]}` shape works for books by passing book title/path), and `<JsonLd>` from `@/components/seo/json-ld`.

## Sitemap + routes — `src/app/sitemap.ts`, `src/lib/seo/routes.ts`

- Add `getPublishedBookSlugsWithDates()` + `getPublishedCollectionSlugs()` + `getBookGenres()` to the sitemap's `Promise.all`; push `DynamicExpansion`s for `/^\/books\/\[slug\]$/`, `/^\/books\/shelf\/\[slug\]$/`, `/^\/books\/genre\/\[slug\]$/`; add a `lastMod.set(\`/books/${b.slug}\`, ...)` loop.
- Add `/books` to `HIGH_PRIORITY_PREFIXES`.
- Add `/books/search` and `/books/my-list` to `APP_ROUTES` in `src/lib/seo/routes.ts` so they stay `noIndex` + out of the sitemap.

## Components — `src/components/books/`

Book-typed equivalents of the movies components (same prop patterns, `Book`/`BookCollection` types). **Reuse the generic `Poster`** from `@/components/movies/poster` (not movie-typed) rather than duplicating.
- `book-hero.tsx` `BookHero` (server) `{ book: Book }`
- `book-rail.tsx` `BookRail` (client) `{ title?, books: Book[], href?, className? }`
- `book-card.tsx` `BookCard` (client) `{ book: Book, className? }` — cover card; click opens modal via `useBooks().open`, links `/books/${slug}`; reading-status badge + progress bar for currently-reading; rating.
- `book-grid.tsx` `BookGrid` (server) `{ books: Book[], className? }`
- `book-collection-card.tsx` `BookShelfCard` (server) — links `/books/shelf/${slug}`.
- `recommendation-badge.tsx`, `book-rating.tsx` — duplicate the tiny movies ones (Book-agnostic values), OR reuse the movies ones (they take primitive props: `type: string|null`, `rating: number|null`). **Reuse** the movies `RecommendationBadge` + `MovieRating` (rename import) since they take primitives, not Movie — confirm their prop types are primitive before reusing; if Movie-typed, duplicate.
- `reading-status-badge.tsx` `ReadingStatusBadge` (server) `{ status: string|null }` — NEW (books-specific): maps want_to_read/currently_reading/paused/finished/abandoned to a label + tone.
- `book-progress.tsx` `BookProgress` (server) `{ percentage: number|null }` — NEW: a slim progress bar + "N%".
- `book-nav.tsx` `BookNav` (client) — Discover / Collections / My List tabs + GET search form to `/books/search`.
- `books-provider.tsx` + `books-context.tsx` (client) — modal state + My List; on mount calls `getBookListState()`; `open/isSaved/toggle/loggedIn`; renders `<BookModal>`. Mirror movies provider exactly (keeps pages ISR-static).
- `book-modal.tsx` `BookModal` (client) `{ book: Book|null, onClose }` — quick-look: cover, title, author, rating, status+progress, verdict, short review, whyRecommend, link to full page + notes.
- `my-book-list-button.tsx` `MyBookListButton` (client) `{ bookId, ... }` — reads `useBooks().isSaved/toggle`.
No trailer button (books have none).

## Types — `src/lib/books/types.ts`

Types already exist from slice 1 (`Book`, `BookWithRelations`, `BookCollection`, `BookNote`, mappers, vocab). Add only if a component needs a shape not present (e.g. a light `BookCardData`). Prefer reusing `BookWithRelations`.

## Non-goals (deferred to Slice 4)

The cinematic bookshelf presentation and the open-book/page-turn reader. Slice 3's `/books` and `/books/[slug]` are plain (if handsome) SSR pages; Slice 4 restyles/enhances them. No changes to admin or data schema.

## Testing / verification

- `tsc` clean for books files; `eslint` clean; `next build` exits 0 with the new `/books*` routes present.
- Unit test for the pure additions: `getSimilarBooks` ranking and `searchPublishedBooks` matching (small vitest with fixture books) — the only non-trivial pure logic.
- Live smoke (after deploy, data already seeded): `/books` shows shelves + hero; `/books/[slug]` renders review + JSON-LD (validate one book's Book schema); `/books/shelf/[slug]` and `/books/genre/[slug]` list books; `/books/[slug]/notes` groups notes; search + my-list work; book slugs appear in `/sitemap.xml`.

## Risks

- `getMyBookListBooks` must use the session (cookie) client under RLS and never leak another user's list — mirror `getMyListMovies` exactly.
- Reusing movies `Poster`/`RecommendationBadge`/`MovieRating` couples books to the movies namespace; acceptable for primitives, but confirm prop types are primitive (not `Movie`) before reusing — duplicate if not.
- Keep `/books` pages statically renderable (ISR): the provider fetches My List client-side on mount; never pass per-user data into the server-rendered page.
