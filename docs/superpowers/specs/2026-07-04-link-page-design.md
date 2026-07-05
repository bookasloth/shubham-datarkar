# Link Page Design Spec

**Date:** 2026-07-04
**Branch:** `feat/admin-link-page`
**Route:** `/link`

## Overview

Linktree-style page at `/link` with admin CRUD. Colorful standalone page (animated blob background, colored hover links). Categories and links fully managed from admin dashboard.

## Database Schema

### `link_categories`

| Column     | Type        | Notes                          |
|------------|-------------|--------------------------------|
| id         | UUID PK     | `gen_random_uuid()`            |
| name       | TEXT        | NOT NULL, display name         |
| slug       | TEXT        | UNIQUE NOT NULL, tab key       |
| sort       | INTEGER     | DEFAULT 0, tab order           |
| published  | BOOLEAN     | DEFAULT true, show/hide tab    |
| created_at | TIMESTAMPTZ | DEFAULT `now()`                |
| updated_at | TIMESTAMPTZ | Auto-update trigger            |

### `links`

| Column      | Type        | Notes                                  |
|-------------|-------------|----------------------------------------|
| id          | UUID PK     | `gen_random_uuid()`                    |
| category_id | UUID FK     | References `link_categories.id`, CASCADE |
| title       | TEXT        | NOT NULL, link display text            |
| url         | TEXT        | NOT NULL, destination URL              |
| color       | TEXT        | DEFAULT `'#ffffff'`, hover color hex   |
| sort        | INTEGER     | DEFAULT 0, order within category       |
| published   | BOOLEAN     | DEFAULT true, show/hide link           |
| created_at  | TIMESTAMPTZ | DEFAULT `now()`                        |
| updated_at  | TIMESTAMPTZ | Auto-update trigger                    |

### RLS Policies

- **Public SELECT:** `published = true` on both tables (independent RLS per table).
- **Parent filtering:** Query-level JOIN ensures links only appear under published categories (not enforced in RLS).
- **Admin full access:** Gated via `public.is_admin()` (existing function).

## Admin UI

### Route: `/admin/links`

Single page managing both categories and links.

**Categories section (top):**
- Table/list of categories: name, slug, sort, published toggle
- Add new category button (dialog or inline form)
- Edit/delete per category row

**Links section (below):**
- Accordion or grouped list per category
- Each link row: title, URL, color picker/swatch, sort, published toggle
- Add new link button per category (dialog or inline form)
- Edit/delete per link row

### Sidebar Integration

"Links" entry added to admin sidebar nav in `src/app/admin/layout.tsx`.

### Server Actions

Located in `src/lib/links/actions.ts`:

- `createCategory(formData)` — insert into `link_categories`
- `updateCategory(id, formData)` — update `link_categories` row
- `deleteCategory(id)` — delete category (cascades links)
- `createLink(formData)` — insert into `links`
- `updateLink(id, formData)` — update `links` row
- `deleteLink(id)` — delete link

All actions:
- Gated with `requireAdmin()`
- Use `supabaseAuthServer()` client
- Call `revalidatePath('/link')` on success

### Queries

Located in `src/lib/links/queries.ts`:

- `getPublishedCategoriesWithLinks()` — public: all published categories with their published links, ordered by sort
- `getAllCategoriesAdmin()` — admin: all categories regardless of published state
- `getCategoryLinksAdmin(categoryId)` — admin: all links for a category
- `getLinkByIdAdmin(id)` — admin: single link for edit form

## Public Page

### Route: `src/app/link/page.tsx`

- ISR: `revalidate = 300`
- Standalone layout (no site navbar/footer)
- Custom metadata: title "Shubham Datarkar | Links"

### Visual Design

Matches reference bio page:

1. **Animated fluid background:** 5 colored blobs (`#ff6a25`, `#FF4D93`, `#36abff`, `#45ff74`, `#9d3aff`) with `blur(60px)`, floating animation, dark overlay at 75% opacity
2. **Profile header:** Site logo, "Shubham Datarkar", tagline from `site.ts` config
3. **Category tabs:** Horizontal pills, active = white bg with orange accent text, inactive = dark bg
4. **Links list:** Vertical cards with white text on dark `#1A1D24` bg, `0.5px` white border, hover applies link's `color` field as background
5. **Footer:** Copyright line

### Data Flow

1. Server component fetches all published categories with links (single query with join)
2. Passes data to client component `LinkPage` for tab interactivity
3. Tab switching = client-side state (no refetch), default = first category by sort
4. Links open in new tab (`target="_blank"`)

## File Structure

```
src/
  app/
    link/
      page.tsx              # Public page (server component wrapper)
    admin/
      links/
        page.tsx            # Admin CRUD page
  components/
    link-page.tsx           # Client component for public /link page
    admin/
      link-manager.tsx      # Client component for admin CRUD
  lib/
    links/
      queries.ts            # Data fetching
      actions.ts            # Server actions
supabase/
  migrations/
    0001_games_schema.sql   # (existing)
    0002_link_page.sql      # New migration
```

## Seed Data

Pre-populate with categories and links from reference bio page:
- Start (5 links), Work (5 links), Resources (5 links), Shop (5 links), Social (5 links), Games (5 links)
- Colors from reference: orange, pink, blue, green, yellow, black, red, violet, cyan, peach, magenta + social brand colors
