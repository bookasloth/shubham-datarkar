# Photos: Cloudinary → Supabase Storage Migration

**Date:** 2026-07-06
**Status:** Approved
**Scope:** Replace Cloudinary with Supabase Storage for all photo upload, rendering, and deletion

## Context

The photos feature currently uses Cloudinary for image storage (upload via CldUploadWidget, render via CldImage, delete via Cloudinary SDK). This migration moves everything to Supabase Storage, matching the existing `support-media` bucket pattern already in the codebase.

Fresh start — no existing Cloudinary photos to migrate.

## Architecture

### Storage

- **Bucket:** `photos` (public, in Supabase Storage)
- **File naming:** `{Date.now()}-{randomHex(6)}.{ext}` — collision-free, no subdirectories
- **Allowed MIME types:** `image/jpeg`, `image/png`, `image/webp`, `image/avif`
- **Max file size:** 10 MB (enforced at upload)

### Database

Rename column `cloudinary_public_id` → `storage_path` in `photos` table. Stores the path within the bucket (e.g. `1720300000-a1b2c3.webp`). Public URL constructed at render time.

Migration: `ALTER TABLE ... RENAME COLUMN` (no data to backfill).

### New module: `src/lib/photos/storage.ts`

Three functions following the `support-media` pattern:

| Function | Signature | Notes |
|----------|-----------|-------|
| `getPhotoPublicUrl` | `(storagePath: string) => string` | Constructs full Supabase public URL |
| `uploadPhoto` | `(file: File) => Promise<string>` | Uploads to `photos` bucket via `supabaseAdmin()`, returns storage_path |
| `deleteStoragePhoto` | `(storagePath: string) => Promise<void>` | Removes file from bucket, logs errors without throwing |

### Image rendering

- `CldImage` → `next/image` with `src={getPhotoPublicUrl(storagePath)}`
- Supabase hostname added to `remotePatterns` in `next.config`
- Vercel image optimizer handles resize/format/lazy-load at edge
- Responsive `sizes` prop on each `<Image>` for srcset generation

### Upload flow (admin)

1. `<input type="file" accept="image/*">` replaces CldUploadWidget
2. Client-side preview via `URL.createObjectURL()`
3. Form submission sends file as FormData
4. Server action validates type + size, calls `uploadPhoto()`, saves `storage_path` to DB
5. On edit: existing image shown via `getPhotoPublicUrl()`, file input replaces it

### Delete flow

Same pattern as current: delete DB row first, then call `deleteStoragePhoto()`. Storage errors logged, not thrown — avoids orphaning DB state on transient storage failures.

## Files changed

### New
- `src/lib/photos/storage.ts` — upload/delete/URL helper

### Modified
- `src/lib/photos/types.ts` — `cloudinaryPublicId` → `storagePath`
- `src/lib/photos/actions.ts` — use storage.ts instead of cloudinary.ts
- `src/lib/photos/queries.ts` — field name update
- `src/lib/photos/form.ts` — form parsing for new field
- `src/components/admin/photo-editor.tsx` — file input + Image instead of Cld* components
- `src/components/photos/photo-card.tsx` — Image instead of CldImage
- `src/components/photos/photo-lightbox.tsx` — Image instead of CldImage
- `src/app/admin/photos/page.tsx` — Image instead of CldImage
- `src/app/admin/photos/new/page.tsx` — pass-through (uses photo-editor)
- `src/app/admin/photos/[id]/page.tsx` — pass-through (uses photo-editor)
- `next.config.*` — add Supabase to remotePatterns
- `.env.example` — remove CLOUDINARY vars
- `package.json` — remove cloudinary + next-cloudinary

### Deleted
- `src/lib/cloudinary.ts`
- `src/lib/cloudinary.test.ts`

### Migration SQL
- New migration: rename column + create storage bucket (bucket creation via SQL or manual)

### Tests updated
- `src/lib/photos/form.test.ts` — field name
- `src/lib/photos/queries.test.ts` — field name
- Remove cloudinary.test.ts

## Not in scope

- Image cropping/editing UI
- Multiple image upload
- Image size variants (Next.js Image optimizer handles this)
- Cloudinary data migration (fresh start confirmed)
