# Photos Gallery — Design Spec

**Date:** 2026-07-04
**Branch:** `feat/photos-gallery`
**Route:** `/photos` (public), `/admin/photos` (admin CRUD)

## Goal

Premium photo gallery at `shubhamdatarkar.com/photos` with grid/masonry toggle,
lightbox modal, anonymous likes with confetti, infinite scroll, and tag filtering.
Photos hosted on Cloudinary, metadata in Supabase, managed from the existing admin
dashboard. Adapted to the site's monochrome design system (Jakarta + Poppins fonts,
`#ff4800` brand color used only for interaction states, dark-mode support).

## Approach

Option A: `next-cloudinary` package.

- `CldImage` for optimized, responsive, auto-format (WebP/AVIF) rendering
- `CldUploadWidget` for admin uploads (unsigned upload preset)
- Supabase `photos` table for metadata
- Server Components for page shell + data fetch (ISR); Client Components for
  interactive pieces (layout toggle, lightbox, likes, infinite scroll, tag filter)

## Data Model

Supabase table `photos`:

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | default `gen_random_uuid()` |
| `cloudinary_public_id` | text NOT NULL | Cloudinary asset identifier |
| `title` | text NOT NULL | Display title |
| `description` | text | Optional caption |
| `tags` | text[] | Tags for filtering |
| `sort_order` | integer NOT NULL default 0 | Manual ordering |
| `published` | boolean NOT NULL default false | Draft vs visible |
| `created_at` | timestamptz NOT NULL default now() | |
| `updated_at` | timestamptz NOT NULL default now() | |

RLS:
- Public `SELECT` where `published = true`
- All operations for authenticated admin

Indexes: `sort_order`, `published`.

No `like_count` — likes are anonymous, stored in browser localStorage only.

## Public Gallery Page (`/photos`)

Server Component, ISR-cached. Structure follows existing page pattern:

- `PageHero` — eyebrow "Gallery", title "Photos", description
- `Container` wrapping gallery content
- Initial batch (12 photos) fetched server-side; rest via infinite scroll

### Layout toggle
- Radix `ToggleGroup`, grid vs masonry
- Persisted to localStorage
- Grid: CSS `repeat(auto-fill, minmax(300px, 1fr))`
- Masonry: CSS `column-count: 3` (2 tablet, 1 mobile)

### Cards
- `CldImage` fills card, gradient overlay at bottom with title + date
- Hover: `translateY(-4px)` + shadow lift, image `scale(1.02)`
- Entrance animation via `Stagger` / `StaggerItem`

### Lightbox modal
- Radix `Dialog`
- Full-screen overlay, `CldImage` centered
- Thumbnail strip (horizontal scroll) at bottom
- Keyboard: `ArrowLeft` / `ArrowRight` navigate, `Escape` close
- Touch: swipe left/right on mobile
- Like button with heart confetti

### Likes (anonymous)
- localStorage key `gallery-likes` → set of photo ids
- Heart toggles filled/outline
- Confetti: 30–40 heart particles via CSS `@keyframes`, brand/monochrome tones

### Infinite scroll
- `IntersectionObserver` on sentinel element
- 12 photos per page; fetch next batch when sentinel visible
- Skeleton shimmer cards during load

### Search / filter
- Tag pills above gallery (distinct tags from DB)
- Click tag to filter; active tag highlighted with brand ring
- Optional title substring search

Client Components: layout toggle, lightbox, likes, infinite scroll, tag filter.
Server Components: gallery shell + initial data fetch.

## Admin Photos Page (`/admin/photos`)

Follows existing admin CRUD pattern (layout-based `requireAdmin()` guard, server
actions, client-component forms).

### List (`/admin/photos/page.tsx`)
- Server Component, fetches all photos (published + drafts)
- Thumbnail card grid: preview, title, published/draft badge, sort order
- "New Photo" button → `/admin/photos/new`
- Click card → edit page

### New (`/admin/photos/new/page.tsx`)
- Server Component shell → passes `createPhoto` action to form

### Edit (`/admin/photos/[id]/page.tsx`)
- Server Component shell → fetches photo, passes `updatePhoto` action to form
- Delete button with `deletePhoto` action

### PhotoEditor (`/components/admin/photo-editor.tsx`)
- Client Component (matches PostEditor / EntityEditor)
- Fields:
  - Image upload — `CldUploadWidget`, preview after upload, stores `public_id`
  - Title — text input
  - Description — textarea (optional)
  - Tags — comma-separated input parsed to array
  - Sort order — number input
  - Published — checkbox
- Submit via form `action` prop

### Server actions (`/lib/photos/actions.ts`)
- `createPhoto(formData)` — insert into Supabase
- `updatePhoto(formData)` — update by id
- `deletePhoto(formData)` — delete by id + remove asset from Cloudinary via API
- All revalidate `/photos` and redirect to `/admin/photos`

### Nav
- Add "Photos" link to admin layout sidebar nav array.

## Cloudinary Setup (new account)

- New Cloudinary account required
- Env vars: `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`,
  `CLOUDINARY_API_SECRET`, `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`
- Unsigned upload preset for admin widget
- Signed API (server) for delete operations
- User handles account creation + provides keys; code reads from env

## Migration Workflow

Per project convention: write migration file
`supabase/migrations/20260704000002_photos_schema.sql`, hand user the SQL to run
manually. Never apply directly.

## Out of Scope (v1)

- Server-persisted likes / like counts
- Per-user accounts for likes
- Photo albums / collections
- EXIF metadata extraction
- Comments
