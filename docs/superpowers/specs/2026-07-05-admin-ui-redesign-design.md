# Admin UI Redesign — Design Spec

**Date:** 2026-07-05
**Status:** Approved (brainstorming) — pending spec review
**Scope:** Visual + component-architecture redesign of the `/admin` panel. **No** changes to routes, APIs, server actions, queries, auth, permissions, or database schema.

---

## 1. Objective

Modernize the existing admin panel to the quality bar of Linear / Vercel / Stripe / Supabase dashboards while preserving **every** existing feature, route, and business rule. This is a UI + component-architecture refactor, not a rewrite and not a data-layer migration.

**Feel:** minimal, professional, dense but readable, fast, highly consistent. No decorative UI, gradients, glassmorphism, neumorphism, or gratuitous motion.

---

## 2. Hard Constraints (non-negotiable)

Do NOT change:
- Routes / URL structure under `app/admin/**`
- APIs, server actions, `src/lib/**/queries`, business logic
- Authentication (`requireAdmin`), permissions
- Database schema
- Public site (`components/ui/*` and all non-admin routes stay frozen)

Only markup, styling, and component composition inside the admin change. Data-fetching call sites may be **optimized** (parallelize, use `count()` instead of over-fetching) but must return the same data.

---

## 3. Brand / Accent Decision

Public brand is **locked monochrome**. Admin is an internal tool and is granted an exception: it uses **`#FE5100`** as an interaction/emphasis accent only.

- Ratio target: **95% black/white/gray, 5% orange**.
- Orange appears **only** on state: active nav, hover/focus/active borders, focus ring, active tabs, selected rows, primary CTA, important badges, progress, active filters.
- Never used as a fill/background flood.
- Accent is **scoped** to admin (see tokens) so it can never leak into public pages.

Admin **respects the site light/dark theme** (public site already uses `next-themes`). Both palettes defined below.

---

## 4. Design Tokens (semantic, admin-scoped)

Tokens are declared under an admin scope (`[data-admin]` wrapper on the admin layout root) so they never affect public pages. Components consume **semantic** tokens, never raw hex.

```
--admin-bg
--admin-surface
--admin-surface-hover

--admin-border
--admin-border-hover      /* = accent */
--admin-border-active     /* = accent */

--admin-text
--admin-text-muted

--admin-accent            /* #FE5100 */
--admin-accent-fg         /* text on accent fill (CTA) */

--admin-success
--admin-warning
--admin-danger
--admin-info

--admin-radius            /* single shared radius */
--admin-shadow            /* subtle elevation only */
```

**Light:** bg white, surface white, border gray-200/300, text near-black, muted gray-500.
**Dark:** bg zinc-950, surface zinc-900, surface-hover zinc-800, border zinc-800, text zinc-100, muted zinc-400. Accent `#FE5100` unchanged (verify contrast on dark; nudge lightness only if it fails AA).

Changing themes later = editing this token block only.

---

## 5. Folder Architecture

Public primitives stay frozen. Admin gets its own layered set:

```
components/ui/                # Public primitives — FROZEN, untouched

components/admin/ui/          # Admin primitives (AdminButton, AdminCard, StatusBadge, SearchInput, ...)
components/admin/layout/      # AdminShell, Sidebar, Header, layout wrappers
components/admin/data/        # DataTable, FilterBar, BulkActions, Pagination
components/admin/widgets/     # KPIWidget, StatCard, MiniChart, ActivityRail
components/admin/forms/       # Field, FormSection, ActionBar (sticky footer), inputs
components/admin/feedback/    # EmptyState, LoadingState, ErrorState, ConfirmDialog

app/admin/**                  # Pages — refactored to consume the above
```

Admin primitives compose the **already-installed** Radix packages directly. They are a **fresh, admin-only set** (chosen over extending `components/ui`) for isolation.

**Explicitly out of scope:** a `features/*` folder migration (moving `queries/hooks/types` out of `src/lib`). That moves business logic, violates the constraint, and is deferred to a separate future project with its own spec. New admin UI may be co-located by domain under `components/admin/` without touching logic.

---

## 6. Layouts

Thin wrappers over `AdminShell`, defined now so future pages slot in:

- **`DashboardLayout`** — KPI grid + rails.
- **`ContentLayout`** — PageHeader + DataTable/list container.
- **`SettingsLayout`** — sectioned forms with sticky ActionBar.
- **`AuthLayout`** — the existing admin login screen (centered card, no shell).

---

## 7. Shell

### Sidebar (`components/admin/layout/Sidebar`)
- Grouped nav, Lucide icons, orange active indicator (left border/marker), smooth ≤150ms hover.
- **Collapsible**, collapsed state persisted (localStorage).
- Workspace mark (top), user section (bottom, email + sign-out — reuse existing `SignOutButton`).
- Nav still **generated from `ENTITY_LIST`** — adding a content entity auto-appears (feature-preserving).
- **Groups mapped to real routes** (no invented sections):
  - **Overview** → Dashboard
  - **Content** → Posts, Updates, + content entities (Case Studies, Projects, Products, Services, Testimonials)
  - **Audience** → Subscribers, Contacts
  - **Commerce** → Payments, Affiliate
  - **Distribution** → Links, Integrations
  - **System** → settings / sign-out

