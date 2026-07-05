# Admin UI Redesign — PR3: Dashboard (real data + perf) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Rebuild the `/admin` dashboard on the new design system — KPI widgets + recent-activity rails + quick actions — using ONLY data that already exists, and fix its performance by fetching everything in parallel and reusing each result (no double-fetch, no new queries).

**Architecture:** A small pure helper computes post-status counts (unit-tested). Two presentational widgets (`KPIWidget`, `RecentCard`) render the grid + rails using PR1 admin primitives + tokens. The page fetches all six data sources in one `Promise.all`, then derives KPIs and recent lists from those arrays.

**Tech Stack:** Next.js 16 App Router (server component page), React 19, TS, Tailwind v4, PR1 admin primitives, lucide-react, Vitest.

## Global Constraints

- ADDITIVE / UI-only: no new DB queries, no changes to `src/lib/**` query modules, no API/route/schema/auth changes. The ONLY existing file modified is `src/app/admin/page.tsx`.
- Real data only — no invented metrics. KPIs and rails come strictly from existing functions: `getAllPostsAdmin`, `getSubscribers`, `countEntities`, `getPaymentStats`, `getRecentSupports`, `getContacts`.
- Perf: replace the current sequential awaits with a single `Promise.all`; reuse each fetched array for both its count and its recent list (one round-trip per source). Keep `export const dynamic = "force-dynamic"` (admin is auth-gated; ISR does not apply).
- Money formatting: reuse the exact INR formatter the payments admin page uses — `new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })`. `raised`/`thisMonth` are already rupee amounts.
- Styling: admin tokens only (`bg-admin-*`, `text-admin-*`, `border-admin-*`); PR1 primitives (`AdminCard`, `StatusBadge`, `AdminButton`). Orange only on interaction/emphasis (95/5). Transitions ≤150ms border/opacity. Dark mode inherited. The page renders inside the PR2 shell's `[data-admin]` — no extra wrapper needed.
- Branch from `origin/main` tip (cf02593). PR title: `feat(admin): dashboard — real-data KPIs + activity (redesign PR3)`.

## Scope decisions (documented)

- **No mini-chart.** The spec listed an optional sparkline "where useful". There is no time-series data available without new aggregation queries, so a chart would be fabricated shape. Omitted (YAGNI); revisit if/when a real series exists.
- **Contacts count uses `getContacts(1000)`.** `getContacts` takes a limit; there is no count() helper and we are not adding one. 1000 is far above this founder site's contact volume, so `.length` is an accurate count in practice; a code comment notes the cap. Its result doubles as the "recent contacts" source (single fetch).

## File Structure

**Create:**
- `src/components/admin/widgets/kpi-widget.tsx` — `KPIWidget`.
- `src/components/admin/widgets/recent-card.tsx` — `RecentCard`.
- `src/components/admin/widgets/index.ts` — barrel.
- `src/components/admin/widgets/dashboard-summary.ts` — pure `postStatusCounts`.
- `src/components/admin/widgets/__tests__/dashboard-summary.test.ts`.

**Modify:**
- `src/app/admin/page.tsx` — parallel fetch + new layout.

---

## Task 1: Pure summary helper + test

**Files:**
- Create: `src/components/admin/widgets/dashboard-summary.ts`
- Test: `src/components/admin/widgets/__tests__/dashboard-summary.test.ts`

**Interfaces:**
- Produces: `postStatusCounts(posts: { status: string }[]): { published: number; drafts: number; scheduled: number }`.

- [ ] **Step 1: Write failing test**

`src/components/admin/widgets/__tests__/dashboard-summary.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { postStatusCounts } from "@/components/admin/widgets/dashboard-summary";

describe("postStatusCounts", () => {
  it("counts each status", () => {
    const posts = [
      { status: "published" }, { status: "published" },
      { status: "draft" }, { status: "scheduled" },
      { status: "archived" }, // unknown statuses ignored
    ];
    expect(postStatusCounts(posts)).toEqual({ published: 2, drafts: 1, scheduled: 1 });
  });
  it("handles empty", () => {
    expect(postStatusCounts([])).toEqual({ published: 0, drafts: 0, scheduled: 0 });
  });
});
```

