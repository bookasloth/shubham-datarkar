# Admin Foundation + Blog Management — Design Spec

**Date:** 2026-06-14
**Status:** Approved (design), pending implementation plan
**Scope:** First spec of a multi-slice admin build. Covers Slice 0 (auth foundation) + Slice 1 (blog end-to-end) + subscriber capture. Later slices reuse this pattern.

---

## 1. Goal

Give the site owner (single admin) a custom admin panel inside this Next.js app to manage blog content, with the data moved from static TypeScript files into Supabase. Establish the auth + data + CRUD pattern that all later content types (case studies, projects, products) will copy. Start capturing newsletter subscribers now so the later dashboard has real data.

## 2. Locked context (decided, not re-litigated)

- **Stack:** Next.js 16.2.9, React 19, Tailwind 4, Radix UI, framer-motion, `@supabase/supabase-js`. Existing repo.
- **Hosting/data:** owner's own Vercel + Supabase project + custom domain. The connected BAS Supabase project is OFF-LIMITS — never written to.
- **Design:** monochrome, Plus Jakarta Sans + Poppins. Reuse existing component library.
- **Admin approach:** custom-built in this app (no headless CMS, no generated admin).
- **Admin auth:** Supabase Auth, email + password, single admin user.
- **Payments:** keep Zoho (already partly wired via `supports.zoho_session_id`). Not touched in this spec.
- **Content authoring:** block editor over the existing `ContentBlock[]` model — public renderer unchanged.
- **Content migration:** seed existing static content into DB, then public pages read from DB.
- **Publishing:** draft / published / scheduled.
- **Media:** Supabase Storage.
- **Subscribers:** wire the existing newsletter form to a `subscribers` table now.

## 3. Slice / spec boundaries

This spec = **Slice 0 + Slice 1 + subscriber capture**.

- **Slice 0 — Auth foundation:** lock `/admin/*`, single admin, session handling, RLS admin gate.
- **Slice 1 — Blog end-to-end:** `posts` table → seed → public pages read DB → admin CRUD with block editor + media + scheduling.
- **Subscriber capture:** `subscribers` table + newsletter form insert + read-only admin list.

Later specs (NOT here): case studies, projects, products CRUD; payments/supports dashboard; subscriber export / email send; post analytics.

## 4. Architecture

```
/admin/*               gated app section, custom UI (Radix + monochrome)
  /login               existing page, wired to Supabase Auth
  /admin               dashboard (minimal: nav + entity counts)
  /admin/posts         list / create / edit posts (block editor)
  /admin/subscribers   read-only subscriber list

middleware.ts          redirects unauthenticated /admin/* -> /login

Supabase
  auth.users           single admin (owner), email + password
  public.posts         RLS: admin full write; public read of published/past-scheduled
  public.subscribers   RLS: anon insert (dedupe); admin read
  storage bucket media RLS: admin upload; public read
  fn is_admin()        email-allowlist gate used by RLS policies
```

## 5. Auth (Slice 0)

- Add **`@supabase/ssr`**. The existing `src/lib/supabase/server.ts` uses `persistSession: false` and cannot hold a login session — it stays for the anon/admin service-role read/write paths. New cookie-aware clients are added for auth:
  - a server client (reads/writes the session cookie in Server Components / route handlers / middleware),
  - a browser client (for the login form).
- **`middleware.ts`** guards `/admin/*`: if no valid session, redirect to `/login`. (Verify Next 16 middleware API against local docs before coding — see §12.)
- **Single-admin gate:** a Postgres `is_admin()` function checks the authenticated user's email against an allowlist (the owner's email). Used inside RLS policies for write access. No roles table (YAGNI).
- The existing `LoginForm` component is wired to `supabase.auth.signInWithPassword`. On success → redirect `/admin`. Logout action clears the session.
- The admin user is created once manually in Supabase (no public signup).

## 6. Posts data model

`public.posts`:

