# Books Admin CMS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the admin CMS for the Books/Reading section — list, fast add-book workflow, reading dashboard, shelves CRUD, notes, and a minimal open-book page-builder — wired to the server actions from Slice 1.

**Architecture:** App Router server components for pages (admin kit: `PageHeader`, `DataTable`, `AdminButton`, `StatusBadge`, `KPIWidget`), client components for editors (generic kit: `Button`, `Input`, `Label`, `useToast`). Mirror the Movies admin (`src/components/admin/movie-editor.tsx`, `collection-editor.tsx`, `src/app/admin/movies/*`, `src/app/admin/collections/*`) file-for-file. All writes use existing `src/lib/books/actions.ts`; this slice adds only admin read queries + UI. Auth is already enforced: `src/app/admin/layout.tsx` → `requireAdmin()`, and every action re-checks `getAdminUser()`.

**Tech Stack:** Next.js 16 App Router, React 19, Supabase, Tailwind v4, Vitest, lucide-react.

**Spec:** `docs/superpowers/specs/2026-09-09-books-admin-cms-design.md`

## Global Constraints

- Branch `feat/books-admin-cms`, stacked on `feat/books-data-foundation` (already created). PR targets `feat/books-data-foundation`; do NOT merge; do NOT apply any SQL.
- No new write-layer logic — use existing actions in `src/lib/books/actions.ts` (signatures below). New code is admin read queries + UI only.
- Editors are `"use client"` with the generic kit (`@/components/ui/{button,input,label,toast}`). List/detail pages are server components using the admin kit (`@/components/admin`, `@/components/admin/data`).
- `createBook`/`updateBook` take ONE `BookInput` that already contains `genreIds`, `collectionIds`, `review`, `reading` — the editor passes one object, does NOT call `setBookGenres`/`setBookCollections` separately.
- `createCollection`/`updateCollection` take **`FormData`** (keys: `title`, `description`, `coverUrl`, `isPublished`), like movies. `setCollectionBooks(collectionId, bookIds[])` is an ordered replace (array order = display order).
- Every action returns a discriminated union `{ ok: true, ... } | { error: string }`. UI pattern: `if ("error" in res) toast danger; else toast success + router.refresh()`.
- Slug is stable after create (server-side); editors never send a slug on update.
- `dynamic = "force-dynamic"` on admin pages that read admin (service-role) data; `params` is a `Promise` in `[id]` routes (`const { id } = await params`).
- Attribution trailer on commits: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

### Existing action signatures (from `src/lib/books/actions.ts`) — consume, don't rebuild
```
createBook(input: BookInput) / updateBook(id, input: BookInput)          // handle review+reading+genres+collections inline
setBookPublished(id, published) / deleteBook(id) / duplicateBook(id)
setBookGenres(bookId, genreIds[]) / setBookCollections(bookId, collectionIds[])   // exist, but editor uses inline BookInput
createCollection(FormData) / updateCollection(id, FormData) / setCollectionPublished(id, bool) / deleteCollection(id)
setCollectionBooks(collectionId, bookIds[])                              // ordered replace
saveNote(NoteInput) / deleteNote(id)
saveBookPage(PageInput) / deleteBookPage(id) / reorderBookPages(bookId, orderedIds[])
searchGoogleBooks(query) / importFromGoogleBooks(googleId) / refreshCoversFromGoogleBooks()
```
Input shapes: `BookInput { title, subtitle?, description?, author?, authors?[], coverUrl?, backdropUrl?, isbn?, publisher?, publicationDate?, publicationYear?, pageCount?, language?, country?, moods?[], googleId?, isPublished?, genreIds?[], collectionIds?[], review?: ReviewInput, reading?: ReadingInput }`. `ReviewInput { rating?, verdict?, recommendationType?, shortReview?, fullReview?, whyRead?, whyRecommend?, whatILearned?, whoShouldRead?, whoShouldNotRead?, published? }`. `ReadingInput { status?, currentPage?, totalPages?, startedAt?, lastReadAt?, finishedAt? }`. `NoteInput { id?, bookId, chapter?, page?, quote?, note?, tags?[], published? }`. `PageInput { id?, bookId, pageType, title?, content?, metadata?, published? }`. Vocab: `RECOMMENDATION_TYPES`, `READING_STATUSES`, `MOODS` from `@/lib/books/types`. `PAGE_TYPES` for page_type: cover|text|review|notes|lessons|quote|image|book_info|recommendations.

