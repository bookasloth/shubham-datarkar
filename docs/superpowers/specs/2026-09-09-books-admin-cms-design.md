# Books / Reading — Admin CMS (Slice 2)

Second slice of the Books/Reading section. Builds the admin CMS on top of the
Slice 1 data foundation (`feat/books-data-foundation`): list, fast add-book
workflow, reading dashboard, shelves CRUD, notes, and a minimal open-book
page-builder. It mirrors the existing Movies admin
(`src/components/admin/movie-editor.tsx`, `.../admin/movies/*`,
`.../admin/collections/*`) and wires to the server actions already built in
`src/lib/books/actions.ts` — no new write-layer logic.

Spec (slice 1 it builds on): `docs/superpowers/specs/2026-09-09-books-data-foundation-design.md`.

## Decisions (from brainstorming)

- Shelves admin at **`/admin/books/shelves`** (nested; public counterpart is `/books/shelf/[slug]`).
- **Include** a minimal `book_pages` builder now (list / add / reorder / delete; consumed by the slice-4 open-book reader).
- Reading dashboard at a dedicated **`/admin/books/dashboard`**.
- Slice 2 **stacks on** slice 1: branch off `feat/books-data-foundation`, PR targets it; rebase + retarget to `main` after slice 1 merges.

## Scope

All server actions exist (Task 5 of slice 1). This slice is admin UI + a few
admin-only read queries. Auth: pages live under `src/app/admin/**`, already
gated by `admin/layout.tsx` → `requireAdmin()`; every action re-checks
`getAdminUser()` (server-side defense in depth, already in place).

### Routes (App Router, server components; editors are client)
- `src/app/admin/books/page.tsx` — list. Server-fetches `getAllBooksAdmin()`, renders `<BooksTable>`.
- `src/app/admin/books/books-table.tsx` — client table: search (title/author), filter (reading status, genre, shelf, published, min rating), sort (title / updated / rating / status), pagination; row actions publish-toggle / duplicate / delete (existing actions) + edit link. Plus a header "Refresh covers from Google Books" button (calls `refreshCoversFromGoogleBooks`, shows `{updated,skipped,failed}` toast) — mirrors movies' refresh-artwork button.
- `src/app/admin/books/new/page.tsx` — `dynamic="force-dynamic"`; loads genres + shelves; renders `<BookEditor mode="create">`.
- `src/app/admin/books/[id]/page.tsx` — loads book (admin) + genres + shelves; `<BookEditor mode="edit">`.
- `src/app/admin/books/dashboard/page.tsx` — reading dashboard (server-computed stats).
- `src/app/admin/books/shelves/page.tsx` + `shelves-table.tsx` — shelves list.
- `src/app/admin/books/shelves/new/page.tsx` + `[id]/page.tsx` — `<ShelfEditor>`.

### Components
- `src/components/admin/book-editor.tsx` (client, `mode: "create"|"edit"`) — the fast add-book workflow, mirroring `movie-editor.tsx`:
  1. **Google Books search** box → `searchGoogleBooks(query)` → result cards → pick one → prefill metadata fields (never touches editorial). On edit, a "re-import metadata" affordance fills only empty fields.
  2. **Metadata** fields (editable): title, subtitle, author, description, cover_url, backdrop_url, isbn, publisher, publication_date/year, page_count, language, country.
  3. **Reading**: status (select), current_page, total_pages (percentage shown live, computed client-side for display; authoritative value recomputed server-side on save), started_at, finished_at.
  4. **Editorial**: rating, verdict, recommendation_type (from `RECOMMENDATION_TYPES`), short_review, full_review, why_read, why_recommend, what_i_learned (multiline → renders as the lessons spread), who_should_read, who_should_not_read.
  5. **Genres** + **moods** chip toggles (`MOODS`), **shelves** multi-select (calls `setBookGenres`/`setBookCollections` on save).
  6. **Notes** sub-panel: inline list + add (chapter/page/quote/note/tags/published) via `saveNote`/`deleteNote`.
  7. **Pages** sub-panel (minimal builder): list `book_pages`, add (page_type select + title + content), reorder (up/down → `reorderBookPages`), delete (`deleteBookPage`), edit (`saveBookPage`).
  8. Publish toggle; Save calls `createBook`/`updateBook`, toast, `router.push("/admin/books")`.
- `src/components/admin/shelf-editor.tsx` (client) — mirror `collection-editor.tsx`: title/slug/description/cover/publish/display_order + ordered book membership (`setCollectionBooks` — the ordered-replace action from slice 1; drag or up/down reorder).
- `src/components/admin/reading-stats.tsx` (server) — dashboard tiles.

### Admin read queries (add to `src/lib/books/queries.ts`, service role)
- `getBooksAdminList()` already exists as `getAllBooksAdmin()` — reuse; if it lacks reading/review for filtering, extend the admin select to embed them.
- `getReadingStats()` — currently-reading (with %), finished-this-year count, total pages read (sum finished total_pages), average rating (published reviews), counts by status, want-to-read count. Compute in memory over admin book set (small scale; `ponytail:` note).
- `getBookPagesAdmin(bookId)`, `getNotesAdmin(bookId)` — for the editor sub-panels (all rows incl. unpublished).

### Nav
- Register in `src/components/admin/layout/nav-config.tsx` under the **Content** group (where movies/collections live): "Books" → `/admin/books` and "Shelves" → `/admin/books/shelves`, with lucide icons (e.g. `BookOpen`, `Library`). `resolveActiveGroup` already resolves by pathname prefix.

## Non-goals (deferred)
- The public bookshelf / open-book reader (slice 4) and the public `/books` pages (slice 3). This slice authors content; slice 3 renders it.
- Rich-text editor for reviews (plain textarea like movies; upgrade later if wanted).
- Bulk actions beyond cover-refresh.

## Testing / verification
- `tsc` clean for the new files; `eslint` clean; `next build` exits 0 (server-only not leaked; the concurrent `playlists` tree may still break whole-tree build — verify books files compile in isolation as in slice 1).
- Unit tests only where pure logic is added (e.g. the dashboard stat helpers — `pagesRead`, `averageRating`, `finishedThisYear` — get a small vitest with fixtures). UI/action wiring is verified by build + a live smoke test after the user runs the slice-1 SQL and this deploys.
- Live smoke (after SQL + deploy): add a book via Google Books search → set reading + editorial → add a note → assign a shelf → publish → appears in `/admin/books`; dashboard numbers reflect it.

## Risks
- `nav-config.tsx` is being edited by a concurrent session (uncommitted `playlists` nav work in the shared tree). Our nav edit may conflict at merge — keep the edit minimal (add two entries to the Content group) and flag the conflict on the PR.
- Whole-tree build stays red while the neighbor's `playlists` work is uncommitted — not our regression; verify books files in isolation.
