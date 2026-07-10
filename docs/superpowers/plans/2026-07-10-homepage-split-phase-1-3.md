# Homepage Split — Phases 1–3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the single front door into a personal-brand home (`/me`) and a buyer-facing home (`/`) that leads with the AEO/GEO wedge, and instrument contact submissions with first-touch attribution so the change is measurable.

**Architecture:** Attribution is captured client-side into `localStorage` by a probe component in the root layout, parsed by pure functions in `src/lib/attribution.ts`, and passed through the existing `submitContact` server action into new `contacts` columns. The homepage move is a verbatim copy to `src/app/me/page.tsx` with two CTA swaps; `/` is then rewritten as a re-composition of existing card components. No new middleware, no new dependencies, no redirects.

**Tech Stack:** Next.js App Router (see `AGENTS.md` — this Next.js differs from training data), React Server Components, Supabase (`contacts` table), Vercel Analytics, vitest, Tailwind.

Spec: `docs/superpowers/specs/2026-07-10-homepage-split-buyer-funnel-design.md`

## Global Constraints

- **Read the docs first.** Per `AGENTS.md`: this Next.js version has breaking changes. Read the relevant guide in `node_modules/next/dist/docs/` before writing App Router code.
- **Never commit to `main`.** Branch from `origin/main`, open a PR. Verify `git log --oneline origin/main..HEAD` shows only your commits before pushing.
- **Concurrent sessions share this working tree.** Another Claude session is active and has added and deleted files under `src/lib/seo/` during this planning session. Re-run `git status` before every branch operation and never `git add -A`.
- **Supabase migrations are never applied directly.** Write the migration file, then hand the SQL to the user to run manually.
- **`next build` must be confirmed by its own exit code.** Piping masks failure. Run `npm run build; echo "exit=$?"`.
- **`npm run lint` already exits 1 on `main`.** Baseline as of `479b918`: 21 problems, 15 of them errors, all in files this plan does not touch (`src/components/games/*`, `src/app/admin/*`, `src/components/link-page.tsx`, `src/lib/games/themes.test.ts`). Do not try to fix them and do not treat a red repo-wide lint as your failure. Gate on scoped lint instead: `npx eslint <the files you changed>; echo "exit=$?"` must print `exit=0`. Where a task below says `npm run lint; echo "exit=$?"` expecting `exit=0`, read it as scoped lint over that task's files.
- **Client components must never import `server-only`.** It passes `tsc` and breaks the build on Vercel.
- **No emojis anywhere.** Monochrome design system. Fonts are Jakarta + Poppins.
- **Tests are `src/**/*.test.ts` under `environment: "node"`.** There is no DOM in the test environment and no `.tsx` test support. Component changes are verified by `npm run build` and browser DOM inspection, not unit tests. Do not add a DOM test runner.
- **Do not use `preview_screenshot`.** Verify rendered output with `preview_snapshot` or `preview_eval`.

---

## File Structure

**Created:**
- `src/lib/attribution.ts` — pure attribution parsing and sanitizing. No I/O, no `window`, no `server-only`. Imported by both client and server.
- `src/lib/attribution.test.ts` — unit tests for the above.
- `src/components/analytics/attribution-probe.tsx` — client component. Writes first-touch to `localStorage`, increments `pagesSeen` on navigation, exposes `readFirstTouch()`.
- `supabase/migrations/20260711000001_contact_attribution.sql` — seven new nullable columns on `contacts`.
- `src/app/me/page.tsx` — the personal-brand home.

**Modified:**
- `src/components/analytics/ai-referrer.tsx` — imports `AI_HOSTS` from the new lib instead of defining it.
- `src/lib/contact/actions.ts` — accepts and persists attribution.
- `src/lib/contact/queries.ts` — selects and maps the new columns.
- `src/app/admin/contacts/contacts-table.tsx` — renders a Source column.
- `src/components/sections/contact-form.tsx` — reads first-touch, passes it to `submitContact`.
- `src/app/layout.tsx` — mounts `<AttributionProbe />`.
- `src/lib/blog/actions.ts`, `src/lib/content/actions.ts` — revalidate `/me` alongside `/`.
- `src/app/sitemap.ts` — `/me` joins `WEEKLY_PATHS`.
- `src/lib/site.ts` — `/me` in `footerNav`.
- `src/components/cards/service-card.tsx` — renders `startingAt`.
- `src/components/sections/cta-band.tsx` — gains `primaryHref` / `secondaryHref`.
- `src/app/page.tsx` — rewritten as the buyer home.

---

## Task 1: Attribution core

Pure functions, fully unit-tested. Nothing else depends on `window` or the database.

