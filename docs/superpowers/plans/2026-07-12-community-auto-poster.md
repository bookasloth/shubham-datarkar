# Community Auto-Poster Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Auto-post site events (content published, PR merged, new supporter, growth milestones) to the `/community` feed as owner-authored posts, worded from rotating template pools.

**Architecture:** One small engine — `autoPost({ sourceKey, body })` inserts a `community_posts` row authored by the owner, idempotent via a unique `auto_key`. Five thin triggers feed it: on-publish content hooks, the support confirm route, a Postgres `profiles` trigger (community size), and a new GitHub webhook route. Copy comes from ≥10-string template pools so it reads human.

**Tech Stack:** Next.js (App Router, server actions + route handlers), Supabase (Postgres + service-role admin client), TypeScript, Vitest, `node:crypto`.

## Global Constraints

- **Read the bundled Next.js docs before writing route/server-action code** — `node_modules/next/dist/docs/` (AGENTS.md: this Next.js has breaking changes). Verify route-handler + `revalidatePath` usage there.
- **Manual SQL workflow:** write the migration file; hand the user the SQL to run in the Supabase SQL editor. NEVER apply migrations directly. Target the OWN Supabase project, not BAS.
- **Branch + PR flow:** all work on `feat/community-auto-poster` (already created from `origin/main`); never commit to `main`.
- **No emojis, monochrome tone** in all copy — match existing `thankyou-messages.ts` house style.
- **`community_posts.body` max length is 500 chars** (DB check) — slice before insert.
- **Best-effort/guarded:** an auto-post failure must NEVER break the host action (publishing, payment confirm). Wrap in try/catch that only logs.
- **Owner email literal** in SQL is `bookasloth@gmail.com` (matches `is_admin()` in `20260614000002_admin_auth.sql`). The app maps the owner via `ADMIN_EMAIL` env.
- **Idempotency** is by unique `auto_key`; the JS client can't do `ON CONFLICT`, so catch Postgres error code `23505` (unique_violation) and treat it as success — same pattern as `insertUpdate` in `src/lib/support/updates.ts`.

---

## File Structure

**Create:**
- `supabase/migrations/20260712000004_community_auto_poster.sql` — `auto_key` column + unique index, `community_owner_id()` fn, `profiles` community-size milestone trigger + SQL template array.
- `src/lib/community/auto/templates.ts` — template pools + `pick(kind, vars)`.
- `src/lib/community/auto/templates.test.ts`
- `src/lib/community/auto/pr.ts` — `parsePrTitle`, `shouldAnnounce`, `humanizeSubject`.
- `src/lib/community/auto/pr.test.ts`
- `src/lib/community/auto/github-verify.ts` — `verifyGithubSignature`.
- `src/lib/community/auto/github-verify.test.ts`
- `src/lib/community/auto/owner.ts` — `getOwnerProfileId()`.
- `src/lib/community/auto/post.ts` — `autoPost({ sourceKey, body })`.
- `src/lib/community/auto/supporter.ts` — `postCommunitySupporter(support)`, `supporterMilestoneFor(count)`.
- `src/lib/community/auto/supporter.test.ts`
- `src/app/api/community/github/route.ts` — the webhook.

**Modify:**
- `src/app/api/support/confirm/route.ts` — one call after `postThankyou`.
- `src/lib/blog/actions.ts` — auto-post on live publish (createPost + updatePost).
- `src/lib/content/actions.ts` — auto-post on published case study (createEntity + updateEntity).
- `src/lib/support/updates.ts` — cross-post non-thankyou updates from `insertUpdate`.
- `.env.example` — add `GITHUB_WEBHOOK_SECRET`.

---

## Task 1: Migration — `auto_key`, owner resolver, community-size trigger

**Files:**
- Create: `supabase/migrations/20260712000004_community_auto_poster.sql`

**Interfaces:**
- Produces (SQL, callable from TS via `supabaseAdmin().rpc(...)` and from the trigger): `public.community_owner_id() returns uuid`.
- Produces: `community_posts.auto_key text` + unique index `community_posts_auto_key_key`.

- [ ] **Step 1: Write the migration file**