### Header (`components/admin/layout/Header`)
Sticky, lightweight. Includes:
- **Breadcrumbs** from the route (pure UI).
- **Command palette** (Cmd+K) — reuses installed `cmdk`; jumps between admin routes + filters already-loaded page lists client-side. **No new API.**
- **Quick actions** `+ New` dropdown → links to existing create routes (new post/update/link).
- **Notifications bell** — **client-only placeholder** reading a stub that returns `[]`, structurally ready to wire to a real feed later. No fabricated backend.
- **Profile menu** — email + sign-out + theme toggle.

---

## 8. Dashboard (real data only)

Rebuilt from data that **actually exists**. No revenue-that-isn't, bookings, orders, jobs, or deploy feeds.

- **KPI row** (`KPIWidget`): Published, Drafts, Scheduled, Subscribers, Contacts, Paid supports. Plus **Total raised** and **This month** (both already returned by `getPaymentStats`).
- **Rails:** Recent posts, Recent subscribers, Recent supports (data already available).
- **Quick actions:** New post / update / link.
- Optional `MiniChart` = pure inline SVG sparkline/bars (no chart library) where a trend is genuinely useful; skip otherwise.
- **Perf fix (same data, faster):** parallelize the dashboard fetches and replace `getAllPostsAdmin()`-then-count-in-JS with real `count()` queries. Behavior identical, load faster (addresses known force-dynamic slowness).

---

## 9. DataTable (`components/admin/data/DataTable`)

Build now:
- Sticky header, sort, row selection, **bulk actions**, pagination.
- Search + **FilterBar**, status badges, hover state with **orange hover border**.
- **Column visibility** toggle, **density** toggle (comfortable/compact), **row actions** menu, sticky action column, **keyboard navigation**.
- **CSV export hook** — reuse the existing `/admin/subscribers/export` route pattern; hook is generic, wired where an export already exists.
- Loading **skeletons** + **empty states** built in.

Design the row/data API **virtualization-ready** (stable row model, no assumption of full-DOM render) but **do not build** virtualization, saved filters, or infinite loading — no admin list is large enough today (largest = subscribers). Add later without API breakage. State that these are intentionally deferred.

---

## 10. Forms (`components/admin/forms/*`)

- `FormSection` grouping, proper labels + helper text, inline validation display.
- **Sticky `ActionBar`** footer on long forms (save/cancel).
- Consistent field spacing, RTL-safe (logical properties).
- Reuse existing block/entity editors' logic; restyle their shells only.

---

## 11. Shared Component API Contracts

- **`PageHeader`**: `title`, `description`, `breadcrumb`, `primaryAction`, `secondaryAction`, `contextActions[]`, `statusPills[]`.
- **`StatusBadge`**: subtle variants — `neutral | success | warning | info | danger` (no bright fills).
- **Buttons** (`AdminButton`): `primary` (black or accent by importance), `secondary` (outline), `ghost`, `danger` (red). One size scale.
- **`ConfirmDialog`**: required for every destructive action; keyboard-accessible.
- **Cards** (`AdminCard`): one radius, one padding scale, consistent action placement.

---

## 12. Component Quality Rules (design-system law)

Every admin component must support, where applicable:
`loading` · `disabled` · `error` · `empty` · `mobile` · keyboard navigation · dark mode · RTL-safe spacing.

## 13. Animation Rules

- Transitions ≤ **150ms**.
- **Border-color transitions only** (+ subtle opacity). No scaling, bouncing, gradients.
- Orange appears only on interaction.
- Honor `prefers-reduced-motion` (motion reduced automatically).

## 14. Accessibility

Keyboard nav throughout, visible focus (accent ring), ARIA labels where needed, AA contrast in both themes.

---

## 15. Rollout (multi-PR, real routes)

Each PR is a focused, verifiable batch. Branch each from `origin/main`. Every feature verified working (DOM snapshot) before merge. Never sweep other sessions' uncommitted changes into a commit.

```
PR1  Design tokens + admin/ui primitives + feedback states
PR2  Shell (Sidebar + Header) + layouts
PR3  Dashboard (real data) + widgets + perf fix
PR4  DataTable + shared admin forms
PR5  Content       (Posts, Updates, content entities)
PR6  Audience      (Subscribers, Contacts)
PR7  Commerce      (Payments, Affiliate)
PR8  Distribution  (Links, Integrations)
PR9  Polish: accessibility, performance, dark-mode audit
```

---

## 16. Verification per PR

- App renders, no console/build errors.
- Every pre-existing action still reachable and functional (create/edit/delete/export/filter).
- Light + dark both checked.
- No public-site regression (admin tokens scoped).
- DOM snapshot / eval (per project convention — no preview screenshots).

---

## 17. Deferred (explicitly not in this project)

- `features/*` folder migration of data layer.
- DataTable virtualization, saved filters, infinite loading.
- Real notifications backend.
- Any new metric requiring new data (bookings, orders, conversion, jobs, deploy feed).