**Files:**
- Create: `src/lib/attribution.ts`
- Create: `src/lib/attribution.test.ts`
- Modify: `src/components/analytics/ai-referrer.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `type FirstTouch = { landingPage: string; referrer: string | null; aiSource: string | null; utmSource: string | null; utmMedium: string | null; utmCampaign: string | null; pagesSeen: number }`
  - `const AI_HOSTS: Record<string, string>`
  - `function aiSourceFor(referrer: string): string | null`
  - `function parseFirstTouch(href: string, referrer: string): FirstTouch`
  - `function toAttributionRow(a: FirstTouch | null | undefined): Record<string, string | number | null>`

- [ ] **Step 1: Write the failing test**

Create `src/lib/attribution.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { aiSourceFor, parseFirstTouch, toAttributionRow } from "./attribution";

describe("aiSourceFor", () => {
  it("names known AI answer engines", () => {
    expect(aiSourceFor("https://chatgpt.com/c/abc")).toBe("ChatGPT");
    expect(aiSourceFor("https://www.perplexity.ai/search?q=x")).toBe("Perplexity");
    expect(aiSourceFor("https://claude.ai/chat/1")).toBe("Claude");
  });

  it("returns null for non-AI, empty, and malformed referrers", () => {
    expect(aiSourceFor("https://google.com/search")).toBeNull();
    expect(aiSourceFor("")).toBeNull();
    expect(aiSourceFor("not a url")).toBeNull();
  });
});

describe("parseFirstTouch", () => {
  it("records the landing path without the query string", () => {
    const t = parseFirstTouch("https://shubhamdatarkar.com/blog/seo/x?utm_source=li", "");
    expect(t.landingPage).toBe("/blog/seo/x");
  });

  it("extracts utm parameters", () => {
    const t = parseFirstTouch("https://x.com/?utm_source=li&utm_medium=social&utm_campaign=aeo", "");
    expect(t.utmSource).toBe("li");
    expect(t.utmMedium).toBe("social");
    expect(t.utmCampaign).toBe("aeo");
  });

  it("leaves utm fields null when absent and starts pagesSeen at 1", () => {
    const t = parseFirstTouch("https://x.com/", "");
    expect(t.utmSource).toBeNull();
    expect(t.pagesSeen).toBe(1);
    expect(t.referrer).toBeNull();
  });

  it("classifies an AI referrer", () => {
    const t = parseFirstTouch("https://x.com/", "https://chatgpt.com/c/1");
    expect(t.aiSource).toBe("ChatGPT");
    expect(t.referrer).toBe("https://chatgpt.com/c/1");
  });
});