- [ ] **Step 2: Run — expect FAIL.** `npx vitest run src/components/admin/widgets/__tests__/dashboard-summary.test.ts`

- [ ] **Step 3: Implement**

`src/components/admin/widgets/dashboard-summary.ts`:

```ts
/** Tally post statuses for the dashboard KPIs. Unknown statuses are ignored. */
export function postStatusCounts(
  posts: { status: string }[],
): { published: number; drafts: number; scheduled: number } {
  let published = 0, drafts = 0, scheduled = 0;
  for (const p of posts) {
    if (p.status === "published") published++;
    else if (p.status === "draft") drafts++;
    else if (p.status === "scheduled") scheduled++;
  }
  return { published, drafts, scheduled };
}
```

- [ ] **Step 4: Run — expect PASS.** Then `npx vitest run` (full suite, no regressions).

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/widgets/dashboard-summary.ts src/components/admin/widgets/__tests__/dashboard-summary.test.ts
git commit -m "feat(admin): dashboard post-status summary helper"
```

---

## Task 2: KPIWidget + RecentCard + barrel

**Files:**
- Create: `src/components/admin/widgets/kpi-widget.tsx`
- Create: `src/components/admin/widgets/recent-card.tsx`
- Create: `src/components/admin/widgets/index.ts`

**Interfaces:**
- `KPIWidget(props: { label: string; value: string | number; hint?: string; icon?: React.ReactNode; href?: string })` — renders an `AdminCard` (interactive when `href`) wrapped in a `Link` if `href`. Big value, muted label, optional hint + icon.
- `RecentCard(props: { title: string; viewAllHref?: string; isEmpty?: boolean; emptyLabel?: string; children?: React.ReactNode })` — titled `AdminCard` with a header (title + optional "View all" link) and a list body or an empty message.

- [ ] **Step 1: Implement `kpi-widget.tsx`**

```tsx
import Link from "next/link";
import { AdminCard } from "@/components/admin";

export function KPIWidget({
  label,
  value,
  hint,
  icon,
  href,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: React.ReactNode;
  href?: string;
}) {
  const card = (
    <AdminCard interactive={!!href} className="h-full">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-admin-text-muted">{label}</p>
        {icon && <span className="text-admin-text-muted [&_svg]:size-4">{icon}</span>}
      </div>
      <p className="mt-2 text-2xl font-bold text-admin-text">{value}</p>
      {hint && <p className="mt-1 text-xs text-admin-text-muted">{hint}</p>}
    </AdminCard>
  );
  return href ? (
    <Link href={href} className="block outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-admin-accent rounded-card">
      {card}
    </Link>
  ) : (
    card
  );
}
```

- [ ] **Step 2: Implement `recent-card.tsx`**

```tsx
import Link from "next/link";
import { AdminCard } from "@/components/admin";

export function RecentCard({
  title,
  viewAllHref,
  isEmpty,
  emptyLabel = "Nothing yet.",
  children,
}: {
  title: string;
  viewAllHref?: string;
  isEmpty?: boolean;
  emptyLabel?: string;
  children?: React.ReactNode;
}) {
  return (
    <AdminCard className="flex flex-col p-0">
      <div className="flex items-center justify-between border-b border-admin-border px-4 py-3">
        <h2 className="text-sm font-semibold text-admin-text">{title}</h2>
        {viewAllHref && (
          <Link
            href={viewAllHref}
            className="text-xs text-admin-text-muted transition-[color] duration-150 hover:text-admin-accent"
          >
            View all
          </Link>
        )}
      </div>
      {isEmpty ? (
        <p className="px-4 py-8 text-center text-sm text-admin-text-muted">{emptyLabel}</p>
      ) : (
        <ul className="divide-y divide-admin-border">{children}</ul>
      )}
    </AdminCard>
  );
}
```

- [ ] **Step 3: Implement `index.ts`**

```ts
export { KPIWidget } from "./kpi-widget";
export { RecentCard } from "./recent-card";
export { postStatusCounts } from "./dashboard-summary";
```

- [ ] **Step 4: Typecheck** — `npx tsc --noEmit`.

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/widgets/kpi-widget.tsx src/components/admin/widgets/recent-card.tsx src/components/admin/widgets/index.ts
git commit -m "feat(admin): KPIWidget + RecentCard dashboard widgets"
```

