# Books Bookshelf + Open-Book Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the Slice-3 `/books` and `/books/[slug]` pages into a cinematic bookshelf and an open-book page-turn reader, as progressive enhancement over the existing crawlable HTML.

**Architecture:** Server components still render the Slice-3 content (the SEO source of truth); new `"use client"` components re-present that content as shelves (hover-lift) and an open book (CSS 3D `rotateY` fold via framer-motion). `prefers-reduced-motion` and no-JS fall back to the plain Slice-3 pages. framer-motion v12 is already installed — no new dependency.

**Tech Stack:** Next.js 16 App Router, React 19, framer-motion v12, Tailwind v4, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-09-books-bookshelf-openbook-design.md`

## Global Constraints

- Branch `feat/books-bookshelf` off `main` (already created). PR to `main` — user-facing, so add a `Tweet:` line per `docs/PR-TWEET.md`. Do NOT merge; no SQL in this slice.
- **Progressive enhancement is non-negotiable:** the server component renders the full editorial HTML (reuse Slice-3 markup); client components position/re-present the EXISTING DOM or receive the SAME data as props — never hide editorial content from the initial HTML or gate it behind JS. Every task that touches a page must keep view-source showing the review + notes.
- All animation components are `"use client"`; use `transform`/`opacity` only (GPU-friendly); no layout-thrashing animations.
- `prefers-reduced-motion: reduce` disables the fold (cross-fade/hard-swap) and the shelf lift; keyboard + prev/next controls always work; the whole book is a real `<a href="/books/${slug}">`.
- No new npm dependency (framer-motion already present). No schema changes.
- Reuse Slice-3 components (`BookCard`, `Poster`, `BookRail`, `ReadingStatusBadge`, `BookProgress`, `RecommendationBadge`, `MovieRating`) where they fit.
- Attribution trailer on commits: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- Ignore unrelated `src/app/playlists/*`, `src/lib/seo-audit/*`, `.next/types` errors from concurrent work — verify books files in isolation.

### Existing to consume
- Slice-3 queries/pages: `getHomepageSections`, `getPublishedCollections`, `getBookBySlug`, `getSimilarBooks`, `getPublicNotes` in `src/lib/books/queries.ts`; the Slice-3 `/books/page.tsx` and `/books/[slug]/page.tsx` (this slice edits them to mount the new client layers).
- Types: `Book`, `BookWithRelations`, `BookNote`, `BookPage`, `BookCollection` from `@/lib/books/types`.

---

### Task 1: Public book_pages query + spread-composition helper

**Files:**
- Modify: `src/lib/books/queries.ts` (add `getPublishedBookPages`)
- Create: `src/lib/books/spreads.ts`, `src/lib/books/spreads.test.ts`

**Interfaces:**
- `getPublishedBookPages(bookId: string): Promise<BookPage[]>` — anon, fail-soft, `published=true`, ordered by `position`.
- `type Spread = { key: string; kind: "cover"|"about"|"why_read"|"review"|"lessons"|"notes"|"quotes"|"audience"|"verdict"|"related"|"custom"; title?: string; /* data the renderer needs, referencing book fields by the composer */ }` — exact shape defined here and consumed by Task 3.
- `composeSpreads(book: BookWithRelations, notes: BookNote[], pages: BookPage[]): Spread[]` — PURE. If `pages.length`, map each `book_pages` row to a `{kind:"custom", ...}` (or its `page_type`) spread in `position` order. Else compose the default order from the spec (cover, about, why_read, review, lessons, notes, quotes, audience, verdict, related), **skipping any spread whose source field(s) are empty** (e.g. no `whyRead` → no why_read spread; no notes → no notes/quotes spreads). Cover + verdict + related always present.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/books/spreads.test.ts
import { describe, it, expect } from "vitest";
import { composeSpreads } from "./spreads";

const base = { id:"b", slug:"s", title:"T", author:"A", description:null, coverUrl:null,
  genres:[], moods:[], review:null, reading:null } as any;

describe("composeSpreads (no authored pages)", () => {
  it("always has cover, verdict, related; skips empty editorial", () => {
    const s = composeSpreads(base, [], []);
    const kinds = s.map(x => x.kind);
    expect(kinds[0]).toBe("cover");
    expect(kinds).toContain("verdict");
    expect(kinds).toContain("related");
    expect(kinds).not.toContain("why_read");   // no whyRead
    expect(kinds).not.toContain("notes");       // no notes
  });
  it("includes why_read/review/lessons/notes/quotes when data present", () => {
    const book = { ...base, description:"d",
      review:{ whyRead:"w", shortReview:"r", whatILearned:"a\nb", verdict:"v", rating:9, recommendationType:"Must Read" } };
    const notes = [{ id:"n1", note:"x", quote:"q", chapter:"1", page:1, tags:[] }] as any;
    const kinds = composeSpreads(book, notes, []).map(x => x.kind);
    expect(kinds).toEqual(expect.arrayContaining(["why_read","review","lessons","notes","quotes","about"]));
  });
  it("authored pages win over composition, in position order", () => {
    const pages = [
      { id:"p2", position:1, pageType:"review", title:"R", content:"c", published:true },
      { id:"p1", position:0, pageType:"cover", title:"C", content:"", published:true },
    ] as any;
    const s = composeSpreads(base, [], pages);
    expect(s.map(x => x.key)).toEqual(["p1","p2"]);  // sorted by position
  });
});
```