describe("toAttributionRow", () => {
  const base = parseFirstTouch("https://x.com/p?utm_source=li", "https://chatgpt.com/c/1");

  it("returns an empty object when there is no attribution", () => {
    expect(toAttributionRow(null)).toEqual({});
    expect(toAttributionRow(undefined)).toEqual({});
  });

  it("maps camelCase fields onto snake_case columns", () => {
    const row = toAttributionRow(base);
    expect(row.first_landing_page).toBe("/p");
    expect(row.ai_source).toBe("ChatGPT");
    expect(row.utm_source).toBe("li");
    expect(row.utm_medium).toBeNull();
    expect(row.pages_seen).toBe(1);
  });

  it("clamps hostile input from the client", () => {
    const row = toAttributionRow({ ...base, landingPage: "/" + "a".repeat(500), pagesSeen: 1e9 });
    expect((row.first_landing_page as string).length).toBe(300);
    expect(row.pages_seen).toBe(9999);
  });

  it("rejects a non-numeric pagesSeen", () => {
    const row = toAttributionRow({ ...base, pagesSeen: Number.NaN });
    expect(row.pages_seen).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/attribution.test.ts`
Expected: FAIL — `Failed to resolve import "./attribution"`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/attribution.ts`:

```ts
/**
 * First-touch attribution. Pure functions only — no `window`, no I/O, no
 * `server-only`. Imported by the client probe and by the contact server action,
 * so it must stay safe on both sides of the boundary.
 */

export type FirstTouch = {
  landingPage: string;
  referrer: string | null;
  aiSource: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  pagesSeen: number;
};

/**
 * AI answer engines. They are invisible in normal referrer reports because most
 * strip or proxy the referrer, so an explicit host map is the only way to see
 * GEO/AEO traffic.
 */
export const AI_HOSTS: Record<string, string> = {
  "chat.openai.com": "ChatGPT",
  "chatgpt.com": "ChatGPT",
  "perplexity.ai": "Perplexity",
  "www.perplexity.ai": "Perplexity",
  "gemini.google.com": "Gemini",
  "copilot.microsoft.com": "Copilot",
  "www.bing.com": "Bing Copilot",
  "claude.ai": "Claude",
};

export function aiSourceFor(referrer: string): string | null {
  if (!referrer) return null;
  try {
    return AI_HOSTS[new URL(referrer).hostname] ?? null;
  } catch {
    return null;
  }
}

export function parseFirstTouch(href: string, referrer: string): FirstTouch {
  const url = new URL(href);
  const q = url.searchParams;
  return {
    landingPage: url.pathname,
    referrer: referrer || null,
    aiSource: aiSourceFor(referrer),
    utmSource: q.get("utm_source"),
    utmMedium: q.get("utm_medium"),
    utmCampaign: q.get("utm_campaign"),
    pagesSeen: 1,
  };
}

const clamp = (v: string | null, max: number) => (v ? String(v).slice(0, max) : null);

/**
 * Maps a client-supplied FirstTouch onto `contacts` columns. This is a trust
 * boundary: the payload arrives from localStorage, which the user controls.
 * Every field is length-clamped and pagesSeen is range-checked.
 */
export function toAttributionRow(a: FirstTouch | null | undefined): Record<string, string | number | null> {
  if (!a) return {};
  const pages = Number(a.pagesSeen);
  return {
    first_landing_page: clamp(a.landingPage, 300),
    referrer: clamp(a.referrer, 500),
    ai_source: clamp(a.aiSource, 60),
    utm_source: clamp(a.utmSource, 120),
    utm_medium: clamp(a.utmMedium, 120),
    utm_campaign: clamp(a.utmCampaign, 120),
    pages_seen: Number.isFinite(pages) ? Math.max(1, Math.min(9999, Math.trunc(pages))) : null,
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/attribution.test.ts`
Expected: PASS, 10 tests.

- [ ] **Step 5: Point `AiReferrer` at the shared host map**

The map now lives in one place. Replace the top of `src/components/analytics/ai-referrer.tsx` — delete its local `AI_HOSTS` const and import instead:

```tsx
"use client";

import { useEffect } from "react";
import { track } from "@vercel/analytics";
import { AI_HOSTS } from "@/lib/attribution";

/**
 * Fires a single `ai_referral` event when a visitor arrives from an AI answer
 * engine (ChatGPT, Perplexity, Gemini, Copilot, Claude). This is the only way
 * to see GEO/AEO traffic — AI surfaces are invisible in normal referrer reports
 * because most strip or proxy the referrer. Renders nothing.
 */
export function AiReferrer() {
  useEffect(() => {
    const ref = document.referrer;
    if (!ref) return;
    let host: string;
    try {
      host = new URL(ref).hostname;
    } catch {
      return;
    }
    const source = AI_HOSTS[host];
    if (source) {
      track("ai_referral", { source, landing: window.location.pathname });
    }
  }, []);

  return null;
}
```

- [ ] **Step 6: Run the full suite and lint**

Run: `npm test; echo "exit=$?"`
Expected: `exit=0`.

Run: `npm run lint; echo "exit=$?"`
Expected: `exit=0`.

- [ ] **Step 7: Commit**

```bash
git add src/lib/attribution.ts src/lib/attribution.test.ts src/components/analytics/ai-referrer.tsx
git commit -m "feat(attribution): pure first-touch parsing + shared AI host map"
```

---

## Task 2: Attribution columns and server persistence

**Files:**
- Create: `supabase/migrations/20260711000001_contact_attribution.sql`
- Modify: `src/lib/contact/actions.ts`

**Interfaces:**
- Consumes: `FirstTouch`, `toAttributionRow` from Task 1.
- Produces: `ContactInput` gains an optional `attribution?: FirstTouch | null` field. `submitContact` persists it.

- [ ] **Step 1: Write the migration file**

Create `supabase/migrations/20260711000001_contact_attribution.sql`:

```sql
-- First-touch attribution on contact submissions.
-- All nullable: rows written before this migration, and visitors with
-- localStorage disabled, legitimately have no attribution.
alter table public.contacts
  add column if not exists first_landing_page text,
  add column if not exists referrer          text,
  add column if not exists ai_source         text,
  add column if not exists utm_source        text,
  add column if not exists utm_medium        text,
  add column if not exists utm_campaign      text,
  add column if not exists pages_seen        integer;

-- The two questions this table now has to answer fast:
--   "which page produces retainer leads?"  and  "did AI send them?"
create index if not exists contacts_first_landing_page_idx on public.contacts (first_landing_page);
create index if not exists contacts_ai_source_idx on public.contacts (ai_source) where ai_source is not null;
```

- [ ] **Step 2: Hand the SQL to the user — do not apply it**

Print the file contents and tell the user to run it in the Supabase SQL editor for the **shubhamdatarkar.com** project. This project's Supabase MCP connection points at Book A Sloth, a different project. Never run this against the connected instance.

Wait for the user to confirm the migration ran before continuing. The server action below will fail at runtime without these columns.

- [ ] **Step 3: Extend the server action**

In `src/lib/contact/actions.ts`, add the import at the top of the file, next to the existing imports:

```ts
import { toAttributionRow, type FirstTouch } from "@/lib/attribution";
```

Extend the input type:

```ts
export type ContactInput = {
  name: string;
  email: string;
  projectType?: string;
  budget?: string;
  message: string;
  attribution?: FirstTouch | null;
};
```

Then change the insert. Find this block:

```ts
  const { data, error } = await admin
    .from("contacts")
    .insert({ name, email, project_type: projectType, budget, message })
    .select("id")
    .single();
```

Replace it with:

```ts
  const { data, error } = await admin
    .from("contacts")
    .insert({ name, email, project_type: projectType, budget, message, ...toAttributionRow(input.attribution) })
    .select("id")
    .single();
```

Nothing else in the action changes. Attribution is best-effort context, never a reason to reject a submission — `toAttributionRow` returns `{}` when it is absent, and the insert proceeds exactly as before.

- [ ] **Step 4: Verify the build**

Run: `npm run build; echo "exit=$?"`
Expected: `exit=0`. If it fails, the most likely cause is a client component reaching `server-only` through a new import path — check that `src/lib/attribution.ts` imports nothing.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260711000001_contact_attribution.sql src/lib/contact/actions.ts
git commit -m "feat(contact): persist first-touch attribution on submissions"
```

---

## Task 3: Capture attribution in the browser

**Files:**
- Create: `src/components/analytics/attribution-probe.tsx`
- Modify: `src/app/layout.tsx`
- Modify: `src/components/sections/contact-form.tsx`

**Interfaces:**
- Consumes: `parseFirstTouch`, `FirstTouch` from Task 1. `ContactInput.attribution` from Task 2.
- Produces: `<AttributionProbe />` and `readFirstTouch(): FirstTouch | null`.

- [ ] **Step 1: Create the probe**

Create `src/components/analytics/attribution-probe.tsx`:

```tsx
"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { parseFirstTouch, type FirstTouch } from "@/lib/attribution";

const KEY = "sd_first_touch";

/**
 * Records where a visitor first landed and how many pages they have seen since.
 * localStorage rather than a cookie: the value is only ever read by the contact
 * form, so there is no reason to put it on every request. Client-side rather
 * than middleware: this app has no middleware, and App Router client navigation
 * means `document.referrer` on the first load is the true external referrer.
 *
 * Best-effort by design. Private mode, quota errors, and disabled storage all
 * fail silently — a lead without attribution is still a lead.
 */
export function AttributionProbe() {
  const pathname = usePathname();

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (!raw) {
        const first = parseFirstTouch(window.location.href, document.referrer);
        window.localStorage.setItem(KEY, JSON.stringify(first));
        return;
      }
      const touch = JSON.parse(raw) as FirstTouch;
      touch.pagesSeen = (Number(touch.pagesSeen) || 1) + 1;
      window.localStorage.setItem(KEY, JSON.stringify(touch));
    } catch {
      // No storage, no attribution. Not worth breaking a page over.
    }
  }, [pathname]);

  return null;
}

/** Reads the stored first touch. Returns null when absent or unparseable. */
export function readFirstTouch(): FirstTouch | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as FirstTouch) : null;
  } catch {
    return null;
  }
}
```

- [ ] **Step 2: Mount it in the root layout**

In `src/app/layout.tsx`, add the import beside the existing `AiReferrer` import:

```tsx
import { AttributionProbe } from "@/components/analytics/attribution-probe";
```

Then add the component next to `<AiReferrer />` near the end of `<body>`:

```tsx
        <SpeedInsights />
        <Analytics />
        <AiReferrer />
        <AttributionProbe />
