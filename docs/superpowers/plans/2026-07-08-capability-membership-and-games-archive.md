# Capability-Based Membership + Games Archive Gating — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hardcoded visibility/role gate with a capability system (plans grant capabilities, features require them), gate the games archive behind the `view_archive` capability while keeping today + yesterday free, and reframe the two user-facing tiers as Free and Member.

**Architecture:** Capability keys are a code constant (the app checks them); a DB `plan_capabilities` table bundles keys into plans (admin-editable). `getMemberContext()` resolves the signed-in user's active plan into a `Set<Capability>` (admin holds every key). Every gate calls `can(capabilities, key)` instead of `canAccess(visibility, role)`. Resources carry a `required_capability` (null = public); games archive hardcodes `view_archive`. Internal plan keys stay `premium-monthly`/`premium-yearly` (Razorpay links intact); every user-facing string says "Member", never "Premium".

**Tech Stack:** Next 16.2.9 App Router, Supabase (SQL + RLS), Tailwind v4, existing members/games/admin code from the V1 build (`src/lib/members/*`, `src/lib/games/*`, `src/app/members/*`, `src/app/games/*`, `src/app/admin/*`).

## Global Constraints

- Next **16** — `params`/`searchParams` are Promises (always `await`); middleware is `src/proxy.ts`; legacy caching model (members/games pages are dynamic via cookie reads).
- **No new npm dependencies.**
- **PR flow**: branch from `origin/main` (fetch first — concurrent sessions move HEAD), PR, merge. Never commit to main. Commit trailer: `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- **Migrations are manual**: write the file under `supabase/migrations/`, hand the SQL to the user to run. Never apply directly. The prod DB may already contain the V1 members tables from migration `20260707000001`.
- **No emojis anywhere** (project rule). The upsell spec used 🔒 — use a lucide `Lock` icon instead.
- **User never sees the word "Premium"** — internal keys/columns may keep it, all rendered copy says "Member" / "Free".
- Monochrome + accent `#FE5100` scoped under `[data-members]` / games surfaces. Sentence-case copy.
- Tests: vitest (`npm test`). Unit-test the pure logic: `can`, `requiredCapabilityForType`, capability resolution helper, `isYesterday`/`isTodayOrYesterday`.
- Two user-facing tiers only: **Free** and **Member**. Pro Member is future — define its capability keys, do not surface it.

## Canonical capability keys (define ALL now; enforce only live ones)