- [ ] **Step 2: Run — expect FAIL** (`npm test -- src/lib/books/spreads.test.ts`).
- [ ] **Step 3: Implement** `spreads.ts` (`composeSpreads` + `Spread` type, PURE — no server-only) to satisfy the rules, and add `getPublishedBookPages` to `queries.ts` (mirror the fail-soft anon reads; select `book_pages` where `book_id` + `published`, order `position`).
- [ ] **Step 4: Run — expect PASS.** `npx tsc --noEmit` (zero books errors).
- [ ] **Step 5: Commit** `git add src/lib/books/queries.ts src/lib/books/spreads.ts src/lib/books/spreads.test.ts && git commit -m "feat(books): public book_pages query + spread composition"`

---

### Task 2: Bookshelf presentation for `/books`

**Files:**
- Create: `src/components/books/book-shelf.tsx` (`"use client"` — one shelf row + hover-lift), `src/components/books/book-spine.tsx` (`"use client"`)
- Modify: `src/app/books/page.tsx` (render shelves through `BookShelf`, keeping the server data resolution + a plain fallback)

**Interfaces:**
- `BookShelf({ title, books, href }: { title?: string; books: Book[]; href?: string })` — a labeled physical shelf row: shelf ledge + shadow, books standing (mix of `Poster` covers and `BookSpine` for density/narrow widths), desktop hover-lift (framer-motion `whileHover` raising the book, soft shadow, neighbors easing apart, an info panel with title/author/`ReadingStatusBadge`/`BookProgress`/`MovieRating` + one-line editorial). Each book is a real `<a href="/books/${slug}">`. Horizontal scroll on overflow (no shrink below tappable size). `prefers-reduced-motion` → no lift (use framer-motion `useReducedMotion`).
- `BookSpine({ book }: { book: Book })` — narrow vertical spine, cover-derived background color (fallback neutral), vertical title + author when space allows; links to the book.

- [ ] **Step 1: Build `book-spine.tsx`** — vertical spine, `<a>` wrapper, cover-derived color (simple hash of slug/title → hue, or a neutral palette), vertical text via `writing-mode: vertical-rl`. Reduced-motion irrelevant (static).
- [ ] **Step 2: Build `book-shelf.tsx`** — the shelf row + lift. Use `useReducedMotion()`; `motion.div` per book with `whileHover` (skip when reduced). Info panel positioned absolutely near the hovered book (desktop only, `hidden md:block`). Books overflow into a horizontal `overflow-x-auto snap-x` row. Reuse `Poster`, `ReadingStatusBadge`, `BookProgress`, `RecommendationBadge`, `MovieRating`.
- [ ] **Step 3: Modify `src/app/books/page.tsx`** — keep the server data resolution (getHomepageSections/getPublishedCollections/buildFallback). Replace the Slice-3 `BookRail` rows with `BookShelf` rows (same title/books/href), keep the hero, keep the browse-shelves grid. The page stays a server component; `BookShelf`/`BookSpine` are the client leaves. Ensure book titles/authors remain in the SSR HTML (they do — the shelf renders real anchors with text).
- [ ] **Step 4: Verify** `npx tsc --noEmit`; `npx eslint src/components/books/book-shelf.tsx src/components/books/book-spine.tsx "src/app/books/page.tsx"`.
- [ ] **Step 5: Commit** `git commit -m "feat(books): bookshelf presentation with hover-lift"`

---

### Task 3: Spread renderers

**Files:**
- Create: `src/components/books/spreads/` — one renderer per spread kind (or a single `spread.tsx` switching on `kind`), plus an index. Keep files focused.

