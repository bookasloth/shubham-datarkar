# Unified Identity + People Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Collapse the four "user types" (contactor, subscriber, gamer, member) into one identity — a verified `auth.users` profile — and give the admin a unified People view; contact/newsletter/donation stay frictionless and link by email.

**Architecture:** No new tables. Two security-definer, admin-gated Postgres RPCs (`get_people`, `get_person_timeline`) aggregate/join every behavior table by `lower(trim(email))` at read time. A new `/admin/people` page (list + per-person timeline) consumes them. Free-account CTAs on the contact/newsletter/support success states funnel email-only visitors toward a verified account. The members area already admits free users (`requireMember` only checks for a logged-in user), so free-tier work is additive: newsletter preferences + donation history on `/members/account`.

**Tech Stack:** Next.js 16.2.9 (App Router, React 19 Server Components + server actions), Supabase (Postgres + Auth + RLS), TypeScript, Tailwind v4, vitest.

## Global Constraints

- **Modified Next.js** — this repo runs Next 16.2.9 with local docs at `node_modules/next/dist/docs/`. Mirror existing repo patterns; dynamic-route `params` is a **Promise** (`params: Promise<{…}>`, then `await params`). When unsure, read the relevant doc before writing.
- **Supabase manual SQL** — write the migration file; hand the SQL to the user to run in their own project's SQL editor. NEVER apply migrations directly. Target = Shubham's OWN project (not BAS).
- **Admin gate** — `public.is_admin()` = `auth.jwt()->>'email' = 'bookasloth@gmail.com'`. Admin pages read with `supabaseAuthServer()` (cookie session) so `is_admin()` resolves true.
- **Service-role stays server-side** — `supabaseAdmin()` bypasses RLS; never return its raw rows or the key to the client.
- **Design** — monochrome, no emojis; follow existing admin (`admin-*` tokens) and members (`border-border bg-card`) styling. Fonts/tokens already set.
- **Tiers unchanged** — Visitor → Free (verified) → Premium (99 monthly / 999 yearly, same benefits). No capability, plan, or Razorpay changes.
- **Git** — branch already exists: `feat/unified-identity-people` (based on `origin/main`), working in isolated worktree `C:/Users/shubh/OneDrive/Documents/Claude/Projects/identity-wt`. Commit per task. PR at the end; never commit to `main`.
- **Deploy** — no auto-deploy; explicit user gate.

---

## File Structure

**Create:**
- `supabase/migrations/20260710000001_people_rpcs.sql` — the two RPCs.
- `src/lib/people/queries.ts` — `getPeople()`, `getPersonTimeline()`, types, `planLabel()` helper.
- `src/lib/people/queries.test.ts` — unit tests for `normalizeEmail` + `planLabel`.
- `src/app/admin/people/page.tsx` — People list (server).
- `src/app/admin/people/people-table.tsx` — client DataTable with badges.
- `src/app/admin/people/[email]/page.tsx` — per-person timeline (server).
- `src/components/members/create-account-cta.tsx` — shared CTA block.
- `src/lib/members/newsletter-actions.ts` — self-scoped newsletter toggle server action.
- `src/components/members/newsletter-prefs.tsx` — client toggle for the account page.

**Modify:**
- `src/components/admin/layout/nav-config.tsx` — add People to the Audience group.
- `src/components/sections/contact-form.tsx` — CTA in the `done` state.
- `src/components/sections/newsletter-form.tsx` — CTA in the success state.
- `src/components/support/support-panel.tsx` — CTA after a paid support.
- `src/lib/subscribers/queries.ts` — add `getSubscriptionStatus(email)`.
- `src/lib/support/queries.ts` — add `getMyDonations(email)`.
- `src/app/members/account/page.tsx` — add Newsletter preferences + Donation history sections.

---

## Task 1: People RPCs migration

**Files:**
- Create: `supabase/migrations/20260710000001_people_rpcs.sql`

**Interfaces:**
- Produces (SQL, callable via PostgREST `.rpc()`):
  - `get_people()` → rows `(email text, display_name text, user_id uuid, verified bool, contacted bool, contact_count int, subscribed bool, donated bool, donation_total numeric, is_gamer bool, plan_key text, membership_status text, first_seen timestamptz, last_seen timestamptz)`
  - `get_person_timeline(p_email text)` → rows `(kind text, occurred_at timestamptz, title text, detail text)`

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260710000001_people_rpcs.sql`:

```sql
-- Unified People: aggregate every email across contacts, subscribers, supports,
-- and auth.users into one row per person; plus a per-person activity timeline.
-- Both are security-definer (they read auth.users) and admin-gated via is_admin().
-- Target: Shubham's OWN Supabase project. Run manually in the SQL editor.

