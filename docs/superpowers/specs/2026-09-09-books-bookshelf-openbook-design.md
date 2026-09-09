# Books / Reading — Bookshelf + Open-Book (Slice 4)

Final slice: the signature experience. Transforms the plain SSR pages from
Slice 3 into a cinematic personal library — `/books` becomes a bookshelf,
`/books/[slug]` becomes an open book you page through — as **progressive
enhancement** over the existing crawlable HTML. Slices 1–3 are merged/live.

Spec of prior slices: `docs/superpowers/specs/2026-09-09-books-{data-foundation,admin-cms,public-pages}-design.md`.

## Decisions (from brainstorming)

- **Page-turn tech: CSS 3D `rotateY` fold driven by framer-motion** (already a dep, v12). No new library. Honors the spec's "PERFORMANCE > PHYSICS" — a clean 3D fold with perspective + edge shadow, not a hyper-real paper curl. `prefers-reduced-motion` disables the fold and just swaps pages.
- Slice 4 **enhances** Slice 3's pages; it does not replace the data or the SSR content. The editorial HTML stays in the initial server response for crawlers and no-JS; the bookshelf/open-book presentation is applied client-side on top of those same DOM nodes.
- Branch `feat/books-bookshelf` off `main`.

## Core principle: progressive enhancement (non-negotiable)