```

- [ ] **Step 3: Pass attribution from the contact form**

In `src/components/sections/contact-form.tsx`, add the import:

```tsx
import { readFirstTouch } from "@/components/analytics/attribution-probe";
```

Then, inside `onSubmit`, add `attribution` to the `submitContact` call. Find:

```tsx
    const res = await submitContact({
      name: values.name,
      email: values.email,
      projectType: values.projectType,
      budget: values.budget || undefined,
      message: values.message,
    });
```

Replace with:

```tsx
    const res = await submitContact({
      name: values.name,
      email: values.email,
      projectType: values.projectType,
      budget: values.budget || undefined,
      message: values.message,
      attribution: readFirstTouch(),
    });
```

- [ ] **Step 4: Verify end to end in the browser**

Start the dev server with `preview_start`, then:

1. `preview_eval`: `localStorage.removeItem("sd_first_touch"); window.location.href = "/blog?utm_source=plan_test"`
2. `preview_eval`: `JSON.parse(localStorage.getItem("sd_first_touch"))`
   Expected: `{ landingPage: "/blog", utmSource: "plan_test", pagesSeen: 1, ... }`
3. Navigate to another page with `preview_click` on any in-app link.
4. `preview_eval`: `JSON.parse(localStorage.getItem("sd_first_touch")).pagesSeen`
   Expected: `2`. `landingPage` still `/blog` — first touch, not last.
5. Submit the contact form at `/contact` with `preview_fill` and `preview_click`.
6. Confirm the new row in Supabase carries `first_landing_page = "/blog"` and `utm_source = "plan_test"`.

Do not use `preview_screenshot`.

- [ ] **Step 5: Verify the build**

Run: `npm run build; echo "exit=$?"`
Expected: `exit=0`.

- [ ] **Step 6: Commit**

```bash
git add src/components/analytics/attribution-probe.tsx src/app/layout.tsx src/components/sections/contact-form.tsx
git commit -m "feat(attribution): capture first touch and attach it to contact submissions"
```

---

## Task 4: Surface attribution in the admin

Without this, the data lands in the database and nobody ever looks at it.

**Files:**
- Modify: `src/lib/contact/queries.ts`
- Modify: `src/app/admin/contacts/contacts-table.tsx`

**Interfaces:**
- Consumes: the columns from Task 2.
- Produces: `Contact` gains `firstLandingPage`, `aiSource`, `utmSource`, `pagesSeen`.

- [ ] **Step 1: Select and map the new columns**

In `src/lib/contact/queries.ts`, extend `Contact`:

```ts
export type Contact = {
  id: string;
  createdAt: string;
  name: string;
  email: string;
  projectType: string | null;
  budget: string | null;
  message: string;
  status: "new" | "read" | "archived";
  notified: boolean;
  firstLandingPage: string | null;
  aiSource: string | null;
  utmSource: string | null;
  pagesSeen: number | null;
};
```

Extend `Row` with the snake_case equivalents:

```ts
type Row = {
  id: string;
  created_at: string;
  name: string;
  email: string;
  project_type: string | null;
  budget: string | null;
  message: string;
  status: Contact["status"];
  notified: boolean;
  first_landing_page: string | null;
  ai_source: string | null;
  utm_source: string | null;
  pages_seen: number | null;
};
```

Widen the select string:

```ts
      .select("id,created_at,name,email,project_type,budget,message,status,notified,first_landing_page,ai_source,utm_source,pages_seen")