-- ============ one row per distinct email across all behaviors ============
create or replace function public.get_people()
returns table (
  email             text,
  display_name      text,
  user_id           uuid,
  verified          boolean,
  contacted         boolean,
  contact_count     int,
  subscribed        boolean,
  donated           boolean,
  donation_total    numeric,
  is_gamer          boolean,
  plan_key          text,
  membership_status text,
  first_seen        timestamptz,
  last_seen         timestamptz
)
language plpgsql stable security definer set search_path = public, auth as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;

  return query
  with c as (
    select lower(trim(email)) as email, count(*)::int as contact_count,
           min(created_at) as first_seen, max(created_at) as last_seen
    from public.contacts
    where email is not null and trim(email) <> '' group by 1
  ),
  s as (
    select lower(trim(email)) as email, bool_or(status = 'active') as subscribed,
           min(created_at) as first_seen, max(created_at) as last_seen
    from public.subscribers
    where email is not null and trim(email) <> '' group by 1
  ),
  d as (
    select lower(trim(email)) as email,
           bool_or(status = 'paid') as donated,
           coalesce(sum(total_amount) filter (where status = 'paid'), 0) as donation_total,
           min(created_at) as first_seen, max(created_at) as last_seen
    from public.supports
    where email is not null and trim(email) <> '' group by 1
  ),
  u as (
    select id as user_id, lower(trim(email)) as email,
           (email_confirmed_at is not null) as verified, created_at
    from auth.users
    where email is not null and trim(email) <> ''
  ),
  keys as (
    select email from c union select email from s
    union select email from d union select email from u
  )
  select
    k.email,
    coalesce(p.username, split_part(k.email, '@', 1)) as display_name,
    u.user_id,
    coalesce(u.verified, false) as verified,
    (c.email is not null) as contacted,
    coalesce(c.contact_count, 0) as contact_count,
    coalesce(s.subscribed, false) as subscribed,
    coalesce(d.donated, false) as donated,
    coalesce(d.donation_total, 0) as donation_total,
    exists (select 1 from public.game_results gr where gr.user_id = u.user_id) as is_gamer,
    m.plan_key,
    m.status as membership_status,
    least(c.first_seen, s.first_seen, d.first_seen, u.created_at) as first_seen,
    greatest(c.last_seen, s.last_seen, d.last_seen, u.created_at) as last_seen
  from keys k
  left join c on c.email = k.email
  left join s on s.email = k.email
  left join d on d.email = k.email
  left join u on u.email = k.email
  left join public.profiles p on p.id = u.user_id
  left join public.memberships m on m.user_id = u.user_id
  order by greatest(c.last_seen, s.last_seen, d.last_seen, u.created_at) desc nulls last;
end;
$$;

-- ============ per-person merged activity feed ============
create or replace function public.get_person_timeline(p_email text)
returns table (kind text, occurred_at timestamptz, title text, detail text)
language plpgsql stable security definer set search_path = public, auth as $$
declare
  v_email text := lower(trim(p_email));
  v_uid uuid;
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;

  select id into v_uid from auth.users where lower(trim(email)) = v_email limit 1;

  return query
  select 'contact'::text, c.created_at,
         coalesce(nullif(c.project_type, ''), 'Contact message'), c.message
  from public.contacts c where lower(trim(c.email)) = v_email
  union all
  select 'newsletter'::text, s.created_at,
         case when s.status = 'active' then 'Subscribed' else 'Unsubscribed' end, s.source
  from public.subscribers s where lower(trim(s.email)) = v_email
  union all
  select 'donation'::text, d.created_at,
         d.status || ' - INR ' || d.total_amount::text, d.message
  from public.supports d where lower(trim(d.email)) = v_email
  union all
  select 'game'::text, coalesce(gr.completed_at, gr.updated_at),
         gr.game::text || ' #' || gr.puzzle_number::text, gr.status::text
  from public.game_results gr where v_uid is not null and gr.user_id = v_uid
  union all
  select 'membership'::text, m.created_at, m.plan_key, m.status
  from public.memberships m where v_uid is not null and m.user_id = v_uid
  order by 2 desc nulls last;
end;
$$;

-- ============ grants: admin-gated internally; authenticated may call ============
revoke all on function public.get_people() from public, anon;
revoke all on function public.get_person_timeline(text) from public, anon;
grant execute on function public.get_people() to authenticated;
grant execute on function public.get_person_timeline(text) to authenticated;
```

- [ ] **Step 2: Provide the manual verification script (runs in the Supabase SQL editor)**

The RPC's `is_admin()` gate blocks calls from the SQL editor (no admin JWT there), so verify the **aggregation logic** by running the People CTE body directly (guard omitted). Paste and run:

```sql
-- Logic check: expect ONE row per distinct lower(email), badges correct.
with c as (
  select lower(trim(email)) as email, count(*)::int as contact_count
  from public.contacts where email is not null and trim(email) <> '' group by 1),
