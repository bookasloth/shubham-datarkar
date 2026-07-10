# SEO Scoring Profiles + Route Single-Source Implementation Plan (PR 2 of 5)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the audit score mean something — one source of truth for what a route *is*, weighted checks that honour `priority`, checks that don't apply leaving the denominator, and issue counts that don't triple-count.

**Architecture:** A new `src/lib/seo/routes.ts` classifies every route into one of four `PageType`s and derives `isPrivate` and `isIndexable` from that classification. `sitemap.ts` and `discovery.ts` both consume it, so they cannot disagree. `scoring.ts` gains weights and an `applies` predicate per check. `audit.ts` keys issue counts on `check.id`.

**Tech Stack:** Next.js 16.2.9 (App Router), React 19.2.4, TypeScript 5, Vitest 4.

**Spec:** `docs/superpowers/specs/2026-07-10-seo-entity-and-audit-accuracy-design.md` — this plan implements §5 (page-type profiles), §4.1's `routes.ts`, and the scoring/dedupe half of §12's PR 2 row.

## Context: PR 1 already landed

`main` now contains the rendered-HTML analyzer (`parse-html.ts`, `fetch-html.ts`), a null-aware `audit.ts`, and `scoring.ts` predicates realigned to schema.org `@type` values. Do not redo any of that.

## A live bug this PR fixes

`src/app/sitemap.ts` emits every discovered route where `!p.isPrivate && !p.route.includes("[")`. `PRIVATE_PREFIXES` covers only `/admin`, `/dashboard`, `/login`, `/settings`, `/profile`, `/success`, `/search`.

It therefore **currently emits `/games/login`, `/members/login`, `/members/account`, `/community/compose`, `/unsubscribe`, `/subscriber-assets`, and every game archive / results / leaderboard page into the sitemap.** Login and account pages are being advertised to Google.

Meanwhile `discovery.ts` computes each page's `inSitemap` flag from a *separate* hand-maintained list, `SITEMAP_STATIC_PATHS`, which does not contain those routes — so the audit reports "In sitemap: No" for pages that are, in fact, in the sitemap. The dashboard was wrong in the direction that hid the defect.

`routes.ts` inverts the dependency: one `isIndexable(route)` function that both modules consume.

## Global Constraints