```

And extend the mapper's returned object with:

```ts
      firstLandingPage: r.first_landing_page,
      aiSource: r.ai_source,
      utmSource: r.utm_source,
      pagesSeen: r.pages_seen,
```

`referrer`, `utm_medium`, and `utm_campaign` are stored but not selected — they are for SQL analysis, not the table. Add them to the select only when a screen needs them.

- [ ] **Step 2: Render a Source column**

In `src/app/admin/contacts/contacts-table.tsx`, extend the local `Row` type:

```tsx
type Row = {
  id: string; name: string; email: string; createdAt: string;
  projectType?: string | null; budget?: string | null; message: string; notified: boolean;
  firstLandingPage?: string | null; aiSource?: string | null; utmSource?: string | null; pagesSeen?: number | null;
};
```

Add a helper above `columns`:

```tsx
/** Most specific known origin, in descending order of usefulness. */
function sourceOf(r: Row): string {
  return r.aiSource ?? r.utmSource ?? r.firstLandingPage ?? "—";
}
```

Insert two columns into the `columns` array, immediately after the `budget` column and before `message`:

```tsx
  {
    key: "source", header: "Source", sortValue: (r) => sourceOf(r), hideable: true,
    cell: (r) => <span className="text-admin-text-muted" title={r.firstLandingPage ?? ""}>{sourceOf(r)}</span>,
  },
  { key: "pages", header: "Pages", sortValue: (r) => r.pagesSeen ?? 0, cell: (r) => r.pagesSeen ?? "—", hideable: true },
```

Finally, make the new fields searchable — replace the `searchable` prop:

```tsx
      searchable={(r) => `${r.name} ${r.email} ${r.message} ${r.projectType ?? ""} ${sourceOf(r)}`}
