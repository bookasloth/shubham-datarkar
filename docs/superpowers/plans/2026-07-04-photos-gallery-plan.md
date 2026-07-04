# Photos Gallery — Implementation Plan

Executes spec: `docs/superpowers/specs/2026-07-04-photos-gallery-design.md`
Branch: `feat/photos-gallery` (worktree at `../photos-gallery-wt`)

## Global Constraints (bind every task)

1. **Next.js 16.2.9 with breaking changes vs training data.** Per repo AGENTS.md,
   BEFORE writing any Next code, read the relevant guide under
   `node_modules/next/dist/docs/01-app/` (routing, data fetching, server actions,
   `next/image`). Heed deprecation notices. Do not assume APIs from memory.
2. **Monochrome design system.** Use the existing CSS design tokens defined in
   `src/app/globals.css` (`--background`, `--foreground`, `--card`, `--muted`,
   `--border`, `--primary`, radii `--radius-card`/`--radius-img`, motion
   `--ease-out-quint`, `--dur-*`). The brand color `--brand` (#ff4800) is used
   ONLY for interaction states (focus ring, hover, active/selected, scroll) —
   never as decoration. Never hardcode hex colors; support light + dark mode
   (next-themes `.dark` class) via tokens.
3. **Reuse existing components/patterns.** Layout: `Container`, `Section`,
   `PageHero`, `SectionHeading`. Motion: `Reveal`, `Stagger`, `StaggerItem` from
   `src/components/motion/reveal.tsx`. UI primitives (Radix-based): existing
   `Dialog`, `ToggleGroup`, `Button`, `Input`, `Label` in `src/components/ui/`
   (verify exact filenames before importing). Match the admin CRUD pattern from
   `src/app/admin/posts/` and `src/components/admin/post-editor.tsx`.
4. **No emojis in UI** (user preference). The HTML reference used ❤️ emoji for
   hearts — replace with Lucide `Heart` icon (outline/filled) throughout,
   including confetti particles (small filled Heart icons or CSS shapes, brand +
   muted tones), NOT emoji characters.
5. **Fonts are already global** (Plus Jakarta Sans display, Poppins body). Do not
   re-import fonts; use `font-display`/`font-sans` utilities or existing classes.
6. **Supabase manual SQL workflow.** Migrations are written as files only and
   handed to the user to run manually. NEVER apply migrations directly, never call
   Supabase MCP apply/execute tools.
7. **Images via next-cloudinary.** Use `CldImage` for rendering and
   `CldUploadWidget` for admin upload. Cloud name from
   `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`.
8. **TDD.** Follow test-driven development. Write tests where the project's test
   setup supports them; for pure logic (pagination, tag parsing, like-store)
   tests are expected. Match the repo's existing test framework/conventions
   (inspect for vitest/jest/playwright before writing tests).

## Data / Type Contract (shared across tasks)

`Photo` shape (TypeScript), defined in Task 1 at `src/lib/photos/types.ts`:

```ts
export type Photo = {
  id: string;
  cloudinaryPublicId: string;
  title: string;
  description: string | null;
  tags: string[];
  sortOrder: number;
  published: boolean;
  createdAt: string;
  updatedAt: string;
};
```

Queries (Task 1) map snake_case DB columns → camelCase `Photo`.

---

## Task 1: Database migration + data layer + types

**Goal:** Supabase `photos` table migration (file only) and a typed data-access
layer the rest of the app imports.

**Files:**
- `supabase/migrations/20260704000002_photos_schema.sql` — create `photos` table
  per spec Data Model (columns, defaults, `updated_at` trigger if the repo has a
  shared trigger pattern — check existing migrations first). RLS: enable; policy
  public `SELECT` where `published = true`; policy for admin (match how existing
  tables authorize admin writes — inspect `20260614000002_admin_auth.sql` and a
  table migration like `20260614000003_create_posts.sql`). Indexes on
  `sort_order` and `published`.
- `src/lib/photos/types.ts` — the `Photo` type above.
- `src/lib/photos/queries.ts` — server data access using the existing Supabase
  server client (`src/lib/supabase/server.ts`):
  - `getPublishedPhotos({ offset, limit, tag? }): Promise<Photo[]>` — published
    only, ordered by `sort_order` asc then `created_at` desc, paginated; optional
    tag filter (array contains).
  - `getPublishedPhotosCount(tag?): Promise<number>`
  - `getAllPhotos(): Promise<Photo[]>` — admin, all rows.
  - `getPhotoById(id): Promise<Photo | null>`
  - `getDistinctTags(): Promise<string[]>` — distinct tags across published photos.
  - A `mapRow` helper snake_case → `Photo`.

**Tests:** unit-test `mapRow` (row → Photo mapping). Do not hit a live DB.

**Verify:** typecheck passes. Migration SQL is valid Postgres (review by eye;
follow existing migration style).

**Do NOT:** apply the migration. Add `like_count`. Build UI.

---

## Task 2: Cloudinary integration + config

**Goal:** Wire next-cloudinary and server-side Cloudinary config for deletes.

**Files:**
- Install `next-cloudinary` and `cloudinary` (server SDK) — add to package.json,
  run the repo's package manager (detect from lockfile: pnpm/npm/yarn).
- `src/lib/cloudinary.ts` — server-only helper: configure `cloudinary` v2 with
  `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` /
  `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`; export `deleteCloudinaryAsset(publicId)`.
  Mark server-only (no client import).
- `next.config.ts` — if `next/image` remotePatterns are needed for
  `res.cloudinary.com`, add it (check current config; `CldImage` may not need it,
  verify against next-cloudinary docs behavior).
- `.env.example` (create if absent, else append) — document the four env vars:
  `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`, `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`,
  `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`. Do NOT put real secrets anywhere.

**Tests:** none required beyond typecheck (config/glue). If `deleteCloudinaryAsset`
has branching, add a small unit test with the SDK mocked.

**Verify:** typecheck passes; app still builds/starts.

**Do NOT:** commit real credentials. Build UI or actions here.

---

## Task 3: Public gallery page + grid/masonry + pagination + tag filter

**Goal:** The browse experience at `/photos`. Server page shell + client gallery
with layout toggle, cards, infinite scroll, tag filter, skeletons. (Lightbox is
Task 4 — this task exposes the seam for it.)

**Depends on:** Task 1 (queries, `Photo` type), Task 2 (`CldImage`).

**Files:**
- `src/app/photos/page.tsx` — Server Component. Metadata + JSON-LD (match how
  other pages do SEO, e.g. `src/app/about/page.tsx`). Renders `PageHero`
  (eyebrow "Gallery", title "Photos", description) then `Container` wrapping
  `<PhotoGallery>`. Fetches first page (12) via `getPublishedPhotos` and
  `getDistinctTags`, passes as props. ISR: set `revalidate` (match the value
  other public pages use — check an existing public page).
- Pagination endpoint for infinite scroll: a Route Handler
  `src/app/api/photos/route.ts` returning JSON `{ photos, hasMore }` for
  `?offset=&limit=&tag=`. (Read the route-handler doc under
  `node_modules/next/dist/docs/01-app/` first.) Published only.
- `src/components/photos/photo-gallery.tsx` — `"use client"`. Owns: photo list
  state (seeded from server props), current layout (`grid` | `masonry`, persisted
  to localStorage key `gallery-layout`), active tag, loading state. Renders:
  toolbar (ToggleGroup layout switch + tag pills), the card grid, skeletons while
  loading, and an `IntersectionObserver` sentinel that fetches the next page from
  `/api/photos`. Grid uses CSS grid `repeat(auto-fill,minmax(300px,1fr))`;
  masonry uses CSS `column-count` (3 desktop / 2 tablet / 1 mobile). Entrance
  animation via `Stagger`/`StaggerItem`.
  - **Seam for Task 4:** each card calls an `onOpen(index)` prop; `PhotoGallery`
    holds `openIndex: number | null` state and renders `<PhotoLightbox>` (a
    component Task 4 creates) with `photos`, `openIndex`, `onOpenChange`. In THIS
    task, stub `PhotoLightbox` as a minimal placeholder file exporting a component
    that renders `null` (Task 4 fills it in) OR wire the state and leave a clearly
    marked `// Task 4: lightbox` seam. Prefer the stub so the gallery compiles.
- `src/components/photos/photo-card.tsx` — `"use client"` (or server child if it
  needs no interactivity beyond onClick — decide). `CldImage` fill, gradient
  overlay with title + formatted date, hover lift (`translateY(-4px)` + shadow,
  image `scale(1.02)`) using tokens + `--ease-out-quint`. Calls `onOpen(index)`.
- `src/components/photos/photo-skeleton.tsx` — shimmer skeleton card using tokens.
- Date formatting + tag-parse helpers as needed in `src/lib/photos/` (pure,
  tested).

**Tests:** unit-test pure helpers (date format, hasMore/pagination math, tag
filter predicate). Component tests only if the repo already tests components.

**Verify:** `/photos` renders with seeded data; toggle switches layout and
persists; scrolling loads more; tag pills filter; dark mode correct. Use preview
tools (DOM snapshot/eval, no screenshots per user pref).

**Do NOT:** implement the lightbox internals, likes, or confetti (Task 4).

---

## Task 4: Lightbox modal + likes + confetti

**Goal:** Full-screen lightbox layered on the gallery, with anonymous likes and
heart confetti.

**Depends on:** Task 3 (`PhotoGallery` seam, `Photo` type, `CldImage`).

**Files:**
- `src/components/photos/photo-lightbox.tsx` — `"use client"`. Props:
  `photos: Photo[]`, `openIndex: number | null`, `onOpenChange(open)`,
  optional `onIndexChange`. Built on the existing Radix `Dialog`. Full-screen
  overlay; `CldImage` centered (contain). Bottom: horizontal-scroll thumbnail
  strip (click → jump), title + date, like button. Keyboard: ArrowLeft/Right
  navigate, Escape close (Dialog handles Escape — verify). Touch: swipe left/right
  navigates (touchstart/touchend threshold ~60px). Replace the stub from Task 3.
- `src/lib/photos/likes.ts` — localStorage like-store: `isLiked(id)`,
  `toggleLike(id): boolean`, `getLikedSet(): Set<string>`. Key `gallery-likes`.
  SSR-safe (guard `window`). Pure/unit-testable with a mocked storage.
- `src/components/photos/like-button.tsx` — `"use client"`. Lucide `Heart`
  (outline default, filled + brand color when liked). On like: toggle store,
  fire confetti, optional `navigator.vibrate(30)` guarded. Filled state animates
  (heartbeat scale keyframe).
- `src/components/photos/heart-confetti.tsx` — 30–40 Lucide `Heart` particles
  (NOT emoji) in brand + muted token tones, CSS `@keyframes` float-up + fade,
  randomized positions/durations, `pointer-events:none`, auto-cleanup ~1.3s.
- Wire `LikeButton` into both the lightbox and (optionally) a quick-like on the
  card overlay, matching the reference behavior.

**Tests:** unit-test `likes.ts` (toggle/isLiked/getLikedSet with mocked
localStorage) and any index-navigation math (wrap-around prev/next).

**Verify:** open lightbox from a card; arrows/swipe navigate with wrap-around;
Escape/close works; like toggles + persists across reload; confetti fires; dark
mode correct; no emoji anywhere. Preview via DOM tools.

**Do NOT:** add server-side like persistence.

---

## Task 5: Admin CRUD (list / new / edit + editor + actions + nav)

**Goal:** Manage photos from the admin dashboard, matching the existing admin
pattern.

**Depends on:** Task 1 (queries), Task 2 (`CldUploadWidget`, `deleteCloudinaryAsset`).

**Files:**
- `src/app/admin/photos/page.tsx` — Server Component list. Fetch `getAllPhotos`.
  Thumbnail card grid (CldImage), title, published/draft badge, sort order.
  "New Photo" button → `/admin/photos/new`. Card links to `/admin/photos/[id]`.
  Mirror `src/app/admin/posts/page.tsx`.
- `src/app/admin/photos/new/page.tsx` — Server shell passing `createPhoto` action
  to `<PhotoEditor>`.
- `src/app/admin/photos/[id]/page.tsx` — Server shell: fetch by id, pass
  `updatePhoto` action + existing values to `<PhotoEditor>`; render delete form
  wired to `deletePhoto`. Mirror `src/app/admin/posts/[id]/page.tsx`.
- `src/components/admin/photo-editor.tsx` — `"use client"`. Fields: Cloudinary
  upload (`CldUploadWidget`, unsigned preset from
  `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`, preview after upload, hidden input holds
  `public_id`), title, description (textarea), tags (comma-separated →
  parsed server-side), sort order (number), published (checkbox). Submit via form
  `action` prop. Match `post-editor.tsx` structure and UI primitives.
- `src/lib/photos/actions.ts` — `"use server"`. `createPhoto(formData)`,
  `updatePhoto(formData)`, `deletePhoto(formData)`. Use the admin Supabase server
  client; guard with the existing admin check (`requireAdmin`/`getAdminUser` from
  `src/lib/auth/session.ts` — verify path). `deletePhoto` also calls
  `deleteCloudinaryAsset`. All call `revalidatePath('/photos')` and
  `revalidatePath('/admin/photos')`, then `redirect('/admin/photos')`. Read the
  server-actions doc under `node_modules/next/dist/docs/01-app/` first.
- Add a "Photos" link to the admin sidebar nav in `src/app/admin/layout.tsx`
  (match the existing nav array entry shape).

**Tests:** unit-test tag parsing (comma string → normalized string[]) and any
formData→row mapping helper. Extract such logic into a pure function to test.

**Verify:** admin list shows photos; new/edit forms save; upload widget stores a
public_id; delete removes row (+ Cloudinary call); nav link present; admin auth
guard enforced. Preview via DOM tools where feasible.

**Do NOT:** expose these routes without the admin guard.

---

## Post-implementation

- Final whole-branch code review.
- Hand user: (1) the migration SQL to run manually in Supabase, (2) the four
  Cloudinary env vars to set (locally + Vercel), (3) Cloudinary account +
  unsigned upload preset setup steps.
- Do NOT deploy — deploy is a separate explicit user-gated step.