---

### Task 1: Admin read queries + reading-stats helpers

**Files:**
- Modify: `src/lib/books/queries.ts`
- Create: `src/lib/books/reading-stats.ts`
- Test: `src/lib/books/reading-stats.test.ts`

**Interfaces:**
- Consumes: `supabaseAdmin()`, mappers/types from `./types`; `BookWithRelations` from `./types`.
- Produces (add to `queries.ts`, service role, admin — no visibility filter):
  - `getAllBookGenresAdmin(): Promise<{id,name,slug}[]>` (all rows of `book_genres_ref`)
  - `getBookGenreIdsAdmin(bookId): Promise<string[]>`
  - `getBookCollectionIdsAdmin(bookId): Promise<string[]>`
  - `getNotesAdmin(bookId): Promise<BookNote[]>` (all notes, incl. unpublished, ordered by position)
  - `getBookPagesAdmin(bookId): Promise<BookPage[]>` (all pages, ordered by position)
  - `getBooksForPickerAdmin(): Promise<{id,title,author,coverUrl,year}[]>` (lightweight, for the shelf editor picker)
  - confirm `getAllBooksAdmin()` returns each book WITH `reading` + `review` embedded (needed for list filters/stats); if it doesn't, extend its select to embed `reading:book_reading(*)`, `review:book_reviews(*)`.
- Produces (in `reading-stats.ts`, PURE, unit-tested): `computeReadingStats(books: BookWithRelations[]): ReadingStats` where
  `ReadingStats = { currentlyReading: {title, slug, percentage}[]; finishedThisYear: number; pagesRead: number; averageRating: number | null; countsByStatus: Record<string, number>; wantToRead: number }`.
  Rules: `finishedThisYear` = books whose `reading.status==='finished'` and `reading.finishedAt` year === current year; `pagesRead` = sum of `reading.totalPages` for finished books (fallback `book.pageCount`); `averageRating` = mean of `review.rating` where `review` present and `rating!=null`, rounded to 1 dp, null if none; `countsByStatus` tallies all five statuses.

- [ ] **Step 1: Write the failing test** for `computeReadingStats`

```ts
// src/lib/books/reading-stats.test.ts
import { describe, it, expect } from "vitest";
import { computeReadingStats } from "./reading-stats";

const yr = new Date().getFullYear();
const mk = (o: any) => ({ id: o.id, title: o.title ?? "T", slug: o.slug ?? o.id, pageCount: o.pageCount ?? null,
  reading: o.reading ?? null, review: o.review ?? null, genres: [] } as any);

describe("computeReadingStats", () => {
  const books = [
    mk({ id: "a", reading: { status: "currently_reading", currentPage: 180, totalPages: 300, percentage: 60 } }),
    mk({ id: "b", reading: { status: "finished", finishedAt: `${yr}-02-01`, totalPages: 320 }, review: { rating: 9 } }),
    mk({ id: "c", reading: { status: "finished", finishedAt: `${yr - 1}-05-01`, totalPages: 200 }, review: { rating: 8 } }),
    mk({ id: "d", reading: { status: "want_to_read" } }),
  ];
  const s = computeReadingStats(books);
  it("counts currently reading with percentage", () => {
    expect(s.currentlyReading).toEqual([{ title: "T", slug: "a", percentage: 60 }]);
  });
  it("finished-this-year excludes prior years", () => { expect(s.finishedThisYear).toBe(1); });
  it("pages read sums finished totalPages (all years)", () => { expect(s.pagesRead).toBe(520); });
  it("average rating over reviews, 1dp", () => { expect(s.averageRating).toBe(8.5); });
  it("want to read count", () => { expect(s.wantToRead).toBe(1); });
  it("counts by status", () => {
    expect(s.countsByStatus.finished).toBe(2);
    expect(s.countsByStatus.currently_reading).toBe(1);
  });
  it("null average when no reviews", () => {
    expect(computeReadingStats([mk({ id: "x", reading: { status: "want_to_read" } })]).averageRating).toBeNull();
  });
});
```