```sql
-- =====================================================================
-- /community auto-poster: idempotency key, owner resolver, size milestone.
-- Target: OWN Supabase (NOT the BAS project). Apply MANUALLY via SQL editor.
-- Idempotent — safe to re-run.
-- =====================================================================

-- ---------- idempotency: one auto-post per source event ----------
alter table public.community_posts add column if not exists auto_key text;
-- Nullable + unique: manual posts leave it null (Postgres allows many nulls);
-- auto-posts set a stable key so retries/re-saves can't double-post.
create unique index if not exists community_posts_auto_key_key
  on public.community_posts (auto_key) where auto_key is not null;

-- ---------- owner profile id (single source of truth) ----------
-- Same admin email literal as public.is_admin(). security definer so it can
-- read auth.users from the trigger and from the service-role client.
create or replace function public.community_owner_id()
returns uuid language sql stable security definer set search_path = public as $$
  select p.id
  from public.profiles p
  join auth.users u on u.id = p.id
  where lower(u.email) = 'bookasloth@gmail.com'
  limit 1;
$$;
grant execute on function public.community_owner_id() to anon, authenticated, service_role;

-- ---------- community-size milestone (signup has no app hook) ----------
-- handle_new_user() creates a profile per signup via a DB trigger, so this
-- milestone must also live in the DB. On crossing a threshold exactly, insert
-- one owner-authored post. auto_key + the unique index make it fire once.
create or replace function public.community_size_milestone()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  n        int;
  owner_id uuid;
  msgs     text[] := array[
    'The community just crossed {n} members. Glad you''re all here.',
    'We just hit {n} members. Thanks for being part of this.',
    '{n} people in the community now. Welcome, all of you.',
    'Milestone: {n} members strong.',
    'Just passed {n} members. This is growing into something.',
    '{n} of us here now. Grateful for every one.',
    'The community reached {n} members today.',
    'Officially {n} members. Thanks for showing up.',
    '{n} members and counting. Welcome aboard.',
    'We are now {n} strong. Good to have you here.'
  ];
  body text;
begin
  select count(*) into n from public.profiles;
  if n not in (10, 25, 50, 100, 250, 500, 1000) then
    return null;
  end if;
  owner_id := public.community_owner_id();
  if owner_id is null then
    return null;
  end if;
  body := replace(msgs[1 + floor(random() * array_length(msgs, 1))::int], '{n}', n::text);
  insert into public.community_posts (user_id, type, body, auto_key)
  values (owner_id, 'text', body, 'member-milestone:' || n)
  on conflict (auto_key) do nothing;
  return null;
end $$;

drop trigger if exists community_size_milestone_trg on public.profiles;
create trigger community_size_milestone_trg
  after insert on public.profiles
  for each row execute function public.community_size_milestone();
```

- [ ] **Step 2: Hand the SQL to the user to run**

Tell the user: "Run `supabase/migrations/20260712000004_community_auto_poster.sql` in your OWN Supabase SQL editor." Do NOT apply it automatically.

- [ ] **Step 3: Verification SELECT (user runs after applying)**

```sql
-- Column + index present:
select 1 from information_schema.columns
  where table_name='community_posts' and column_name='auto_key';
-- Owner resolves to a real profile (should return one uuid):
select public.community_owner_id();
```
Expected: the column row exists; `community_owner_id()` returns a non-null uuid. If it returns null, the admin has no `profiles` row / email mismatch — fix before the app can post.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260712000004_community_auto_poster.sql
git commit -m "feat(community): migration — auto_key, owner resolver, size milestone"
```

---

## Task 2: Template pools + `pick`

**Files:**
- Create: `src/lib/community/auto/templates.ts`
- Test: `src/lib/community/auto/templates.test.ts`

**Interfaces:**
- Produces: `type AutoKind = "blog" | "caseStudy" | "update" | "supporter" | "supporterMilestone" | "pr"`
- Produces: `pick(kind: AutoKind, vars?: { title?: string; url?: string; n?: number }): string`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { pick, type AutoKind } from "./templates";

const KINDS: AutoKind[] = ["blog", "caseStudy", "update", "supporter", "supporterMilestone", "pr"];

describe("auto templates", () => {
  it("fills placeholders and leaves none behind", () => {
    for (const kind of KINDS) {
      for (let i = 0; i < 40; i++) {
        const out = pick(kind, { title: "My Title", url: "https://x.test/y", n: 50 });
        expect(out.length).toBeGreaterThan(0);
        expect(out).not.toMatch(/\{(title|url|n)\}/);
        expect(out.length).toBeLessThanOrEqual(500);
      }
    }
  });

  it("uses the interpolated values", () => {
    const out = pick("supporterMilestone", { url: "https://x.test/support", n: 25 });
    expect(out).toContain("25");
    expect(out).toContain("https://x.test/support");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/community/auto/templates.test.ts`