```

- [ ] **Step 3: Verify**

Run: `npm run build; echo "exit=$?"`
Expected: `exit=0`.

Open `/admin/contacts`. The test submission from Task 3 shows Source `plan_test` and Pages `2`. Verify with `preview_snapshot`, not a screenshot.

- [ ] **Step 4: Commit**

```bash
git add src/lib/contact/queries.ts src/app/admin/contacts/contacts-table.tsx
git commit -m "feat(admin): show lead source and pages-seen on contacts"
```

---

## Task 5: Move the homepage to `/me`

A near-verbatim move. `/` is left untouched here — it temporarily renders the same content as `/me`, which is correct and safe. Task 8 replaces it. Doing the move and the rewrite as one task would make it impossible to tell a move bug from a rewrite bug.

**Files:**
- Create: `src/app/me/page.tsx`
- Modify: `src/lib/blog/actions.ts`, `src/lib/content/actions.ts`
- Modify: `src/app/sitemap.ts`
- Modify: `src/lib/site.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: the route `/me`.

- [ ] **Step 1: Copy the page**

```bash
cp src/app/page.tsx src/app/me/page.tsx
```

(Create the directory first if `cp` complains: `mkdir -p src/app/me`.)

- [ ] **Step 2: Adapt the copy**

In `src/app/me/page.tsx`, make exactly four changes.

Change the metadata path:

```tsx
export const metadata = buildMetadata({ path: "/me" });
```

Swap the schema import — replace `organizationSchema` with `profilePageSchema` in the import from `@/lib/seo`:

```tsx
import { buildMetadata, profilePageSchema } from "@/lib/seo";
```

Swap the JSON-LD emitted at the top of the returned fragment:

```tsx
      <JsonLd data={profilePageSchema()} />
```

`personSchema()` and `websiteSchema()` are already emitted globally from `src/app/layout.tsx`, so they must not be repeated here. `organizationSchema()` describes the business and stays on `/`.

Swap the hero CTA pair. A personal-brand page must not ask a reader for a sales call. Find the hero button row and replace it:

```tsx
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/newsletter" className={cn(buttonVariants({ size: "lg" }))}>
                Join the Builders List
                <ArrowRight />
              </Link>
              <Link href="/community" className={cn(buttonVariants({ variant: "outline", size: "lg" }))}>
                Visit the community
              </Link>
            </div>
```

Do not remove the `site`, `BrandIcon`, or `Check` imports. The hero no longer uses them, but the booking section further down the page still does, and it stays as-is — a personal-brand page may still offer a call, it just must not open with one. `ArrowRight` and `Link` are already imported. Run `npm run lint` to catch anything that genuinely became unused.

- [ ] **Step 3: Stop `/me` going stale**

This is the single most likely bug in the whole change. `/me` renders featured posts, featured case studies, and the testimonial marquee. Both publish actions currently revalidate only `/`.

In `src/lib/blog/actions.ts`, at line 16:

```ts
  revalidatePath("/"); // home shows featured posts
  revalidatePath("/me"); // /me shows them too
```

In `src/lib/content/actions.ts`, at both line 17 and line 30, add the matching `revalidatePath("/me")` immediately after each existing `revalidatePath("/")`:

```ts
      revalidatePath("/"); // home shows featured case studies
      revalidatePath("/me");
```

```ts
      revalidatePath("/"); // home marquee
      revalidatePath("/me");
```

- [ ] **Step 4: Sitemap and nav**

In `src/app/sitemap.ts`, add `/me` to the weekly set:

```ts
  const WEEKLY_PATHS = new Set(["/", "/me", "/blog"]);
```

`discoverPages` walks the filesystem, so `/me` enters the sitemap on its own — this only fixes its change frequency.

In `src/lib/site.ts`, add `/me` as the second item of the `footerNav` "Explore" group, after Home:

```ts
      { label: "Home", href: "/" },
      { label: "Me", href: "/me" },
      { label: "About", href: "/about" },
```

- [ ] **Step 5: Verify**

Run: `npm test; echo "exit=$?"` — `src/lib/seo/discovery.test.ts` asserts the route list; confirm it still passes.
Expected: `exit=0`.

Run: `npm run build; echo "exit=$?"`
Expected: `exit=0`.

Then in the browser: `/me` renders the full page, and its hero shows "Join the Builders List", not "Book a discovery call". Confirm with `preview_snapshot`. `/` still renders the old homepage unchanged.

- [ ] **Step 6: Commit**

```bash
git add src/app/me/page.tsx src/lib/blog/actions.ts src/lib/content/actions.ts src/app/sitemap.ts src/lib/site.ts
git commit -m "feat(me): personal-brand home at /me"
```

---

## Task 6: Show the price on service cards

The price band already exists in the data (`Service.startingAt`, e.g. `"₹1.5L / month"`). It has never been rendered. This one line makes every service surface self-qualifying.