- [ ] **Step 2: Run test — expect FAIL** (module missing)

Run: `npm test -- src/lib/books/reading-stats.test.ts`

- [ ] **Step 3: Implement `reading-stats.ts`** (pure) to satisfy the rules above, then add the query functions to `queries.ts` mirroring the movies admin readers (`getAllGenresAdmin`, `getMovieGenreIdsAdmin`, `getMovieCollectionIdsAdmin` in `src/lib/movies/queries.ts`). Use `supabaseAdmin()`; admin readers may throw on error like the movies ones. Confirm/extend `getAllBooksAdmin()` embeds reading+review.

- [ ] **Step 4: Run test — expect PASS.** Then `npx tsc --noEmit` (expect zero errors in `src/lib/books`; ignore `src/app/playlists/*` — a concurrent session's uncommitted work, not ours).

- [ ] **Step 5: Commit**

```bash
git add src/lib/books/queries.ts src/lib/books/reading-stats.ts src/lib/books/reading-stats.test.ts
git commit -m "feat(books): admin read queries + reading-stats helpers"
```

---

### Task 2: Register Books + Shelves in admin nav

**Files:**
- Modify: `src/components/admin/layout/nav-config.tsx`

**Interfaces:** Consumes the existing `ADMIN_NAV` Content group. Produces two new nav items resolvable by `resolveActiveGroup`.

- [ ] **Step 1: Add the two entries** to the Content group's `items` array, immediately after the `Collections` entry and before the `...contentEntityItems` spread:

```ts
{ label: "Books", href: "/admin/books", icon: BookMarked },
{ label: "Shelves", href: "/admin/books/shelves", icon: BookOpen },
```

Add `BookMarked, BookOpen` to the existing `lucide-react` import (do NOT reuse `Library` — it's already used by the Library group heading). `isNavItemActive` already resolves `/admin/books`, `/admin/books/new`, `/admin/books/[id]` to Books, and `/admin/books/shelves*` to Shelves (longest-prefix wins, so Shelves' longer href takes its own routes).

- [ ] **Step 2: Type-check.** Run: `npx tsc --noEmit` (zero books/admin errors).

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/layout/nav-config.tsx
git commit -m "feat(books): admin nav entries for Books and Shelves"
```

Note: this file has concurrent uncommitted edits from another session (playlists). Change ONLY the two-line addition + the icon import; keep the diff minimal to reduce merge conflict.

---

### Task 3: Books list page + table

**Files:**
- Create: `src/app/admin/books/page.tsx`
- Create: `src/app/admin/books/books-table.tsx`
- Create: `src/components/admin/refresh-covers-button.tsx`

**Interfaces:**
- Consumes: `getAllBooksAdmin()`; actions `setBookPublished`, `deleteBook`, `duplicateBook`, `refreshCoversFromGoogleBooks`. Admin kit `PageHeader`, `AdminButton`; `DataTable`/`Column` from `@/components/admin/data`; `StatusBadge`; dropdown items from `@/components/ui/dropdown-menu`; `useToast`; `formatDate` from `@/lib/utils`.
- Produces: the `/admin/books` route.

- [ ] **Step 1: Write the list page** (`page.tsx`, `dynamic="force-dynamic"`, async server), mirroring `src/app/admin/movies/page.tsx`. Fetch `getAllBooksAdmin()`, flatten each book to a `Row`:
  `{ id, slug, title, author, status (reading?.status ?? "—"), percentage (reading?.percentage ?? null), rating (review?.rating?.toFixed(1) ?? "—"), genres (joined names), published (is_published), reviewPublished (review?.published), updatedAt }`.
  `PageHeader` actions: `<RefreshCoversButton />`, a "Shelves" link to `/admin/books/shelves`, and a "New book" link to `/admin/books/new` (all `AdminButton size="sm"`, the New one `asChild` wrapping a `Link`). Render `<BooksTable rows={rows} />`.

- [ ] **Step 2: Write `books-table.tsx`** (`"use client"`) mirroring `movies-table.tsx`. Declare `Column<Row>[]`: Title (link to `/admin/books/${r.id}`), Author, Status (`StatusBadge` tone by status: finished/currently_reading→success/info, else neutral; plus a `"No review"` warning badge when `!reviewPublished`), Progress (`r.percentage != null ? r.percentage + "%" : "—"`), Rating, Updated (`formatDate`). Pass `searchable={(r)=>`${r.title} ${r.author} ${r.genres} ${r.status}`}`, `initialSort={{key:"updated",dir:"desc"}}`, `getRowId`, empty states. `rowActions`: Edit link, Preview (`/books/${r.slug}` target=_blank), publish toggle (`setBookPublished`), Duplicate (`duplicateBook`), separator, Delete (native `confirm()` → `deleteBook`). `bulkActions`: Publish/Unpublish via `Promise.all(ids.map(id=>setBookPublished(id, bool)))`. Reuse the `run(promise, okMsg)` helper pattern from movies-table.

- [ ] **Step 3: Write `refresh-covers-button.tsx`** (`"use client"`), mirroring `RefreshArtworkButton`: an `AdminButton` that calls `refreshCoversFromGoogleBooks()`, disables while running, toasts `Updated {updated}, skipped {skipped}, failed {failed}` (danger on `error`), then `router.refresh()`.

- [ ] **Step 4: Type-check.** `npx tsc --noEmit` (zero books errors).

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/books/page.tsx src/app/admin/books/books-table.tsx src/components/admin/refresh-covers-button.tsx
git commit -m "feat(books): admin books list, table, refresh-covers action"
```

---

### Task 4: Book editor component

**Files:**
- Create: `src/components/admin/book-editor.tsx`

**Interfaces:**
- Consumes: actions `createBook`, `updateBook`, `searchGoogleBooks`, `importFromGoogleBooks`, `saveNote`, `deleteNote`, `saveBookPage`, `deleteBookPage`, `reorderBookPages`; `RECOMMENDATION_TYPES`, `READING_STATUSES`, `MOODS`, `PAGE_TYPES` from `@/lib/books/types`; generic kit `Button`/`Input`/`Label`, `useToast`; `useRouter`.
- Produces: `export function BookEditor(props: BookEditorProps)`.
  ```ts
  type BookEditorProps = {
    mode: "create" | "edit";
    book?: BookWithRelations & { review?: BookReview | null; reading?: BookReading | null };
    genreIds?: string[]; collectionIds?: string[];
    notes?: BookNote[]; pages?: BookPage[];
    allGenres: { id: string; name: string; slug: string }[];
    allShelves: { id: string; title: string }[];
  };
  ```

- [ ] **Step 1: Build the editor**, mirroring `src/components/admin/movie-editor.tsx` structure (fieldsets with legends, local `Field`/`Chip` components, `SELECT`/`TEXTAREA` class constants, `max-w-3xl` root). Sections in order:

  1. **Find the book (Google Books)** — query `Input` + Search button → `searchGoogleBooks(query)` → results `<ul>` of cover thumb + title + authors + year + a "Use" `Button` (`loading` per row). On pick → `importFromGoogleBooks` is for creating a fresh DB row, so here instead call the local prefill directly from the search result fields (title/subtitle/authors/description/cover/isbn/publisher/publishedDate/pageCount/language/categories): set metadata fields, using `setTitle((t)=>t||result.title)` guard so an in-progress editorial title isn't clobbered; map `categories` to matching `allGenres` (name/slug, lowercased) and union into the genre Set. Do NOT touch review/reading fields.
  2. **Book details** (metadata): title, subtitle, author, authors (comma-split → string[]), description (textarea), coverUrl, backdropUrl, isbn, publisher, publicationDate (date input), publicationYear, pageCount, language, country.
  3. **Reading** (`ReadingInput`): status `<select>` from `READING_STATUSES`; currentPage, totalPages (show a live computed `Math.round(cp/tp*100)%` label next to them — display only); startedAt, lastReadAt, finishedAt (date inputs).
  4. **My review** (`ReviewInput`): rating (number), verdict, recommendationType `<select>` from `RECOMMENDATION_TYPES`, shortReview, fullReview (textarea), whyRead, whyRecommend, whatILearned (textarea; helper text "one lesson per line"), whoShouldRead, whoShouldNotRead, review `published` checkbox.
  5. **Genres, moods & shelves** — chip toggles over `allGenres` (Set of ids), `MOODS` (Set of strings), `allShelves` (Set of ids), using the `toggle(set,setFn,id)` helper.
  6. **Notes** sub-panel (edit mode only, needs `book.id`): list `notes` (chapter/page/note preview + published badge), each with Edit/Delete; an add form (chapter, page, quote, note, tags comma-split, published) → `saveNote({ bookId, ... })`; Delete → `deleteNote(id)`; refresh local list from the action's returned row / `router.refresh()`.
  7. **Pages** sub-panel (edit mode only) — minimal builder: list `pages` ordered, each row shows `pageType` + title with up/down (`reorderBookPages(bookId, orderedIds)`), Edit (inline: pageType `<select>` from `PAGE_TYPES`, title, content textarea, published) → `saveBookPage({ bookId, ... })`, Delete → `deleteBookPage(id)`.
  8. **Visibility**: book `isPublished` checkbox.
  9. **Actions row**: Save (`createBook`/`updateBook` with the assembled `BookInput` incl. `genreIds:[...genreSet]`, `collectionIds:[...shelfSet]`, `moods:[...moods]`, `review`, `reading`), a Preview link to `/books/${book.slug}` in edit mode, Cancel (ghost → `/admin/books`). On success: toast + `router.push("/admin/books"); router.refresh()`. On create, the returned id can be used to `router.push(`/admin/books/${id}`)` so the notes/pages panels become available (mirror collection-editor's post-create redirect).

  Notes/pages/shelf membership that require a persisted `book.id`: in create mode, hide those sub-panels and show a hint "Save the book first to add notes and pages." (mirrors how collection-editor gates the movies list behind edit mode).

- [ ] **Step 2: Type-check.** `npx tsc --noEmit` (zero books errors).

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/book-editor.tsx
git commit -m "feat(books): book editor (metadata, reading, review, taxonomy, notes, pages)"
```

---

### Task 5: Book new/edit pages + delete button

**Files:**
- Create: `src/app/admin/books/new/page.tsx`
- Create: `src/app/admin/books/[id]/page.tsx`
- Create: `src/components/admin/book-delete-button.tsx`

**Interfaces:**
- Consumes: `getBookByIdAdmin`, `getAllBookGenresAdmin`, `getAllCollectionsAdmin`, `getBookGenreIdsAdmin`, `getBookCollectionIdsAdmin`, `getNotesAdmin`, `getBookPagesAdmin`; `BookEditor` from Task 4; `deleteBook`.
- Produces: `/admin/books/new` and `/admin/books/[id]`.

- [ ] **Step 1: `new/page.tsx`** (`dynamic="force-dynamic"`, async): `const [genres, shelves] = await Promise.all([getAllBookGenresAdmin(), getAllCollectionsAdmin()])`; render `PageHeader` + `<BookEditor mode="create" allGenres={genres} allShelves={shelves.map(s=>({id:s.id,title:s.title}))} />`.

- [ ] **Step 2: `[id]/page.tsx`** (`dynamic="force-dynamic"`, `params: Promise<{id:string}>`): `const { id } = await params`; parallel-load `getBookByIdAdmin(id)`, `getBookGenreIdsAdmin(id)`, `getBookCollectionIdsAdmin(id)`, `getNotesAdmin(id)`, `getBookPagesAdmin(id)`, `getAllBookGenresAdmin()`, `getAllCollectionsAdmin()`; `if (!book) notFound()`. Header flex row: `<h1>{book.title}</h1>` + `<BookDeleteButton id={book.id} title={book.title} />`. Render `<BookEditor mode="edit" book={book} genreIds collectionIds notes pages allGenres allShelves />`.

- [ ] **Step 3: `book-delete-button.tsx`** (`"use client"`), mirror `movie-delete-button.tsx`: `confirm()` → `deleteBook(id)` → toast → `router.push("/admin/books"); router.refresh()`.

- [ ] **Step 4: Type-check.** `npx tsc --noEmit`.

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/books/new/page.tsx "src/app/admin/books/[id]/page.tsx" src/components/admin/book-delete-button.tsx
git commit -m "feat(books): book new/edit pages + delete button"
```

---

### Task 6: Shelves admin (editor, table, pages)

**Files:**
- Create: `src/components/admin/shelf-editor.tsx`
- Create: `src/app/admin/books/shelves/page.tsx`
- Create: `src/app/admin/books/shelves/shelves-table.tsx`
- Create: `src/app/admin/books/shelves/new/page.tsx`
- Create: `src/app/admin/books/shelves/[id]/page.tsx`

**Interfaces:**
- Consumes: `createCollection`(FormData), `updateCollection`(FormData), `setCollectionPublished`, `deleteCollection`, `setCollectionBooks`; `getAllCollectionsAdmin`, `getCollectionByIdAdmin`, `getBooksForPickerAdmin`.
- Produces: `/admin/books/shelves` (+ new/[id]).

- [ ] **Step 1: `shelf-editor.tsx`** (`"use client"`) mirroring `collection-editor.tsx` exactly, swapping movie→book:
  `type PickBook = { id: string; title: string; coverUrl: string | null; year: string }`.
  Props `{ mode; shelf?: {id,title,description,coverUrl,isPublished}; allBooks?: PickBook[]; initialBooks?: PickBook[] }`.
  Info fieldset saves via `FormData` → `createCollection`/`updateCollection` (on create: `router.push(`/admin/books/shelves/${res.id}`)`). Books fieldset (edit only) manages ordered membership with optimistic `persist(next)` → `setCollectionBooks(shelf.id, next.map(b=>b.id))`, `move(i,dir)`/`remove(id)`/`add(book)`, and the same add-search dropdown + `<ol>` with up/down/remove `IconBtn`s.

- [ ] **Step 2: `shelves/page.tsx`** (`dynamic="force-dynamic"`): `getAllCollectionsAdmin()`, `PageHeader` (New shelf action + back-to-Books link), map to `Row {id,title,slug,count: bookCount ?? 0, published: isPublished, updatedAt}`, `<ShelvesTable rows/>`. `shelves-table.tsx` (`"use client"`) mirrors `collections-table.tsx`: columns Title (link `/admin/books/shelves/${r.id}`), Books (count), Status (Live/Hidden), Updated; row actions Edit / View (`/books/shelf/${slug}`) / publish toggle (`setCollectionPublished`) / Delete (`deleteCollection`, confirm "the books stay"). No bulk, no duplicate. (Note: `getAllCollectionsAdmin` may not populate a book count — if not, either add a count via a lightweight query or render `—`; do not block.)

- [ ] **Step 3: `shelves/new/page.tsx`** (non-async): `PageHeader` + `<ShelfEditor mode="create" />`. `shelves/[id]/page.tsx` (`params: Promise`): parallel `getCollectionByIdAdmin(id)` + `getBooksForPickerAdmin()`, `notFound()` guard, module-level `toPick(b)` mapper; render `PageHeader` + `<ShelfEditor mode="edit" shelf={{...}} allBooks={books.map(toPick)} initialBooks={(shelf.books ?? []).map(toPick)} />`. (Confirm `getCollectionByIdAdmin` returns ordered `books`; if it returns items without book details, extend it or map from the picker set by id preserving order.)

- [ ] **Step 4: Type-check.** `npx tsc --noEmit`.

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/shelf-editor.tsx "src/app/admin/books/shelves/"
git commit -m "feat(books): shelves admin (editor, table, new/edit pages)"
```

---

### Task 7: Reading dashboard

**Files:**
- Create: `src/app/admin/books/dashboard/page.tsx`
- Create: `src/components/admin/reading-stats.tsx`

**Interfaces:**
- Consumes: `getAllBooksAdmin()`, `computeReadingStats` (Task 1); admin `KPIWidget` (`@/components/admin/widgets`), `RecentCard`, `PageHeader`, `StatusBadge`.
- Produces: `/admin/books/dashboard`.

- [ ] **Step 1: `reading-stats.tsx`** (server) — takes `stats: ReadingStats`, renders a KPI grid (`grid grid-cols-2 md:grid-cols-4`): Currently reading (count), Finished this year, Pages read, Average rating (`stats.averageRating ?? "—"`), plus Want to read. Then a "Currently reading" `RecentCard` listing `stats.currentlyReading` (title + `percentage%`). Mirror the tile pattern in `src/app/admin/page.tsx`.

- [ ] **Step 2: `dashboard/page.tsx`** (`dynamic="force-dynamic"`, async): `const books = await getAllBooksAdmin(); const stats = computeReadingStats(books);` render `PageHeader title="Reading" ` + `<ReadingStats stats={stats} />`.

- [ ] **Step 3: Type-check.** `npx tsc --noEmit`.

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/books/dashboard/page.tsx src/components/admin/reading-stats.tsx
git commit -m "feat(books): admin reading dashboard"
```

---

### Task 8: Verify + PR

**Files:** none.

- [ ] **Step 1: Full test suite.** Run: `npm test` — expect all pass (incl. new `reading-stats` test). The whole-tree run passes even with the foreign `playlists` tsc errors (vitest ignores type errors).

- [ ] **Step 2: Books type-check.** Run: `npx tsc --noEmit 2>&1 | grep -E "src/(lib|components|app)/.*book" || echo NO_BOOKS_TSC_ERRORS`. Expect `NO_BOOKS_TSC_ERRORS`. (Whole-tree tsc still reports the neighbor's `src/app/playlists/*` errors — not ours.)

- [ ] **Step 3: Lint books.** Run: `npx eslint src/lib/books/ src/components/admin/book-editor.tsx src/components/admin/shelf-editor.tsx src/components/admin/reading-stats.tsx src/components/admin/refresh-covers-button.tsx src/components/admin/book-delete-button.tsx "src/app/admin/books/"` — expect clean.

- [ ] **Step 4: Push + PR (stacked; do NOT merge).**

```bash
git push -u origin feat/books-admin-cms
```
Open a PR with `--base feat/books-data-foundation --label no-announce`. Body: slice-2 admin CMS on top of slice 1; note it stacks on `feat/books-data-foundation` (retarget to `main` after slice 1 merges); note whole-tree `next build` may be red only from the concurrent `playlists` work; note `nav-config.tsx` may conflict with the concurrent playlists nav edit. Live smoke test (add book → reading + review → note → shelf → publish → dashboard) is pending the user's slice-1 SQL run + deploy.

---

## Self-Review

**Spec coverage:** list+filters+row actions → T3 ✓; add-book Google Books workflow + editorial + reading + genres/moods/shelves → T4 ✓; new/edit pages → T5 ✓; notes management → T4 (notes sub-panel) ✓; minimal page-builder → T4 (pages sub-panel) ✓; shelves CRUD + ordered membership → T6 ✓; reading dashboard → T7 ✓; nav registration → T2 ✓; admin read queries + stats → T1 ✓. Auth already enforced (layout + per-action gate) — no task needed. Cover-refresh bulk action → T3 ✓.

**Placeholder scan:** pure/tested code (T1 `computeReadingStats`) given in full with test. UI tasks point to concrete in-repo mirror files + exact action signatures (verified from `actions.ts`) + exact prop shapes + section order — copy-with-named-changes, as in slice 1's tasks 4/5. No "add error handling" hand-waving (toast/confirm/refresh patterns specified).

**Type consistency:** `BookInput`/`ReviewInput`/`ReadingInput`/`NoteInput`/`PageInput` fields quoted verbatim from `actions.ts` and consumed identically in T4. `ReadingStats` shape defined in T1, consumed in T7. `BookEditorProps`/`PickBook` defined where produced. `createCollection`/`updateCollection` FormData contract consistent across T6. `setCollectionBooks` ordered-replace consumed correctly in T6.

**Risks flagged in-plan:** `getAllBooksAdmin` may need a reading/review embed (T1 step 3 handles); `getAllCollectionsAdmin` book count + `getCollectionByIdAdmin` ordered books may need extending (T6 notes fallbacks); `nav-config.tsx` concurrent-edit conflict (T2 minimal-diff note).