s as (
  select lower(trim(email)) as email, bool_or(status='active') as subscribed
  from public.subscribers where email is not null and trim(email) <> '' group by 1),
d as (
  select lower(trim(email)) as email, bool_or(status='paid') as donated,
         coalesce(sum(total_amount) filter (where status='paid'),0) as donation_total
  from public.supports where email is not null and trim(email) <> '' group by 1),
u as (select id, lower(trim(email)) as email, email_confirmed_at is not null as verified
      from auth.users where email is not null and trim(email) <> ''),
keys as (select email from c union select email from s union select email from d union select email from u)
select k.email, (c.email is not null) contacted, coalesce(c.contact_count,0) contact_count,
       coalesce(s.subscribed,false) subscribed, coalesce(d.donated,false) donated,
       coalesce(d.donation_total,0) donation_total, u.id user_id, coalesce(u.verified,false) verified
from keys k
left join c on c.email=k.email left join s on s.email=k.email
left join d on d.email=k.email left join u on u.email=k.email
order by k.email;
```

Expected: distinct email count matches `select count(distinct lower(trim(email))) from (…union of all four…)`; a person who contacted twice shows `contact_count = 2` on one row; `donated=true` only where a paid support exists. The `is_admin()` gate itself is verified in-app in Task 3 (admin sees rows; anon/non-admin gets "not authorized").

- [ ] **Step 3: Hand the SQL to the user**

Tell the user: "Run `supabase/migrations/20260710000001_people_rpcs.sql` in your project's SQL editor, then the Step-2 logic check." Do not apply it via any tool.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260710000001_people_rpcs.sql
git commit -m "feat(identity): get_people + get_person_timeline admin RPCs"
```

---

## Task 2: People query lib + helpers

**Files:**
- Create: `src/lib/people/queries.ts`
- Test: `src/lib/people/queries.test.ts`

**Interfaces:**
- Consumes: `supabaseAuthServer()` from `@/lib/supabase/auth-server`; the RPCs from Task 1.
- Produces:
  - `type Person = { email; displayName; userId: string|null; verified; contacted; contactCount; subscribed; donated; donationTotal; isGamer; planKey: string|null; membershipStatus: string|null; firstSeen: string|null; lastSeen: string|null }`
  - `type TimelineEntry = { kind: string; occurredAt: string|null; title: string; detail: string|null }`
  - `getPeople(): Promise<Person[]>`
  - `getPersonTimeline(email: string): Promise<TimelineEntry[]>`
  - `normalizeEmail(raw: string): string`
  - `planLabel(p: Pick<Person,"userId"|"planKey"|"membershipStatus">): "Premium"|"Free"|"—"`

- [ ] **Step 1: Write the failing test**

Create `src/lib/people/queries.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { normalizeEmail, planLabel } from "./queries";

describe("normalizeEmail", () => {
  it("lowercases and trims", () => {
    expect(normalizeEmail("  Foo@Bar.COM ")).toBe("foo@bar.com");
  });
});

describe("planLabel", () => {
  it("active membership → Premium", () => {
    expect(planLabel({ userId: "u1", planKey: "premium-monthly", membershipStatus: "active" })).toBe("Premium");
  });
  it("verified account, no active membership → Free", () => {
    expect(planLabel({ userId: "u1", planKey: null, membershipStatus: null })).toBe("Free");
    expect(planLabel({ userId: "u1", planKey: "premium-monthly", membershipStatus: "cancelled" })).toBe("Free");
  });
  it("email-only lead (no account) → em dash", () => {
    expect(planLabel({ userId: null, planKey: null, membershipStatus: null })).toBe("—");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/people/queries.test.ts`
Expected: FAIL — cannot resolve `./queries`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/people/queries.ts`:

```ts
import "server-only";

import { supabaseAuthServer } from "@/lib/supabase/auth-server";

export type Person = {
  email: string;
  displayName: string;
  userId: string | null;
  verified: boolean;
  contacted: boolean;
  contactCount: number;
  subscribed: boolean;
  donated: boolean;
  donationTotal: number;
  isGamer: boolean;
  planKey: string | null;
  membershipStatus: string | null;
  firstSeen: string | null;
  lastSeen: string | null;
};

export type TimelineEntry = {
  kind: string;
  occurredAt: string | null;
  title: string;
  detail: string | null;
};

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

/** Admin badge: active membership → Premium; any verified account → Free; lead → —. */
export function planLabel(p: Pick<Person, "userId" | "planKey" | "membershipStatus">): "Premium" | "Free" | "—" {
  if (p.membershipStatus === "active" && p.planKey) return "Premium";
  if (p.userId) return "Free";
  return "—";
}

