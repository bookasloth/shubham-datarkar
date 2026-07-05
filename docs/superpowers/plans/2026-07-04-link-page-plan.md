# Implementation Plan: /link Page

**Spec:** `docs/superpowers/specs/2026-07-04-link-page-design.md`
**Branch:** `feat/admin-link-page`

## Global Constraints

- Supabase workflow: write migration SQL file only, user runs manually. Never apply directly.
- RLS: public reads via `published = true`, admin via `public.is_admin()` (existing function).
- Reuse `public.touch_updated_at()` trigger function (already exists from posts migration).
- Auth: `requireAdmin()` from `@/lib/auth/session` for all admin actions.
- Supabase clients: `supabaseAnon()` for public reads, `supabaseAuthServer()` for admin.
- ISR: `revalidate = 300` on public pages, `revalidatePath('/link')` on admin mutations.
- No tests required (no existing test infrastructure for server actions/queries in this project).
- Site identity: pull name/tagline from `site.ts` (`site.name`, `site.role`).
- Logo URL: `https://website-assets.shubhamdatarkar.com/logos/shubham-logo-secondary.png`

## Task 1: Database Migration

Write `supabase/migrations/20260704000002_link_page.sql`.

Two tables:

**`link_categories`:**
- `id` UUID PK default `gen_random_uuid()`
- `name` TEXT NOT NULL
- `slug` TEXT UNIQUE NOT NULL
- `sort` INTEGER NOT NULL DEFAULT 0
- `published` BOOLEAN NOT NULL DEFAULT true
- `created_at` TIMESTAMPTZ NOT NULL DEFAULT `now()`
- `updated_at` TIMESTAMPTZ NOT NULL DEFAULT `now()`

**`links`:**
- `id` UUID PK default `gen_random_uuid()`
- `category_id` UUID NOT NULL REFERENCES `link_categories(id)` ON DELETE CASCADE
- `title` TEXT NOT NULL
- `url` TEXT NOT NULL
- `color` TEXT NOT NULL DEFAULT `'#ffffff'`
- `sort` INTEGER NOT NULL DEFAULT 0
- `published` BOOLEAN NOT NULL DEFAULT true
- `created_at` TIMESTAMPTZ NOT NULL DEFAULT `now()`
- `updated_at` TIMESTAMPTZ NOT NULL DEFAULT `now()`

Indexes: `link_categories_sort_idx`, `links_category_sort_idx` (category_id, sort).

RLS on both tables:
- `{table}_public_read`: SELECT for anon, authenticated WHERE `published = true`
- `{table}_admin_read`: SELECT for authenticated WHERE `is_admin()`
- `{table}_admin_write`: ALL for authenticated WHERE `is_admin()` WITH CHECK `is_admin()`

Grants: SELECT to anon, authenticated. INSERT/UPDATE/DELETE to authenticated.

Trigger: `touch_updated_at` on both tables (reuse existing function).

Include seed data from reference bio page:
- 6 categories: start (sort 0), work (1), resources (2), shop (3), social (4), games (5)
- 30 links total (5 per category) with titles, URLs, and colors from reference HTML

Seed link colors (from reference CSS):
- orange: #FE5100, pink: #FF4D93, green: #2d9948, yellow: #FFCC1C, blue: #269CEF
- black: #000000, red: #E53935, violet: #7F00FF, cyan: #00BCD4, peach: #FFCBA4
- magenta: #FF00FF, linkedin: #0A66C2, twitter: #000000, youtube: #FF0000
- instagram: #E1306C, facebook: #1877F2

**Acceptance:** Valid SQL file that creates both tables, indexes, RLS, grants, triggers, and seed data. Follows pattern of existing migrations (see `20260615000002_create_content.sql`).

## Task 2: Queries and Server Actions

Create two files:

**`src/lib/links/queries.ts`:**
- `import "server-only"`
- `getPublishedCategoriesWithLinks()` — public query using `supabaseAnon()`. Select all published categories ordered by sort, then for each fetch published links ordered by sort. Return type: `LinkCategory[]` where `LinkCategory = { id, name, slug, links: Link[] }` and `Link = { id, title, url, color }`.
- `getAllCategoriesWithLinksAdmin()` — admin query using `supabaseAuthServer()`. All categories with all links (regardless of published). Return type includes `published`, `sort` fields.
- Types: export `LinkCategory`, `Link`, `AdminLinkCategory`, `AdminLink`.