- **Work in the git worktree `C:\Users\shubh\seo-wt`, on branch `feat/seo-scoring-profiles`.** Do NOT touch `C:\Users\shubh\OneDrive\Documents\Claude\Projects\Shubham Datarkar Website` — a concurrent Claude session owns that directory. Its `node_modules` is junctioned; the test suite works.
- Before every commit, run `git branch --show-current`. It must print `feat/seo-scoring-profiles`.
- No new production dependencies.
- **Weights are exactly `high = 3`, `medium = 2`, `low = 1`.**
- **A check whose `applies` returns false leaves BOTH the numerator and the denominator.** It is neither a pass nor a failure. This is the mechanism that makes "100/100" reachable honestly.
- **`app`-type routes are never scored and never in the sitemap.** They are the private ones.
- Category blend is unchanged: `overall = seo × 0.5 + geo × 0.3 + aeo × 0.2`.
- `scoreColor` thresholds are unchanged: green ≥ 85, yellow ≥ 70, orange ≥ 50, red below.
- Every commit message ends with:
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`
  Write the message to a temp file and use `git commit -F <file>` — PowerShell here-strings mangle multi-line `-m` in this environment.
- Verify the build by its own exit code. In this worktree the default Turbopack build fails on the junctioned `node_modules` (`Symlink ... points out of the filesystem root`), an environment artifact — use `npx next build --webpack`, which also needs a temporary `.env.local` with placeholder Supabase vars. Delete it afterwards and confirm `git status` is clean.
- Do not deploy. Deployment is gated on explicit instruction.

## Explicitly NOT in this PR

Stated so nobody "helpfully" adds them:

- **No `noIndex: true` metadata on app pages.** Removing them from the sitemap is this PR's job; adding the robots meta tag belongs to the metadata-plumbing PR, where `buildMetadata` grows and the 14 metadata-less pages get metadata at all.
- **No `buildMetadata` `ogTitle`/`ogDescription`.** Next PR.
- **No root `title.template`.** Next PR.
- **No `seo` block on `lib/data/types.ts`.** Next PR.
- **No `/community/p/[id]` expansion.** It needs a DB query and a `generateMetadata`; it lands with the metadata plumbing. In this PR it stays an unexpanded template, and `isIndexable` returns false for any route containing `[` because a template is not a URL.
- **No `getOrigin()` SSRF hardening.** Deferred by decision.

## File Structure

| File | Responsibility |
| --- | --- |
| `src/lib/seo/routes.ts` (create) | `PageType`, `pageTypeOf`, `isPrivate`, `isIndexable`. Pure, no I/O. |
| `src/lib/seo/routes.test.ts` (create) | Pins the classification of every route family. |
| `src/lib/seo/types.ts` (modify) | `PageEntry.pageType`; `CheckResult.applicable`; `ScoreBreakdown.skipped`; `AuditSummary.issuesByType` shape. |
| `src/lib/seo/discovery.ts` (modify) | Consume `routes.ts`. Delete `SITEMAP_STATIC_PATHS` and `getSitemapPaths`. |
| `src/lib/seo/discovery.test.ts` (modify) | Drop the `getSitemapPaths` block; assert the new sitemap semantics. |
| `src/app/sitemap.ts` (modify) | Filter by `isIndexable`. |
| `src/lib/seo/constants.ts` (modify) | Delete `PRIVATE_PREFIXES` — `pageTypeOf` subsumes it. |
| `src/lib/seo/scoring.ts` (modify) | Weights, `applies`, new `seo-h2-present`. |
| `src/lib/seo/scoring.test.ts` (modify) | Weighting and applicability tests. |
| `src/lib/seo/audit.ts` (modify) | `issuesByType` keyed on `check.id`. |
| `src/lib/seo/audit.test.ts` (modify) | Fixtures gain `pageType`; assert no issue count exceeds the page count. |
| `src/app/admin/seo/seo-dashboard.tsx` (modify) | React key `issue.id`; show category. |
| `src/app/admin/seo/pages/pages-table.tsx` (modify) | Issue count excludes non-applicable checks. |
| `src/app/admin/seo/pages/[page]/page-detail.tsx` (modify) | Recommendations exclude non-applicable; show "not applicable" count. |

---

### Task 1: Classify every route

**Files:**
- Create: `src/lib/seo/routes.ts`
- Create: `src/lib/seo/routes.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `type PageType = "pillar" | "hub" | "utility" | "app"`; `pageTypeOf(route: string): PageType`; `isPrivate(route: string): boolean`; `isIndexable(route: string): boolean`.

Purely additive — nothing imports it yet, so the suite stays green.

- [ ] **Step 1: Write the failing test**

Create `src/lib/seo/routes.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { pageTypeOf, isPrivate, isIndexable } from "./routes";

describe("pageTypeOf", () => {
  it("classifies the marketing pillars", () => {
    for (const route of ["/", "/about", "/my-story", "/philosophy", "/speaking"]) {
      expect(pageTypeOf(route)).toBe("pillar");
    }
  });

  it("classifies detail pages as pillars", () => {
    expect(pageTypeOf("/services/seo")).toBe("pillar");
    expect(pageTypeOf("/products/alluminaty")).toBe("pillar");
    expect(pageTypeOf("/case-studies/corart-meta-lead-gen")).toBe("pillar");
    expect(pageTypeOf("/blog/seo/some-post-slug")).toBe("pillar");
  });

  it("classifies index pages as hubs, not pillars", () => {
    expect(pageTypeOf("/services")).toBe("hub");
    expect(pageTypeOf("/products")).toBe("hub");
    expect(pageTypeOf("/case-studies")).toBe("hub");
    expect(pageTypeOf("/blog")).toBe("hub");
  });

  it("treats a blog category as a hub and a blog post as a pillar", () => {
    expect(pageTypeOf("/blog/seo")).toBe("hub");
    expect(pageTypeOf("/blog/seo/technical-seo-guide")).toBe("pillar");
  });

  it("classifies game and member landings as hubs", () => {
    for (const route of ["/games", "/games/alfazy", "/games/hit-and-blow", "/games/integra", "/members", "/community"]) {
      expect(pageTypeOf(route)).toBe("hub");
    }
  });

  it("classifies utility pages", () => {
    for (const route of ["/contact", "/book", "/link", "/help", "/support", "/support/supporters", "/support/updates", "/privacy-policy", "/terms-of-use"]) {
      expect(pageTypeOf(route)).toBe("utility");
    }
  });

  it("classifies admin subtrees as app", () => {
    expect(pageTypeOf("/admin")).toBe("app");
    expect(pageTypeOf("/admin/seo/pages")).toBe("app");
    expect(pageTypeOf("/dashboard")).toBe("app");
    expect(pageTypeOf("/login")).toBe("app");
    expect(pageTypeOf("/search")).toBe("app");
  });

  it("classifies auth and account routes under public subtrees as app", () => {
    for (const route of [
      "/games/login", "/games/profile", "/games/leaderboard",
      "/members/login", "/members/account", "/members/upgrade", "/members/tools",
      "/community/compose", "/community/me", "/community/bookmarks",
      "/unsubscribe", "/subscriber-assets",
    ]) {
      expect(pageTypeOf(route)).toBe("app");
    }
  });

  it("classifies per-game archive, results, and leaderboard as app", () => {
    expect(pageTypeOf("/games/alfazy/archive")).toBe("app");
    expect(pageTypeOf("/games/hit-and-blow/results")).toBe("app");
    expect(pageTypeOf("/games/integra/leaderboard")).toBe("app");
  });

  it("classifies gated dynamic templates as app", () => {
    expect(pageTypeOf("/games/alfazy/[puzzle]")).toBe("app");
    expect(pageTypeOf("/members/tools/[slug]")).toBe("app");
    expect(pageTypeOf("/members/resources/[slug]")).toBe("app");
    expect(pageTypeOf("/support/updates/[code]")).toBe("app");
  });

  it("does not let the /profile prefix swallow /games/profile via prefix matching", () => {
    // Both are app, but for different reasons — this pins that /games/profile is
    // matched by the explicit route list, not by a sloppy startsWith("/profile").
    expect(pageTypeOf("/profile")).toBe("app");
    expect(pageTypeOf("/games/profile")).toBe("app");
    expect(pageTypeOf("/profiles-of-founders")).toBe("hub");
  });

  it("falls back to hub for anything unrecognised", () => {
    expect(pageTypeOf("/tools")).toBe("hub");
    expect(pageTypeOf("/tools/roas-calculator")).toBe("hub");
    expect(pageTypeOf("/newsletter")).toBe("hub");
    expect(pageTypeOf("/some-new-page-nobody-mapped")).toBe("hub");
  });
});

describe("isPrivate", () => {
  it("is true exactly for app routes", () => {
    expect(isPrivate("/admin/seo")).toBe(true);
    expect(isPrivate("/members/account")).toBe(true);
    expect(isPrivate("/about")).toBe(false);
    expect(isPrivate("/games")).toBe(false);
  });
});

describe("isIndexable", () => {
  it("excludes app routes", () => {
    expect(isIndexable("/games/login")).toBe(false);
    expect(isIndexable("/members/account")).toBe(false);
    expect(isIndexable("/unsubscribe")).toBe(false);
    expect(isIndexable("/admin")).toBe(false);
  });

  it("excludes unexpanded dynamic templates, which are not URLs", () => {
    expect(isIndexable("/community/p/[id]")).toBe(false);
    expect(isIndexable("/blog/[category]")).toBe(false);
  });

  it("includes real public routes", () => {
    for (const route of ["/", "/about", "/blog", "/blog/seo", "/services/seo", "/games", "/link", "/privacy-policy"]) {
      expect(isIndexable(route)).toBe(true);
    }
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

From `C:\Users\shubh\seo-wt`, run: `npx vitest run src/lib/seo/routes.test.ts`
Expected: FAIL — `Failed to resolve import "./routes"`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/seo/routes.ts`:

```ts
/**
 * Single source of truth for what a route IS.
 *
 * `sitemap.ts` and `discovery.ts` both consume this. Before it existed they each
 * had their own idea of which routes belonged in the sitemap, and they disagreed:
 * the sitemap emitted `/games/login` and `/members/account` while the audit
 * reported those same routes as "not in sitemap".
 */

export type PageType = "pillar" | "hub" | "utility" | "app";

/** Subtrees that are entirely application UI. */
const APP_PREFIXES = [
  "/admin",
  "/dashboard",
  "/login",
  "/settings",
  "/profile",
  "/success",
  "/search",
];

/** Application routes sitting under an otherwise-public subtree. */
const APP_ROUTES = new Set([
  "/games/login",
  "/games/profile",
  "/games/leaderboard",
  "/members/login",
  "/members/account",
  "/members/bookmarks",
  "/members/downloads",
  "/members/explore",
  "/members/latest",
  "/members/requests",
  "/members/tools",
  "/members/upgrade",
  "/community/compose",
  "/community/me",
  "/community/bookmarks",
  "/unsubscribe",
  "/subscriber-assets",
]);

const APP_PATTERNS = [
  /^\/games\/[^/]+\/(?:archive|results|leaderboard)$/,
  /^\/games\/[^/]+\/\[puzzle\]$/,
  /^\/members\/(?:tools|resources)\/\[slug\]$/,
  /^\/support\/updates\/\[code\]$/,
];

const UTILITY_ROUTES = new Set([
  "/contact",
  "/book",
  "/link",
  "/help",
  "/support",
  "/support/supporters",
  "/support/updates",
  "/privacy-policy",
  "/terms-of-use",
]);

const PILLAR_ROUTES = new Set(["/", "/about", "/my-story", "/philosophy", "/speaking"]);

const PILLAR_PATTERNS = [
  /^\/(?:services|products|case-studies)\/[^/]+$/,
  // A blog post is three segments deep; /blog/<category> is only two and is a hub.
  /^\/blog\/[^/]+\/[^/]+$/,
];

export function pageTypeOf(route: string): PageType {
  if (APP_PREFIXES.some((p) => route === p || route.startsWith(`${p}/`))) return "app";
  if (APP_ROUTES.has(route)) return "app";
  if (APP_PATTERNS.some((re) => re.test(route))) return "app";
  if (UTILITY_ROUTES.has(route)) return "utility";
  if (PILLAR_ROUTES.has(route)) return "pillar";
  if (PILLAR_PATTERNS.some((re) => re.test(route))) return "pillar";
  return "hub";
}

/** An app route is the private one. Never scored, never crawled. */
export function isPrivate(route: string): boolean {
  return pageTypeOf(route) === "app";
}

/**
 * Belongs in the sitemap. A route containing `[` is an unexpanded template, not
 * a URL — discovery expands the ones backed by a data source.
 */
export function isIndexable(route: string): boolean {
  if (route.includes("[")) return false;
  return pageTypeOf(route) !== "app";
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/seo/routes.test.ts`
Expected: PASS — 14 tests.

- [ ] **Step 5: Confirm nothing else broke**

Run: `npm run test`
Expected: PASS. `routes.ts` is additive; no existing module imports it yet.

- [ ] **Step 6: Commit**

```bash
git add src/lib/seo/routes.ts src/lib/seo/routes.test.ts
git commit -F <msgfile>
```
Subject: `feat(seo): classify every route into a page type`

---

### Task 2: One source of truth for the sitemap

**Files:**
- Modify: `src/lib/seo/types.ts`
- Modify: `src/lib/seo/discovery.ts`
- Modify: `src/lib/seo/discovery.test.ts`
- Modify: `src/app/sitemap.ts`
- Modify: `src/lib/seo/constants.ts`

**Interfaces:**
- Consumes: `pageTypeOf`, `isPrivate`, `isIndexable` (Task 1).
- Produces: `PageEntry` gains `pageType: PageType`. `getSitemapPaths` and `PRIVATE_PREFIXES` cease to exist.

This is the commit that drops login and account pages from the sitemap.

- [ ] **Step 1: Add `pageType` to `PageEntry`**

In `src/lib/seo/types.ts`, add the import and the field:

```ts
import type { PageType } from "./routes";

export type PageEntry = {
  route: string;
  filePath: string;
  isDynamic: boolean;
  isPrivate: boolean;
  inSitemap: boolean;
  pageType: PageType;
};
```

- [ ] **Step 2: Rewrite the failing parts of `discovery.test.ts`**

Replace the whole `describe("getSitemapPaths", ...)` block and the `describe("sitemap auto-discovery", ...)` block with:

```ts
describe("sitemap membership", () => {
  it("excludes auth and account routes that used to leak into the sitemap", async () => {
    const pages = await discoverPages();
    const leaked = pages.filter((p) => p.inSitemap).map((p) => p.route);
    for (const route of ["/games/login", "/members/login", "/members/account", "/community/compose", "/unsubscribe", "/subscriber-assets"]) {
      expect(leaked).not.toContain(route);
    }
  });

  it("keeps real public routes in the sitemap", async () => {
    const pages = await discoverPages();
    const indexed = pages.filter((p) => p.inSitemap).map((p) => p.route);
    for (const route of ["/", "/about", "/blog", "/services", "/contact", "/faq", "/games", "/link"]) {
      expect(indexed).toContain(route);
    }
  });

  it("never puts an unexpanded dynamic template in the sitemap", async () => {
    const pages = await discoverPages();
    expect(pages.filter((p) => p.inSitemap && p.route.includes("["))).toEqual([]);
  });

  it("assigns every discovered page a pageType", async () => {
    const pages = await discoverPages();
    expect(pages.every((p) => ["pillar", "hub", "utility", "app"].includes(p.pageType))).toBe(true);
  });

  it("marks app routes private and non-indexable together", async () => {
    const pages = await discoverPages();
    for (const p of pages) {
      expect(p.isPrivate).toBe(p.pageType === "app");
      if (p.pageType === "app") expect(p.inSitemap).toBe(false);
    }
  });
});
```

Also change the top import — `getSitemapPaths` no longer exists:

```ts
import { discoverPages } from "./discovery";
```

Leave the existing `describe("discoverPages", ...)` block alone except for its `"cross-checks against sitemap"` test, which still passes (`/about` is indexable).

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run src/lib/seo/discovery.test.ts`
Expected: FAIL — `getSitemapPaths` import error resolved, but `pageType` is undefined on every entry and `/games/login` is still `inSitemap: true`.

- [ ] **Step 4: Rewrite `discovery.ts`**

Delete the `SITEMAP_STATIC_PATHS` constant, the `getSitemapPaths` export, and the `PRIVATE_PREFIXES` import. Replace them with `routes.ts`.

Change the import block:

```ts
import fs from "node:fs";
import path from "node:path";
import type { PageEntry } from "./types";
import { isIndexable, isPrivate, pageTypeOf } from "./routes";
import { blogCategories } from "@/lib/data/posts";
import { caseStudies } from "@/lib/data/case-studies";
import { services } from "@/lib/data/services";
import { tools } from "@/lib/data/tools";
import { products } from "@/lib/data/products";
```

`discoverPages` keeps its `blogPosts` parameter and its `DYNAMIC_EXPANSIONS`, but the `sitemapPaths` set disappears. Both `pages.push(...)` sites become:

```ts
          pages.push({
            route: expanded.route,
            filePath: relFilePath,
            isDynamic: true,
            isPrivate: isPrivate(expanded.route),
            inSitemap: isIndexable(expanded.route),
            pageType: pageTypeOf(expanded.route),
          });
```

and, for the unexpanded-template and static branches respectively:

```ts
        pages.push({
          route,
          filePath: relFilePath,
          isDynamic: true,
          isPrivate: isPrivate(route),
          inSitemap: isIndexable(route),
          pageType: pageTypeOf(route),
        });
```

```ts
      pages.push({
        route,
        filePath: relFilePath,
        isDynamic: false,
        isPrivate: isPrivate(route),
        inSitemap: isIndexable(route),
        pageType: pageTypeOf(route),
      });
```

`isIndexable` already returns false for any route containing `[`, so the unexpanded-template branch no longer needs its hardcoded `inSitemap: false`.

Note `discoverPages`'s `blogPosts` parameter is now unused for sitemap membership but is still needed to expand `/blog/[category]/[slug]` into real post routes. Keep it.

- [ ] **Step 5: Point `sitemap.ts` at the same function**

In `src/app/sitemap.ts`, change the import and the filter:

```ts
import { isIndexable } from "@/lib/seo/routes";
```

```ts
  return pages
    .filter((p) => isIndexable(p.route))
```

The old filter was `!p.isPrivate && !p.route.includes("[")`. That is what leaked `/games/login` — `isPrivate` was true only for the seven `PRIVATE_PREFIXES`.

- [ ] **Step 6: Delete `PRIVATE_PREFIXES`**

In `src/lib/seo/constants.ts`, delete the `PRIVATE_PREFIXES` export. `pageTypeOf` subsumes it: those seven prefixes are now `APP_PREFIXES` in `routes.ts`. Keep `scoreColor` and `SCORE_TONE`.

Grep to confirm nothing still imports it: `grep -rn "PRIVATE_PREFIXES" src/`

- [ ] **Step 7: Run the tests**

Run: `npx vitest run src/lib/seo/discovery.test.ts`
Expected: PASS.

Run: `npm run test`
Expected: FAIL in `audit.test.ts` and `scoring.test.ts` — their hand-built `PageEntry` fixtures now lack the required `pageType` field. Add `pageType: "pillar"` to each fixture entry to make them compile; Tasks 3 and 4 replace those fixtures properly.

- [ ] **Step 8: Type-check**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 9: Prove the sitemap actually changed**

Run this one-off check and paste its real output into your report:

```bash
npx tsx -e "import('./src/lib/seo/discovery.ts').then(async m => { const p = await m.discoverPages(); const inMap = p.filter(x=>x.inSitemap).map(x=>x.route).sort(); console.log('IN SITEMAP:', inMap.length); console.log('leaked?', inMap.filter(r=>/login|account|compose|unsubscribe|subscriber-assets/.test(r))); })"
```

If `@/` alias resolution fails under `tsx`, import by relative path instead. The `leaked?` array must be empty. Report the total count of indexable routes.

- [ ] **Step 10: Commit**

```bash
git add src/lib/seo/routes.ts src/lib/seo/types.ts src/lib/seo/discovery.ts src/lib/seo/discovery.test.ts src/lib/seo/constants.ts src/app/sitemap.ts src/lib/seo/scoring.test.ts src/lib/seo/audit.test.ts
git commit -F <msgfile>
```
Subject: `fix(seo)!: one source of truth for sitemap membership`

Body must state that `/games/login`, `/members/login`, `/members/account`, `/community/compose`, `/unsubscribe`, and `/subscriber-assets` were being emitted into the sitemap and no longer are.

---

### Task 3: Weighted, profile-aware scoring

**Files:**
- Modify: `src/lib/seo/types.ts`
- Modify: `src/lib/seo/scoring.ts`
- Modify: `src/lib/seo/scoring.test.ts`

**Interfaces:**
- Consumes: `PageType` and `PageEntry.pageType` (Tasks 1-2).
- Produces: `CheckResult` gains `applicable: boolean`. `ScoreBreakdown` gains `skipped: string[]`. `scorePage` unchanged in signature.

- [ ] **Step 1: Extend the types**

In `src/lib/seo/types.ts`:

```ts
export type CheckResult = {
  id: string;
  label: string;
  passed: boolean;
  /** False when the check does not apply to this page's type. Neither pass nor fail. */
  applicable: boolean;
  category: "seo" | "geo" | "aeo";
  priority: "high" | "medium" | "low";
};

export type ScoreBreakdown = {
  score: number;
  passed: string[];
  failed: string[];
  /** Checks that did not apply to this page type. Excluded from the denominator. */
  skipped: string[];
};
```

- [ ] **Step 2: Write the failing tests**

In `src/lib/seo/scoring.test.ts`, keep the existing `goodAnalysis` fixture but replace `goodEntry` and append a new `describe`. The fixture entry must now carry `pageType`:

```ts
import { describe, it, expect } from "vitest";
import { scorePage } from "./scoring";
import type { PageEntry, PageAnalysis } from "./types";
import type { PageType } from "./routes";

const entryOf = (route: string, pageType: PageType): PageEntry => ({
  route,
  filePath: "src/app/x/page.tsx",
  isDynamic: false,
  isPrivate: false,
  inSitemap: true,
  pageType,
});

const goodEntry = entryOf("/about", "pillar");
```

Append:

```ts
describe("profile-aware scoring", () => {
  it("does not fail a utility page for lacking FAQ schema", () => {
    const contact = entryOf("/contact", "utility");
    const scores = scorePage(contact, goodAnalysis);
    const faq = scores.checks.find((c) => c.id === "geo-faq")!;
    expect(faq.applicable).toBe(false);
    expect(faq.passed).toBe(false);
    expect(scores.geo.failed).not.toContain("Has FAQ schema");
    expect(scores.geo.skipped).toContain("Has FAQ schema");
  });

  it("does demand FAQ schema on /faq and on service pages", () => {
    for (const route of ["/faq", "/services/seo"]) {
      const type: PageType = route === "/faq" ? "hub" : "pillar";
      const scores = scorePage(entryOf(route, type), goodAnalysis);
      expect(scores.checks.find((c) => c.id === "geo-faq")!.applicable).toBe(true);
    }
  });

  it("does not demand a 300-word body of a utility page", () => {
    const scores = scorePage(entryOf("/link", "utility"), { ...goodAnalysis, wordCount: 12 });
    expect(scores.checks.find((c) => c.id === "geo-word-count")!.applicable).toBe(false);
  });

  it("does not demand a breadcrumb of the homepage", () => {
    const scores = scorePage(entryOf("/", "pillar"), goodAnalysis);
    expect(scores.checks.find((c) => c.id === "seo-breadcrumb")!.applicable).toBe(false);
    expect(scores.checks.find((c) => c.id === "geo-breadcrumbs")!.applicable).toBe(false);
  });

  it("demands a dedicated OG image of a pillar but not of a hub", () => {
    expect(scorePage(entryOf("/about", "pillar"), goodAnalysis).checks.find((c) => c.id === "seo-og-image")!.applicable).toBe(true);
    expect(scorePage(entryOf("/blog", "hub"), goodAnalysis).checks.find((c) => c.id === "seo-og-image")!.applicable).toBe(false);
  });
});

describe("weighting", () => {
  it("costs more to fail a high-priority check than a low-priority one", () => {
    const missingTitle = scorePage(goodEntry, { ...goodAnalysis, title: null, titleLength: 0 });
    const missingTwitter = scorePage(goodEntry, { ...goodAnalysis, hasTwitterCard: false });
    expect(missingTitle.seo.score).toBeLessThan(missingTwitter.seo.score);
  });

  it("scores 100 when every applicable check passes", () => {
    const perfect: PageAnalysis = {
      ...goodAnalysis,
      titleLength: 45,
      descriptionLength: 140,
      ogImageSource: "dedicated",
      schemas: ["BreadcrumbList", "ProfilePage", "Person", "WebSite", "FAQPage", "Service"],
      hasBreadcrumbs: true,
      h1Count: 1,
      h2Count: 3,
      wordCount: 800,
      internalLinks: 6,
      listCount: 2,
    };
    const scores = scorePage(entryOf("/services/seo", "pillar"), perfect);
    expect(scores.seo.score).toBe(100);
    expect(scores.geo.score).toBe(100);
    expect(scores.aeo.score).toBe(100);
    expect(scores.overall).toBe(100);
  });

  it("a skipped check is neither passed nor failed", () => {
    const scores = scorePage(entryOf("/contact", "utility"), goodAnalysis);
    for (const b of [scores.seo, scores.geo, scores.aeo]) {
      const overlap = b.skipped.filter((s) => b.passed.includes(s) || b.failed.includes(s));
      expect(overlap).toEqual([]);
    }
  });

  it("requires at least one H2 on every scored page", () => {
    const noH2 = scorePage(goodEntry, { ...goodAnalysis, h2Count: 0 });
    const check = noH2.checks.find((c) => c.id === "seo-h2-present")!;
    expect(check.applicable).toBe(true);
    expect(check.passed).toBe(false);
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run src/lib/seo/scoring.test.ts`
Expected: FAIL — `applicable` is undefined, `skipped` is undefined, `seo-h2-present` does not exist.

- [ ] **Step 4: Rewrite `scoring.ts`**

Replace the entire file:

```ts
import type { PageEntry, PageAnalysis, PageScores, CheckResult, ScoreBreakdown } from "./types";
import type { PageType } from "./routes";
import { scoreColor } from "./constants";

type Check = {
  id: string;
  label: string;
  test: (entry: PageEntry, analysis: PageAnalysis) => boolean;
  priority: "high" | "medium" | "low";
  /**
   * When present and false, the check leaves BOTH the numerator and the
   * denominator. It is neither a pass nor a failure — the page simply is not the
   * kind of page the check is asking about.
   */
  applies?: (entry: PageEntry) => boolean;
};

const WEIGHT = { high: 3, medium: 2, low: 1 } as const;

const onlyOn = (...types: PageType[]) => (e: PageEntry) => types.includes(e.pageType);
const notHome = (e: PageEntry) => e.route !== "/";

/**
 * FAQPage markup requires the questions and answers be visible on the page.
 * Emitting it elsewhere to satisfy a checker violates Google's structured-data
 * policy, so the check simply does not apply to pages without an FAQ.
 */
const hasVisibleFaq = (e: PageEntry) => e.route === "/faq" || e.route.startsWith("/services/");

const SEO_CHECKS: Check[] = [
  { id: "seo-has-title", label: "Has title", test: (_, a) => !!a.title, priority: "high" },
  { id: "seo-title-length", label: "Title length 30-60 chars", test: (_, a) => a.titleLength >= 30 && a.titleLength <= 60, priority: "medium" },
  { id: "seo-has-desc", label: "Has description", test: (_, a) => !!a.description, priority: "high" },
  { id: "seo-desc-length", label: "Description length 120-160 chars", test: (_, a) => a.descriptionLength >= 120 && a.descriptionLength <= 160, priority: "medium" },
  { id: "seo-canonical", label: "Has canonical URL", test: (_, a) => a.hasCanonical, priority: "high" },
  { id: "seo-og", label: "Has Open Graph tags", test: (_, a) => a.hasOgTags, priority: "medium" },
  { id: "seo-twitter", label: "Has Twitter card", test: (_, a) => a.hasTwitterCard, priority: "low" },
  { id: "seo-og-image", label: "Has dedicated OG image", test: (_, a) => a.ogImageSource === "dedicated", priority: "low", applies: onlyOn("pillar") },
  { id: "seo-breadcrumb", label: "Has breadcrumb schema", test: (_, a) => a.hasBreadcrumbs, priority: "medium", applies: notHome },
  { id: "seo-h1-present", label: "Has at least one H1", test: (_, a) => a.h1Count >= 1, priority: "high" },
  { id: "seo-h1-single", label: "No more than one H1", test: (_, a) => a.h1Count <= 1, priority: "medium" },
  { id: "seo-h2-present", label: "Has at least one H2", test: (_, a) => a.h2Count >= 1, priority: "medium" },
  { id: "seo-sitemap", label: "In sitemap", test: (e) => e.inSitemap, priority: "high" },
];

const ENTITY_TYPES = ["Article", "Service", "Product", "ProfilePage", "Organization"];
const SITE_WIDE_TYPES = ["Person", "WebSite", "BreadcrumbList"];

const GEO_CHECKS: Check[] = [
  { id: "geo-schema", label: "Has structured data", test: (_, a) => a.schemas.length > 0, priority: "high" },
  { id: "geo-author", label: "Has author/person schema", test: (_, a) => a.schemas.some((s) => ["ProfilePage", "Person"].includes(s)), priority: "medium" },
  { id: "geo-faq", label: "Has FAQ schema", test: (_, a) => a.schemas.includes("FAQPage"), priority: "medium", applies: hasVisibleFaq },
  { id: "geo-breadcrumbs", label: "Has breadcrumbs", test: (_, a) => a.hasBreadcrumbs, priority: "medium", applies: notHome },
  { id: "geo-description", label: "Has description", test: (_, a) => a.descriptionLength > 0, priority: "high" },
  { id: "geo-entity-schema", label: "Has entity-relevant schema", test: (_, a) => a.schemas.some((s) => ENTITY_TYPES.includes(s)), priority: "medium", applies: onlyOn("pillar", "hub") },
  { id: "geo-word-count", label: "Word count > 300", test: (_, a) => a.wordCount > 300, priority: "medium", applies: onlyOn("pillar") },
  { id: "geo-internal-links", label: "Has internal links > 2", test: (_, a) => a.internalLinks > 2, priority: "low", applies: onlyOn("pillar", "hub") },
  { id: "geo-content-schema", label: "Content type schema matches page", test: (_, a) => a.schemas.some((s) => !SITE_WIDE_TYPES.includes(s)), priority: "low", applies: onlyOn("pillar", "hub") },
  { id: "geo-sitemap", label: "In sitemap", test: (e) => e.inSitemap, priority: "high" },
];

const AEO_CHECKS: Check[] = [
  { id: "aeo-faq", label: "Has FAQ schema", test: (_, a) => a.schemas.includes("FAQPage"), priority: "high", applies: hasVisibleFaq },
  { id: "aeo-breadcrumbs", label: "Has breadcrumbs", test: (_, a) => a.hasBreadcrumbs, priority: "medium", applies: notHome },
  { id: "aeo-headings", label: "Has structured headings (H1 + H2s)", test: (_, a) => a.h1Count >= 1 && a.h2Count >= 1, priority: "high" },
  { id: "aeo-word-count", label: "Word count > 200", test: (_, a) => a.wordCount > 200, priority: "medium", applies: onlyOn("pillar", "hub") },
  { id: "aeo-description", label: "Has description", test: (_, a) => a.descriptionLength > 0, priority: "medium" },
  { id: "aeo-lists", label: "Has list or table patterns", test: (_, a) => a.listCount > 0, priority: "low", applies: onlyOn("pillar", "hub") },
  { id: "aeo-h2-count", label: "H2 count >= 2", test: (_, a) => a.h2Count >= 2, priority: "medium", applies: onlyOn("pillar", "hub") },
  { id: "aeo-schema", label: "Has schema.org markup", test: (_, a) => a.schemas.length > 0, priority: "high" },
];

function runChecks(
  checks: Check[],
  category: "seo" | "geo" | "aeo",
  entry: PageEntry,
  analysis: PageAnalysis,
): { breakdown: ScoreBreakdown; results: CheckResult[] } {
  const results: CheckResult[] = checks.map((check) => {
    const applicable = check.applies ? check.applies(entry) : true;
    return {
      id: check.id,
      label: check.label,
      applicable,
      passed: applicable && check.test(entry, analysis),
      category,
      priority: check.priority,
    };
  });

  const applicable = results.filter((r) => r.applicable);
  const weight = (r: CheckResult) => WEIGHT[r.priority];
  const earned = applicable.filter((r) => r.passed).reduce((sum, r) => sum + weight(r), 0);
  const total = applicable.reduce((sum, r) => sum + weight(r), 0);

  // A category with nothing applicable is vacuously complete, not a zero.
  // Unreachable today — every category has unconditional checks — but a zero
  // here would read as "this page failed" when it means "nothing was asked".
  const score = total === 0 ? 100 : Math.round((earned / total) * 100);

  return {
    breakdown: {
      score,
      passed: applicable.filter((r) => r.passed).map((r) => r.label),
      failed: applicable.filter((r) => !r.passed).map((r) => r.label),
      skipped: results.filter((r) => !r.applicable).map((r) => r.label),
    },
    results,
  };
}

export function scorePage(entry: PageEntry, analysis: PageAnalysis): PageScores {
  const seo = runChecks(SEO_CHECKS, "seo", entry, analysis);
  const geo = runChecks(GEO_CHECKS, "geo", entry, analysis);
  const aeo = runChecks(AEO_CHECKS, "aeo", entry, analysis);

  const overall = Math.round(seo.breakdown.score * 0.5 + geo.breakdown.score * 0.3 + aeo.breakdown.score * 0.2);

  return {
    seo: seo.breakdown,
    geo: geo.breakdown,
    aeo: aeo.breakdown,
    overall,
    color: scoreColor(overall),
    checks: [...seo.results, ...geo.results, ...aeo.results],
  };
}
```

- [ ] **Step 5: Run the tests**

Run: `npx vitest run src/lib/seo/scoring.test.ts`
Expected: PASS.

The `"scores 100 when every applicable check passes"` test is the one that matters. If it fails, do not adjust the expected value — find out which applicable check is not passing and say so in your report. That test is the operational definition of "100/100".

- [ ] **Step 6: Sanity-check the weighting by mutation**

Temporarily change `WEIGHT` to `{ high: 1, medium: 1, low: 1 }` and re-run. The `"costs more to fail a high-priority check"` test must FAIL. Revert. Report what you observed. A weighting test that passes under equal weights is testing nothing.

- [ ] **Step 7: Commit**

Subject: `feat(seo): weight checks by priority and skip inapplicable ones`

---

### Task 4: Honest issue counts

**Files:**
- Modify: `src/lib/seo/types.ts`
- Modify: `src/lib/seo/audit.ts`
- Modify: `src/lib/seo/audit.test.ts`
- Modify: `src/app/admin/seo/seo-dashboard.tsx`
- Modify: `src/app/admin/seo/pages/pages-table.tsx`
- Modify: `src/app/admin/seo/pages/[page]/page-detail.tsx`

**Interfaces:**
- Consumes: `CheckResult.applicable` (Task 3).
- Produces: `AuditSummary.issuesByType: { id: string; label: string; category: "seo" | "geo" | "aeo"; count: number }[]`

`issuesByType` currently keys on `check.label`. `geo-faq` and `aeo-faq` share the label `"Has FAQ schema"`, so it reports roughly twice the page count. `"Has description"` spans three categories and triples. This is the fix.

- [ ] **Step 1: Change the summary type**

In `src/lib/seo/types.ts`:

```ts
export type IssueCount = {
  id: string;
  label: string;
  category: "seo" | "geo" | "aeo";
  count: number;
};
```

and in `AuditSummary`, replace `issuesByType: { label: string; count: number }[]` with `issuesByType: IssueCount[]`.

- [ ] **Step 2: Write the failing test**

Append to `src/lib/seo/audit.test.ts`. Its existing fixtures build `PageEntry` objects — add `pageType: "pillar"` to each.

```ts
describe("issuesByType", () => {
  it("keys on check id, so no issue can exceed the page count", () => {
    const pages = [makeScored("/a"), makeScored("/b")];
    const summary = buildSummary(pages);
    for (const issue of summary.issuesByType) {
      expect(issue.count).toBeLessThanOrEqual(summary.totalPages);
    }
  });

  it("counts geo-faq and aeo-faq separately despite the shared label", () => {
    const pages = [makeScored("/a"), makeScored("/b")];
    const summary = buildSummary(pages);
    const faqIssues = summary.issuesByType.filter((i) => i.label === "Has FAQ schema");
    // Either both categories failed it, or neither did — but they must be distinct rows.
    const ids = faqIssues.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every((id) => id === "geo-faq" || id === "aeo-faq")).toBe(true);
  });

  it("never reports a check that did not apply to the page", () => {
    // A utility page skips geo-faq entirely; it must not appear as an issue.
    const utility = makeScoredWithType("/contact", "utility");
    const summary = buildSummary([utility]);
    expect(summary.issuesByType.map((i) => i.id)).not.toContain("geo-faq");
  });
});
```

You will need a `makeScoredWithType(route, pageType)` helper alongside the existing `makeScored`. Build it the same way — real `scorePage` output, not a hand-written `PageScores`.

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run src/lib/seo/audit.test.ts`
Expected: FAIL — `issue.id` is undefined; `geo-faq` appears for the utility page.

- [ ] **Step 4: Fix `buildSummary`**

In `src/lib/seo/audit.ts`, replace the `issueCounts` block:

```ts
  const issueCounts = new Map<string, IssueCount>();
  for (const page of scored) {
    for (const check of page.scores.checks) {
      // A check that did not apply is neither passed nor failed — it is not an issue.
      if (check.applicable && !check.passed) {
        const existing = issueCounts.get(check.id);
        if (existing) existing.count++;
        else issueCounts.set(check.id, { id: check.id, label: check.label, category: check.category, count: 1 });
      }
    }
  }
  const issuesByType = [...issueCounts.values()].sort((a, b) => b.count - a.count);
```

Import `IssueCount` from `./types`.

- [ ] **Step 5: Update the three UI consumers**

`src/app/admin/seo/seo-dashboard.tsx` — the React key was `issue.label`, which is now non-unique. Key on `issue.id` and show the category so a reader can tell the two FAQ rows apart:

```tsx
            {summary.issuesByType.slice(0, 10).map((issue) => (
              <div key={issue.id} className="flex items-center justify-between text-sm">
                <span className="text-admin-text">
                  {issue.label}
                  <span className="ml-2 text-xs uppercase text-admin-text-muted">{issue.category}</span>
                </span>
                <StatusBadge tone="danger">{issue.count} pages</StatusBadge>
              </div>
            ))}
```

`src/app/admin/seo/pages/pages-table.tsx` — `issueCount` must exclude inapplicable checks:

```ts
    issueCount: scores?.checks.filter((c) => c.applicable && !c.passed).length ?? 0,
```

`src/app/admin/seo/pages/[page]/page-detail.tsx` — recommendations must exclude them too, and the score card's denominator should reflect only applicable checks:

```tsx
  const failedChecks = scores.checks
    .filter((c) => c.applicable && !c.passed)
    .sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 };
      return order[a.priority] - order[b.priority];
    });
```

In `ScoreCard`, the existing `{breakdown.passed.length}/{breakdown.passed.length + breakdown.failed.length}` is already correct — `passed` and `failed` now contain only applicable checks. Add a skipped hint beneath it:

```tsx
      <p className="text-xs text-admin-text-muted">
        checks passed
        {breakdown.skipped.length > 0 && ` · ${breakdown.skipped.length} n/a`}
      </p>
```

- [ ] **Step 6: Run everything**

Run: `npx vitest run` — expected PASS.
Run: `npx tsc --noEmit` — expected exit 0.
Run: `npx next build --webpack` (with a temporary placeholder `.env.local`, deleted afterwards) — report the real exit code, unpiped. Expected 0. Confirm `git status` is clean.

- [ ] **Step 7: Commit**

Subject: `fix(seo): key issue counts on check id, not label`

Body must state that "Has FAQ schema" previously reported roughly twice the page count because `geo-faq` and `aeo-faq` share a label.

---

## What this PR deliberately leaves broken

- **App pages still lack `noIndex` metadata.** They are out of the sitemap now, which is the crawl signal that matters, but a direct link would still be indexable. The metadata-plumbing PR adds the robots tag.
- **`/community/p/[id]` is still an unexpanded template**, so community posts are not in the sitemap despite the spec's decision to index them. Needs a DB query and a `generateMetadata`; lands with the plumbing.
- **`getOrigin()` still trusts the `Host` header.** Deferred by decision.

## Self-Review Notes

- **Spec coverage:** Implements spec §5 (profiles, check matrix, scoring formula) and the `routes.ts` half of §4.1. §7 (metadata plumbing) and §8-9 are out of scope by decision.
- **Type consistency:** `PageType` is declared in `routes.ts` (Task 1) and imported by `types.ts` (Task 2) and `scoring.ts` (Task 3). `CheckResult.applicable` is added in Task 3 and consumed in Task 4. `IssueCount` is declared in Task 4's Step 1 and used in its Step 4.
- **A note on Task 2's Step 7:** it deliberately expects a red suite. `scoring.test.ts` and `audit.test.ts` fixtures gain `pageType` there only to compile; Tasks 3 and 4 rewrite them properly. This is the one place in the plan where a task ends with known-failing sibling tests, and it is called out rather than hidden.