/** Every distinct person across contacts, subscribers, supports, and accounts. */
export async function getPeople(): Promise<Person[]> {
  try {
    const supabase = await supabaseAuthServer();
    const { data, error } = await supabase.rpc("get_people");
    if (error) throw error;
    return (data ?? []).map((r: Record<string, unknown>) => ({
      email: String(r.email),
      displayName: String(r.display_name ?? ""),
      userId: (r.user_id as string | null) ?? null,
      verified: Boolean(r.verified),
      contacted: Boolean(r.contacted),
      contactCount: Number(r.contact_count ?? 0),
      subscribed: Boolean(r.subscribed),
      donated: Boolean(r.donated),
      donationTotal: Number(r.donation_total ?? 0),
      isGamer: Boolean(r.is_gamer),
      planKey: (r.plan_key as string | null) ?? null,
      membershipStatus: (r.membership_status as string | null) ?? null,
      firstSeen: (r.first_seen as string | null) ?? null,
      lastSeen: (r.last_seen as string | null) ?? null,
    }));
  } catch (e) {
    console.warn("[people] getPeople failed; returning empty:", (e as Error)?.message ?? e);
    return [];
  }
}

/** Merged chronological activity for one email. */
export async function getPersonTimeline(email: string): Promise<TimelineEntry[]> {
  try {
    const supabase = await supabaseAuthServer();
    const { data, error } = await supabase.rpc("get_person_timeline", { p_email: normalizeEmail(email) });
    if (error) throw error;
    return (data ?? []).map((r: Record<string, unknown>) => ({
      kind: String(r.kind),
      occurredAt: (r.occurred_at as string | null) ?? null,
      title: String(r.title ?? ""),
      detail: (r.detail as string | null) ?? null,
    }));
  } catch (e) {
    console.warn("[people] getPersonTimeline failed; returning empty:", (e as Error)?.message ?? e);
    return [];
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/people/queries.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/people/queries.ts src/lib/people/queries.test.ts
git commit -m "feat(identity): people query lib + planLabel/normalizeEmail helpers"
```

---

## Task 3: /admin/people list page + nav

**Files:**
- Create: `src/app/admin/people/page.tsx`
- Create: `src/app/admin/people/people-table.tsx`
- Modify: `src/components/admin/layout/nav-config.tsx` (Audience group)

**Interfaces:**
- Consumes: `getPeople`, `planLabel`, `Person` from `@/lib/people/queries`; `DataTable`/`Column` from `@/components/admin/data`; `StatusBadge` from `@/components/admin`; `formatDate` from `@/lib/utils`.

- [ ] **Step 1: Add the nav entry**

In `src/components/admin/layout/nav-config.tsx`, add `Contact` to the lucide import line (line 1-5 import block) and add People as the first item in the Audience group:

```tsx
  {
    heading: "Audience",
    items: [
      { label: "People", href: "/admin/people", icon: Contact },
      { label: "Subscribers", href: "/admin/subscribers", icon: Users },
      { label: "Contacts", href: "/admin/contacts", icon: Mail },
    ],
  },
```

(Add `Contact` to the existing `import { … } from "lucide-react";` list at the top.)

- [ ] **Step 2: Create the client table**

Create `src/app/admin/people/people-table.tsx`:

```tsx
"use client";

import Link from "next/link";
import { DataTable, type Column } from "@/components/admin/data";
import { StatusBadge } from "@/components/admin";
import { formatDate } from "@/lib/utils";
import { planLabel, type Person } from "@/lib/people/queries";

function Yes({ on, label }: { on: boolean; label: string }) {
  return on ? <StatusBadge tone="success">{label}</StatusBadge> : <span className="text-admin-text-muted">—</span>;
}

const columns: Column<Person>[] = [
  {
    key: "person",
    header: "Person",
    cell: (r) => (
      <Link href={`/admin/people/${encodeURIComponent(r.email)}`} className="font-medium hover:underline">
        {r.displayName}
        <span className="block text-xs text-admin-text-muted">{r.email}</span>
      </Link>
    ),
    sortValue: (r) => r.email,
  },
  { key: "contact", header: "Contact", cell: (r) => <Yes on={r.contacted} label={r.contactCount > 1 ? `${r.contactCount}×` : "Yes"} />, sortValue: (r) => (r.contacted ? 1 : 0) },
  { key: "newsletter", header: "Newsletter", cell: (r) => <Yes on={r.subscribed} label="Yes" />, sortValue: (r) => (r.subscribed ? 1 : 0), hideable: true },
  { key: "donation", header: "Donation", cell: (r) => <Yes on={r.donated} label={`INR ${r.donationTotal}`} />, sortValue: (r) => r.donationTotal, hideable: true },
  { key: "games", header: "Games", cell: (r) => <Yes on={r.isGamer} label="Player" />, sortValue: (r) => (r.isGamer ? 1 : 0), hideable: true },
  {
    key: "membership",
    header: "Membership",
    cell: (r) => {
      const p = planLabel(r);
      return p === "Premium" ? <StatusBadge tone="success">Premium</StatusBadge> : <span className="text-admin-text-muted">{p}</span>;
    },
    sortValue: (r) => planLabel(r),
  },
  { key: "lastSeen", header: "Last seen", cell: (r) => (r.lastSeen ? formatDate(r.lastSeen) : "—"), sortValue: (r) => r.lastSeen ?? "", hideable: true },
];

export function PeopleTable({ rows }: { rows: Person[] }) {
  return (
    <DataTable
      rows={rows}
      columns={columns}
      getRowId={(r) => r.email}
      searchable={(r) => `${r.displayName} ${r.email}`}
      searchPlaceholder="Search people…"
      initialSort={{ key: "lastSeen", dir: "desc" }}
      emptyTitle="No people yet"
      emptyDescription="Everyone who contacts, subscribes, donates, plays, or signs up appears here."
    />
  );
}
```

- [ ] **Step 3: Create the page**

Create `src/app/admin/people/page.tsx`:

```tsx
import { getPeople } from "@/lib/people/queries";
import { PeopleTable } from "./people-table";

export const dynamic = "force-dynamic";

export default async function AdminPeoplePage() {
  const people = await getPeople();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-admin-text">People</h1>
        <p className="mt-1 text-sm text-admin-text-muted">
          {people.length} {people.length === 1 ? "person" : "people"} — one row per email across every behavior.
        </p>
      </div>
      <PeopleTable rows={people} />
    </div>
  );
}
```

- [ ] **Step 4: Typecheck + build**

Run: `npx tsc --noEmit`
Expected: no errors in the new files.
Run: `npm run lint`
Expected: clean.

- [ ] **Step 5: Manual smoke (after Task 1 SQL is applied — may defer to Task 7)**

As the admin, load `/admin/people`: rows render with badges; search filters; a row links to `/admin/people/<email>`. As anon (logged out), `getPeople` returns `[]` (gate raises, caught) → empty state. Note: full data smoke requires the migration applied; if not yet, confirm the page renders its empty state without error.

- [ ] **Step 6: Commit**

```bash
git add src/app/admin/people src/components/admin/layout/nav-config.tsx
git commit -m "feat(identity): /admin/people unified list + Audience nav entry"
```

---

## Task 4: /admin/people/[email] timeline

**Files:**
- Create: `src/app/admin/people/[email]/page.tsx`

**Interfaces:**
- Consumes: `getPersonTimeline` from `@/lib/people/queries`; Next 16 `params: Promise<{ email: string }>`.

- [ ] **Step 1: Create the detail page**

Create `src/app/admin/people/[email]/page.tsx`:

```tsx
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getPersonTimeline } from "@/lib/people/queries";
import { StatusBadge } from "@/components/admin";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