**Interfaces:**
- `SpreadView({ spread, book, notes, similar }: { spread: Spread; book: BookWithRelations; notes: BookNote[]; similar: Book[] })` — renders ONE spread's content as semantic HTML (headings, prose, lists). This is the content that must be crawlable, so it is plain semantic markup (no motion here). Covers all `kind`s: cover, about, why_read, review, lessons (numbered list from `whatILearned` split on newlines), notes (grouped), quotes (blockquotes from notes with `quote`), audience (whoShouldRead/whoShouldNotRead), verdict (rating + recommendation), related (similar rail + "Back to my shelf" link), custom (a `book_pages` row: title + content, with `page_type`-specific formatting for lessons/quote/notes).

- [ ] **Step 1: Build `SpreadView`** — a server-renderable component (no `"use client"` needed; it is pure content) that switches on `spread.kind` and renders the matching markup, reusing Slice-3 idioms (the `Prose`/lessons-splitting/notes-grouping already written in the Slice-3 `/books/[slug]` and notes pages — extract or mirror them). Reuse `RecommendationBadge`, `MovieRating`, `ReadingStatusBadge`, `BookProgress`, `Poster`, `BookRail`.
- [ ] **Step 2: Verify** `npx tsc --noEmit`; `npx eslint src/components/books/spreads/`.
- [ ] **Step 3: Commit** `git commit -m "feat(books): open-book spread renderers"`

---

### Task 4: The open-book reader (page-turn)

**Files:**
- Create: `src/components/books/book-reader.tsx` (`"use client"`), `src/components/books/book-page-fold.tsx` (`"use client"`), `src/components/books/book-progress-dots.tsx`

**Interfaces:**
- `BookReader({ spreads, book, notes, similar }: { spreads: Spread[]; book: BookWithRelations; notes: BookNote[]; similar: Book[] })` — orchestrates the open book: holds current-spread index; renders the current (and adjacent) `SpreadView`(s) into page faces; handles next/prev via click-halves, `ArrowRight`/`ArrowLeft`, and touch swipe; shows subtle prev/next controls + `BookProgressDots`. Desktop = two pages side by side (`perspective` container, `preserve-3d`); mobile (`< md`) = one page. Turn animates via `BookPageFold`. `useReducedMotion()` → no fold, cross-fade/hard-swap. Preload the next spread's image. A "Back to my shelf" control links to `/books`.
- `BookPageFold({ children, direction, onComplete })` — the single-turn 3D fold: a `motion.div` rotating `rotateY` 0→±180 (forward folds right page toward left) with `perspective`, a gradient edge shadow, spring easing, no bounce; calls `onComplete` when done. Reduced-motion → render without rotation.
- `BookProgressDots({ total, current })` — subtle dots or `n / N`.

- [ ] **Step 1: Build `book-page-fold.tsx`** — the fold primitive. `transform: rotateY(...)`, `transformOrigin` on the spine edge, GPU-only props, framer-motion spring. Reduced-motion guard.
- [ ] **Step 2: Build `book-progress-dots.tsx`** — trivial presentational.
- [ ] **Step 3: Build `book-reader.tsx`** — index state, `next()`/`prev()` (clamped), keyboard listener (effect + cleanup), touch swipe (pointer/touch handlers, threshold), click-halves, controls, dots, image preload of `spreads[index+1]`, desktop-two-page vs mobile-one-page layout, reduced-motion branch. Renders `SpreadView` for the visible spread(s) inside the fold faces.
- [ ] **Step 4: Verify** `npx tsc --noEmit`; `npx eslint src/components/books/book-reader.tsx src/components/books/book-page-fold.tsx src/components/books/book-progress-dots.tsx`.
- [ ] **Step 5: Commit** `git commit -m "feat(books): open-book reader with CSS 3D page-turn"`

---

### Task 5: Wire the reader into `/books/[slug]` (crawlable)

**Files:**
- Modify: `src/app/books/[slug]/page.tsx`

**Interfaces:** Consumes `getBookBySlug`, `getSimilarBooks`, `getPublicNotes`, `getPublishedBookPages`, `composeSpreads`, `SpreadView`, `BookReader`.