**`src/lib/links/actions.ts`:**
- `"use server"` directive
- `createCategory(formData: FormData)` — requireAdmin, insert into link_categories (name, slug, sort, published), revalidatePath('/link'), redirect to /admin/links
- `updateCategory(id: string, formData: FormData)` — same pattern, update
- `deleteCategory(id: string)` — requireAdmin, delete, revalidatePath('/link'), redirect /admin/links
- `createLink(formData: FormData)` — requireAdmin, insert into links (category_id, title, url, color, sort, published), revalidatePath('/link'), redirect /admin/links
- `updateLink(id: string, formData: FormData)` — same pattern, update
- `deleteLink(id: string)` — requireAdmin, delete, revalidatePath('/link'), redirect /admin/links

Follow patterns from `src/lib/content/actions.ts` and `src/lib/content/queries.ts`.

**Acceptance:** Both files compile. Queries return correct types. Actions gate with requireAdmin, use supabaseAuthServer, revalidate /link.

## Task 3: Admin Page + Sidebar

Three files:

**`src/components/admin/link-manager.tsx`:**
- `"use client"` directive
- Client component receiving `categories: AdminLinkCategory[]` prop
- Categories section at top: table with name, slug, sort, published columns. Each row has edit/delete buttons. Add category button opens inline form or dialog.
- Links section below: grouped by category with category name as header. Each link row shows title, URL (truncated), color swatch (small colored div), sort, published. Edit/delete buttons per link. Add link button per category group.
- Edit forms: inline or dialog with fields for each property. Color input uses native `<input type="color">`.
- All form submissions use server actions from `src/lib/links/actions.ts`.
- Delete with confirmation (`confirm()` dialog).
- Use existing UI components from `src/components/ui/` (button, input, card, etc.) and match existing admin styling (see entity-editor.tsx patterns).

**`src/app/admin/links/page.tsx`:**
- Server component
- `requireAdmin()` guard
- Fetch `getAllCategoriesWithLinksAdmin()`
- Render `<LinkManager categories={data} />`
- Page title: "Links"

**`src/app/admin/layout.tsx`:**
- Add `{ href: "/admin/links", label: "Links" }` to NAV array, after "Updates" entry.

**Acceptance:** Admin page renders categories and links. CRUD operations work via server actions. Sidebar shows "Links" entry.

## Task 4: Public /link Page

Two files:

**`src/components/link-page.tsx`:**
- `"use client"` directive
- Props: `categories: LinkCategory[]` (from public query)
- State: `activeTab` (string, default = first category's slug)
- Renders full Linktree-style page:

1. Animated fluid background: fixed position div with 5 spans (colored blobs). Colors: `#ff6a25`, `#FF4D93`, `#36abff`, `#45ff74`, `#9d3aff`. Each blob: `position:absolute`, `width:400px`, `height:400px`, `border-radius:50%`, `opacity:0.6`. Parent: `filter:blur(60px)`, `z-index:-2`. Floating keyframe animation (translate + scale, 2-9s durations per blob). Dark overlay via `::before` on body-like wrapper: `rgba(15,17,17,0.75)`.

2. Container: `max-width:680px`, centered, `padding:50px 20px`, `text-align:center`.

3. Profile: logo img (50px, rounded, white bg padding), name "Shubham Datarkar" (26px, font-weight 600), tagline from site config (14px, grey).

4. Category tabs: flex row centered, gap 8px, flex-wrap. Each tab: padding 10px 14px, dark bg `#1A1D24`, rounded 4px, cursor pointer, 14px. Active: white bg, orange text `#FE5100`, font-weight 500. onClick sets activeTab.

5. Links list: flex column, gap 12px. Only show links for activeTab category. Each link: `<a>` block, padding 16px, text-decoration none, 16px font, font-weight 500, bg `#1A1D24`, white text, rounded 4px, border `0.5px solid rgba(255,255,255,0.55)`. Hover: apply link's `color` as backgroundColor (use inline style). `target="_blank"` + `rel="noopener noreferrer"`.

6. Footer: margin-top 20px, 12px, grey `#6b7280`. Text: "1995 - 2026 (c) Shubham N Datarkar | Build with Love"

- Use Tailwind where clean, inline styles where Tailwind can't express (dynamic hover colors, blob animations). Poppins font via `font-family: 'Poppins', sans-serif` (already loaded globally or add import).

**`src/app/link/page.tsx`:**
- Server component
- `export const revalidate = 300`
- Custom metadata: title "Shubham Datarkar | Links", description, no robots index (optional)
- Fetch `getPublishedCategoriesWithLinks()`
- If no categories, show empty state
- Render `<LinkPage categories={data} />`
- Standalone: does NOT use admin layout or main site layout. Add `src/app/link/layout.tsx` if needed to strip site chrome — or just render without it since /link is outside the (site) group.

Check whether the app uses a route group for the main layout. If `/link` already bypasses site layout by default, no extra layout needed.

**Acceptance:** /link page renders with animated background, profile header, working tab switching, clickable links with colored hover effects. Matches reference bio page visually.