---

## Task 3: Dashboard page rewrite (parallel fetch + real data)

**Files:**
- Modify: `src/app/admin/page.tsx`

**Interfaces:**
- Consumes: `getAllPostsAdmin` (`@/lib/blog/queries`), `getSubscribers` (`@/lib/subscribers/queries`), `countEntities` + `ENTITY_LIST` (`@/lib/content/*`), `getPaymentStats` + `getRecentSupports` (`@/lib/payments/queries`), `getContacts` (`@/lib/contact/queries`), `postStatusCounts` + widgets, PR1 primitives, `formatDate` (`@/lib/utils`).

- [ ] **Step 1: Rewrite `src/app/admin/page.tsx`**

```tsx
import Link from "next/link";
import { getAllPostsAdmin } from "@/lib/blog/queries";
import { getSubscribers } from "@/lib/subscribers/queries";
import { countEntities } from "@/lib/content/queries";
import { getPaymentStats, getRecentSupports } from "@/lib/payments/queries";
import { getContacts } from "@/lib/contact/queries";
import { ENTITY_LIST } from "@/lib/content/registry";
import { formatDate } from "@/lib/utils";
import { AdminButton, StatusBadge } from "@/components/admin";
import { KPIWidget, RecentCard, postStatusCounts } from "@/components/admin/widgets";

export const dynamic = "force-dynamic";

const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

const postTone = (s: string) =>
  s === "published" ? "success" : s === "scheduled" ? "info" : "neutral";
const supportTone = (s: string) =>
  s === "paid" ? "success" : s === "failed" ? "danger" : "warning";

export default async function AdminDashboardPage() {
  // One parallel batch; each array is reused for both its count and its recent list.
  const [posts, subscribers, payments, recentSupports, contacts, entityCounts] = await Promise.all([
    getAllPostsAdmin(),
    getSubscribers(),
    getPaymentStats(),
    getRecentSupports(5),
    getContacts(1000), // no count() helper; 1000 >> real contact volume, so length is accurate
    Promise.all(ENTITY_LIST.map(async (e) => ({ def: e, count: await countEntities(e.table) }))),
  ]);

  const { published, drafts, scheduled } = postStatusCounts(posts);
  const recentPosts = [...posts]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);
  const recentSubs = subscribers.slice(0, 5);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight text-admin-text">Dashboard</h1>
        <div className="flex gap-2">
          <AdminButton asChild size="sm"><Link href="/admin/posts/new">New post</Link></AdminButton>
          <AdminButton asChild size="sm" variant="secondary"><Link href="/admin/updates/new">New update</Link></AdminButton>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KPIWidget label="Published" value={published} href="/admin/posts" />
        <KPIWidget label="Drafts" value={drafts} href="/admin/posts" />
        <KPIWidget label="Scheduled" value={scheduled} href="/admin/posts" />
        <KPIWidget label="Subscribers" value={subscribers.length} href="/admin/subscribers" />
        <KPIWidget label="Contacts" value={contacts.length} href="/admin/contacts" />
        <KPIWidget label="Paid supports" value={payments.paidCount} href="/admin/payments" />
        <KPIWidget label="Total raised" value={inr(payments.raised)} href="/admin/payments" />
        <KPIWidget label="This month" value={inr(payments.thisMonth)} hint="Paid this calendar month" href="/admin/payments" />
      </div>

      {/* Content entity counts */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {entityCounts.map(({ def, count }) => (
          <KPIWidget key={def.key} label={def.label} value={count} href={`/admin/content/${def.key}`} />
        ))}
      </div>

      {/* Recent activity */}
      <div className="grid gap-4 lg:grid-cols-3">
        <RecentCard title="Recent posts" viewAllHref="/admin/posts" isEmpty={recentPosts.length === 0}>
          {recentPosts.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
              <Link href="/admin/posts" className="min-w-0 flex-1 truncate text-sm text-admin-text hover:text-admin-accent">
                {p.title}
              </Link>
              <StatusBadge tone={postTone(p.status)}>{p.status}</StatusBadge>
            </li>
          ))}
        </RecentCard>

        <RecentCard title="Recent subscribers" viewAllHref="/admin/subscribers" isEmpty={recentSubs.length === 0}>
          {recentSubs.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
              <span className="min-w-0 flex-1 truncate text-sm text-admin-text">{s.email}</span>
              <span className="shrink-0 text-xs text-admin-text-muted">{formatDate(s.createdAt)}</span>
            </li>
          ))}
        </RecentCard>

        <RecentCard title="Recent supports" viewAllHref="/admin/payments" isEmpty={recentSupports.length === 0}>
          {recentSupports.map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
              <span className="min-w-0 flex-1 truncate text-sm text-admin-text">{t.name || t.email}</span>
              <span className="flex shrink-0 items-center gap-2">
                <span className="text-xs text-admin-text-muted">{inr(t.total)}</span>
                <StatusBadge tone={supportTone(t.status)}>{t.status}</StatusBadge>
              </span>
            </li>
          ))}
        </RecentCard>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify `AdminButton` supports `asChild`.** It does (PR1 — CVA + Slot). If typecheck flags `asChild`, check the PR1 `AdminButton` signature and adjust the usage to match (it accepts `asChild?: boolean`).

- [ ] **Step 3: Typecheck + tests** — `npx tsc --noEmit && npx vitest run` (clean; all tests pass).

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/page.tsx
git commit -m "feat(admin): rebuild dashboard on real data with parallel fetch"
```