**Files:**
- Modify: `src/components/cards/service-card.tsx`

**Interfaces:**
- Consumes: `Service.startingAt: string` from `src/lib/data/types.ts:174`.
- Produces: nothing.

- [ ] **Step 1: Render `startingAt`**

Replace the footer of the card — insert the price line between the outcome paragraph and the "Explore service" link:

```tsx
      <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">{service.outcome}</p>
      <p className="mt-5 text-sm font-medium text-foreground">
        From <span className="font-display font-bold">{service.startingAt}</span>
      </p>
      <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-foreground">
```

The old `mt-5` on the `<span>` becomes `mt-3` so the vertical rhythm holds.

- [ ] **Step 2: Verify**

Run: `npm run build; echo "exit=$?"`
Expected: `exit=0`.

Open `/services`. Every card shows a price. Confirm with:
`preview_eval`: `[...document.querySelectorAll('main')].length && document.body.innerText.includes('From')`

- [ ] **Step 3: Commit**

```bash
git add src/components/cards/service-card.tsx
git commit -m "feat(services): render the price band that was already in the data"
```

---

## Task 7: Let `CtaBand` point somewhere other than the calendar

Today `CtaBand` hardcodes its primary link to `site.bookingUrl` and its secondary to `/contact`. The buyer home needs to point the primary CTA elsewhere. Defaults preserve every existing call site.