Expected: FAIL — cannot find module `./templates`.

- [ ] **Step 3: Write the implementation**

```ts
/**
 * Template pools for auto-posts to /community. >=10 per kind so the feed reads
 * human, not robotic. Pure (only node:crypto) — unit-testable directly. Mirrors
 * the structure of src/lib/support/thankyou-messages.ts. No emojis (house style).
 */
import { randomInt } from "node:crypto";

export type AutoKind = "blog" | "caseStudy" | "update" | "supporter" | "supporterMilestone" | "pr";

const BLOG: readonly string[] = [
  "New on the blog: {title}. {url}",
  "Just published: {title}. Read it here — {url}",
  "Fresh post is live: {title}. {url}",
  "Wrote something new: {title}. {url}",
  "New writing up now: {title}. {url}",
  "Out today on the blog: {title}. {url}",
  "Latest post: {title}. Have a read — {url}",
  "Published a new one: {title}. {url}",
  "New article live: {title}. {url}",
  "Hot off the keyboard: {title}. {url}",
] as const;

const CASE_STUDY: readonly string[] = [
  "New case study: {title}. {url}",
  "Just shipped a case study: {title}. {url}",
  "Behind a recent project: {title}. {url}",
  "New work written up: {title}. {url}",
  "Case study live now: {title}. {url}",
  "How it actually went: {title}. {url}",
  "New breakdown up: {title}. {url}",
  "Latest case study: {title}. {url}",
  "Published a project deep-dive: {title}. {url}",
  "New results, documented: {title}. {url}",
] as const;

const UPDATE: readonly string[] = [
  "From the build log: {title} {url}",
  "Small update from behind the scenes: {title} {url}",
  "Building in public: {title} {url}",
  "Progress note: {title} {url}",
  "What I shipped recently: {title} {url}",
  "Quick update: {title} {url}",
  "Latest from the workshop: {title} {url}",
  "Build-in-public log: {title} {url}",
  "New update posted: {title} {url}",
  "Here is where things are: {title} {url}",
] as const;

const SUPPORTER: readonly string[] = [
  "Someone just supported the work. Thank you. You can too: {url}",
  "A new supporter just backed the work. Grateful. Join them: {url}",
  "Just got some support from a kind stranger. Thank you. {url}",
  "Another quiet supporter stepped up today. You can too: {url}",
  "Someone believed enough to chip in. Thank you. {url}",
  "Fresh support just landed. Deeply grateful. Back the work: {url}",
  "A generous someone just supported this. Thank you. {url}",
  "New backer on board today. Grateful. Support here: {url}",
  "Someone just kept the lights on a little longer. Thank you. {url}",
  "Just received support from one of you. It means a lot. {url}",
] as const;

const SUPPORTER_MILESTONE: readonly string[] = [
  "{n} people have now supported the work. Thank you, all of you. {url}",
  "Just crossed {n} supporters. Grateful for every one. {url}",
  "{n} supporters and counting. You keep this going. {url}",
  "Milestone: {n} people have backed the work. Thank you. {url}",
  "We just hit {n} supporters. Humbled. Join them: {url}",
  "{n} of you have supported this so far. Thank you. {url}",
  "Officially past {n} supporters. Grateful beyond words. {url}",
  "{n} supporters strong. Every one matters. {url}",
  "Just reached {n} people backing the work. Thank you. {url}",
  "{n} supporters in. This community is something else. {url}",
] as const;

const PR: readonly string[] = [
  "Just shipped: {title}.",
  "New on the site: {title}.",
  "Shipped something: {title}.",
  "Just pushed live: {title}.",
  "New update to the platform: {title}.",
  "Improved something today: {title}.",
  "Just landed: {title}.",
  "Fresh change is live: {title}.",
  "Shipped an update: {title}.",
  "New: {title}.",
] as const;

const POOLS: Record<AutoKind, readonly string[]> = {
  blog: BLOG,
  caseStudy: CASE_STUDY,
  update: UPDATE,
  supporter: SUPPORTER,
  supporterMilestone: SUPPORTER_MILESTONE,
  pr: PR,
};

/** Random template for `kind`, placeholders filled. Trimmed, never > 500 chars. */
export function pick(kind: AutoKind, vars: { title?: string; url?: string; n?: number } = {}): string {
  const pool = POOLS[kind];
  const out = pool[randomInt(0, pool.length)]
    .replaceAll("{title}", vars.title ?? "")
    .replaceAll("{url}", vars.url ?? "")
    .replaceAll("{n}", vars.n === undefined ? "" : String(vars.n))
    .trim();
  return out.slice(0, 500);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/community/auto/templates.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/community/auto/templates.ts src/lib/community/auto/templates.test.ts
git commit -m "feat(community): auto-post template pools"
```