---

## Task 4: Build verification

- [ ] **Step 1: Production build** — `npm run build`. Expected: exit 0, "Compiled successfully", `/admin` present in the route manifest (as ƒ dynamic). If it fails, read the error, fix genuine integration issues (wrong field name, missing export), rebuild.

- [ ] **Step 2: Confirm no data-shape mismatch.** Grep the build log for type errors. The page uses these fields — confirm they exist (they were verified during planning): `AdminPostRow.{id,title,status,updatedAt}`, `Subscriber.{id,email,createdAt}`, `SupportTxn.{id,name,email,total,status}`, `Contact[]` length, `PaymentStats.{paidCount,raised,thisMonth}`.

- [ ] **Step 3: Commit (only if a fix was needed in Step 1).**

---

## Self-Review

- Real-data only: every KPI/rail sourced from an existing query; no invented metrics; no mini-chart fabricated. ✓
- Perf: single `Promise.all` (was 4 sequential awaits); each array reused for count + recent list; no new queries; `force-dynamic` retained (auth-gated). ✓
- Feature parity: dashboard still surfaces posts (by status), content entity counts, subscribers, payments — plus new contacts + recent activity. Nothing removed. ✓
- Money: reuses payments-page INR formatter (correct unit). ✓
- Tokens/primitives: admin tokens + PR1 primitives only; orange 95/5; ≤150ms. ✓
- Tests: `postStatusCounts` pure-unit-tested (real assertions). Widgets/page verified via typecheck + build (auth-gated page can't be previewed unauthenticated). ✓
- Scope: only `src/app/admin/page.tsx` modified; everything else additive. ✓
- Contacts count cap (1000) documented in code. ✓