**Files:**
- Modify: `src/components/sections/cta-band.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: `CtaBand` accepts `primaryHref?: string` and `secondaryHref?: string`.

- [ ] **Step 1: Add the props**

Extend the signature:

```tsx
export function CtaBand({
  title = "Have a project? Let's talk.",
  description = "Whether it's organic growth, performance, AI workflows, or a product you need built — start with a conversation.",
  primaryLabel = "Book a call",
  secondaryLabel = "Start a project",
  primaryHref = site.bookingUrl,
  secondaryHref = "/contact",
}: {
  title?: string;
  description?: string;
  primaryLabel?: string;
  secondaryLabel?: string;
  primaryHref?: string;
  secondaryHref?: string;
}) {
```

- [ ] **Step 2: Use them, and stop opening internal links in a new tab**

An internal href must not get `target="_blank"`. Derive it:

```tsx
  const primaryIsExternal = primaryHref.startsWith("http");
```

Replace the primary anchor:

```tsx
                <a
                  href={primaryHref}
                  {...(primaryIsExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    "w-full bg-background text-foreground hover:bg-background/90 sm:w-auto",
                  )}
                >
                  <BrandIcon name="CalendarCheck" />
                  {primaryLabel}
                </a>
```

And the secondary `<Link>`:

```tsx
                <Link
                  href={secondaryHref}
```

- [ ] **Step 3: Verify defaults are unchanged**

Run: `npm run build; echo "exit=$?"`
Expected: `exit=0`.

Open `/services`. The CTA band still reads "Book a call" and still opens the external calendar in a new tab. No call site passed the new props, so nothing may have moved.

- [ ] **Step 4: Commit**

```bash
git add src/components/sections/cta-band.tsx
git commit -m "refactor(cta-band): accept hrefs, keep booking as the default"
```

---

## Task 8: The buyer home

**Files:**
- Modify: `src/app/page.tsx` (full rewrite)

**Interfaces:**
- Consumes: `CtaBand` hrefs (Task 7), `ServiceCard` price (Task 6), `/me` (Task 5).
- Produces: nothing.

**Copy that is locked by the spec:** the page must not contain the phrase "startups that are just getting started". The lead offer is the AEO/GEO wedge — *"Get your brand cited by AI."*

**Copy that is not locked:** the exact hero sentence. Before writing this task, ask the user for it. The placeholder below is a working draft, not an approved line. Do not ship it without confirmation.

- [ ] **Step 1: Confirm the hero sentence with the user**

Present the draft and get a yes or a replacement:

> **H1:** Get your brand cited by AI.
> **Sub:** When a founder asks ChatGPT who to hire, you are either the answer or you are invisible. I make 0–10 Cr companies the answer — through AEO, GEO, and the SEO underneath it.

Also confirm the three services to feature and their order. AEO/GEO leads. The other two are the user's call.

- [ ] **Step 2: Rewrite `src/app/page.tsx`**

Keep: `organizationSchema()`, `ClientsMarquee`, `ServiceCard`, `CaseStudyCard`, `StatGrid`, `TestimonialCard`, `CtaBand`, `Container`, `Section`, `SectionHeading`, `Reveal`, `Stagger`, `StaggerItem`, `revalidate = 300`.

Drop from this page: `PlatformCard` / `platforms`, `ToolStackGrid`, `PostCard` / the writing rail, `capabilities`. All of it still lives on `/me`.

Section order:

1. **Hero** — H1 and sub from Step 1. Primary CTA `/contact` (it becomes the audit tool in a later plan). Secondary CTA `/case-studies`.
2. **`ClientsMarquee`** — unchanged, under an eyebrow reading "Brands I've worked with".
3. **Who this is for / who this isn't for** — two `Card`s side by side. For: 0–10 Cr ARR SaaS, agency owners, growth-stage startups in India. Not for: pre-revenue, anyone wanting a one-off campaign, anyone shopping on price. This section does the qualifying the contact form currently doesn't.
4. **Three services with prices** — `getPublishedEntities<Service>("services")`, filtered and ordered with AEO/GEO first, rendered through `ServiceCard`. Link out to `/services`.
5. **Two case studies** — `getPublishedEntities<CaseStudy>("case_studies")`, `.filter(c => c.featured).slice(0, 2)`, rendered through `CaseStudyCard`, which already leads with `heroMetric.value`.
6. **How it works** — the four-step `how` array. Copy it from `src/app/services/page.tsx:19-24`; do not import it from a page module.
7. **Testimonials** — a static three-column grid of `TestimonialCard`, **not** `Marquee`. Proof has to sit still long enough to be read.
8. **Who is Shubham** — two sentences and a link to `/me`. Non-optional: brand searches for the name land on `/`, and this is what keeps that query relevant.
9. **`CtaBand`** — with AEO-flavoured copy, `primaryHref={site.bookingUrl}` (the default) and `secondaryHref="/contact"`.

Fetch case studies and services in a single `Promise.all`, matching the existing pattern at `src/app/page.tsx:48`. Serial awaits stack their latency onto TTFB.

- [ ] **Step 3: Verify**

Run: `npm run lint; echo "exit=$?"` — catches the imports left behind by the deletions.
Expected: `exit=0`.

Run: `npm run build; echo "exit=$?"`
Expected: `exit=0`.

In the browser:
- `preview_eval`: `document.body.innerText.includes("startups that are just getting started")` → `false`
- `preview_eval`: `document.querySelector("h1").innerText` → the approved hero line
- `preview_eval`: `document.body.innerText.includes("From ₹")` → `true`
- `/me` still renders the personal-brand page.
- `preview_resize` to mobile; confirm the two-column "for / not for" section stacks.

- [ ] **Step 4: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat(home): buyer-facing homepage leading with the AEO/GEO wedge"
```

---

## Task 9: Ship it

- [ ] **Step 1: Confirm the branch contains only this work**

```bash
git status --short
git log --oneline origin/main..HEAD
```

Expected: eight commits, all from this plan. If a commit from the concurrent session appears, stop and ask.

- [ ] **Step 2: Final verification**

```bash
npm test; echo "exit=$?"
npm run lint; echo "exit=$?"
npm run build; echo "exit=$?"
```

All three must print `exit=0`.

- [ ] **Step 3: Open the PR**

Push the branch and open a PR against `main`. Do not merge without the user's word, and do not deploy — this project has no automatic Vercel deploy, and production releases are gated on an explicit instruction every time.

---

## What this plan does not do

- **The audit tool.** The middle rung between "read a post" and "book a call" is the whole point of the funnel, and it is not here. It needs to score a stranger's URL, but `src/lib/seo/analyzer.ts` reads TSX from the local filesystem. The missing pieces — `src/lib/seo/fetch-html.ts` and `src/lib/seo/parse-html.ts` — **landed on `origin/main` during this planning session** via PR #108. Its own plan should adapt the analyzer to consume parsed HTML and wrap it in a public route; it must not rebuild the fetcher. Until it ships, the hero CTA points at `/contact`.
- **Contextual CTAs.** `CtaBand` gains the props here; nothing yet chooses a case study by post category.
- **Bottom-of-funnel content.** Money pages for "AEO agency India" and its neighbours. Content, not code.
- **Lead qualification, scoring, and reply-speed SLAs.** There is no pipeline to triage yet. Attribution first; decide what to filter once something arrives.

---

## Open questions

1. **The hero sentence.** Blocks Task 8, Step 1.
2. **Do the published case studies carry numbers worth leading with?** `heroMetric` is a required field on the type, so every case study has one. Whether the published values are compelling has not been verified — the project database is not reachable from a planning session. Check before Task 8; if they are thin, section 5 should be cut rather than shipped weak.
3. **Does `/me` deserve a primary-nav slot?** Currently it gets a footer entry and a link from the `/` bio strip. That may be too quiet for the page that carries the personal brand.