---

## Task 3: Webhook pure helpers — PR parser + signature verify

**Files:**
- Create: `src/lib/community/auto/pr.ts`, `src/lib/community/auto/github-verify.ts`
- Test: `src/lib/community/auto/pr.test.ts`, `src/lib/community/auto/github-verify.test.ts`

**Interfaces:**
- Produces: `parsePrTitle(title: string): { type: string | null; scope: string | null; subject: string }`
- Produces: `shouldAnnounce(title: string, labels: string[]): boolean`
- Produces: `humanizeSubject(subject: string): string`
- Produces: `verifyGithubSignature(secret: string, payload: string, header: string | null): boolean`

- [ ] **Step 1: Write the failing tests**

`src/lib/community/auto/pr.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { parsePrTitle, shouldAnnounce, humanizeSubject } from "./pr";

describe("parsePrTitle", () => {
  it("splits type, scope, subject", () => {
    expect(parsePrTitle("feat(community): welcome header")).toEqual({
      type: "feat", scope: "community", subject: "welcome header",
    });
  });
  it("handles no scope", () => {
    expect(parsePrTitle("fix: broken link")).toEqual({ type: "fix", scope: null, subject: "broken link" });
  });
  it("falls back when unconventional", () => {
    expect(parsePrTitle("random title")).toEqual({ type: null, scope: null, subject: "random title" });
  });
});

describe("shouldAnnounce", () => {
  it("announces user-facing types", () => {
    expect(shouldAnnounce("feat(community): x", [])).toBe(true);
    expect(shouldAnnounce("fix(games): y", [])).toBe(true);
    expect(shouldAnnounce("chore(services): update prices", [])).toBe(true);
  });
  it("skips non-user-facing scopes and types", () => {
    expect(shouldAnnounce("chore(deps): bump lodash", [])).toBe(false);
    expect(shouldAnnounce("docs: readme", [])).toBe(false);
    expect(shouldAnnounce("refactor(auth): tidy", [])).toBe(false);
    expect(shouldAnnounce("random title", [])).toBe(false);
  });
  it("kill switch: no-announce label suppresses", () => {
    expect(shouldAnnounce("feat(community): x", ["no-announce"])).toBe(false);
    expect(shouldAnnounce("feat(community): x", ["No-Announce"])).toBe(false);
  });
});

describe("humanizeSubject", () => {
  it("capitalizes the first letter", () => {
    expect(humanizeSubject("welcome header")).toBe("Welcome header");
  });
});
```

`src/lib/community/auto/github-verify.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { createHmac } from "node:crypto";
import { verifyGithubSignature } from "./github-verify";

const secret = "s3cr3t";
const payload = '{"hello":"world"}';
const good = "sha256=" + createHmac("sha256", secret).update(payload).digest("hex");

describe("verifyGithubSignature", () => {
  it("accepts a correct signature", () => {
    expect(verifyGithubSignature(secret, payload, good)).toBe(true);
  });
  it("rejects a wrong signature", () => {
    expect(verifyGithubSignature(secret, payload, "sha256=deadbeef")).toBe(false);
  });
  it("rejects a missing header", () => {
    expect(verifyGithubSignature(secret, payload, null)).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/community/auto/pr.test.ts src/lib/community/auto/github-verify.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Write the implementations**

`src/lib/community/auto/pr.ts`:
```ts
/**
 * Conventional-commit parsing + the "is this PR worth announcing" heuristic.
 * Pure — unit-testable directly. Announce feat/fix/perf/chore; skip noise
 * scopes; a `no-announce` label is a hard kill switch.
 */
const ANNOUNCE_TYPES = new Set(["feat", "fix", "perf", "chore"]);
const SKIP_SCOPES = new Set(["deps", "ci", "build", "test", "docs", "refactor", "style"]);

export function parsePrTitle(title: string): { type: string | null; scope: string | null; subject: string } {
  const m = title.trim().match(/^(\w+)(?:\(([^)]+)\))?!?:\s*(.+)$/);
  if (!m) return { type: null, scope: null, subject: title.trim() };
  return { type: m[1].toLowerCase(), scope: m[2] ? m[2].toLowerCase() : null, subject: m[3].trim() };
}