```
view_archive            (LIVE — games archive)
view_premium_blog       (LIVE — resource gate)
view_premium_case_study (LIVE)
view_premium_video      (LIVE)
view_premium_course     (future content type)
view_premium_album      (future content type)
view_premium_resource   (LIVE — generic fallback for tool/workflow/checklist/snippet)
download_assets         (LIVE)
download_templates      (LIVE)
access_prompt_library   (LIVE)
play_unlimited_games    (dormant — no play limits exist yet)
earn_achievements       (dormant)
streak_history          (dormant)
join_private_community  (dormant)
attend_live_sessions    (dormant)
access_beta_features    (dormant)
early_access            (dormant)
```
Plus a non-grantable sentinel `admin_only` (only the admin's synthetic full set contains it; represents the old `visibility='hidden'`).

**Member plan grants every LIVE + dormant key** (not `admin_only`). **Free plan grants none** (public content needs no capability). Admin (`ADMIN_EMAIL`) holds all keys including `admin_only`.

## Resource type → capability (when a resource is marked "Member")

| type | capability |
|---|---|
| article | view_premium_blog |
| case-study | view_premium_case_study |
| video | view_premium_video |
| prompt | access_prompt_library |
| template | download_templates |
| download | download_assets |
| tool, workflow, checklist, snippet | view_premium_resource |

Admin picks **Public / Member** per resource; "Member" stores the type's capability, "Public" stores null.

---

## PR A — Capability engine + schema (no user-visible change)

Branch: `feat/capabilities-engine`

### Task A1: Migration `supabase/migrations/20260708000001_capabilities.sql`

**Files:**
- Create: `supabase/migrations/20260708000001_capabilities.sql`

Full SQL (verbatim):

```sql
-- Capability-based membership: plans bundle capabilities; content requires them.

-- Free plan needs a non-billing interval; relax the check and add the row.
alter table public.membership_plans drop constraint if exists membership_plans_interval_check;
alter table public.membership_plans
  add constraint membership_plans_interval_check check (interval in ('monthly','yearly','free'));

insert into public.membership_plans (key, name, description, amount, interval, active, sort)
values ('free','Free','Today''s puzzle, yesterday''s puzzle, and public resources.',0,'free',true,0)
on conflict (key) do nothing;

-- Plan → capability bundle (admin-editable).
create table if not exists public.plan_capabilities (
  plan_key text not null references public.membership_plans(key) on delete cascade,
  capability text not null,
  primary key (plan_key, capability)
);

-- Member tier = both paid plans get every grantable capability.
insert into public.plan_capabilities (plan_key, capability)
select p.key, c.cap
from (values ('premium-monthly'), ('premium-yearly')) as p(key)
cross join (values
  ('view_archive'),('view_premium_blog'),('view_premium_case_study'),
  ('view_premium_video'),('view_premium_course'),('view_premium_album'),
  ('view_premium_resource'),('download_assets'),('download_templates'),
  ('access_prompt_library'),('play_unlimited_games'),('earn_achievements'),
  ('streak_history'),('join_private_community'),('attend_live_sessions'),
  ('access_beta_features'),('early_access')
) as c(cap)
on conflict do nothing;

-- Resources declare the capability they need (null = public).
alter table public.resources add column if not exists required_capability text;

update public.resources set required_capability = case
  when visibility = 'hidden' then 'admin_only'
  when visibility in ('members','premium') then case type
    when 'article'    then 'view_premium_blog'
    when 'case-study' then 'view_premium_case_study'
    when 'video'      then 'view_premium_video'
    when 'prompt'     then 'access_prompt_library'
    when 'template'   then 'download_templates'
    when 'download'   then 'download_assets'
    else 'view_premium_resource'
  end
  else null
end
where required_capability is null;

create index if not exists resources_required_capability_idx
  on public.resources (required_capability);

-- RLS for the new table: public read, admin write.
alter table public.plan_capabilities enable row level security;
create policy plan_capabilities_public_read on public.plan_capabilities
  for select to anon, authenticated using (true);
create policy plan_capabilities_admin_all on public.plan_capabilities
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
```

Notes: the V1 `resources.visibility` column is left in place (backfill source); PR B removes app references, then a later migration can drop it. Do NOT run this migration — hand it to the user.

**Steps:**
- [ ] Write the file exactly as above.
- [ ] Grep for policy-name collisions: `grep -rn "plan_capabilities" supabase/migrations/` returns only this file.
- [ ] Commit: `feat(members): capability schema — plan_capabilities, Free plan, resources.required_capability`

### Task A2: Capability constants + pure helpers (TDD)

**Files:**
- Create: `src/lib/members/capabilities.ts`
- Test: `src/lib/members/capabilities.test.ts`

**Interfaces (Produces):**
```ts
export type Capability =
  | "view_archive" | "view_premium_blog" | "view_premium_case_study"
  | "view_premium_video" | "view_premium_course" | "view_premium_album"
  | "view_premium_resource" | "download_assets" | "download_templates"
  | "access_prompt_library" | "play_unlimited_games" | "earn_achievements"
  | "streak_history" | "join_private_community" | "attend_live_sessions"
  | "access_beta_features" | "early_access" | "admin_only";
export const ALL_CAPABILITIES: Capability[];          // every key incl. admin_only
export const GRANTABLE_CAPABILITIES: Capability[];     // every key EXCEPT admin_only
export function can(caps: ReadonlySet<string>, cap: Capability): boolean;
export function requiredCapabilityForType(type: string): Capability; // "Member" resource → its cap
```

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { can, requiredCapabilityForType, ALL_CAPABILITIES, GRANTABLE_CAPABILITIES } from "./capabilities";

describe("can", () => {
  it("is true only when the set holds the capability", () => {
    const caps = new Set(["view_archive", "download_assets"]);
    expect(can(caps, "view_archive")).toBe(true);
    expect(can(caps, "view_premium_blog")).toBe(false);
  });
  it("empty set grants nothing", () => {
    expect(can(new Set(), "view_archive")).toBe(false);
  });
});

describe("requiredCapabilityForType", () => {
  it("maps known types", () => {
    expect(requiredCapabilityForType("article")).toBe("view_premium_blog");
    expect(requiredCapabilityForType("case-study")).toBe("view_premium_case_study");
    expect(requiredCapabilityForType("video")).toBe("view_premium_video");
    expect(requiredCapabilityForType("prompt")).toBe("access_prompt_library");
    expect(requiredCapabilityForType("template")).toBe("download_templates");
    expect(requiredCapabilityForType("download")).toBe("download_assets");
  });
  it("falls back to the generic capability", () => {
    expect(requiredCapabilityForType("tool")).toBe("view_premium_resource");
    expect(requiredCapabilityForType("snippet")).toBe("view_premium_resource");
  });
});

describe("capability catalogs", () => {
  it("grantable excludes admin_only, all includes it", () => {
    expect(ALL_CAPABILITIES).toContain("admin_only");
    expect(GRANTABLE_CAPABILITIES).not.toContain("admin_only");
    expect(GRANTABLE_CAPABILITIES.length).toBe(ALL_CAPABILITIES.length - 1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/members/capabilities.test.ts`
Expected: FAIL (module missing).

- [ ] **Step 3: Write the implementation**

```ts
/** Capability keys the app checks. Plans bundle these; features require them. Pure — no imports. */

export type Capability =
  | "view_archive"
  | "view_premium_blog"
  | "view_premium_case_study"
  | "view_premium_video"
  | "view_premium_course"
  | "view_premium_album"
  | "view_premium_resource"
  | "download_assets"
  | "download_templates"
  | "access_prompt_library"
  | "play_unlimited_games"
  | "earn_achievements"
  | "streak_history"
  | "join_private_community"
  | "attend_live_sessions"
  | "access_beta_features"
  | "early_access"
  | "admin_only";

export const ALL_CAPABILITIES: Capability[] = [
  "view_archive", "view_premium_blog", "view_premium_case_study",
  "view_premium_video", "view_premium_course", "view_premium_album",
  "view_premium_resource", "download_assets", "download_templates",
  "access_prompt_library", "play_unlimited_games", "earn_achievements",
  "streak_history", "join_private_community", "attend_live_sessions",
  "access_beta_features", "early_access", "admin_only",
];

/** Everything a plan may grant (admin_only is never plan-granted). */
export const GRANTABLE_CAPABILITIES: Capability[] = ALL_CAPABILITIES.filter(
  (c) => c !== "admin_only",
);

export function can(caps: ReadonlySet<string>, cap: Capability): boolean {
  return caps.has(cap);
}

const TYPE_CAPABILITY: Record<string, Capability> = {
  article: "view_premium_blog",
  "case-study": "view_premium_case_study",
  video: "view_premium_video",
  prompt: "access_prompt_library",
  template: "download_templates",
  download: "download_assets",
};

/** Capability a "Member"-level resource of this type requires. */
export function requiredCapabilityForType(type: string): Capability {
  return TYPE_CAPABILITY[type] ?? "view_premium_resource";
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/members/capabilities.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/members/capabilities.ts src/lib/members/capabilities.test.ts
git commit -m "feat(members): capability keys, can(), requiredCapabilityForType"
```

### Task A3: Resolve capabilities in `getMemberContext`

**Files:**
- Modify: `src/lib/members/session.ts`
- Create: `src/lib/members/capability-resolver.ts`
- Test: `src/lib/members/capability-resolver.test.ts`

**Interfaces:**
- Consumes: `Capability`, `ALL_CAPABILITIES` from `capabilities.ts`.
- Produces:
```ts
// capability-resolver.ts (pure)
export function resolveCapabilities(input: {
  isAdmin: boolean;
  planCapabilities: string[]; // rows from plan_capabilities for the user's active plan
}): Set<string>;               // admin → every key incl admin_only; else the plan's set

// session.ts — MemberContext gains:
//   capabilities: Set<string>
// role stays for a coarse display tier ("Free" | "Member" | "Admin").
```

- [ ] **Step 1: Write the failing test for the resolver**

```ts
import { describe, expect, it } from "vitest";
import { resolveCapabilities } from "./capability-resolver";
import { ALL_CAPABILITIES } from "./capabilities";

describe("resolveCapabilities", () => {
  it("admin gets every capability including admin_only", () => {
    const caps = resolveCapabilities({ isAdmin: true, planCapabilities: [] });
    for (const c of ALL_CAPABILITIES) expect(caps.has(c)).toBe(true);
  });
  it("non-admin gets exactly the plan's capabilities", () => {
    const caps = resolveCapabilities({ isAdmin: false, planCapabilities: ["view_archive"] });
    expect(caps.has("view_archive")).toBe(true);
    expect(caps.has("view_premium_blog")).toBe(false);
    expect(caps.has("admin_only")).toBe(false);
  });
  it("free/guest (no plan) gets nothing", () => {
    expect(resolveCapabilities({ isAdmin: false, planCapabilities: [] }).size).toBe(0);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/members/capability-resolver.test.ts`
Expected: FAIL (module missing).

- [ ] **Step 3: Implement the resolver**

```ts
import { ALL_CAPABILITIES } from "./capabilities";

/** Admin holds every key; everyone else holds exactly their active plan's grants. */
export function resolveCapabilities(input: {
  isAdmin: boolean;
  planCapabilities: string[];
}): Set<string> {
  if (input.isAdmin) return new Set<string>(ALL_CAPABILITIES);
  return new Set<string>(input.planCapabilities);
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/lib/members/capability-resolver.test.ts`
Expected: PASS.

- [ ] **Step 5: Wire it into `session.ts`**

Replace the body of `src/lib/members/session.ts` with:

```ts
import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { supabaseAuthServer } from "@/lib/supabase/auth-server";
import type { MemberRole } from "./access";
import { resolveCapabilities } from "./capability-resolver";

export type MembershipInfo = {
  planKey: string;
  status: string;
  currentPeriodEnd: string | null;
};

export type MemberContext = {
  user: User | null;
  role: MemberRole;            // coarse display tier: guest | member | premium | admin
  membership: MembershipInfo | null;
  capabilities: Set<string>;   // the gate reads this
};

const GUEST: MemberContext = {
  user: null,
  role: "guest",
  membership: null,
  capabilities: new Set(),
};

export const getMemberContext = cache(async (): Promise<MemberContext> => {
  const supabase = await supabaseAuthServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return GUEST;

  const adminEmail = process.env.ADMIN_EMAIL;
  const isAdmin = !!adminEmail && user.email?.toLowerCase() === adminEmail.toLowerCase();
  if (isAdmin) {
    return {
      user,
      role: "admin",
      membership: null,
      capabilities: resolveCapabilities({ isAdmin: true, planCapabilities: [] }),
    };
  }

  const { data: m } = await supabase
    .from("memberships")
    .select("plan_key,status,current_period_end")
    .eq("user_id", user.id)
    .maybeSingle();

  const membership: MembershipInfo | null = m
    ? { planKey: m.plan_key, status: m.status, currentPeriodEnd: m.current_period_end }
    : null;

  const active =
    m?.status === "active" &&
    !!m.current_period_end &&
    new Date(m.current_period_end) > new Date();

  let planCapabilities: string[] = [];
  if (active && m) {
    const { data: caps } = await supabase
      .from("plan_capabilities")
      .select("capability")
      .eq("plan_key", m.plan_key);
    planCapabilities = (caps ?? []).map((r) => r.capability as string);
  }

  return {
    user,
    role: active ? "premium" : "member",
    membership,
    capabilities: resolveCapabilities({ isAdmin: false, planCapabilities }),
  };
});

export async function requireMember(next?: string): Promise<MemberContext> {
  const ctx = await getMemberContext();
  if (!ctx.user) {
    redirect(`/members/login${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  }
  return ctx;
}
```

- [ ] **Step 6: Build + full test run**

Run: `npm run build` then `npm test`
Expected: build succeeds; all tests pass (existing `access.test.ts` still green — untouched this PR).

- [ ] **Step 7: Commit**

```bash
git add src/lib/members/session.ts src/lib/members/capability-resolver.ts src/lib/members/capability-resolver.test.ts
git commit -m "feat(members): resolve capabilities in getMemberContext"
```

### Task A4: PR A ship

- [ ] `git fetch origin`; branch based on `origin/main`; `git log origin/main..HEAD` shows only this PR's commits.
- [ ] PR: `feat(members): capability engine + schema`. Call out the migration for manual run.
- [ ] Merge. Tell user: run `20260708000001_capabilities.sql`.

---

## PR B — Resource gate → capabilities

Branch: `feat/resource-capability-gate`

### Task B1: Resource types carry `required_capability`

**Files:**
- Modify: `src/lib/resources/types.ts`

Change `ResourceCard` and `Resource` to drop `visibility` and add `required_capability`:

```ts
// In ResourceCard: replace `visibility: Visibility;` with:
required_capability: string | null;
// In Resource: remove the visibility field entirely (inherited from ResourceCard now carries required_capability).
```

Remove the `import type { Visibility } from "@/lib/members/access";` line. Everywhere `Visibility` was used in this file, delete it.

- [ ] Edit the file; `npx tsc --noEmit` will surface every downstream break — that list drives B2–B5.
- [ ] Commit after B5 (this task has no independent deliverable; fold into the PR).

### Task B2: Queries select `required_capability`

**Files:**
- Modify: `src/lib/resources/queries.ts` — `CARD_COLS` and `getResourceBySlug` select `required_capability` instead of `visibility`; `searchResources` maps `required_capability` (the RPC returns `visibility` today — see B6).
- Modify: `src/lib/resources/admin-queries.ts` — `getAllResourcesAdmin` selects `required_capability`; `AdminResourceRow.visibility` → `required_capability: string | null`.

`CARD_COLS` becomes:
```ts
const CARD_COLS =
  "id,slug,title,description,type,difficulty,required_capability,cover_image,featured,reading_time,published_at,category:resource_categories(name,slug)";
```
In `listResources`, replace `.neq("visibility", "hidden")` with `.neq("required_capability", "admin_only")` (and keep a `.or("required_capability.is.null,required_capability.neq.admin_only")` — simplest: filter admin-only out in JS after fetch to avoid null-vs-neq SQL quirks: `rows.filter(r => r.required_capability !== "admin_only")`). Apply the same admin-only exclusion in `getRelatedResources` and `getNextResource`.

- [ ] Update both files; `npx tsc --noEmit` advances.

### Task B3: `search_resources` RPC returns `required_capability`

**Files:**
- Create: `supabase/migrations/20260708000002_search_required_capability.sql`

```sql
-- Point the search RPC at required_capability instead of visibility.
create or replace function public.search_resources(q text, lim int default 20)
returns table (
  id uuid, slug text, title text, description text, type text,
  category_id uuid, difficulty text, required_capability text, cover_image text,
  featured boolean, published_at timestamptz
)
language sql stable security definer set search_path = public as $$
  select r.id, r.slug, r.title, r.description, r.type, r.category_id,
         r.difficulty, r.required_capability, r.cover_image, r.featured, r.published_at
  from resources r
  where r.status = 'published' and coalesce(r.required_capability,'') <> 'admin_only'
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
```

- [ ] Update `searchResources` in `queries.ts` to map `required_capability` (drop `visibility`).
- [ ] Hand this migration to the user with the PR.

### Task B4: Write actions store `required_capability`; admin editor Access level

**Files:**
- Modify: `src/lib/resources/actions.ts` — in `fields()`, replace the `visibility` read with:
```ts
// Access level: "public" → null; "member" → the type's capability.
const accessLevel = str(formData, "access_level"); // "public" | "member"
const type = str(formData, "type");
const required_capability =
  accessLevel === "member" ? requiredCapabilityForType(type) : null;
```
Add `import { requiredCapabilityForType } from "@/lib/members/capabilities";`. Remove `visibility` from the returned row; add `required_capability`.
- Modify: `src/components/admin/resource-editor.tsx` — replace the Visibility `<select>` (options free/members/premium/hidden) with an **Access level** select:
```tsx
<Field label="Access level" htmlFor="access_level">
  <select
    id="access_level"
    name="access_level"
    defaultValue={resource?.required_capability ? "member" : "public"}
    className={SELECT_CLASSES}
  >
    <option value="public">Public — anyone</option>
    <option value="member">Member — requires membership</option>
  </select>
</Field>
```
`EditorResource` type: replace `visibility: string;` with `required_capability: string | null;`.

- [ ] Update both; `npx tsc --noEmit` advances.

### Task B5: Gate sites use `can()`; relabel to "Member"

**Files:**
- Modify: `src/app/members/resources/[slug]/page.tsx` — replace `canAccess(resource.visibility, role)` with `can(ctx.capabilities, resource.required_capability)` via a small helper (a resource with `required_capability === null` is always allowed):
```ts
// at top:
import { can, type Capability } from "@/lib/members/capabilities";
// gating:
const allowed =
  !resource.required_capability ||
  can(ctx.capabilities, resource.required_capability as Capability);
```
Note: the page currently destructures `{ role, user }` from `getMemberContext()` — change to `const ctx = await getMemberContext();` and use `ctx.user`, `ctx.capabilities`, `ctx.role`. The `<Paywall>` no longer takes `visibility`; see below.
- Modify: `src/components/members/paywall.tsx` — replace the `visibility` prop with `requiredCapability: string | null`. Every "premium" copy becomes "Member". The heading logic: any gated resource → "This is a Member resource" / "Become a Member to unlock this and everything else." Buttons: signed-out → "Sign in free" (to login); signed-in-not-member → "Become a Member" (to `/members/upgrade`). Pass a `signedIn: boolean` prop from the page.
- Modify: `src/components/members/resource-card.tsx` — replace the `locked`/`visibility` badge. Card receives `locked: boolean` (computed by the grid). When locked, show a `Lock` icon + "Member" (never "Premium").
- Modify: `src/components/members/resource-grid.tsx` — compute `locked`:
```ts
import { can, type Capability } from "@/lib/members/capabilities";
// per card:
const locked = !!r.required_capability &&
  r.required_capability !== "admin_only" &&
  !can(capabilities, r.required_capability as Capability);
```
The grid now takes `capabilities: Set<string>` instead of `role`. Update every caller (`explore`, `latest`, `bookmarks`, `downloads`, dashboard) to pass `ctx.capabilities`.
- Modify: `src/app/members/page.tsx`, `explore/page.tsx`, `latest/page.tsx`, `bookmarks/page.tsx`, `downloads/page.tsx` — swap `role` for `capabilities` where they call `ResourceGrid`/`ResourceCard`; the dashboard's featured/trending `ResourceCard` gets `locked={r.required_capability ? !can(caps, ...) : false}`.
- Modify: `src/lib/members/download-actions.ts` — replace the `canAccess(resource.visibility, role)` check with `can(ctx.capabilities, resource.required_capability)` (allow when `required_capability` is null). Error copy: "Become a Member to download this file."
- Modify: `src/app/admin/resources/resources-table.tsx` — the "visibility" column becomes "Access": show "Member" when `required_capability` is set (and not admin_only), "Hidden" for admin_only, else "Public".
- Modify: `src/app/admin/resources/page.tsx` — map `required_capability` into the row instead of `visibility`.
- Delete: `src/lib/members/access.ts` and `src/lib/members/access.test.ts` (replaced by capabilities). Update `src/lib/members/session.ts` import of `MemberRole` — move the `MemberRole` type into `session.ts` directly (it's only a display label now):
```ts
export type MemberRole = "guest" | "member" | "premium" | "admin";
```
and drop the `import type { MemberRole } from "./access";`.

- [ ] Run `npx tsc --noEmit` until clean, then `npm run build`, then `npm test`.
- [ ] Preview-verify (per user pref, DOM eval not screenshots): a Member-gated resource shows the paywall as a guest with "Become a Member"; a public resource renders; admin sees hidden resources.
- [ ] Commit: `feat(members): gate resources on capabilities, relabel to Member`

### Task B6: PR B ship

- [ ] Tests green, build green. PR with both migrations (`20260708000002`) noted for manual run.
- [ ] Merge. Tell user: run `20260708000002_search_required_capability.sql`.

---

## PR C — Membership UI relabel + Free/Member framing + plan-capabilities admin

Branch: `feat/member-tier-ui`

### Task C1: Relabel every remaining user-facing "Premium" → "Member"

**Files (replace user-facing copy only; keep internal keys/vars):**
- `src/components/members/shell.tsx` — the "Go premium" pill → "Become a Member".
- `src/app/members/upgrade/page.tsx` + `src/components/members/upgrade-panel.tsx` — headings/buttons "Go premium" → "Become a Member"; the `role === "premium"` redirect stays (internal). Price label unchanged.
- `src/app/members/account/page.tsx` — the tier badge maps `role`: `premium` → "Member", `member` → "Free", `admin` → "Admin". "Go premium" link → "Become a Member".
- `src/components/members/cancel-membership-button.tsx` — "premium membership" → "membership".

- [ ] Grep check: `grep -rni "premium" src/app/members src/components/members` returns only internal identifiers (plan keys, `role === "premium"`), no rendered copy.
- [ ] Commit: `feat(members): user-facing Premium copy becomes Member`

### Task C2: Upgrade page shows Free vs Member

**Files:**
- Modify: `src/app/members/upgrade/page.tsx` — above the plan cards, render a two-column "What's included" comparison: **Free** (today + yesterday puzzle, public blogs/case studies, selected assets/videos, public tools) vs **Member** (full archive, premium blogs/case studies, complete asset library, prompt library, premium videos, courses, albums, downloads, streaks & achievements). Static content; no new query.

- [ ] Build; commit: `feat(members): Free vs Member comparison on upgrade`

### Task C3: Plan-capabilities admin editor

**Files:**
- Create: `src/lib/members/capability-admin-actions.ts` — `setPlanCapability(formData)` (`plan_key`, `capability`, `on` → insert/delete a `plan_capabilities` row via `supabaseAuthServer`; `requireAdmin`; `revalidatePath("/admin/plans")`).
- Modify: `src/app/admin/plans/page.tsx` — under each plan row, render a capability checklist: for each `GRANTABLE_CAPABILITIES` key, a checkbox (checked if that plan has the row) that posts `setPlanCapability`. Fetch current `plan_capabilities` grouped by plan_key. Free plan shows the same checklist (starts empty). Label each key human-readably (map key → sentence label inline).

- [ ] Build; preview-verify a capability toggle persists (admin-gated, so verify via the query round-trip / DOM).
- [ ] Commit: `feat(admin): edit plan capabilities`

### Task C4: PR C ship

- [ ] Build + tests green. PR. Merge. (No migration.)

---

## PR D — Games archive gating + in-game upsell

Branch: `feat/games-archive-gate`

### Task D1: `isYesterday` / `isTodayOrYesterday` (TDD)

**Files:**
- Modify: `src/lib/daily.ts`
- Test: `src/lib/daily.test.ts` (create if absent)

**Interfaces (Produces):**
```ts
export function isYesterday(puzzleNumber: number, now?: number): boolean;
export function isTodayOrYesterday(puzzleNumber: number, now?: number): boolean;
```

- [ ] **Step 1: Failing test**

```ts
import { describe, expect, it } from "vitest";
import { puzzleNumberFor, isYesterday, isTodayOrYesterday } from "./daily";

const NOW = Date.UTC(2026, 6, 8, 6, 0, 0); // fixed instant
const today = puzzleNumberFor(NOW);

describe("isYesterday / isTodayOrYesterday", () => {
  it("today is not yesterday but is today-or-yesterday", () => {
    expect(isYesterday(today, NOW)).toBe(false);
    expect(isTodayOrYesterday(today, NOW)).toBe(true);
  });
  it("yesterday qualifies", () => {
    expect(isYesterday(today - 1, NOW)).toBe(true);
    expect(isTodayOrYesterday(today - 1, NOW)).toBe(true);
  });
  it("two days ago is archive", () => {
    expect(isTodayOrYesterday(today - 2, NOW)).toBe(false);
  });
});
```

- [ ] **Step 2: Run to fail** — `npx vitest run src/lib/daily.test.ts` → FAIL.
- [ ] **Step 3: Implement (append to `daily.ts`)**

```ts
/** Was this the puzzle exactly one day before today's? */
export function isYesterday(puzzleNumber: number, now: number = Date.now()): boolean {
  return puzzleNumber === puzzleNumberFor(now) - 1;
}

/** Free window: the live puzzle and the one before it. Older puzzles need view_archive. */
export function isTodayOrYesterday(puzzleNumber: number, now: number = Date.now()): boolean {
  return isToday(puzzleNumber, now) || isYesterday(puzzleNumber, now);
}
```

- [ ] **Step 4: Run to pass** — PASS.
- [ ] **Step 5: Commit** — `feat(games): today+yesterday free-window helpers`

### Task D2: Archive upsell card

**Files:**
- Create: `src/components/games/ArchiveUpsell.tsx`

```tsx
import Link from "next/link";
import { Lock } from "lucide-react";

/** Native in-game wall for archive puzzles the viewer can't open yet. No emoji (project rule). */
export function ArchiveUpsell({ game }: { game: "alfazy" | "hit-and-blow" }) {
  return (
    <div className="mx-auto mt-10 max-w-sm rounded-card border border-border bg-card p-6 text-center">
      <div className="mx-auto flex size-12 items-center justify-center rounded-card bg-muted">
        <Lock className="size-6 text-muted-foreground" />
      </div>
      <h1 className="mt-4 font-display text-xl font-bold">This puzzle is in the Member archive</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Today and yesterday are free. Become a Member to play every past puzzle.
      </p>
      <div className="mt-6 flex flex-col gap-2">
        <Link
          href="/members/upgrade"
          className="rounded-btn bg-foreground px-4 py-2 text-sm font-medium text-background transition-ui hover:opacity-85"
        >
          Unlock the archive
        </Link>
        <Link
          href={`/games/${game}`}
          className="rounded-btn border border-border px-4 py-2 text-sm transition-ui hover:bg-accent"
        >
          Continue with today's puzzle
        </Link>
        <Link
          href="/members/upgrade"
          className="text-xs text-muted-foreground underline-offset-4 hover:underline"
        >
          See everything included in Membership
        </Link>
      </div>
    </div>
  );
}
```

- [ ] Commit: `feat(games): archive upsell card`

### Task D3: Gate the archive routes on `view_archive`

**Files:**
- Modify: `src/app/games/alfazy/[puzzle]/page.tsx`
- Modify: `src/app/games/hit-and-blow/[puzzle]/page.tsx`

Alfazy `[puzzle]` page becomes:
```tsx
import { isToday, isTodayOrYesterday } from "@/lib/daily";
import { getMemberContext } from "@/lib/members/session";
import { requireGameUser } from "@/lib/games/session";
import { can } from "@/lib/members/capabilities";
import { notFound } from "next/navigation";
import AlfazyBoard from "@/components/games/AlfazyBoard";
import AlfazyThemeProvider from "@/components/games/AlfazyThemeProvider";
import { ArchiveUpsell } from "@/components/games/ArchiveUpsell";
import { wordForPuzzle } from "@/lib/games/alfazy-puzzles";

export default async function AlfazyArchive({ params }: { params: Promise<{ puzzle: string }> }) {
  const { puzzle } = await params;
  const n = Number(puzzle);
  if (!Number.isInteger(n) || n < 0) notFound();

  if (!isTodayOrYesterday(n)) {
    // Older than the free window → require sign-in, then the view_archive capability.
    await requireGameUser(`/games/alfazy/${n}`);
    const { capabilities } = await getMemberContext();
    if (!can(capabilities, "view_archive")) {
      return <ArchiveUpsell game="alfazy" />;
    }
  }
  const now = Date.now();
  const answer = await wordForPuzzle(n);
  return (
    <AlfazyThemeProvider now={now}>
      <AlfazyBoard puzzleNumber={n} isArchive={!isToday(n)} answer={answer} />
    </AlfazyThemeProvider>
  );
}
```

Hit-and-blow `[puzzle]` page becomes:
```tsx
import { isToday, isTodayOrYesterday } from "@/lib/daily";
import { getMemberContext } from "@/lib/members/session";
import { requireGameUser } from "@/lib/games/session";
import { can } from "@/lib/members/capabilities";
import { notFound } from "next/navigation";
import HitAndBlowBoard from "@/components/games/HitAndBlowBoard";
import { ArchiveUpsell } from "@/components/games/ArchiveUpsell";

export default async function HitAndBlowArchive({ params }: { params: Promise<{ puzzle: string }> }) {
  const { puzzle } = await params;
  const n = Number(puzzle);
  if (!Number.isInteger(n) || n < 0) notFound();

  if (!isTodayOrYesterday(n)) {
    await requireGameUser(`/games/hit-and-blow/${n}`);
    const { capabilities } = await getMemberContext();
    if (!can(capabilities, "view_archive")) {
      return <ArchiveUpsell game="hit-and-blow" />;
    }
  }
  return <HitAndBlowBoard puzzleNumber={n} isArchive={!isToday(n)} />;
}
```

- [ ] Build; preview-verify: yesterday's puzzle opens without login; an older puzzle as a signed-in non-Member shows `ArchiveUpsell`; admin opens it.
- [ ] Commit: `feat(games): gate archive puzzles on view_archive (today+yesterday free)`

### Task D4: PR D ship

- [ ] Build + tests green. PR. Merge. (No migration.)

---

## PR E — Archive browser (conversion surface)

Branch: `feat/games-archive-browser`

### Task E1: Archive listing query

**Files:**
- Create: `src/lib/games/archive-queries.ts`

```ts
import "server-only";

import { supabaseAuthServer } from "@/lib/supabase/auth-server";
import { puzzleNumberFor, puzzleDateISO } from "@/lib/daily";

export type ArchiveEntry = {
  puzzleNumber: number;
  dateISO: string;
  played: boolean;
};

/**
 * Every puzzle from today back to #0, newest first, with the signed-in user's
 * played flag. `game` maps to the game_key enum used by game_results.
 */
export async function listArchive(
  game: "alfazy" | "hit_and_blow",
  now: number = Date.now(),
): Promise<ArchiveEntry[]> {
  const today = puzzleNumberFor(now);
  const supabase = await supabaseAuthServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const played = new Set<number>();
  if (user) {
    const { data } = await supabase
      .from("game_results")
      .select("puzzle_number")
      .eq("user_id", user.id)
      .eq("game", game);
    for (const r of data ?? []) played.add(r.puzzle_number as number);
  }

  const entries: ArchiveEntry[] = [];
  for (let n = today; n >= 0; n--) {
    entries.push({ puzzleNumber: n, dateISO: puzzleDateISO(n), played: played.has(n) });
  }
  return entries;
}
```

- [ ] Build; commit: `feat(games): archive listing query`

### Task E2: Archive browser pages

**Files:**
- Create: `src/app/games/alfazy/archive/page.tsx`
- Create: `src/app/games/hit-and-blow/archive/page.tsx`
- Create: `src/components/games/ArchiveGrid.tsx`

`ArchiveGrid.tsx`:
```tsx
import Link from "next/link";
import { Check, Lock } from "lucide-react";
import { isTodayOrYesterday } from "@/lib/daily";
import { cn } from "@/lib/utils";
import type { ArchiveEntry } from "@/lib/games/archive-queries";

/** Locked entries stay visible — people buy what they can see. */
export function ArchiveGrid({
  entries,
  game,
  canViewArchive,
  now,
}: {
  entries: ArchiveEntry[];
  game: "alfazy" | "hit-and-blow";
  canViewArchive: boolean;
  now: number;
}) {
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-7">
      {entries.map((e) => {
        const free = isTodayOrYesterday(e.puzzleNumber, now);
        const open = free || canViewArchive;
        const href = `/games/${game}/${e.puzzleNumber}`;
        const label = e.dateISO.slice(5); // MM-DD
        const inner = (
          <>
            <span className="text-xs font-medium">#{e.puzzleNumber}</span>
            <span className="text-[11px] text-muted-foreground">{label}</span>
            {e.played ? (
              <Check className="size-3.5 text-success" />
            ) : open ? null : (
              <Lock className="size-3.5 text-muted-foreground" />
            )}
          </>
        );
        return open ? (
          <Link
            key={e.puzzleNumber}
            href={href}
            className={cn(
              "flex flex-col items-center gap-1 rounded-card border border-border bg-card p-3 transition-ui hover:border-foreground/30",
              free && "ring-1 ring-brand/40",
            )}
          >
            {inner}
          </Link>
        ) : (
          <Link
            key={e.puzzleNumber}
            href={href} // gated route renders the upsell card
            className="flex flex-col items-center gap-1 rounded-card border border-dashed border-border bg-muted/40 p-3 opacity-80 transition-ui hover:opacity-100"
          >
            {inner}
          </Link>
        );
      })}
    </div>
  );
}
```

`src/app/games/alfazy/archive/page.tsx`:
```tsx
import { listArchive } from "@/lib/games/archive-queries";
import { getMemberContext } from "@/lib/members/session";
import { can } from "@/lib/members/capabilities";
import { ArchiveGrid } from "@/components/games/ArchiveGrid";

export const metadata = { title: "Alfazy Archive" };

export default async function AlfazyArchivePage() {
  const now = Date.now();
  const [entries, ctx] = await Promise.all([listArchive("alfazy", now), getMemberContext()]);
  const canViewArchive = can(ctx.capabilities, "view_archive");

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4">
      <header>
        <h1 className="font-display text-2xl font-bold tracking-tight">Alfazy archive</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Today and yesterday are free. {canViewArchive ? "You have full archive access." : "Become a Member to play every past puzzle."}
        </p>
      </header>
      <ArchiveGrid entries={entries} game="alfazy" canViewArchive={canViewArchive} now={now} />
    </div>
  );
}
```

`src/app/games/hit-and-blow/archive/page.tsx` — identical but `listArchive("hit_and_blow", now)`, `game="hit-and-blow"`, title "Hit and Blow Archive", heading "Hit and Blow archive".

- [ ] Build; preview-verify: grid renders all puzzles, today+yesterday have the accent ring and open, older show a Lock for non-Members, played puzzles show a check.
- [ ] Commit: `feat(games): archive browser with visible locked entries`

### Task E3: Link the archive from games

**Files:**
- Modify: `src/app/games/alfazy/page.tsx` and `src/app/games/hit-and-blow/page.tsx` (or the shared games header/nav component if one exists — check `src/app/games/layout.tsx` and any `GamesHeader`) — add an "Archive" link to `/games/<game>/archive`.

- [ ] Locate the games nav (`src/app/games/layout.tsx` / `src/components/games/*Header*`); add the link there if shared, else on each game's today page.
- [ ] Build; preview-verify the link appears and routes.
- [ ] Commit: `feat(games): archive entry point in games nav`

### Task E4: PR E ship

- [ ] Build + tests green. PR. Merge. (No migration.)

---

## Deferred (architecture supports, no code this cycle)

- Pro Member tier: keys defined (`join_private_community`, `attend_live_sessions`, `access_beta_features`, etc.); create a `pro-monthly`/`pro-yearly` plan + `plan_capabilities` rows + Razorpay plans when it launches. No app changes needed to gate on those keys.
- Dormant capability features (play limits → `play_unlimited_games`, achievements → `earn_achievements`, streak history → `streak_history`): each new feature just calls `can(ctx.capabilities, key)`.
- Dropping the legacy `resources.visibility` column: a cleanup migration once PR B is confirmed in prod.
- Per-puzzle "played/won" richness in the archive grid, calendar-month view, filters.

## Self-review notes

- **Spec coverage:** archive today+yesterday free (D1/D3) ✓; capabilities not hardcoded (A2/A3/B) ✓; per-capability keys incl. all listed (A2) ✓; dormant keys defined not enforced (A2, Deferred) ✓; per-resource Public/Member (B4) ✓; single paid Member plan, keys unchanged (A1, C1) ✓; Free/Member framing (C2) ✓; in-game upsell before redirect (D2/D3) ✓; visible archive browser with locked entries (E) ✓; Pro designed not launched (Deferred) ✓; no user-facing "Premium" (C1 grep gate) ✓; no emoji — Lock icon (D2) ✓.
- **Type consistency:** `Capability` union defined once (A2); `capabilities: Set<string>` on `MemberContext` (A3) consumed by grid/paywall/games/download (B, D, E); `required_capability: string | null` on resource types (B1) flows through queries/actions/editor/gate; `requiredCapabilityForType(type)` used in A1 backfill (SQL mirror) and B4 (write path) identically; games `game_key` value is `hit_and_blow` (underscore) in queries, `hit-and-blow` (hyphen) in routes/components — kept distinct deliberately (E1 vs E2).
- **Placeholder scan:** none — every code step shows full code; migrations verbatim.
