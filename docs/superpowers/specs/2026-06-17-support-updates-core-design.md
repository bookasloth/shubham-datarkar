# Support Updates — Core (Sub-project 1 of 5)

**Date:** 2026-06-17
**Branch:** `feat/support-updates-core`
**Status:** Approved design, pre-implementation

## Context

`/support/updates` is currently a static feed (`supportUpdates` mock in
`src/lib/data/support-content.ts`, rendered by `src/components/support/update-post.tsx`
with text/image/checklist variants). It is read-only, has no per-post pages, no DB.

The owner wants `/support/updates` to become a DB-backed social layer: posts with
their own shareable pages, reactions, threaded comments, email-verified commenters,
tier badges, and an auto-generated thank-you post on every successful payment.

That full scope is **five sub-projects**, each with its own spec → plan → build:

1. **Updates core** ← *this spec*
2. Auto thank-you post on payment success
3. Commenter identity + email verification + supporter tier badges
4. Threaded comments + reply notifications
5. LinkedIn-style post reactions

This spec covers **only #1**: the data model, media handling, admin authoring, public
feed, and per-post pages. It is the foundation the later sub-projects slot into.

## Goals

- DB-backed updates replacing the static mock.
- Three manual post types: **text**, **image + caption**, **video + caption**.
- A fourth **thankyou** type the schema supports but only the system creates (in #2).
- Each post has a unique shareable page at `/support/updates/{6-digit-code}`.
- Admin authoring at `/admin/updates` (list + structured create/edit/delete).
- Per-post page renders the post, a "Support" button → `/support`, and leaves mounted
  slots for comments (#4) and reactions (#5).

## Non-goals (later sub-projects)

Auto-creation on payment, email verification, tier badges, comments, notifications,
reactions. None of those are built here.

## Decisions (confirmed with owner)

- **Post code:** random 6-digit, DB unique, regenerate-and-retry on collision.
- **Media:** images uploaded to a Supabase Storage bucket; video pasted as a
  YouTube/Vimeo URL and embedded (no video file upload).
- **Feed mix:** thank-you posts and manual posts share one chronological feed.
- **No title:** posts are caption/body + media only (LinkedIn-style).
- **No drafts:** saving a post publishes it immediately; all rows are live. Delete only.

## Data model

New dedicated table (not the generic content registry — updates own their URL,
comments, and reactions).

```
support_updates
  id          uuid primary key default gen_random_uuid()
  code        text not null unique          -- 6-digit, random + retry
  type        text not null check (type in ('text','image','video','thankyou'))
  body        text not null default ''       -- the caption / text
  media       jsonb not null default '{}'    -- image: {url}
                                             -- video: {provider:'youtube'|'vimeo', videoId, embedUrl}
                                             -- thankyou: {imageUrl}
  author      jsonb                          -- thankyou only: {name} | {alias}
  created_at  timestamptz not null default now()   -- feed order, newest first
  updated_at  timestamptz not null default now()
```

- Index on `created_at desc` for the feed.
- RLS: public (anon + authenticated) read **all** rows (no draft state); writes only
  for authenticated admins via `public.is_admin()` — mirrors existing content tables.
- Reuses `public.touch_updated_at()` trigger from the posts migration.
- `thankyou` rows are inserted only by the system in sub-project 2. Admin authors
  text/image/video only.

### Thank-you image library

A single-row settings table holds the 5 reusable thank-you images that sub-project 2
chooses from:

```
support_settings
  id            int primary key default 1 check (id = 1)   -- enforce single row
  thankyou_images jsonb not null default '[]'              -- array of up to 5 public URLs
  updated_at    timestamptz not null default now()
```

RLS: admin read/write; public read (the chosen image URL ends up on a public post anyway).

### Migration

One manual SQL migration file `supabase/migrations/20260617000003_support_updates.sql`
(both tables + Storage bucket note). Per the project workflow, the file is written and
the SQL handed to the owner to run manually against his own Supabase. Storage bucket
`support-media` (public read) is created in the Supabase dashboard/SQL as part of
activation.

## Media handling

- **Bucket:** `support-media`, public-read.
- **Image upload:** a server action receives the file and uploads via the
  service-role Supabase client (consistent with the project's service-role pattern),
  returns the public URL, which is stored in `media.url`.
- **Video:** admin pastes a YouTube or Vimeo watch/share URL. A small parser
  (`src/lib/support/video.ts`) extracts provider + id and derives the embed URL.
  Invalid URLs are rejected in the action with a field error.

## Admin — `/admin/updates`

- **List page:** newest first, shows type + a snippet of body, link to edit, delete.
  "New" button.
- **Editor** (`src/components/admin/update-editor.tsx`):
  - Type dropdown: text / image / video.
  - Conditional fields: text → body. image → body + image upload. video → body +
    video URL (live-validated, shows resolved embed preview).
  - Save publishes immediately (insert with a freshly generated unique code).
- **Thank-you images panel:** upload/replace the 5 images, persisted to
  `support_settings.thankyou_images`.
- Add **Updates** to the admin nav (`src/app/admin/layout.tsx`).
- Server actions in `src/lib/support/updates-actions.ts`; admin queries +
  code generator in `src/lib/support/updates.ts`.

## Public — feed + per-post pages

- **Feed** (`src/app/support/updates/page.tsx`): rewritten to read published rows from
  the DB (newest first), mixed manual + thank-you. Empty state preserved.
- **Card** (`src/components/support/update-card.tsx`): renders per type —
  - text: body.
  - image: image + body.
  - video: embedded player + body.
  - thankyou: thank-you image + author name/alias + body.
  Each card links to its post page.
- **Per-post page** (`src/app/support/updates/[code]/page.tsx`): fetches by `code`
  (404 if missing), renders the full post, a **Support** button linking to `/support`,
  and empty mounted slots for comments (#4) and reactions (#5). Sets per-post OG
  metadata so pages are shareable.

## Retirements

- Remove the static `supportUpdates` array and the `checklist` variant.
- `src/components/support/update-post.tsx` is replaced by `update-card.tsx`
  (or refactored). The text/image/checklist variant logic is gone; new types are
  text/image/video/thankyou.

## Components & boundaries

| Unit | Purpose | Depends on |
|------|---------|-----------|
| `support_updates`, `support_settings` (DB) | persistence | Supabase |
| `lib/support/updates.ts` | typed queries + code generator | supabase clients |
| `lib/support/updates-actions.ts` | admin create/delete + image upload server actions | service-role client, video.ts |
| `lib/support/video.ts` | parse YouTube/Vimeo URL → embed | — |
| `admin/updates/*` + `update-editor.tsx` | authoring UI | actions, queries |
| `support/updates/page.tsx` + `update-card.tsx` | public feed | queries |
| `support/updates/[code]/page.tsx` | per-post page | queries |

## Error handling

- All DB reads fail-safe to empty (matches existing `warn → return []` pattern in
  `lib/content/queries.ts`).
- Image upload / video parse errors surface as form field errors, no crash.
- Missing post code → `notFound()`.
- Bucket/table absent before activation → feed shows empty state, admin shows the
  fail-safe empty list.

## Testing / verification

- `next build` green, `tsc` + `eslint` clean.
- Browser verify (DOM eval/snapshot, no screenshot per project pref): feed renders the
  three types, per-post page resolves by code, 404 on bad code, Support button links to
  `/support`, admin create→appears in feed, delete→gone.
- Until the owner runs the migration + creates the bucket, everything fail-safes to
  empty — verified in that state too.
