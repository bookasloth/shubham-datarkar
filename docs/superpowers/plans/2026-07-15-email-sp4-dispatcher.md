# Email SP4 — Scheduled Dispatcher Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** One daily cron that fires the time-based branded emails: 24h introduction, Diwali greeting (2026-11-08 only), renewal reminders, we-miss-you, inactive-account, and the weekly/monthly newsletter digests — each deduped so it never double-sends.

**Architecture:** A single `GET /api/cron/email-dispatch` route (CRON_SECRET-guarded), added to `vercel.json` alongside the existing birthday cron (2 crons, within Vercel Hobby's limit — birthday keeps its own working RPC/dedupe, untouched). The route computes "today" in IST, then calls each sub-task whose date predicate matches. Dedupe uses a new `email_log(recipient, template_key, period)` unique table via claim-before-send. Every sub-task is independently try/catch-wrapped so one failure never aborts the run, and the whole thing is fail-safe if SMTP or the table is absent.

**Tech Stack:** Next.js route handler, Supabase service-role (`supabaseAdmin`, `auth.admin.listUsers`), our `sendTemplate` + catalog, vitest.

## Global Constraints

- Fail-safe + best-effort: no sub-task throws out of the dispatcher; missing `email_log` table / SMTP / query error → log and continue, HTTP 200.
- Dedupe is mandatory: claim a `(recipient, template_key, period)` row BEFORE sending; only send if the claim inserted (not a conflict). A send failure after claim is accepted (no retry) to guarantee no doubles.
- IST throughout (site's audience). Compute IST civil date from UTC + 5.5h.
- Diwali fires ONLY on IST date `2026-11-08` with festival name "Diwali". No other festival dates.
- Do NOT touch the birthday cron (`/api/cron/birthday-greetings`) or its RPCs.
- Thresholds (defaults; owner may tune): renewal reminder = within 3 days of `current_period_end`; we-miss-you = last sign-in > 30 days ago (deduped monthly); inactive = created > 7 days ago AND (never signed in OR email unconfirmed), deduped once.
- Branch: continue on `feat/emails-wiring`. Commit per task. Migration is MANUAL SQL (owner runs it) — never apply directly.
- Recipient key for `email_log` is the lowercased email (works for subscribers with no user id).

## Schema facts (verified)

- `subscribers(email, status)` — status `active|unsubscribed`; digest audience = `status='active'`.
- `posts(title, slug, status, published_at, excerpt)` — published = `status='published'` AND `published_at <= now`; blog URL `${SITE}/blog/{slug}`.
- `memberships(user_id, plan_key, status, current_period_end, source)`; plan name/amount via `membership_plans(key,name,amount,interval)`; `source='gift'` rows have no real renewal.
- `getUserEmail(userId)` (`@/lib/email/user-email`) → email.
- `auth.admin.listUsers({page,perPage})` → users with `created_at`, `last_sign_in_at`, `email_confirmed_at`, `email`, `user_metadata`.
- Catalog: `introduction({name?})`, `festival({name?,festival})`, `renewalReminder({name?,planName,renewsOn,amount?})`, `weMissYou({name?})`, `inactiveAccount({name?})`, `newBlogs({posts})`, `monthlyRoundup({monthLabel,posts})` — all in `@/lib/email/templates/*`.

## Migration (owner runs manually — include verbatim in handoff)

```sql
-- 20260715000010_email_log.sql
create table if not exists public.email_log (
  recipient     text not null,
  template_key  text not null,
  period        text not null,
  sent_at       timestamptz not null default now(),
  primary key (recipient, template_key, period)
);
alter table public.email_log enable row level security;
-- No policies: service-role only (bypasses RLS). No anon/user access.
comment on table public.email_log is 'Dedupe ledger for scheduled emails (SP4 dispatcher).';
```

## File Structure

- `supabase/migrations/20260715000010_email_log.sql` — CREATE (owner runs).
- `src/lib/email/dispatch/dedupe.ts` — CREATE: `claim(recipient, key, period)` + pure `istToday(date)` / date predicates.
- `src/lib/email/dispatch/dedupe.test.ts` — CREATE: predicate + period tests.
- `src/lib/email/dispatch/tasks.ts` — CREATE: the sub-task functions.
- `src/app/api/cron/email-dispatch/route.ts` — CREATE: guard + orchestration.
- `vercel.json` — MODIFY: add the dispatch cron.

---

### Task 1: Dispatcher core — dedupe, date logic, route skeleton

**Files:**
- Create: `src/lib/email/dispatch/dedupe.ts`
- Test: `src/lib/email/dispatch/dedupe.test.ts`
- Create: `src/app/api/cron/email-dispatch/route.ts`
- Modify: `vercel.json`
- Create (for owner): `supabase/migrations/20260715000010_email_log.sql`

**Interfaces:**
- Produces:
  - `istParts(now: Date): { date: string; dow: number; dom: number; monthLabel: string; ym: string; iso: string }` — IST civil date pieces (`date`="YYYY-MM-DD", `dow` 0=Sun..6, `dom` day-of-month, `monthLabel`="November", `ym`="YYYY-MM", `iso` week key "YYYY-Www").
  - `claim(recipient: string, templateKey: string, period: string): Promise<boolean>` — true if this send is newly claimed (insert succeeded), false if already sent or on error.

- [ ] **Step 1: Write failing tests** `src/lib/email/dispatch/dedupe.test.ts`
```ts
import { describe, it, expect } from "vitest";
import { istParts } from "./dedupe";

describe("istParts", () => {
  it("shifts UTC to IST civil date", () => {
    // 2026-11-07 20:00 UTC = 2026-11-08 01:30 IST
    const p = istParts(new Date("2026-11-07T20:00:00Z"));
    expect(p.date).toBe("2026-11-08");
    expect(p.dom).toBe(8);
    expect(p.ym).toBe("2026-11");
    expect(p.monthLabel).toBe("November");
  });
  it("late-UTC crosses into next IST day", () => {
    const p = istParts(new Date("2026-11-07T19:30:00Z")); // 01:00 IST 8th
    expect(p.date).toBe("2026-11-08");
  });
});
```

- [ ] **Step 2: Run to verify fail** — `npx vitest run src/lib/email/dispatch/dedupe.test.ts` → FAIL.

- [ ] **Step 3: Implement `dedupe.ts`**
```ts
import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

/** IST civil-date pieces from a UTC instant (IST = UTC+5:30, no DST). */
export function istParts(now: Date): { date: string; dow: number; dom: number; monthLabel: string; ym: string; iso: string } {
  const ist = new Date(now.getTime() + 5.5 * 3600 * 1000);
  const y = ist.getUTCFullYear();
  const m = ist.getUTCMonth();       // 0-11
  const d = ist.getUTCDate();
  const dow = ist.getUTCDay();       // 0=Sun
  const pad = (n: number) => String(n).padStart(2, "0");
  const date = `${y}-${pad(m + 1)}-${pad(d)}`;
  // ISO week key (approx, good enough for a dedupe period).
  const jan1 = Date.UTC(y, 0, 1);
  const week = Math.ceil(((ist.getTime() - jan1) / 86400000 + 1) / 7);
  return { date, dow, dom: d, monthLabel: MONTHS[m], ym: `${y}-${pad(m + 1)}`, iso: `${y}-W${pad(week)}` };
}

/** Claim a send. Inserts (recipient, templateKey, period); true if newly claimed. */
export async function claim(recipient: string, templateKey: string, period: string): Promise<boolean> {
  try {
    const { data, error } = await supabaseAdmin()
      .from("email_log")
      .insert({ recipient: recipient.toLowerCase(), template_key: templateKey, period })
      .select("period");
    if (error) {
      // 23505 = already sent (unique conflict) → not claimed, no log noise.
      if (error.code !== "23505") console.warn("[dispatch] claim failed:", error.message);
      return false;
    }
    return (data?.length ?? 0) > 0;
  } catch (e) {
    console.warn("[dispatch] claim threw:", (e as Error).message);
    return false;
  }
}
```

- [ ] **Step 4: Implement the route** `src/app/api/cron/email-dispatch/route.ts` (sub-task calls added in Tasks 2–3; here just the guarded skeleton)
```ts
import { NextResponse } from "next/server";
import { istParts } from "@/lib/email/dispatch/dedupe";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "Cron not configured." }, { status: 503 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const now = new Date();
  const t = istParts(now);
  const ran: Record<string, unknown> = {};
  // Sub-tasks (Tasks 2–3) are invoked here, each wrapped so one failure can't abort the run.
  return NextResponse.json({ ok: true, ist: t.date, ran });
}
```

- [ ] **Step 5: Add the cron to `vercel.json`** (keep birthday; add dispatch at 03:30 UTC = 09:00 IST)
```json
{
  "crons": [
    { "path": "/api/cron/birthday-greetings", "schedule": "0 3 * * *" },
    { "path": "/api/cron/email-dispatch", "schedule": "30 3 * * *" }
  ]
}
```

- [ ] **Step 6: Create the migration file** `supabase/migrations/20260715000010_email_log.sql` with the SQL from the Migration section above.

- [ ] **Step 7: Verify** — `npx vitest run src/lib/email/dispatch/dedupe.test.ts` (PASS) + `npx tsc --noEmit` (clean).

- [ ] **Step 8: Commit**
```bash
git add -A && git commit -m "feat(email): SP4 dispatcher core — dedupe, IST date logic, cron route + email_log migration"
```

---

### Task 2: Lifecycle sub-tasks (introduction, Diwali, renewal, we-miss-you, inactive)

**Files:**
- Create: `src/lib/email/dispatch/tasks.ts`
- Modify: `src/app/api/cron/email-dispatch/route.ts` (call the sub-tasks)

**Interfaces:**
- Consumes: `claim`, `istParts` (Task 1), `sendTemplate`, `getUserEmail`, `supabaseAdmin`, catalog `introduction`/`festival`/`renewalReminder`/`weMissYou`/`inactiveAccount`.
- Produces (each returns count sent):
  - `runIntroductions(): Promise<number>`
  - `runDiwali(t): Promise<number>`
  - `runRenewalReminders(): Promise<number>`
  - `runWeMissYou(t): Promise<number>`
  - `runInactive(): Promise<number>`

- [ ] **Step 1: Implement `tasks.ts`.** Each helper wraps its body in try/catch, sends via `sendTemplate`, claims before sending. Firstname from `user_metadata.full_name`/`name` when present, else undefined (templates greet generically). Use these concrete queries:

**Introduction** — users created 24–48h ago, once ever (`period="once"`):
```ts
export async function runIntroductions(): Promise<number> {
  let sent = 0;
  try {
    const admin = supabaseAdmin();
    const now = Date.now();
    const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    for (const u of data?.users ?? []) {
      if (!u.email || !u.created_at) continue;
      const age = now - new Date(u.created_at).getTime();
      if (age < 24 * 3600e3 || age > 48 * 3600e3) continue;
      if (!(await claim(u.email, "introduction", "once"))) continue;
      const name = (u.user_metadata?.full_name as string) || (u.user_metadata?.name as string) || null;
      if ((await sendTemplate(u.email, introduction({ name }))).ok) sent++;
    }
  } catch (e) { console.warn("[dispatch] introductions:", (e as Error).message); }
  return sent;
}
```

**Diwali** — only on `t.date === "2026-11-08"`, to active subscribers, `period="2026-11-08"`:
```ts
export async function runDiwali(t: { date: string }): Promise<number> {
  if (t.date !== "2026-11-08") return 0;
  let sent = 0;
  try {
    const { data } = await supabaseAdmin().from("subscribers").select("email").eq("status", "active");
    for (const s of data ?? []) {
      if (!s.email) continue;
      if (!(await claim(s.email, "festival", "2026-11-08"))) continue;
      if ((await sendTemplate(s.email, festival({ festival: "Diwali" }))).ok) sent++;
    }
  } catch (e) { console.warn("[dispatch] diwali:", (e as Error).message); }
  return sent;
}
```

**Renewal reminders** — active paid memberships with `current_period_end` within 3 days; `period` = that date:
```ts
export async function runRenewalReminders(): Promise<number> {
  let sent = 0;
  try {
    const admin = supabaseAdmin();
    const now = Date.now();
    const { data } = await admin.from("memberships")
      .select("user_id, plan_key, current_period_end, status, source")
      .eq("status", "active").neq("source", "gift");
    for (const m of data ?? []) {
      if (!m.current_period_end) continue;
      const end = new Date(m.current_period_end).getTime();
      const days = (end - now) / 86400e3;
      if (days < 0 || days > 3) continue;
      const email = await getUserEmail(m.user_id);
      if (!email) continue;
      const renewsOn = m.current_period_end.slice(0, 10);
      if (!(await claim(email, "renewalReminder", renewsOn))) continue;
      const { data: plan } = await admin.from("membership_plans").select("name, amount, interval").eq("key", m.plan_key).maybeSingle();
      const amount = plan?.amount ? `₹${Math.round(plan.amount / 100)}` : undefined;
      if ((await sendTemplate(email, renewalReminder({ planName: plan?.name ?? "your plan", renewsOn, amount }))).ok) sent++;
    }
  } catch (e) { console.warn("[dispatch] renewals:", (e as Error).message); }
  return sent;
}
```

**We-miss-you** — last sign-in > 30 days, deduped monthly (`period=t.ym`):
```ts
export async function runWeMissYou(t: { ym: string }): Promise<number> {
  let sent = 0;
  try {
    const admin = supabaseAdmin();
    const cutoff = Date.now() - 30 * 86400e3;
    const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    for (const u of data?.users ?? []) {
      if (!u.email || !u.last_sign_in_at) continue;
      if (new Date(u.last_sign_in_at).getTime() > cutoff) continue;
      if (!(await claim(u.email, "weMissYou", t.ym))) continue;
      const name = (u.user_metadata?.full_name as string) || null;
      if ((await sendTemplate(u.email, weMissYou({ name }))).ok) sent++;
    }
  } catch (e) { console.warn("[dispatch] we-miss-you:", (e as Error).message); }
  return sent;
}
```

**Inactive** — created > 7 days ago, never signed in OR email unconfirmed, once (`period="once"`):
```ts
export async function runInactive(): Promise<number> {
  let sent = 0;
  try {
    const admin = supabaseAdmin();
    const cutoff = Date.now() - 7 * 86400e3;
    const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    for (const u of data?.users ?? []) {
      if (!u.email || !u.created_at) continue;
      if (new Date(u.created_at).getTime() > cutoff) continue;
      const inactive = !u.last_sign_in_at || !u.email_confirmed_at;
      if (!inactive) continue;
      if (!(await claim(u.email, "inactiveAccount", "once"))) continue;
      const name = (u.user_metadata?.full_name as string) || null;
      if ((await sendTemplate(u.email, inactiveAccount({ name }))).ok) sent++;
    }
  } catch (e) { console.warn("[dispatch] inactive:", (e as Error).message); }
  return sent;
}
```

Imports at top of `tasks.ts`:
```ts
import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getUserEmail } from "@/lib/email/user-email";
import { sendTemplate } from "@/lib/email/send-template";
import { claim } from "./dedupe";
import { introduction, weMissYou, inactiveAccount, festival } from "@/lib/email/templates/engagement";
import { renewalReminder } from "@/lib/email/templates/membership";
```

- [ ] **Step 2: Wire into the route.** In `email-dispatch/route.ts`, after computing `t`, call them daily and record counts:
```ts
import { runIntroductions, runDiwali, runRenewalReminders, runWeMissYou, runInactive } from "@/lib/email/dispatch/tasks";
// ...
  ran.introductions = await runIntroductions();
  ran.diwali = await runDiwali(t);
  ran.renewals = await runRenewalReminders();
  ran.weMissYou = await runWeMissYou(t);
  ran.inactive = await runInactive();
```

- [ ] **Step 3: Verify** — `npx tsc --noEmit` (clean) + `npx eslint src/lib/email/dispatch src/app/api/cron/email-dispatch` (0). (No unit test for the query helpers — they need live data; the pure date logic is covered in Task 1.)

- [ ] **Step 4: Commit**
```bash
git add -A && git commit -m "feat(email): dispatcher lifecycle tasks — introduction, Diwali, renewal, we-miss-you, inactive"
```

---

### Task 3: Newsletter digest sub-tasks (new-blogs weekly, monthly roundup)

**Files:**
- Modify: `src/lib/email/dispatch/tasks.ts` (add two helpers)
- Modify: `src/app/api/cron/email-dispatch/route.ts` (call on the right days)

**Interfaces:**
- Produces: `runNewBlogs(t): Promise<number>` (Mondays), `runMonthlyRoundup(t): Promise<number>` (1st of month).

- [ ] **Step 1: Add helpers to `tasks.ts`.** Shared: fetch active subscriber emails; fetch published posts in a window; skip entirely if no posts.
```ts
import { newBlogs, monthlyRoundup } from "@/lib/email/templates/newsletter";

const SITE = "https://shubhamdatarkar.com";

async function activeSubscribers(): Promise<string[]> {
  const { data } = await supabaseAdmin().from("subscribers").select("email").eq("status", "active");
  return (data ?? []).map((s) => s.email).filter(Boolean);
}

async function publishedPostsSince(sinceIso: string): Promise<{ title: string; href: string; meta?: string }[]> {
  const nowIso = new Date().toISOString();
  const { data } = await supabaseAdmin().from("posts")
    .select("title, slug, published_at")
    .eq("status", "published")
    .gte("published_at", sinceIso).lte("published_at", nowIso)
    .order("published_at", { ascending: false });
  return (data ?? []).map((p) => ({ title: p.title, href: `${SITE}/blog/${p.slug}` }));
}

/** Mondays: everything published in the last 7 days → active subscribers. */
export async function runNewBlogs(t: { dow: number; iso: string }): Promise<number> {
  if (t.dow !== 1) return 0; // 1 = Monday
  let sent = 0;
  try {
    const since = new Date(Date.now() - 7 * 86400e3).toISOString();
    const posts = await publishedPostsSince(since);
    if (!posts.length) return 0;
    const email = newBlogs({ posts });
    for (const to of await activeSubscribers()) {
      if (!(await claim(to, "newBlogs", t.iso))) continue;
      if ((await sendTemplate(to, email)).ok) sent++;
    }
  } catch (e) { console.warn("[dispatch] new-blogs:", (e as Error).message); }
  return sent;
}

/** 1st of month: previous calendar month's posts → active subscribers. */
export async function runMonthlyRoundup(t: { dom: number; ym: string }): Promise<number> {
  if (t.dom !== 1) return 0;
  let sent = 0;
  try {
    const since = new Date(Date.now() - 31 * 86400e3).toISOString();
    const posts = await publishedPostsSince(since);
    if (!posts.length) return 0;
    // Label = previous month name.
    const prev = new Date(); prev.setUTCDate(1); prev.setUTCMonth(prev.getUTCMonth() - 1);
    const monthLabel = ["January","February","March","April","May","June","July","August","September","October","November","December"][prev.getUTCMonth()];
    const email = monthlyRoundup({ monthLabel, posts });
    for (const to of await activeSubscribers()) {
      if (!(await claim(to, "monthlyRoundup", t.ym))) continue;
      if ((await sendTemplate(to, email)).ok) sent++;
    }
  } catch (e) { console.warn("[dispatch] monthly-roundup:", (e as Error).message); }
  return sent;
}
```

- [ ] **Step 2: Wire into the route** after the lifecycle calls:
```ts
import { runNewBlogs, runMonthlyRoundup } from "@/lib/email/dispatch/tasks";
// ...
  ran.newBlogs = await runNewBlogs(t);
  ran.monthlyRoundup = await runMonthlyRoundup(t);
```

- [ ] **Step 3: Verify** — `npx tsc --noEmit` (clean) + `npx eslint src/lib/email/dispatch` (0) + `npx vitest run` (only the 4 pre-existing unrelated failures).

- [ ] **Step 4: Commit**
```bash
git add -A && git commit -m "feat(email): dispatcher newsletter digests — weekly new-blogs, monthly roundup"
```

---

## Deferred (documented — NOT built here)

These need game/community-specific candidate queries and live verification; build in a follow-up once the core dispatcher is confirmed working in prod. Templates already exist and are preview-ready:
- Weekly leaderboard (`weeklyLeaderboard`), Streak reminder (`streakReminder`) — need `getStreakBoard`/`getPeriodBoard` wiring + per-player opt-in.
- Community digest (`communityDigest`), Create-first-post nudge (`firstPostNudge`) — need top-post ranking + community-member list.
- Monthly member digest (`memberDigest`), New member resource (`newMemberResource`) — need `member_tools` "new this month" query + members list.

## Self-Review

**Spec coverage vs owner asks:** 24h introduction ✓ (Task 2), Diwali 2026-11-08 only ✓ (Task 2, hard-coded date, no other festivals), renewal/we-miss-you/inactive ✓ (Task 2), new-blogs + monthly roundup ✓ (Task 3). Birthday untouched (separate cron). Game/community digests explicitly deferred with rationale.

**Type consistency:** `istParts` return shape (`date/dow/dom/monthLabel/ym/iso`) consumed identically across tasks. `claim(recipient, templateKey, period)` used uniformly. Catalog calls match SP1/owner-copy signatures (`festival({festival})`, `renewalReminder({planName,renewsOn,amount?})`, `newBlogs({posts})`, `monthlyRoundup({monthLabel,posts})`).

**Dedupe correctness:** claim-before-send with unique PK `(recipient, template_key, period)`; conflict → skip. Periods chosen so each email recurs at the intended cadence (introduction/inactive `once`; we-miss-you monthly `ym`; renewal per end-date; Diwali the date; new-blogs weekly `iso`; roundup monthly `ym`).

**Risk / open verification for the implementer + owner:**
- `listUsers({perPage:1000})` covers ≤1000 users (page 1 only). Fine now; add pagination when the base grows — logged as a known cap, not silent.
- All candidate queries are unverifiable without live data; each sub-task is try/catch-isolated so a schema mismatch logs and skips rather than breaking the cron. Owner verifies live after the migration runs + deploy.
- Digest broadcasts loop per-subscriber with no throttle; fine for a modest list, but a large list may hit Hostinger SMTP rate limits — revisit with batching / an ESP if the list grows.