const KIND_TONE: Record<string, "success" | "info" | "neutral" | "warning"> = {
  contact: "info",
  newsletter: "neutral",
  donation: "success",
  game: "neutral",
  membership: "success",
};

export default async function PersonTimelinePage({ params }: { params: Promise<{ email: string }> }) {
  const { email: raw } = await params;
  const email = decodeURIComponent(raw);
  const timeline = await getPersonTimeline(email);

  return (
    <div className="flex flex-col gap-6">
      <Link href="/admin/people" className="inline-flex items-center gap-1.5 text-xs text-admin-text-muted hover:text-admin-text">
        <ArrowLeft className="size-3.5" /> All people
      </Link>

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-admin-text">{email}</h1>
        <p className="mt-1 text-sm text-admin-text-muted">
          {timeline.length} {timeline.length === 1 ? "event" : "events"} across every behavior.
        </p>
      </div>

      {timeline.length === 0 ? (
        <p className="text-sm text-admin-text-muted">No activity found for this email.</p>
      ) : (
        <ol className="flex flex-col gap-3">
          {timeline.map((e, i) => (
            <li key={i} className="flex gap-3 rounded-card border border-admin-border p-3">
              <StatusBadge tone={KIND_TONE[e.kind] ?? "neutral"}>{e.kind}</StatusBadge>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-admin-text">{e.title}</p>
                {e.detail && <p className="mt-0.5 text-sm text-admin-text-muted break-words">{e.detail}</p>}
              </div>
              <span className="shrink-0 text-xs text-admin-text-muted">{e.occurredAt ? formatDate(e.occurredAt) : "—"}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
```

(`StatusBadge` tones are `neutral | success | warning | info | danger` — all values in `KIND_TONE` are valid.)

- [ ] **Step 2: Typecheck + build**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Manual smoke (after migration; may defer to Task 7)**

Click a row on `/admin/people` → timeline lists that email's contact/newsletter/donation/game/membership events, newest first.

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/people/[email]
git commit -m "feat(identity): per-person activity timeline page"
```

---

## Task 5: Free-account CTAs on entry points

**Files:**
- Create: `src/components/members/create-account-cta.tsx`
- Modify: `src/components/sections/contact-form.tsx`
- Modify: `src/components/sections/newsletter-form.tsx`
- Modify: `src/components/support/support-panel.tsx`

**Interfaces:**
- Produces: `CreateAccountCTA({ message }: { message: string })` — a link to `/members/login`.

- [ ] **Step 1: Create the shared CTA**

Create `src/components/members/create-account-cta.tsx`:

```tsx
import Link from "next/link";
import { ArrowRight } from "lucide-react";

/** Nudge an email-only visitor to create a verified account. No auto-account. */
export function CreateAccountCTA({ message }: { message: string }) {
  return (
    <div className="mt-4 flex flex-col items-center gap-1 text-center">
      <p className="text-xs text-muted-foreground">{message}</p>
      <Link
        href="/members/login"
        className="inline-flex items-center gap-1 text-sm font-medium text-foreground hover:opacity-80"
      >
        Create your free account <ArrowRight className="size-3.5" />
      </Link>
    </div>
  );
}
```

- [ ] **Step 2: Wire into the contact success screen**

In `src/components/sections/contact-form.tsx`, add the import and render the CTA inside the `done` block (after the closing `</p>` on line ~73, before the closing `</div>`):

```tsx
import { CreateAccountCTA } from "@/components/members/create-account-cta";
```
```tsx
        <CreateAccountCTA message="Want to track this conversation and more?" />
```

- [ ] **Step 3: Wire into the newsletter success block**

In `src/components/sections/newsletter-form.tsx`, add the import and place the CTA under the success `<div role="status">` (wrap the success return in a fragment):

```tsx
import { CreateAccountCTA } from "@/components/members/create-account-cta";
```
```tsx
  if (status === "success") {
    return (
      <div className={className}>
        <div
          className="flex items-center gap-2 rounded-input border border-success/30 bg-success/8 px-4 py-3 text-sm"
          role="status"
        >
          <Check className="size-4 text-success" />
          <span>Subscribed. One signal every Tuesday — no noise.</span>
        </div>
        <CreateAccountCTA message="Manage your subscription from a free account." />
      </div>
    );
  }
```

- [ ] **Step 4: Wire into the support panel after a paid support**

In `src/components/support/support-panel.tsx`: add a `supported` state, set it on paid success, and render the CTA above the form.

Add import:
```tsx
import { CreateAccountCTA } from "@/components/members/create-account-cta";
```
Add state (near the other `useState`s):
```tsx
  const [supported, setSupported] = React.useState(false);
```
In the `outcome.status === "paid"` success branch, after the existing `toast(...)` and resets, add:
```tsx
          setSupported(true);
```
Render the CTA at the top of the returned form's parent — change the outer return to wrap the form:
```tsx
  return (
    <div className="grid gap-4">
      {supported && (
        <div className="rounded-card border border-success/30 bg-success/8 p-4">
          <p className="text-sm font-medium">Thank you for your support.</p>
          <CreateAccountCTA message="Keep track of your contributions in your dashboard." />
        </div>
      )}
      <form onSubmit={onSupport} noValidate className="grid gap-4">
        {/* …existing form body unchanged… */}
      </form>
    </div>
  );
```

- [ ] **Step 5: Typecheck + build**

Run: `npx tsc --noEmit`
Expected: no errors.
Run: `npm run lint`
Expected: clean.

- [ ] **Step 6: Manual smoke**

- Contact page: submit → success screen shows the "Create your free account" link → `/members/login`.
- Newsletter: subscribe → success block + CTA.
- Support: (if Razorpay test mode available) a paid support shows the thank-you + CTA; otherwise verify the block renders by temporarily setting `supported` initial state to `true`, confirm, then revert.

- [ ] **Step 7: Commit**

```bash
git add src/components/members/create-account-cta.tsx src/components/sections/contact-form.tsx src/components/sections/newsletter-form.tsx src/components/support/support-panel.tsx
git commit -m "feat(identity): create-free-account CTAs on contact/newsletter/support success"
```

---

## Task 6: Free-tier account surfaces (newsletter prefs + donation history)

**Files:**
- Modify: `src/lib/subscribers/queries.ts` (add `getSubscriptionStatus`)
- Modify: `src/lib/support/queries.ts` (add `getMyDonations`)
- Create: `src/lib/members/newsletter-actions.ts`
- Create: `src/components/members/newsletter-prefs.tsx`
- Modify: `src/app/members/account/page.tsx`

**Interfaces:**
- Produces:
  - `getSubscriptionStatus(email: string): Promise<"active" | "unsubscribed" | null>`
  - `getMyDonations(email: string): Promise<{ id: string; total: number; coffees: number; toffees: number; createdAt: string; message: string | null }[]>`
  - `setMyNewsletter(on: boolean): Promise<{ ok: boolean }>`
  - `NewsletterPrefs({ initialActive }: { initialActive: boolean })`

- [ ] **Step 1: Add the subscription-status query**

Append to `src/lib/subscribers/queries.ts`:

```ts
import { supabaseAdmin } from "@/lib/supabase/server";

/** Current newsletter status for an email (service-role; email base table is admin-only). */
export async function getSubscriptionStatus(email: string): Promise<"active" | "unsubscribed" | null> {
  const e = email.trim().toLowerCase();
  const { data } = await supabaseAdmin()
    .from("subscribers")
    .select("status")
    .eq("email", e)
    .maybeSingle();
  return (data?.status as "active" | "unsubscribed" | undefined) ?? null;
}
```

(Add the `supabaseAdmin` import to the existing import block if not present.)

- [ ] **Step 2: Add the donation-history query**

Append to `src/lib/support/queries.ts`:

```ts
import { supabaseAdmin } from "@/lib/supabase/server";

export type MyDonation = {
  id: string;
  total: number;
  coffees: number;
  toffees: number;
  createdAt: string;
  message: string | null;
};

/** A signed-in person's own paid supports, by email (service-role; base table is locked). */
export async function getMyDonations(email: string): Promise<MyDonation[]> {
  const e = email.trim().toLowerCase();
  const { data, error } = await supabaseAdmin()
    .from("supports")
    .select("id,total_amount,coffee_units,toffee_units,created_at,message")
    .eq("email", e)
    .eq("status", "paid")
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data.map((r) => ({
    id: String(r.id),
    total: Number(r.total_amount ?? 0),
    coffees: Number(r.coffee_units ?? 0),
    toffees: Number(r.toffee_units ?? 0),
    createdAt: String(r.created_at),
    message: (r.message as string | null) ?? null,
  }));
}
```

(`supabaseAdmin` may already be importable in this file's block — the existing code imports `supabaseAnon` from the same module; extend that import.)

- [ ] **Step 3: Add the self-scoped newsletter action**

Create `src/lib/members/newsletter-actions.ts`:

```ts
"use server";

import { getMemberContext } from "@/lib/members/session";
import { subscribe, unsubscribe } from "@/lib/subscribers/actions";

/** Toggle the CURRENT user's own newsletter subscription. Email is taken from
 *  the session, never the client — the account toggle can't touch other emails. */
export async function setMyNewsletter(on: boolean): Promise<{ ok: boolean }> {
  const { user } = await getMemberContext();
  if (!user?.email) return { ok: false };
  if (on) {
    const r = await subscribe(user.email, "members-account");
    return { ok: r.ok };
  }
  return unsubscribe(user.email);
}
```

- [ ] **Step 4: Create the client toggle**

Create `src/components/members/newsletter-prefs.tsx`:

```tsx
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { setMyNewsletter } from "@/lib/members/newsletter-actions";

export function NewsletterPrefs({ initialActive }: { initialActive: boolean }) {
  const { toast } = useToast();
  const [active, setActive] = React.useState(initialActive);
  const [loading, setLoading] = React.useState(false);

  async function toggle() {
    setLoading(true);
    const next = !active;
    const res = await setMyNewsletter(next);
    setLoading(false);
    if (!res.ok) {
      toast({ title: "Couldn't update", description: "Please try again.", variant: "danger" });
      return;
    }
    setActive(next);
    toast({ title: next ? "Subscribed" : "Unsubscribed", variant: "success" });
  }

  return (
    <div className="mt-3 flex items-center justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{active ? "You get the weekly newsletter." : "You're not subscribed."}</span>
      <Button type="button" variant="outline" size="sm" loading={loading} onClick={toggle}>
        {active ? "Unsubscribe" : "Subscribe"}
      </Button>
    </div>
  );
}
```

- [ ] **Step 5: Add both sections to the account page**

In `src/app/members/account/page.tsx`, add imports and fetch the two datasets, then render two new `<section>`s before the Session section.

Imports:
```tsx
import { getSubscriptionStatus } from "@/lib/subscribers/queries";
import { getMyDonations } from "@/lib/support/queries";
import { NewsletterPrefs } from "@/components/members/newsletter-prefs";
```
After the existing `profile` fetch, add:
```tsx
  const [subStatus, donations] = await Promise.all([
    getSubscriptionStatus(user!.email!),
    getMyDonations(user!.email!),
  ]);
```
Add these sections (before the `Session` section):
```tsx
      <section className="rounded-card border border-border bg-card p-5">
        <h2 className="text-sm font-semibold">Newsletter</h2>
        <NewsletterPrefs initialActive={subStatus === "active"} />
      </section>

      <section className="rounded-card border border-border bg-card p-5">
        <h2 className="text-sm font-semibold">Donations</h2>
        {donations.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No contributions yet.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {donations.map((d) => (
              <li key={d.id} className="flex justify-between gap-4">
                <span className="text-muted-foreground">{formatDay(d.createdAt)}</span>
                <span className="tabular-nums">INR {d.total}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
```

- [ ] **Step 6: Typecheck + build**

Run: `npx tsc --noEmit`
Expected: no errors.
Run: `npm run lint`
Expected: clean.

- [ ] **Step 7: Manual smoke**

Log in as a free (non-paying) account:
- `/members/account` loads (free is admitted). Newsletter section shows Subscribe/Unsubscribe reflecting current status; toggling flips it and persists on reload.
- Donations section lists paid supports for that email (or "No contributions yet.").

- [ ] **Step 8: Commit**

```bash
git add src/lib/subscribers/queries.ts src/lib/support/queries.ts src/lib/members/newsletter-actions.ts src/components/members/newsletter-prefs.tsx src/app/members/account/page.tsx
git commit -m "feat(identity): free-tier newsletter prefs + donation history on account"
```

---

## Task 7: Manual steps + verification + PR

**Files:** none (operational)

- [ ] **Step 1: Apply the migration**

Confirm the user has run `supabase/migrations/20260710000001_people_rpcs.sql` in their project's SQL editor (Task 1). If not, prompt them and wait.

- [ ] **Step 2: Turn on email confirmation**

Tell the user: Supabase dashboard → Authentication → Providers/Email → enable **Confirm email**. This makes every account (games + members) require a verified email — the unifier. It adds a confirm step to game signup (reverses the prior Confirm-email OFF plan).

- [ ] **Step 3: Verify free access to /members (guard already admits free)**

`requireMember` (`src/lib/members/session.ts:87`) only redirects when there is no user — it does NOT require a paid membership. So a verified free account already reaches `/members`, `/members/account`, bookmarks, and game progress; premium *content* stays gated by the capability resolver. Confirm by logging in as a free account and loading `/members`. No code change expected; if a specific sub-page blocks free users, note it and stop for a decision.

- [ ] **Step 4: Full data smoke of Task 3/4**

As admin, load `/admin/people`: real rows with badges; open a person → timeline. As a non-admin/anon, confirm no rows leak (gate raises, caught → empty).

- [ ] **Step 5: Full test + build**

Run: `npx vitest run`
Expected: all pass (includes `src/lib/people/queries.test.ts`).
Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 6: Push + open PR (do NOT deploy)**

```bash
git push -u origin feat/unified-identity-people
gh pr create --title "feat(identity): unified People identity + tiers" --body "Implements docs/superpowers/specs/2026-07-09-unified-identity-people-design.md and docs/superpowers/plans/2026-07-10-unified-identity-people.md. Pending manual: run migration 20260710000001, Supabase Confirm-email ON. No deploy."
```

Leave deploy to the user's explicit instruction.

---

## Self-Review

**Spec coverage:**
- Core model (one verified account = one profile; behaviors not types) → the whole plan; no per-type tables added. ✅
- Link by email, live join, no backfill → Task 1 RPCs (`lower(trim(email))`). ✅
- Donations as a behavior (supports) → Task 1 (badge + timeline), Task 3 (column), Task 5 (support CTA), Task 6 (donation history). ✅
- `get_people` + badge semantics (is_gamer = has game_results; plan = active else free else none) → Task 1 SQL + Task 2 `planLabel`. ✅
- `get_person_timeline` (5 sources) → Task 1. ✅
- `/admin/people` list + timeline + Audience nav → Tasks 3, 4. ✅
- Free-account CTAs (contact/newsletter/support) → Task 5. ✅
- Free-tier surfaces: guard admits free (verify), newsletter prefs, donation history → Tasks 6, 7. ✅
- Confirm-email ON → Task 7. ✅
- Edge cases (case/whitespace, anonymous donation links by email, email-only lead) → Task 1 normalization + `planLabel` "—". ✅
- Tiers unchanged → no plan/capability edits. ✅

**Placeholder scan:** no TBD/TODO; every code step shows full code. The two `StatusBadge` tone notes are explicit "confirm and map" instructions, not placeholders.

**Type consistency:** `Person`/`TimelineEntry` field names match between `queries.ts` (Task 2), `people-table.tsx` (Task 3), and the timeline page (Task 4). `planLabel` signature identical across Tasks 2–3. RPC column names match the SQL `returns table` (Task 1) and the mappers (Task 2).

**Gaps / deferred (per spec Out-of-scope):** comments/community UI, denormalized `user_id` FK, purchases/downloads timeline sources, admin email-merge — none implemented, all listed as future in the spec.