- [ ] **Step 1: Modify the server page** — keep `generateStaticParams`/`generateMetadata`/JSON-LD (Slice 3) UNCHANGED. Fetch `pages = await getPublishedBookPages(book.id)` alongside the existing `similar`/`notes`; `const spreads = composeSpreads(book, notes, pages)`. Render:
  - The Breadcrumb + `<JsonLd>` (unchanged).
  - A server-rendered semantic fallback containing every spread's content (map `spreads` → `<SpreadView>` inside a plain `<article>`), so view-source / no-JS / crawlers get all editorial content. Give it a stable wrapper.
  - Mount `<BookReader spreads={...} book={...} notes={...} similar={...} />` which, on hydration, presents the open book. To avoid double content, the reader renders the same `SpreadView`s; the plain `<article>` is marked so the reader hides it visually after mount (e.g. the reader is `position: absolute`/overlay and the article gets `aria-hidden` + visually hidden once JS takes over, OR the reader replaces the article's presentation while keeping it in the DOM). Choose the approach that keeps the editorial text in the initial HTML and avoids showing it twice after hydration. Document the choice in the report.
- [ ] **Step 2: Verify crawlability** — `npm run build` then inspect the prerendered HTML for one slug (e.g. `.next/server/app/books/the-psychology-of-money.html` or via `next start` + `curl`): confirm the review/lessons/notes text is present in the static HTML. This is the SEO gate — the task is not done until confirmed.
- [ ] **Step 3: Verify** `npx tsc --noEmit`; `npx eslint "src/app/books/[slug]/page.tsx"`.
- [ ] **Step 4: Commit** `git commit -m "feat(books): mount open-book reader over crawlable book page"`

---

### Task 6: Shelf→book open/close transition + polish

**Files:**
- Modify: `src/components/books/book-shelf.tsx` (or a small `book-open-transition.tsx`), `src/components/books/book-reader.tsx`

**Interfaces:** framer-motion `layout`/shared-layout or a route-transition; keep it optional and reduced-motion-safe.

- [ ] **Step 1: Add the open/close feel** — clicking a book on the shelf navigates to `/books/${slug}` (a real link — works without JS). Enhance with a brief forward-then-open motion where feasible (e.g. framer-motion `layoutId` on the cover shared between shelf card and reader cover, or a simple scale/fade intro on the reader when arriving from `/books`). On direct URL load, the reader mounts at the cover with no shelf-origin animation. "Back to my shelf" (already in the reader) closes with a reverse motion where feasible. Keep all of this behind `useReducedMotion()` and never required for navigation.
- [ ] **Step 2: Verify** `npx tsc --noEmit`; `npx eslint` the touched files.
- [ ] **Step 3: Commit** `git commit -m "feat(books): shelf-to-book open/close transition"`

---

### Task 7: Verify + PR

**Files:** none.

- [ ] **Step 1: Full suite.** `npm test` — all pass (incl. `spreads` test).
- [ ] **Step 2: Books type-check.** `npx tsc --noEmit 2>&1 | grep -E "books" | grep -vE "playlist|seo-audit" || echo NO_BOOKS_TSC_ERRORS`.
- [ ] **Step 3: Lint.** `npx eslint src/lib/books/ src/components/books/ "src/app/books/"` — clean.
- [ ] **Step 4: Build + crawlability gate.** `npm run build` exit 0; confirm `/books` + `/books/[slug]` still prerender, and the prerendered book HTML still contains the editorial text (SEO must not regress vs Slice 3).
- [ ] **Step 5: Reduced-motion + no-JS sanity** — confirm (by reading the code paths) that `useReducedMotion` disables folds/lifts and that the server `<article>` renders without JS.
- [ ] **Step 6: Push + PR to `main`.** `git push -u origin feat/books-bookshelf`. Open the PR with a `Tweet:` line (read `docs/PR-TWEET.md`). Body: the bookshelf + open-book experience layered on Slice-3 content; note progressive enhancement (SEO preserved), reduced-motion fallback, no new deps; live-verify steps (turn pages, reduced-motion, view-source retains content). Do NOT merge.

---

## Self-Review

**Spec coverage:** bookshelf + hover-lift + spines → T2; open-book spreads → T3; page-turn reader (keyboard/swipe/click/dots/preload/reduced-motion) → T4; crawlable wiring → T5 (with an explicit SEO gate); open/close transition → T6; public book_pages read + spread composition → T1; verify/PR → T7. Progressive-enhancement + reduced-motion + no new dep enforced in Global Constraints and re-checked in T5/T7.

**Placeholder scan:** the one piece of pure logic (`composeSpreads`) has a full failing test; UI/animation tasks give concrete component contracts, the framer-motion mechanism, the reduced-motion guard, and the reuse list. T5 leaves ONE deliberate implementation choice (how the reader hides the fallback article post-hydration) to the implementer with a required report note + a hard crawlability check — this is a genuine either/or that the build must settle against real prerendered HTML, not a placeholder.

**Type consistency:** `Spread`/`composeSpreads` defined in T1, consumed by `SpreadView` (T3) and `BookReader` (T4) and the page (T5) with the same shape. `getPublishedBookPages` return type (`BookPage[]`) matches its consumer in T5. Reused Slice-3 components referenced by their real names.

**Note (handoff):** written for execution in a later session — a concurrent session is committing `seo-audit` work in this repo; branch from a clean `main` and keep the books diff isolated (see Global Constraints).
