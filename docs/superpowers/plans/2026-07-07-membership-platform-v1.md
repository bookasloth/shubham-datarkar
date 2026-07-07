# Membership Platform V1 ("Marketing OS") Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Members area at `/members` — one flexible Resource model powering articles, prompts, templates, workflows, tools, checklists, case studies, downloads, videos, snippets; free/members/premium gating; Razorpay subscriptions; admin CMS with zero-deploy publishing.

**Architecture:** Everything is a row in `resources` (type-specific data in `meta jsonb`, block content in `content jsonb` reusing the existing blog block system). Taxonomy (types/categories/tags) is DB-driven. Access control is app-level via one pure function (`canAccess`) over a derived role (guest/member/premium/admin); the `resources` table itself is RLS-locked with admin-session policies only, member-facing reads go through `supabaseAdmin` server-side (the `supports` pattern). Auth reuses the existing Supabase cookie session (same accounts as games).

**Tech Stack:** Next 16.2.9 App Router (existing conventions), Supabase (SQL + RLS + Storage), Razorpay Subscriptions REST API, Tailwind v4 tokens, existing ui/ + admin/ component kits. **Zero new npm dependencies.**

## Global Constraints

- This is Next **16** — read `node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md` before writing page code. Non-negotiables: `params`/`searchParams` are **Promises** (always `await`), middleware is `src/proxy.ts` (already exists — extend, don't add middleware.ts), repo uses the **legacy caching model** (no `cacheComponents`) — personalized pages must be dynamic (cookie reads make them dynamic automatically; admin pages use `export const dynamic = "force-dynamic"`).
- **No new dependencies.** Razorpay via `fetch` REST (pattern: `src/lib/razorpay/client.ts`).
- **PR flow**: every phase = branch from `origin/main` (fetch first; concurrent sessions may move HEAD) → PR → merge. Never commit to main. Commit trailer: `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- **Migrations are manual**: write file under `supabase/migrations/`, hand the SQL to the user to run in Supabase SQL editor. Never apply directly.
- Design: monochrome + accent `#FE5100` scoped under `[data-members]` (mirror `[data-admin]` in `globals.css:460-488`). Fonts already global (Jakarta headings / Poppins body). No emojis anywhere. Rounded-xl cards, soft shadows, calm/minimal (Linear/Raycast feel).
- Copy style: sentence case, terse labels ("Explore", "Bookmarks", "Continue reading").
- Members pages: `robots: { index: false }` in V1 (revisit free-resource SEO later).
- Tests: vitest (`npm test`). Unit-test the money/security/logic paths only: `canAccess`, subscription signature verify, webhook signature verify, `safeNext`.
- Spec deviations (approved by spec's own escape hatches): Supabase instead of Prisma/NextAuth ("or existing"); gamification = documented-only (additive tables later); comments = table now, no UI; semantic search = FTS now, pgvector later.

## Role model (used everywhere)

```ts
type MemberRole = "guest" | "member" | "premium" | "admin";
// guest   = no session
// member  = any authed Supabase user
// premium = memberships row: status='active' AND current_period_end > now()
// admin   = is_admin() email (ADMIN_EMAIL)
type Visibility = "free" | "members" | "premium" | "hidden";
// canAccess(visibility, role): free→all; members→member+; premium→premium+admin; hidden→admin only.
// Listings always SHOW premium/members metadata to everyone (locked badge + upsell); only content/meta/downloads are gated.
```

---

## PR 1 — Foundation: schema, member auth, members shell

Branch: `feat/members-foundation`

### Task 1.1: Migration `supabase/migrations/20260707000001_members_platform.sql`

**Files:**
- Create: `supabase/migrations/20260707000001_members_platform.sql`

Full SQL (verbatim):

```sql
-- Members platform: resources, taxonomy, membership, member features.
-- Everything is a Resource. Type-specific data lives in meta jsonb.

-- ============ taxonomy ============
create table if not exists public.resource_types (
  key text primary key,
  label text not null,
  icon text,
  sort int not null default 0,
  active boolean not null default true
);

insert into public.resource_types (key, label, sort) values
  ('article','Article',1),('prompt','Prompt',2),('template','Template',3),
  ('workflow','Workflow',4),('tool','Tool',5),('checklist','Checklist',6),
  ('case-study','Case Study',7),('download','Download',8),('video','Video',9),
  ('snippet','Snippet',10)
on conflict (key) do nothing;

create table if not exists public.resource_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  sort int not null default 0,
  active boolean not null default true
);

insert into public.resource_categories (name, slug, sort) values
  ('AI','ai',1),('SEO','seo',2),('GEO','geo',3),('AEO','aeo',4),
  ('Copywriting','copywriting',5),('Ads','ads',6),('Analytics','analytics',7),
  ('Branding','branding',8),('Landing Pages','landing-pages',9),
  ('Email Marketing','email-marketing',10),('Social Media','social-media',11),
  ('Automation','automation',12),('Business','business',13),
  ('Product','product',14),('Development','development',15)
on conflict (slug) do nothing;

create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique
);

-- ============ resources ============
create table if not exists public.resources (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  excerpt text,
  cover_image text,
  type text not null references public.resource_types(key),
  category_id uuid references public.resource_categories(id) on delete set null,
  difficulty text check (difficulty in ('beginner','intermediate','advanced')),
  status text not null default 'draft' check (status in ('draft','published','archived')),
  visibility text not null default 'free' check (visibility in ('free','members','premium','hidden')),
  content jsonb not null default '[]'::jsonb,
  meta jsonb not null default '{}'::jsonb,
  featured boolean not null default false,
  author text not null default 'Shubham Datarkar',
  reading_time int,
  view_count int not null default 0,
  download_count int not null default 0,
  bookmark_count int not null default 0,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search tsvector generated always as (
    setweight(to_tsvector('english', coalesce(title,'')), 'A') ||
    setweight(to_tsvector('english', coalesce(description,'') || ' ' || coalesce(excerpt,'')), 'B') ||
    setweight(to_tsvector('english', coalesce(content::text,'')), 'C')
  ) stored
);

create index if not exists resources_search_idx on public.resources using gin (search);
create index if not exists resources_list_idx on public.resources (status, visibility, published_at desc);
create index if not exists resources_type_idx on public.resources (type);
create index if not exists resources_category_idx on public.resources (category_id);

create trigger resources_touch before update on public.resources
  for each row execute function public.touch_updated_at();

create table if not exists public.resource_tag (
  resource_id uuid not null references public.resources(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  primary key (resource_id, tag_id)
);

-- ============ membership ============
create table if not exists public.membership_plans (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  description text,
  amount int not null,               -- paise
  interval text not null check (interval in ('monthly','yearly')),
  razorpay_plan_id text,             -- filled from Razorpay dashboard
  active boolean not null default false,
  sort int not null default 0
);

insert into public.membership_plans (key, name, description, amount, interval, sort) values
  ('premium-monthly','Premium Monthly','Full access to everything, billed monthly', 49900, 'monthly', 1),
  ('premium-yearly','Premium Yearly','Full access to everything, billed yearly', 399900, 'yearly', 2)
on conflict (key) do nothing;

create table if not exists public.memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  plan_key text not null references public.membership_plans(key),
  status text not null default 'pending' check (status in ('pending','active','cancelled','expired')),
  razorpay_subscription_id text unique,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger memberships_touch before update on public.memberships
  for each row execute function public.touch_updated_at();

-- ============ member features ============
create table if not exists public.resource_bookmarks (
  user_id uuid not null references auth.users(id) on delete cascade,
  resource_id uuid not null references public.resources(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, resource_id)
);

create table if not exists public.resource_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  resource_id uuid not null references public.resources(id) on delete cascade,
  progress numeric(4,3) not null default 0 check (progress >= 0 and progress <= 1),
  completed boolean not null default false,
  last_viewed_at timestamptz not null default now(),
  primary key (user_id, resource_id)
);

create index if not exists resource_progress_recent_idx
  on public.resource_progress (user_id, last_viewed_at desc);

create table if not exists public.member_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('template','prompt','tool','article','review')),
  title text not null,
  details text,
  status text not null default 'open' check (status in ('open','planned','shipped','declined')),
  created_at timestamptz not null default now()
);

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  message text not null,
  href text,
  active boolean not null default false,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_at timestamptz not null default now()
);

-- Analytics events (views/downloads/bookmarks/search). Service-role only.
create table if not exists public.resource_events (
  id bigint generated always as identity primary key,
  resource_id uuid references public.resources(id) on delete cascade,
  user_id uuid,
  event text not null check (event in ('view','download','bookmark','search')),
  query text,
  created_at timestamptz not null default now()
);

create index if not exists resource_events_kind_idx on public.resource_events (event, created_at desc);

-- Comments: architecture only in V1 (no UI, no client policies).
create table if not exists public.resource_comments (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.resources(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  parent_id uuid references public.resource_comments(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

-- Interactive tool registry.
create table if not exists public.member_tools (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  icon text,
  component text not null,           -- key into the client component registry
  category_id uuid references public.resource_categories(id) on delete set null,
  status text not null default 'draft' check (status in ('draft','live','archived')),
  sort int not null default 0
);

insert into public.member_tools (slug, name, description, component, status, sort) values
  ('utm-builder','UTM Link Builder','Build tagged campaign URLs and copy them in one click.','utm-builder','live',1)
on conflict (slug) do nothing;

-- ============ RPCs ============
create or replace function public.search_resources(q text, lim int default 20)
returns table (
  id uuid, slug text, title text, description text, type text,
  category_id uuid, difficulty text, visibility text, cover_image text,
  featured boolean, published_at timestamptz
)
language sql stable security definer set search_path = public as $$
  select r.id, r.slug, r.title, r.description, r.type, r.category_id,
         r.difficulty, r.visibility, r.cover_image, r.featured, r.published_at
  from resources r
  where r.status = 'published' and r.visibility <> 'hidden'
    and (
      r.search @@ plainto_tsquery('english', q)
      or r.title ilike '%' || q || '%'
      or exists (
        select 1 from resource_tag rt join tags t on t.id = rt.tag_id
        where rt.resource_id = r.id and t.name ilike '%' || q || '%'
      )
    )
  order by ts_rank(r.search, plainto_tsquery('english', q)) desc,
           r.published_at desc nulls last
  limit lim;
$$;

create or replace function public.bump_resource_counter(rid uuid, kind text)
returns void language sql security definer set search_path = public as $$
  update resources set
    view_count = view_count + (kind = 'view')::int,
    download_count = download_count + (kind = 'download')::int,
    bookmark_count = greatest(0, bookmark_count
      + case when kind = 'bookmark' then 1 when kind = 'unbookmark' then -1 else 0 end)
  where id = rid;
$$;

revoke execute on function public.bump_resource_counter(uuid, text) from public, anon, authenticated;

-- ============ RLS ============
alter table public.resource_types enable row level security;
alter table public.resource_categories enable row level security;
alter table public.tags enable row level security;
alter table public.resources enable row level security;
alter table public.resource_tag enable row level security;
alter table public.membership_plans enable row level security;
alter table public.memberships enable row level security;
alter table public.resource_bookmarks enable row level security;
alter table public.resource_progress enable row level security;
alter table public.member_requests enable row level security;
alter table public.announcements enable row level security;
alter table public.resource_events enable row level security;
alter table public.resource_comments enable row level security;
alter table public.member_tools enable row level security;

-- taxonomy: public read, admin write
create policy resource_types_public_read on public.resource_types for select to anon, authenticated using (active);
create policy resource_types_admin_all on public.resource_types for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy resource_categories_public_read on public.resource_categories for select to anon, authenticated using (active);
create policy resource_categories_admin_all on public.resource_categories for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy tags_public_read on public.tags for select to anon, authenticated using (true);
create policy tags_admin_all on public.tags for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- resources + join: admin session CRUD; member-facing reads go through service role server-side
create policy resources_admin_all on public.resources for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy resource_tag_admin_all on public.resource_tag for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- membership: self read, admin all; writes via service role
create policy membership_plans_public_read on public.membership_plans for select to anon, authenticated using (active);
create policy membership_plans_admin_all on public.membership_plans for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy memberships_self_read on public.memberships for select to authenticated using (auth.uid() = user_id);
create policy memberships_admin_read on public.memberships for select to authenticated using (public.is_admin());

-- member features: self-scoped
create policy bookmarks_self_all on public.resource_bookmarks for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy progress_self_all on public.resource_progress for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy requests_self_read on public.member_requests for select to authenticated using (auth.uid() = user_id or public.is_admin());
create policy requests_self_insert on public.member_requests for insert to authenticated with check (auth.uid() = user_id);
create policy requests_admin_update on public.member_requests for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- announcements: public read active window, admin all
create policy announcements_public_read on public.announcements for select to anon, authenticated
  using (active and starts_at <= now() and (ends_at is null or ends_at > now()));
create policy announcements_admin_all on public.announcements for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- tools: public read live, admin all
create policy member_tools_public_read on public.member_tools for select to anon, authenticated using (status = 'live');
create policy member_tools_admin_all on public.member_tools for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- resource_events, resource_comments: no client policies (service-role only)

-- ============ storage: private bucket for member downloads ============
insert into storage.buckets (id, name, public)
values ('member-files', 'member-files', false)
on conflict (id) do nothing;
-- No storage.objects policies: service-role only (signed URLs minted server-side after access check).
```

Notes for implementer:
- `touch_updated_at()` and `is_admin()` already exist (migrations `20260614000002/3`).
- `profiles` + `handle_new_user()` trigger already exist (games migration `20260705000001`) — member signups get a profile row automatically; signup form must send `username` in auth metadata exactly like `src/lib/games/auth-actions.ts` does (verify the trigger's metadata key before coding).
- Do NOT run this migration. Hand the SQL to the user at PR time.

**Steps:**
- [ ] Write the file exactly as above.
- [ ] Sanity-parse: `npx tsx -e "1"` not applicable — instead eyeball-check semicolons/policy names are unique across the schema (grep existing migrations for name collisions: `grep -r "policy resources_" supabase/`).
- [ ] Commit: `feat(members): add members platform schema migration`

### Task 1.2: Member session + auth actions

**Files:**
- Create: `src/lib/members/session.ts`
- Create: `src/lib/members/auth-actions.ts`
- Test: `src/lib/members/auth-actions.test.ts` (safeNext only — pure helper; export it)

**Interfaces (Produces):**
```ts
// session.ts ("server-only")
export type MemberRole = "guest" | "member" | "premium" | "admin";
export type MemberContext = {
  user: User | null;
  role: MemberRole;
  membership: { planKey: string; status: string; currentPeriodEnd: string | null } | null;
};
export const getMemberContext: () => Promise<MemberContext>; // React cache()'d
export function requireMember(next?: string): Promise<MemberContext>; // redirects /members/login?next=
```

Implementation notes:
- `getMemberContext`: `supabaseAuthServer()` → `auth.getUser()`; if no user → guest. If `ADMIN_EMAIL` matches → admin. Else query `memberships` via the same session client (RLS self-read): `status='active' && current_period_end > now()` → premium, else member.
- `auth-actions.ts`: copy the shape of `src/lib/games/auth-actions.ts` (signUp/signIn/signOut with `useActionState` state, min 6-char password) but `safeNext` clamps to `/members` paths and default redirect is `/members`. Export `safeNext` for the test.

**Steps:**
- [ ] Write failing test for `safeNext`: allows `/members`, `/members/explore?x=1`; rejects `https://evil.com`, `//evil.com`, `/admin`, empty → `/members`.
- [ ] `npm test` → FAIL (module missing).
- [ ] Implement `auth-actions.ts` + `session.ts`.
- [ ] `npm test` → PASS.
- [ ] Commit: `feat(members): member session helpers and auth actions`

### Task 1.3: Login page + proxy update

**Files:**
- Create: `src/app/members/login/page.tsx`
- Create: `src/components/members/auth-form.tsx` (copy structure of `src/components/games/GamesAuthForm.tsx`, restyle to members tokens, sign-in + sign-up tabs)
- Modify: `src/proxy.ts` — add to matcher: `"/members/:path*"`; redirect logic: `/members/login` + user → `/members`. (Do NOT force auth for all of /members — free resources stay guest-visible; personal pages self-guard via `requireMember`.)

**Steps:**
- [ ] Implement, `npm run build` passes.
- [ ] Commit: `feat(members): member login and proxy gating`

### Task 1.4: Members shell + dashboard skeleton

**Files:**
- Create: `src/app/members/layout.tsx` — wraps children in `<div data-members>` + `MembersShell`; fetch `getMemberContext()` + active announcement; `metadata = { robots: { index: false } }`.
- Create: `src/components/members/shell.tsx` (client) — desktop: left sidebar (Dashboard, Explore, Latest, Bookmarks, Downloads, Requests, Tools, Account) + top bar (search input linking `/members/explore?q=`, user chip / "Sign in" / "Go premium" pill). Mobile: bottom nav (Dashboard, Explore, Bookmarks, Account) + drawer via existing `ui/sheet`. Nav config array in `src/components/members/nav-config.ts`.
- Create: `src/components/members/announcement-banner.tsx` — thin dismissible bar (localStorage dismiss by id).
- Create: `src/app/members/page.tsx` — dashboard, `requireMember()`; V1 skeleton sections wired with empty-state components (real data lands in PR 2/4).
- Modify: `src/app/globals.css` — add `[data-members]` accent block mirroring `[data-admin]` (accent `#fe5100`, focus ring, selection).

Reuse: `ui/` primitives, `EmptyState` patterns from admin feedback components (copy, don't import admin-namespaced components into member surface if they assume admin context).

**Steps:**
- [ ] Implement shell + layout + dashboard skeleton + CSS scope.
- [ ] `npm run build` passes.
- [ ] Verify in preview: `/members` redirects to login when signed out; login page renders; mobile bottom nav at 375px (preview_eval/snapshot — no screenshots per user pref).
- [ ] Commit: `feat(members): members shell, dashboard skeleton, announcement banner`

### Task 1.5: PR 1 ship

- [ ] `git fetch origin` + verify branch based on `origin/main`, no foreign commits (`git log origin/main..HEAD`).
- [ ] PR: `feat(members): foundation — schema, auth, shell` with migration SQL called out for manual run.
- [ ] Merge after checks. Tell user: run migration `20260707000001` in Supabase SQL editor.

---

## PR 2 — Resource core: catalog, detail, gating, search

Branch: `feat/members-resources`

### Task 2.1: Access control (TDD)

**Files:**
- Create: `src/lib/members/access.ts`
- Test: `src/lib/members/access.test.ts`

```ts
// access.ts — pure, no imports
export type MemberRole = "guest" | "member" | "premium" | "admin"; // re-export from session types file if cleaner
export type Visibility = "free" | "members" | "premium" | "hidden";
const RANK: Record<MemberRole, number> = { guest: 0, member: 1, premium: 2, admin: 3 };
const NEED: Record<Visibility, number> = { free: 0, members: 1, premium: 2, hidden: 3 };
export function canAccess(visibility: Visibility, role: MemberRole): boolean {
  return RANK[role] >= NEED[visibility];
}
```

**Steps:**
- [ ] Failing test: full 4×4 matrix (16 assertions).
- [ ] Implement. `npm test` PASS.
- [ ] Commit: `feat(members): access control matrix`

### Task 2.2: Resource types + queries

**Files:**
- Create: `src/lib/resources/types.ts` — `Resource`, `ResourceCard` (metadata subset), `ResourceType`, `Category`, `Tag`, `ResourceMeta` union:
```ts
export type PromptMeta = { role?: string; goal?: string; promptBody: string; variables?: string[]; model?: string; exampleOutput?: string };
export type DownloadMeta = { filePath: string; fileSize?: number; version: string; changelog?: { version: string; date: string; note: string }[] };
export type WorkflowStep = { title: string; body?: string; promptSlug?: string; toolSlug?: string; output?: string };
export type WorkflowMeta = { steps: WorkflowStep[] };
export type TemplateMeta = { links?: { label: string; url: string }[] }; // figma/canva/gdocs
export type VideoMeta = { url: string };
export type ToolMeta = { toolSlug: string };
```
- Create: `src/lib/resources/queries.ts` (`server-only`) — all via `supabaseAdmin()` (table is RLS-locked), try/catch → `[]`/`null` like `lib/content/queries.ts`:
```ts
export type ListFilters = { type?: string; category?: string; difficulty?: string; tag?: string; sort?: "newest" | "popular"; featured?: boolean; limit?: number; offset?: number };
export function listResources(f: ListFilters): Promise<ResourceCard[]>;       // status=published, visibility != hidden, metadata cols only
export function getResourceBySlug(slug: string): Promise<Resource | null>;    // full row
export function getRelatedResources(r: Resource, limit?: number): Promise<ResourceCard[]>; // same category, exclude self
export function getNextResource(r: Resource): Promise<ResourceCard | null>;   // next older published
export function searchResources(q: string): Promise<ResourceCard[]>;          // rpc('search_resources')
export function listCategories(): Promise<Category[]>;
export function listTypes(): Promise<ResourceType[]>;
export function getTagsForResource(id: string): Promise<Tag[]>;
```
- Create: `src/lib/members/track-actions.ts` (`"use server"`) — `trackView(resourceId)`: insert `resource_events` + `rpc bump_resource_counter` via `supabaseAdmin`; fire-and-forget from detail page (call in a server component after render decision, not blocking).

**Steps:**
- [ ] Implement, build passes, commit: `feat(members): resource queries and view tracking`

### Task 2.3: Explore + Latest pages

**Files:**
- Create: `src/app/members/explore/page.tsx` — `await searchParams` for `{ q, type, category, difficulty, sort, tag }`; `q` present → `searchResources` (+ log search event), else `listResources`. Render `FilterBar` + `ResourceGrid`. Guest-accessible.
- Create: `src/app/members/latest/page.tsx` — `listResources({ sort: "newest", limit: 30 })`.
- Create: `src/components/members/resource-card.tsx` — cover/typebadge/title/desc/difficulty/lock badge when `!canAccess(visibility, role)`; link `/members/resources/[slug]`.
- Create: `src/components/members/resource-grid.tsx`, `src/components/members/filter-bar.tsx` (client; writes searchParams via router, `<select>`s from ui/select, options passed from server).

**Steps:**
- [ ] Implement; build; preview check filters change results; commit: `feat(members): explore and latest`

### Task 2.4: Resource detail page

**Files:**
- Create: `src/app/members/resources/[slug]/page.tsx` — `await params`; `getResourceBySlug`; 404 if missing/draft (or hidden for non-admin). Hero (title, category, tags, difficulty, reading time, updated date, author, bookmark placeholder-slot, share button). If `canAccess` → typed content; else → `<Paywall>` (excerpt + blur + CTA: sign in for members-tier, upgrade for premium-tier). Then Related (grid of 3) + Next resource footer link. Calls `trackView`.
- Create: `src/components/members/resource-content.tsx` — switch on `resource.type`: default renders `content` blocks (reuse the blog block renderer — find it where `blog/[category]/[slug]/page.tsx` renders `posts.body`, import same component); `prompt` → `PromptView`; `download` → `DownloadCard` (stub in this PR, wired in PR 4); `workflow` → `WorkflowView`; `template` → blocks + links list; `video` → embed; `tool` → link into `/members/tools/[slug]`.
- Create: `src/components/members/prompt-view.tsx` — role/goal/model chips, mono prompt body with `ui/copy-button`, variables rendered as `{{variable}}` chips, example output collapsible.
- Create: `src/components/members/workflow-view.tsx` — numbered vertical steps (title/body/linked prompt/tool/output).
- Create: `src/components/members/paywall.tsx`.
- Create: `src/components/members/share-button.tsx` — `navigator.share` fallback copy-link.

**Steps:**
- [ ] Implement; build; preview: free article renders blocks, premium shows paywall as guest; commit: `feat(members): resource detail with gating and typed renderers`

### Task 2.5: PR 2 ship

- [ ] Tests green, build green, PR, merge.

---

## PR 3 — Admin CMS

Branch: `feat/members-admin`

Follow the exact existing admin CRUD pattern (`admin/content/[entity]` + `lib/content/actions.ts`): server components + server actions + `requireAdmin()` + `supabaseAuthServer()` (admin RLS policies from Task 1.1 make this work) + `revalidatePath`.

### Task 3.1: Resources CRUD

**Files:**
- Create: `src/lib/resources/admin-queries.ts` — `getAllResourcesAdmin()`, `getResourceByIdAdmin(id)` (session client).
- Create: `src/lib/resources/actions.ts` (`"use server"`) — `createResource(formData)`, `updateResource(id, formData)`, `deleteResource(id)`, `setResourceTags(id, tagNames: string[])` (upsert tags by name, replace join rows), `toggleFeatured(id, next)`. Compute `reading_time` from block text (words/200) on save. `revalidatePath("/members", "layout")` after writes.
- Create: `src/app/admin/resources/page.tsx` + `resources-table.tsx` (DataTable: title, type, category, visibility, status, featured, views, updated; filters via toolbarExtra).
- Create: `src/app/admin/resources/new/page.tsx`, `src/app/admin/resources/[id]/page.tsx`.
- Create: `src/components/admin/resource-editor.tsx` — fields: title/slug/description/excerpt/cover/type(select)/category(select)/difficulty/visibility/status/featured/published_at/tags (`ui/tag-input`); block editor (existing `blocks/block-editor.tsx`) for `content`; per-type meta panel (conditional fieldsets for prompt/download/workflow/template/video/tool meta → serialized into a hidden `meta` JSON field).
- Modify: `src/components/admin/layout/nav-config.tsx` — add "Members" group: Resources, Taxonomy, Requests, Members, Announcements, Plans.

### Task 3.2: Taxonomy admin

**Files:**
- Create: `src/app/admin/resources/taxonomy/page.tsx` — three cards: categories, types, tags; inline add/rename/deactivate/sort forms.
- Create: `src/lib/resources/taxonomy-actions.ts` — `upsertCategory`, `upsertType`, `deleteTag`, etc.

### Task 3.3: Announcements + requests + members admin

**Files:**
- Create: `src/app/admin/announcements/page.tsx` + `src/lib/members/announcement-actions.ts` (CRUD, activate one).
- Create: `src/app/admin/requests/page.tsx` — DataTable of `member_requests` (kind, title, user, status select → `updateRequestStatus` action).
- Create: `src/app/admin/members/page.tsx` — profiles joined with memberships (username, email via `supabaseAdmin` auth admin listUsers or store email on membership at activation — simplest: show username + membership status/plan/period end).

### Task 3.4: Download file upload

**Files:**
- Create: `src/lib/resources/upload-actions.ts` — `uploadMemberFile(formData)`: `requireAdmin()` → `supabaseAdmin().storage.from("member-files").upload(...)` → returns path; wire a file input into the download meta panel of resource-editor (pattern: existing photo upload flow `src/lib/photos/*`).

**Steps (whole PR):**
- [ ] Implement 3.1 → 3.4 in order, building after each task; commit per task.
- [ ] Preview: create a draft resource of each type through the UI, publish, confirm it appears in /members/explore without redeploy.
- [ ] PR, merge.

---

## PR 4 — Member features: bookmarks, progress, downloads, requests, live dashboard

Branch: `feat/members-features`

### Task 4.1: Bookmarks

**Files:**
- Create: `src/lib/members/bookmark-actions.ts` — `toggleBookmark(resourceId)`: session client insert/delete own row + `bump_resource_counter` bookmark/unbookmark + event log; returns new state.
- Create: `src/lib/members/member-queries.ts` — `getBookmarkedResources(userId)`, `isBookmarked(userId, resourceId)`, `getContinueReading(userId, limit)` (progress >0 <1, by last_viewed desc), `getRecentlyViewed(userId, limit)`, `getMyRequests(userId)`, `getMyDownloads(userId)` (distinct download events joined to resources).
- Create: `src/components/members/bookmark-button.tsx` (client, optimistic toggle, prompts sign-in when guest).
- Create: `src/app/members/bookmarks/page.tsx` — `requireMember()`, grid of bookmarked resources.
- Modify: detail page hero → mount real `BookmarkButton`.

### Task 4.2: Reading progress + recently viewed

**Files:**
- Create: `src/lib/members/progress-actions.ts` — `saveProgress(resourceId, progress)` (upsert own row, clamp 0..1, `completed = progress >= 0.95`).
- Create: `src/components/members/progress-tracker.tsx` — client, mounted on detail page for authed users; throttled scroll listener (max-scroll ratio, `sendBeacon`-style fire on visibilitychange + every 10s if changed).
- Detail page: upsert `last_viewed_at` on view for authed users (piggyback in `trackView`).

### Task 4.3: Downloads

**Files:**
- Create: `src/lib/members/download-actions.ts` — `getDownloadUrl(resourceId)`: `getMemberContext()` → `canAccess` check (server-side, hard fail otherwise) → signed URL (60s) from `member-files` → log event + bump counter → return URL.
- Create: `src/components/members/download-card.tsx` — version, updated date, changelog list, download count, button calling action then `window.location = url`.
- Create: `src/app/members/downloads/page.tsx` — `requireMember()`, list from `getMyDownloads`.

### Task 4.4: Requests

**Files:**
- Create: `src/app/members/requests/page.tsx` — `requireMember()`; form (kind select, title, details) + own requests list with status badges.
- Create: `src/lib/members/request-actions.ts` — `createRequest(formData)` (session client insert, RLS-enforced).

### Task 4.5: Live dashboard

- Modify: `src/app/members/page.tsx` — real sections: Search bar, Featured (featured=true limit 3), Continue reading, Recently added (latest 6), Categories (chips grid), Trending (view_count desc last-30-days published, simple: order by view_count limit 6).

**Steps (whole PR):** implement per task w/ commits; build; preview-verify bookmark toggle + progress persistence (eval scroll, reload, check resume); PR; merge.

---

## PR 5 — Payments: Razorpay subscriptions, account page

Branch: `feat/members-payments`

Env additions (user sets in Vercel + .env.local): `RAZORPAY_WEBHOOK_SECRET`. Reuses `RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET`. User must create the two plans in the Razorpay dashboard and paste their `plan_...` ids into `membership_plans.razorpay_plan_id` (via admin Plans page below) and set `active=true`.

### Task 5.1: Razorpay subscriptions client (TDD on verify)

**Files:**
- Create: `src/lib/razorpay/subscriptions.ts` (`server-only`) —
```ts
export function createSubscription(planId: string, notes?: Record<string, string>): Promise<{ id: string; short_url?: string }>;
// POST https://api.razorpay.com/v1/subscriptions { plan_id, total_count: 120 (monthly) | 10 (yearly), customer_notify: 1, notes }
export function cancelSubscription(subId: string, atCycleEnd?: boolean): Promise<void>;
// POST /v1/subscriptions/:id/cancel { cancel_at_cycle_end: 1 }
```
Basic-auth fetch exactly like `src/lib/razorpay/client.ts`.
- Create: `src/lib/razorpay/subscription-verify.ts` — pure, mirrors `verify.ts`:
```ts
export function verifySubscriptionSignature(paymentId: string, subscriptionId: string, signature: string): boolean;
// HMAC_SHA256(razorpay_payment_id + "|" + subscription_id, RAZORPAY_KEY_SECRET) — note the order differs from orders!
export function verifyWebhookSignature(rawBody: string, signature: string, secret: string): boolean;
// HMAC_SHA256(rawBody, webhook_secret), constant-time compare
```
- Test: `src/lib/razorpay/subscription-verify.test.ts` — known-vector HMACs (compute expected with node:crypto in the test), tamper cases, empty signature.

### Task 5.2: Subscribe flow

**Files:**
- Create: `src/app/api/members/subscribe/route.ts` — POST `{ planKey }`; require authed user (cookie client); look up active plan (must have razorpay_plan_id); `createSubscription(planId, { user_id })`; upsert `memberships` row `{ user_id, plan_key, status: 'pending', razorpay_subscription_id }` via `supabaseAdmin`; return `{ subscriptionId, keyId }`.
- Create: `src/app/api/members/subscribe/confirm/route.ts` — POST `{ paymentId, subscriptionId, signature }`; verify signature; mark membership `active`, `current_period_end = now() + interval + 3-day grace` (webhook will correct it); return ok.
- Create: `src/components/members/upgrade-panel.tsx` — plan cards (from `membership_plans`), launches Razorpay Checkout with `subscription_id` (reuse the script-loading approach in `src/lib/support/checkout.ts`), on success POSTs confirm then `router.refresh()`.
- Create: `src/app/members/upgrade/page.tsx` — plans + FAQ blurb; linked from paywall + shell pill.

### Task 5.3: Webhook

**Files:**
- Create: `src/app/api/members/webhook/route.ts` — POST; read raw body via `await request.text()` BEFORE json-parse; `verifyWebhookSignature(raw, request.headers.get("x-razorpay-signature") ?? "", process.env.RAZORPAY_WEBHOOK_SECRET!)` else 401. Handle events:
  - `subscription.charged` → status `active`, `current_period_end = payload.subscription.entity.current_end * 1000 + 3d grace`.
  - `subscription.cancelled` / `subscription.completed` → status `cancelled` (access until period end).
  - `subscription.halted` / `subscription.paused` → status `expired`.
  Idempotent updates keyed by `razorpay_subscription_id` via `supabaseAdmin`. Always 200 after verify (Razorpay retries on non-2xx).
- User action at ship: add webhook in Razorpay dashboard → `https://shubhamdatarkar.com/api/members/webhook` with the secret.

### Task 5.4: Account page + plans admin

**Files:**
- Create: `src/app/members/account/page.tsx` — `requireMember()`; profile card (username, email), membership card (plan, status, renews/ends date, Cancel button → `cancelMembership` action → `cancelSubscription(atCycleEnd)`), sign out.
- Create: `src/lib/members/membership-actions.ts` — `cancelMembership()`.
- Create: `src/app/admin/plans/page.tsx` — edit `membership_plans` rows (name, amount, razorpay_plan_id, active).

**Steps (whole PR):** TDD 5.1; implement 5.2-5.4; `npm test` + build green; PR; merge. Tell user: create Razorpay plans + webhook, set `RAZORPAY_WEBHOOK_SECRET`.

---

## PR 6 — Tools, analytics, polish

Branch: `feat/members-tools-analytics`

### Task 6.1: Tool registry + first tool

**Files:**
- Create: `src/components/members/tools/registry.tsx` —
```tsx
export const TOOL_COMPONENTS: Record<string, ComponentType> = {
  "utm-builder": dynamic(() => import("./utm-builder")),
};
```
- Create: `src/components/members/tools/utm-builder.tsx` — client form (url, source, medium, campaign, term, content) → live output + copy button. Pure client, no deps.
- Create: `src/app/members/tools/page.tsx` — grid from `member_tools` (status=live).
- Create: `src/app/members/tools/[slug]/page.tsx` — lookup row, render `TOOL_COMPONENTS[row.component]`, 404 if unregistered. Adding a tool later = DB row + one component + registry line. No routing changes.
- Create: `src/app/admin/resources/tools/page.tsx` — CRUD for `member_tools` (+ `src/lib/resources/tool-actions.ts`).

### Task 6.2: Analytics dashboard

**Files:**
- Create: `src/lib/members/analytics-queries.ts` (`server-only`, `supabaseAdmin`) — `getMemberStats()` (members count, active premium, resources published, events last 30d), `getPopularResources(limit)`, `getPopularCategories()`, `getTopSearches(limit)` (group resource_events where event='search'), `getRequestBreakdown()`.
- Create: `src/app/admin/members/analytics/page.tsx` — KPI widgets + tables (reuse `widgets/kpi-widget`, `DataTable`).
- Modify: `src/app/admin/page.tsx` — add members KPI row.

### Task 6.3: Polish pass

- [ ] Empty states everywhere (no bookmarks yet, no downloads, no results).
- [ ] Loading.tsx for explore/dashboard/bookmarks.
- [ ] Mobile pass at 375px (bottom nav overlap, filter bar scroll).
- [ ] `next/image` for covers; lazy grids.
- [ ] Explore pagination: "Load more" via searchParams offset (infinite scroll deferred — note as `ponytail:` comment).

**Steps:** implement, build, preview-verify tools + analytics, PR, merge.

---

## Explicitly deferred (architecture supports, zero V1 code)

- Gamification: future additive tables (`achievements`, `user_achievements`, `user_points`, `user_streaks_members`) — nothing in V1 blocks them.
- Comments UI: table exists; UI + RLS policies later.
- Semantic search: add pgvector column + embedding pipeline later; `search_resources` RPC is the single seam to swap.
- Weekly digest/notifications: `announcements` covers V1; digest needs email pipeline (kit/nodemailer exist).
- Collections, notes, saved searches, API/SDK, marketplace: all additive tables/routes on the same Resource model.

## Self-review notes

- Spec coverage: every spec section maps to a task except gamification/comments/notifications-future (deferred by spec's own wording) — verified.
- Type consistency: `MemberRole`/`Visibility` defined once in access/session; `ResourceCard` metadata subset used by all list surfaces; `bump_resource_counter` kinds match action call sites (`view|download|bookmark|unbookmark`).
- Razorpay subscription signature order (`payment_id|subscription_id`) differs from order flow (`order_id|payment_id`) — encoded in Task 5.1 and its test.