export function shouldAnnounce(title: string, labels: string[]): boolean {
  if (labels.some((l) => l.toLowerCase() === "no-announce")) return false;
  const { type, scope } = parsePrTitle(title);
  if (!type || !ANNOUNCE_TYPES.has(type)) return false;
  if (scope && SKIP_SCOPES.has(scope)) return false;
  return true;
}

export function humanizeSubject(subject: string): string {
  const s = subject.trim();
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}
```

`src/lib/community/auto/github-verify.ts`:
```ts
import { createHmac, timingSafeEqual } from "node:crypto";

/** Constant-time verify of GitHub's X-Hub-Signature-256 header. */
export function verifyGithubSignature(secret: string, payload: string, header: string | null): boolean {
  if (!header) return false;
  const expected = "sha256=" + createHmac("sha256", secret).update(payload).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(header);
  return a.length === b.length && timingSafeEqual(a, b);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/community/auto/pr.test.ts src/lib/community/auto/github-verify.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add src/lib/community/auto/pr.ts src/lib/community/auto/pr.test.ts src/lib/community/auto/github-verify.ts src/lib/community/auto/github-verify.test.ts
git commit -m "feat(community): PR heuristic + webhook signature verify"
```

---

## Task 4: Auto-post engine — owner resolver + `autoPost`

**Files:**
- Create: `src/lib/community/auto/owner.ts`, `src/lib/community/auto/post.ts`

**Interfaces:**
- Consumes: `community_owner_id()` RPC (Task 1), `supabaseAdmin` from `@/lib/supabase/server`.
- Produces: `getOwnerProfileId(): Promise<string | null>`
- Produces: `autoPost(input: { sourceKey: string; body: string }): Promise<void>`

**Note:** These are thin DB wrappers; per the codebase pattern (DB-touching modules like `support/server.ts` carry no unit test, only the pure modules do) they are verified end-to-end in Task 8's smoke test, not with a mock-heavy unit test. Do not add a Vitest mock of Supabase here.

- [ ] **Step 1: Write `owner.ts`**

```ts
import "server-only";

import { supabaseAdmin } from "@/lib/supabase/server";

// The owner id never changes at runtime — resolve once per server process.
let cached: string | null | undefined;

/** The owner's profile id (community_posts.user_id target), or null if unresolved. */
export async function getOwnerProfileId(): Promise<string | null> {
  if (cached !== undefined) return cached;
  const { data, error } = await supabaseAdmin().rpc("community_owner_id");
  cached = error ? null : ((data as string | null) ?? null);
  if (!cached) console.warn("[auto] community_owner_id resolved null — check ADMIN_EMAIL / profiles row");
  return cached;
}
```

- [ ] **Step 2: Write `post.ts`**

```ts
import "server-only";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getOwnerProfileId } from "./owner";

/**
 * Insert one owner-authored text post to /community. Idempotent per `sourceKey`
 * (unique auto_key; a 23505 means it was already posted → success). Best-effort:
 * any failure only logs, never throws, so it can never break the host action.
 */