| column | type | notes |
|---|---|---|
| `id` | uuid pk | `gen_random_uuid()` |
| `slug` | text unique not null | URL slug |
| `title` | text not null | |
| `category` | text not null | matches existing `BlogCategory` slugs (seo, performance, content, ai, saas, founder) |
| `excerpt` | text | list/preview |
| `cover_image_url` | text | Storage URL |
| `body` | jsonb not null | existing `ContentBlock[]`, shape UNCHANGED |
| `status` | text not null | check in (`draft`,`published`,`scheduled`), default `draft` |
| `publish_at` | timestamptz | required when status = `scheduled` |
| `created_at` | timestamptz not null | default `now()` |
| `updated_at` | timestamptz not null | default `now()`, trigger-updated |

- **Public visibility rule (read):** `status = 'published' OR (status = 'scheduled' AND publish_at <= now())`. No cron — evaluated at read time. A scheduled post becomes visible automatically once its time passes.
- **Indexes:** unique on `slug`; partial index supporting the public visibility read; index on `category`.
- RLS:
  - public/anon + authenticated-non-admin: SELECT only rows matching the visibility rule, exposed via either a view or a SELECT policy.
  - admin (`is_admin()`): full SELECT/INSERT/UPDATE/DELETE including drafts.

## 7. Seeding

- One-time script (run locally / via migration) reads current `src/lib/data/posts.ts` (`ContentBlock[]` bodies, categories, author) and inserts a `posts` row per article, status `published`, preserving slugs so existing URLs don't break.
- After seeding, public blog pages query Supabase instead of importing the static array.
- `src/lib/data/posts.ts` is retained as the seed source of record, then dormant (not imported by runtime pages).

## 8. Block editor

- Form-based editor over `ContentBlock[]`. Supports the block types the public renderer already handles (e.g. `p`, `h2`, `ul`, `callout`, image, …; final list taken from `src/lib/data/types.ts`).
- Operations: add block, remove block, reorder, edit per-block fields.
- Output is the same `ContentBlock[]` JSON stored in `posts.body` — no markdown parser, no WYSIWYG engine, no renderer changes.

## 9. Media

- Supabase Storage bucket `media`.
- Admin upload widget → uploads file → returns public URL → stored in `cover_image_url` (and any image blocks).
- RLS: admin upload/delete; public read. No image transforms in this spec.

## 10. Subscribers

`public.subscribers`:

| column | type | notes |
|---|---|---|
| `id` | uuid pk | |
| `email` | text unique not null | dedupe key, case-insensitive |
| `source` | text | e.g. `newsletter-form` |
| `status` | text not null | default `active` |
| `created_at` | timestamptz not null | default `now()` |

- Existing newsletter form → inserts a subscriber (anon RLS allows INSERT only; dedupe on lower(email) — duplicate submit is a no-op success).
- `/admin/subscribers` lists them read-only (admin SELECT via RLS).

## 11. Public read repoint

- Blog list page and `blog/[category]/[slug]` page move from static import → Supabase server-component queries, applying the visibility rule.
- Downstream `ContentBlock` rendering is unchanged.
- A small data-access module (e.g. `src/lib/blog/queries.ts`) holds the post queries, mirroring the existing `src/lib/support/queries.ts` convention.

## 12. Implementation constraints

- Per `AGENTS.md`, this Next.js (16.2.9) differs from training data. Before writing middleware, server-client, or route-handler code, read the relevant guide under `node_modules/next/dist/docs/` and heed deprecation notices.
- All new tables target the owner's own Supabase project only.
- Service-role key stays server-only (existing `server-only` guard pattern).

## 13. Out of scope (later specs)

Case studies / projects / products CRUD · payments/supports dashboard · subscriber export + email send · post analytics · multi-user roles · image transforms · scheduling cron.

## 14. Success criteria

- Visiting `/admin/*` while logged out redirects to `/login`; logging in with the admin account reaches `/admin`.
- All existing blog posts are present in Supabase and the public blog renders them from the DB with unchanged appearance and URLs.
- A new post can be created, saved as draft (invisible publicly), published (visible), or scheduled (visible only after `publish_at`).
- A cover image uploads to Storage and displays.
- Submitting the newsletter form creates a subscriber row; duplicates don't error; the admin list shows them.