The interactive experience is a *layer*, never the source of content:
- The server component still renders the full semantic article (Slice 3's `/books/[slug]`) and the shelf lists (`/books`). That HTML is what Google and no-JS users get.
- A client component hydrates and re-presents that content as the bookshelf / open book. If JS is off or `prefers-reduced-motion` is set, the reader gets the plain (still handsome) Slice-3 pages or a no-fold paginated view.
- Nothing in the page-turn animation is required to reach any content. Keyboard + prev/next controls always work.

This satisfies spec §29 (SEO), §30 (accessibility), §32 (mobile fallback).

## Public query gap to fill (Slice 1/2 built the table + admin; Slice 4 needs the public read)

- `getPublishedBookPages(bookId): Promise<BookPage[]>` in `src/lib/books/queries.ts` (anon, fail-soft, `published=true`, ordered by `position`). If a book has authored `book_pages`, the open-book renders those spreads; otherwise it composes spreads from the editorial fields (see Spread model).

## The bookshelf — `/books`

Restyle the Slice-3 homepage into shelves. Keep the server-resolved sections (`getHomepageSections`, `getPublishedCollections`); render each shelf as a physical row:
- A shelf surface (subtle warm ledge + soft drop shadow), books standing on it.
- Books shown as a mix of **covers** (front-facing, `Poster`) and **spines** (narrow, cover-derived color + vertical title) — spines when the row is dense / on smaller widths; covers for featured.
- **Hover-lift** (desktop): book rises a few px, gains a shadow, neighbors ease apart slightly, cover sharpens; a small info panel (title, author, status, progress, rating, one-line editorial) appears near it. Client component; must not be the only way to act — the whole book is a link, and tap on mobile navigates.
- Shelf titles as editorial labels (CURRENTLY READING, BOOKS I'D RECOMMEND, …) from the section titles.
- Responsive: desktop many books + perspective; tablet fewer; mobile smaller books with horizontal shelf scroll. Never shrink below tappable size.
- Modern, not skeuomorphic: dark/warm ground, elegant type, soft shadows — books are the focus, no fake wood.

Components: `BookShelf` (client, one shelf row + lift interaction), `BookSpine` (client), reuse `BookCard`/`Poster`. The page stays a server component that resolves data and hands it to these.

## The open book — `/books/[slug]`

A client `BookReader` enhances the Slice-3 article into a two-page (desktop) / one-page (mobile) open book occupying ~70–85% viewport, with page-turn.

### Spread model
Spreads come from `book_pages` when authored; else composed from editorial fields in this default order (skip a spread when its data is absent):
1. Cover (cover image, title, author, "Read my thoughts")
2. About / intro (description, year, pages, status + progress)
3. Why I'm Reading It (`whyRead`)
4. My Review (`shortReview` + `fullReview`)
5. What I'm Learning (`whatILearned` → numbered lessons)
6. My Notes (published notes, grouped)
7. Favourite Quotes (notes with a `quote`)
8. Who Should Read It (`whoShouldRead` / `whoShouldNotRead`)
9. My Verdict (rating, recommendation, one-line)
10. Related Books (similar rail) + "Back to my shelf"

`book_pages` `page_type` maps to a spread renderer (cover/text/review/notes/lessons/quote/image/book_info/recommendations).

### Interaction
- Turn forward: right page folds toward the left (RTL reading-direction motion per spec §7); backward: left folds right. CSS `rotateY` on a page face with `transform-style: preserve-3d`, `perspective` on the container, an easing spring via framer-motion, a gradient edge shadow, no bounce.
- Navigation: click right half → next, left half → prev; `ArrowRight`/`ArrowLeft` keys; swipe on touch; visible prev/next controls (subtle) + a small progress indicator (`PAGE n / N` or dots).
- Open/close: from the shelf, clicking a book plays a forward-then-open transition into the reader; "Back to my shelf" closes the book and returns. On a direct URL load (deep link / crawler) the reader simply mounts at the cover — no shelf-origin animation required.
- Preload the next spread's image so turns feel instant.
- Reduced motion: no fold; pages cross-fade or hard-swap; all controls still work.
- Mobile: one page at a time, swipe RTL/LTR, larger type, single-column spreads.

Components: `BookReader` (client, orchestrates spreads + turn state + keyboard/swipe), `BookPageFold` (client, the 3D fold for one turn), `Spread` renderers (client or server-rendered content the reader positions), `BookProgressDots`. The server page passes `book`, composed `spreads` (or `pages`), `similar`, `notes` — the same data Slice 3 already fetches.

### Crawlability wiring
The server page renders the Slice-3 article markup (all spread content as semantic sections) **inside** the reader's root. `BookReader` positions those existing sections into pages via CSS on mount; it does not re-fetch or hide content from the initial HTML. A `<noscript>`-safe default (plain article) shows before hydration.

## Admin (small addition)

Optional: a "Preview open book" link on the admin book editor pointing at `/books/[slug]` — the reader itself is the preview. No new admin surface required. (The Slice-2 page-builder already authors `book_pages`.)

## Non-goals

- No new data model, no schema changes (uses `book_pages` from Slice 1).
- No hyper-real paper-curl physics (explicitly out — CSS 3D fold only).
- No change to the admin CMS beyond the optional preview link.

## Testing / verification

- `tsc`/`eslint` clean; `next build` exits 0.
- Unit test for the pure spread-composition helper (`composeSpreads(book, notes)` → ordered spread descriptors, skipping empty ones) — the one piece of non-trivial pure logic.
- Manual/live smoke: `/books` renders shelves with hover-lift (desktop) + tap-nav (mobile); `/books/[slug]` opens the book, turns pages via click/keys/swipe, closes to shelf; **reduced-motion disables the fold**; **JS-disabled / view-source still shows the full review + notes HTML** (the SEO guarantee); Lighthouse/RGT still sees the Book JSON-LD from Slice 3.
- Regression: Slice-3 SEO (canonicals, sitemap, JSON-LD) unchanged; the article content is still in the initial HTML.

## Risks

- Progressive-enhancement discipline: the reader must position **existing** SSR DOM, not replace it with client-only content — otherwise SEO regresses. This is the central risk; the plan must verify view-source retains editorial content.
- Page-turn performance on low-end mobile: keep transforms GPU-friendly (`transform`/`opacity` only), avoid layout thrash; fall back to cross-fade if a cheap FPS check or reduced-motion says so.
- framer-motion + React 19 / Next 16 App Router: client components only (`"use client"`), no SSR of motion internals.
- Shelf density vs readability: spines must stay legible; cap books per shelf and scroll horizontally rather than shrinking.