export async function autoPost(input: { sourceKey: string; body: string }): Promise<void> {
  try {
    const owner = await getOwnerProfileId();
    if (!owner) return; // owner.ts already warned
    const { error } = await supabaseAdmin()
      .from("community_posts")
      .insert({ user_id: owner, type: "text", body: input.body.slice(0, 500), auto_key: input.sourceKey });
    if (error && error.code !== "23505") {
      console.warn("[auto] insert failed", input.sourceKey, error.message);
      return;
    }
    revalidatePath("/community");
  } catch (e) {
    console.warn("[auto] autoPost threw", input.sourceKey, (e as Error).message);
  }
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors from these files.

- [ ] **Step 4: Commit**

```bash
git add src/lib/community/auto/owner.ts src/lib/community/auto/post.ts
git commit -m "feat(community): auto-post engine (owner resolver + insert)"
```

---

## Task 5: Supporter source — shout-out + count milestone

**Files:**
- Create: `src/lib/community/auto/supporter.ts`
- Test: `src/lib/community/auto/supporter.test.ts`
- Modify: `src/app/api/support/confirm/route.ts`

**Interfaces:**
- Consumes: `autoPost` (Task 4), `pick` (Task 2), `SupportRow` from `@/lib/support/server`, `site` from `@/lib/site`.
- Produces: `supporterMilestoneFor(count: number): number | null`
- Produces: `postCommunitySupporter(support: SupportRow): Promise<void>`

- [ ] **Step 1: Write the failing test (pure milestone logic only)**

```ts
import { describe, it, expect } from "vitest";
import { supporterMilestoneFor } from "./supporter";

describe("supporterMilestoneFor", () => {
  it("returns the threshold when count lands on one", () => {
    expect(supporterMilestoneFor(10)).toBe(10);
    expect(supporterMilestoneFor(100)).toBe(100);
  });
  it("returns null off-threshold", () => {
    expect(supporterMilestoneFor(11)).toBeNull();
    expect(supporterMilestoneFor(0)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/community/auto/supporter.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `supporter.ts`**

```ts
import "server-only";

import { supabaseAdmin } from "@/lib/supabase/server";
import { site } from "@/lib/site";
import { autoPost } from "./post";
import { pick } from "./templates";
import type { SupportRow } from "@/lib/support/server";

const SUPPORTER_THRESHOLDS = [10, 25, 50, 100, 250];

/** The crossed threshold, or null. Exact match — supporters land one at a time. */
export function supporterMilestoneFor(count: number): number | null {
  return SUPPORTER_THRESHOLDS.includes(count) ? count : null;
}

/**
 * On a freshly-paid support: post an ANONYMOUS shout-out to /community (never
 * the supporter's name — no review gate to catch a mistake) plus a support CTA,
 * and, if the paid-supporter count just hit a threshold, a milestone post.
 * Best-effort via autoPost; the count query is guarded too.
 */
export async function postCommunitySupporter(_support: SupportRow): Promise<void> {
  const url = `${site.url}/support`;
  await autoPost({ sourceKey: `supporter:${_support.id}`, body: pick("supporter", { url }) });

  const { count, error } = await supabaseAdmin()
    .from("supports")
    .select("id", { count: "exact", head: true })
    .eq("status", "paid");
  if (error) {
    console.warn("[auto] supporter count failed:", error.message);
    return;
  }
  const n = supporterMilestoneFor(count ?? 0);
  if (n) await autoPost({ sourceKey: `supporter-milestone:${n}`, body: pick("supporterMilestone", { n, url }) });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/community/auto/supporter.test.ts`
Expected: PASS.

- [ ] **Step 5: Wire the confirm route**

In `src/app/api/support/confirm/route.ts`, add the import and one call right after the existing thank-you line (do NOT remove `postThankyou` — both feeds fire).

```ts
import { postCommunitySupporter } from "@/lib/community/auto/supporter";
```

```ts
  const res = await markSupportStatus({ orderId, status: "paid", paymentId });
  if (res.updated && res.support) {
    await postThankyou(res.support);
    await postCommunitySupporter(res.support);
  }
```

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 7: Commit**

```bash
git add src/lib/community/auto/supporter.ts src/lib/community/auto/supporter.test.ts src/app/api/support/confirm/route.ts
git commit -m "feat(community): supporter shout-out + count milestone auto-posts"
```

---

## Task 6: On-publish sources — blog, case study, build-in-public update

**Files:**
- Modify: `src/lib/blog/actions.ts`, `src/lib/content/actions.ts`, `src/lib/support/updates.ts`

**Interfaces:**
- Consumes: `autoPost` (Task 4), `pick` (Task 2), `site` from `@/lib/site` (already imported in blog/actions).

- [ ] **Step 1: Blog — add a live-publish auto-post helper + calls**

In `src/lib/blog/actions.ts`, add imports:
```ts
import { autoPost } from "@/lib/community/auto/post";
import { pick } from "@/lib/community/auto/templates";
```

Add this helper next to `notifyIfLive` (reuses the same live condition):
```ts
/** Cross-post a newly-live blog post to /community, once (idempotent per slug). */
async function autoPostBlogIfLive(p: PostFields): Promise<void> {
  if (p.status !== "published" || !p.published_at) return;
  if (new Date(p.published_at) > new Date()) return;
  const url = `${site.url}/blog/${p.category}/${p.slug}`;
  await autoPost({ sourceKey: `blog:${p.slug}`, body: pick("blog", { title: p.title, url }) });
}
```

Call it right after each existing `await notifyIfLive(data);` in `createPost` and `updatePost`:
```ts
  revalidateBlog();
  await notifyIfLive(data);
  await autoPostBlogIfLive(data);
```
(Do NOT move it after the `redirect(...)` — `redirect` throws; the auto-post must run before it.)

- [ ] **Step 2: Case study — cross-post published case studies**

In `src/lib/content/actions.ts`, add imports:
```ts
import { autoPost } from "@/lib/community/auto/post";
import { pick } from "@/lib/community/auto/templates";
import { site } from "@/lib/site";
```

Add this helper:
```ts
/** Cross-post a published case study to /community, once (idempotent per slug). */
async function autoPostCaseStudy(
  def: ReturnType<typeof getEntity>,
  row: { slug: string | null; data: unknown; published: boolean },
): Promise<void> {
  if (!def || def.key !== "case-studies" || !row.published || !row.slug) return;
  const d = row.data as { title?: unknown };
  const title = typeof d?.title === "string" && d.title ? d.title : row.slug;
  const url = `${site.url}/case-studies/${row.slug}`;
  await autoPost({ sourceKey: `case:${row.slug}`, body: pick("caseStudy", { title, url }) });
}
```

Call it after `revalidateEntity(def.key);` in BOTH `createEntity` and `updateEntity`, before the `redirect`:
```ts
  revalidateEntity(def.key);
  await autoPostCaseStudy(def, row);
  redirect(`/admin/content/${def.key}`);
```

- [ ] **Step 3: Build-in-public update — cross-post non-thankyou updates**

In `src/lib/support/updates.ts`, add imports:
```ts
import { site } from "@/lib/site";
import { autoPost } from "@/lib/community/auto/post";
import { pick } from "@/lib/community/auto/templates";
```

In `insertUpdate`, on the success branch, cross-post everything except the supporter thank-you (that path already handles /community via Task 5):
```ts
    if (!error) {
      if (input.type !== "thankyou") {
        const title = input.body.length > 140 ? input.body.slice(0, 137) + "..." : input.body;
        await autoPost({ sourceKey: `update:${code}`, body: pick("update", { title, url: `${site.url}/support/updates` }) });
      }
      return { ok: true, code };
    }
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/blog/actions.ts src/lib/content/actions.ts src/lib/support/updates.ts
git commit -m "feat(community): auto-post on publish (blog, case study, update)"
```

---

## Task 7: GitHub webhook route

**Files:**
- Create: `src/app/api/community/github/route.ts`

**Interfaces:**
- Consumes: `verifyGithubSignature`, `shouldAnnounce`, `parsePrTitle`, `humanizeSubject` (Task 3), `autoPost` (Task 4), `pick` (Task 2).

- [ ] **Step 1: Read the Next.js route-handler docs**

Check `node_modules/next/dist/docs/` for route-handler conventions (request body reading, `runtime`, dynamic). Confirm `request.text()` + `NextResponse.json` are correct for this version before writing.

- [ ] **Step 2: Write the route**

```ts
import { NextResponse } from "next/server";

import { verifyGithubSignature } from "@/lib/community/auto/github-verify";
import { parsePrTitle, shouldAnnounce, humanizeSubject } from "@/lib/community/auto/pr";
import { autoPost } from "@/lib/community/auto/post";
import { pick } from "@/lib/community/auto/templates";

export const dynamic = "force-dynamic";

const SECRET = process.env.GITHUB_WEBHOOK_SECRET;

/**
 * GitHub `pull_request` webhook. On a merged PR whose title passes the
 * user-facing heuristic (and lacks a `no-announce` label), post a "just shipped"
 * line to /community. HMAC-verified; idempotent per PR number.
 */
export async function POST(request: Request) {
  const raw = await request.text(); // raw body needed for HMAC
  const sig = request.headers.get("x-hub-signature-256");
  if (!SECRET || !verifyGithubSignature(SECRET, raw, sig)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  if (request.headers.get("x-github-event") !== "pull_request") {
    return NextResponse.json({ ok: true, ignored: "event" });
  }

  let payload: {
    action?: string;
    pull_request?: { merged?: boolean; number?: number; title?: string; labels?: { name?: string }[] };
  };
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const pr = payload.pull_request;
  if (payload.action !== "closed" || !pr?.merged || !pr.number) {
    return NextResponse.json({ ok: true, ignored: "not-merged" });
  }

  const title = pr.title ?? "";
  const labels = Array.isArray(pr.labels) ? pr.labels.map((l) => String(l?.name ?? "")) : [];
  if (!shouldAnnounce(title, labels)) {
    return NextResponse.json({ ok: true, ignored: "filtered" });
  }

  const subject = humanizeSubject(parsePrTitle(title).subject);
  await autoPost({ sourceKey: `pr:${pr.number}`, body: pick("pr", { title: subject }) });
  return NextResponse.json({ ok: true, posted: true });
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 4: Local smoke test (signed request)**

Start the dev server (via the preview tool, not raw shell). Then from a Node one-liner build a signed request and POST it:
```bash
node -e "const c=require('crypto');const b=JSON.stringify({action:'closed',pull_request:{merged:true,number:99999,title:'feat(test): hello world',labels:[]}});const s='sha256='+c.createHmac('sha256',process.env.GITHUB_WEBHOOK_SECRET||'devsecret').update(b).digest('hex');console.log(JSON.stringify({b,s}));"
```
Send that body with headers `x-github-event: pull_request` and `x-hub-signature-256: <s>` to `http://localhost:3000/api/community/github` (set `GITHUB_WEBHOOK_SECRET=devsecret` in `.env.local` first). Expected JSON: `{ ok: true, posted: true }`, and a `pr:99999` post appears in `/community`. Delete that test post afterward.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/community/github/route.ts
git commit -m "feat(community): GitHub merged-PR webhook -> community post"
```

---

## Task 8: Env, docs, and full verification

**Files:**
- Modify: `.env.example`

- [ ] **Step 1: Add the env var**

In `.env.example`, add:
```
# GitHub webhook secret for /api/community/github (merged-PR -> community auto-post)
GITHUB_WEBHOOK_SECRET=
```

- [ ] **Step 2: Full typecheck + test suite**

Run: `npx tsc --noEmit`
Expected: clean (no new errors).

Run: `npx vitest run src/lib/community/auto`
Expected: all auto/* tests PASS.

- [ ] **Step 3: Confirm the production build compiles**

Run: `npx next build`
Expected: exits 0. (Per the repo rule, judge by `next build`'s own exit code — a client importing `server-only` typechecks but breaks the build. `post.ts`/`owner.ts`/`supporter.ts` are `server-only` and must only be reached from server code.)

- [ ] **Step 4: Browser smoke test of one in-app source**

Using the preview/browser tools: run the dev server, sign in as admin, publish a draft blog post (or re-save a published one), then load `/community` and confirm the owner post appears once. Re-save again and confirm NO duplicate (idempotency). Capture a screenshot as proof.

- [ ] **Step 5: Commit + open the PR**

```bash
git add .env.example
git commit -m "chore(community): document GITHUB_WEBHOOK_SECRET"
git push -u origin feat/community-auto-poster
gh pr create --base main --title "feat(community): auto-poster for the community feed" --body "See docs/superpowers/plans/2026-07-12-community-auto-poster.md"
```

- [ ] **Step 6: Hand off deployment prerequisites to the user**

Report that before this works in production the user must: (a) run migration `20260712000004_community_auto_poster.sql` in their Supabase SQL editor; (b) set `GITHUB_WEBHOOK_SECRET` in the deployment env; (c) add the webhook in the GitHub repo settings (payload URL `https://<site>/api/community/github`, content-type `application/json`, secret = same value, event = "Pull requests"); (d) confirm `community_owner_id()` returns a non-null uuid (the admin must have a `profiles` row). Do NOT deploy — the user gates production deploys manually.

---

## Self-Review

**Spec coverage:**
- Source 1 (on-publish blog/case/update) → Task 6. ✓
- Source 2 (community-size milestone, DB trigger) → Task 1. ✓
- Source 3 (supporter-count milestone) → Task 5. ✓
- Source 4 (anonymous new-supporter shout-out) → Task 5. ✓
- Source 5 (merged-PR webhook, prefix heuristic + no-announce) → Tasks 3 + 7. ✓
- Engine (`autoPost`, idempotent `auto_key`, owner author) → Tasks 1 + 4. ✓
- ≥10 templates per kind → Task 2 (TS: 6 kinds × 10) + Task 1 (SQL member-milestone: 10). ✓
- Both feeds for supporters (keep `/support/updates`, add `/community`) → Task 5 keeps `postThankyou`, adds `postCommunitySupporter`. ✓
- Safety: anonymity (Task 5), idempotency (Tasks 1/4), HMAC + kill switch (Tasks 3/7), best-effort guards (Task 4). ✓
- Testing (templates, PR parser, signature, milestone helper) → Tasks 2/3/5. ✓

**Placeholder scan:** No TBD/TODO; every code step shows full code; every test step shows assertions. ✓

**Type consistency:** `AutoKind` values match `pick` call sites (`blog`/`caseStudy`/`update`/`supporter`/`supporterMilestone`/`pr`). `autoPost({ sourceKey, body })` signature matches all call sites. `getOwnerProfileId`/`community_owner_id` names consistent across Tasks 1/4. `SupportRow` reused from `@/lib/support/server`. ✓
