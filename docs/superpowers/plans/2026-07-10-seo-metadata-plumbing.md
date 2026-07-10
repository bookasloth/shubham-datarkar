# SEO Metadata Plumbing Implementation Plan (PR 3 of 4)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every page somewhere to put its copy, take the non-indexable pages out of Google's index for real, and collapse the last duplicated route list.

**Architecture:** `robots.ts` stops keeping its own private-path list and consumes `routes.ts`. `buildMetadata` grows `ogTitle`/`ogDescription` so the social card can differ from the SERP snippet. The root layout gains a `title.template`. The four static content data files and the blog's DB rows gain optional `seo` fields, so PR 4's copy pass has somewhere to land.

**Tech Stack:** Next.js 16.2.9 (App Router), React 19.2.4, TypeScript 5, Vitest 4, Supabase.

**Spec:** `docs/superpowers/specs/2026-07-10-seo-entity-and-audit-accuracy-design.md` §7 and §9.3.

## Context: PRs 1 and 2 are on `main`

- PR 1 (`75267c9`): the audit parses rendered HTML instead of `page.tsx` source.
- PR 2 (`9587c37`): `routes.ts` classifies every route (`pillar`/`hub`/`utility`/`app`); `sitemap.ts` and `discovery.ts` consume it; scoring is weighted and profile-aware; `issuesByType` keys on `check.id`.

Do not redo any of that.

## The `noindex` correction — read this before Task 1

The obvious reading of "noindex all non-indexable pages" is: add them to `robots.txt` `Disallow` **and** give them a `noindex` meta tag. **That combination does not work.**

A `Disallow`ed URL is never fetched, so Googlebot never sees the `noindex` tag. Google may still list the bare URL — without a title or snippet — if anything links to it. `Disallow` prevents *crawling*, not *indexing*.

So the two mechanisms are used for different routes:

| Route family | `robots.txt` | meta `noindex` | Why |
| --- | --- | --- | --- |
| `APP_PREFIXES` — `/admin`, `/dashboard`, `/settings`, `/profile`, `/success`, `/search`, `/login` | `Disallow` | not needed | Server-private, auth-gated, never publicly linked. Don't waste crawl budget. |
| App routes under public subtrees — `/games/login`, `/members/account`, `/community/compose`, `/unsubscribe`, `/subscriber-assets`, game archive/results/leaderboard | **crawlable** | **`noindex, nofollow`** | These *are* reachable and linked from public nav. Google must be allowed to fetch them in order to read and obey the directive. |

`robots.ts` today hardcodes its own copy of the seven prefixes ([robots.ts:5](../../../src/app/robots.ts)). That is the third duplicated route list — PR 2 killed two and missed this one.

## Global Constraints

- **Work in the git worktree `C:\Users\shubh\seo-wt`, on branch `feat/seo-metadata-plumbing`.** Do NOT touch `C:\Users\shubh\OneDrive\Documents\Claude\Projects\Shubham Datarkar Website` — a concurrent Claude session owns it. `node_modules` there is junctioned; the suite works.
- Before every commit, run `git branch --show-current`. Must print `feat/seo-metadata-plumbing`.
- No new production dependencies.
- **The title copy rule.** The root template appends `" — Shubham Datarkar"` — exactly 20 characters. For the rendered `<title>` to land in the 30–60 window that `seo-title-length` checks, each page's `title` argument must be **15–40 characters and must not contain the brand name**. `"About"` → `"Founder, Marketer & Copywriter"` (30) → renders as 49. `"About Shubham Datarkar"` double-brands. The homepage escapes the template with `title.absolute`.
- **Do not write marketing copy in this PR.** Wherever a real string is needed to make a page compile or to satisfy a type, use the page's existing heading or an obviously-placeholder-free minimal descriptor. PR 4 writes the copy. This PR builds the sockets.
- **Do not apply the Supabase migration.** Write the file and hand the SQL to the maintainer. That is the standing workflow.
- Every commit message ends with:
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`
  Write the message to a temp file and use `git commit -F <file>` — PowerShell here-strings mangle multi-line `-m` here.
- **Build verification.** In this worktree the default Turbopack build fails on the junctioned `node_modules` (`Symlink ... points out of the filesystem root`) — an environment artifact. Use `npx next build --webpack` with a temporary placeholder `.env.local` (`NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co`, `NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder-anon-key`), delete it afterwards, and confirm `git status` is clean. Report the real exit code, unpiped. A clean-clone Turbopack build of `main` was verified separately at exit 0, so a `--webpack` pass here is sufficient evidence.
- Do not deploy.

## Explicitly NOT in this PR

- **`/community/p/[id]` gets nothing.** No metadata, no sitemap expansion. Deferred to PR 4 by decision — sitemap expansion needs a new `getPublishedPostIds()` query and a moderation decision about which member posts Google may index.
- **No marketing copy.** PR 4.
- **No entity graph / `@id` work.** That is its own PR.
- **`getOrigin()` still trusts the `Host` header.** Deferred.

## File Structure

| File | Responsibility |
| --- | --- |
| `src/lib/seo/routes.ts` (modify) | Export `ROBOTS_DISALLOW_PREFIXES`. |
| `src/lib/seo/routes.test.ts` (modify) | Pin that the exported list matches `APP_PREFIXES`. |
| `src/app/robots.ts` (modify) | Consume it. Delete the local copy. |
| `src/lib/seo.ts` (modify) | `buildMetadata` gains `ogTitle`, `ogDescription`, `titleAbsolute`. |
| `src/lib/seo.test.ts` (modify) | Cover the new fields and the defaults. |
| `src/app/layout.tsx` (modify) | `title: { default, template }`. |
| `src/app/page.tsx` (modify) | `titleAbsolute: true` — the homepage must not be templated. |
| ~24 app-route `page.tsx` files (modify) | `noIndex: true` metadata. |
| `src/lib/data/types.ts` (modify) | `SeoFields`; optional `seo` on `Service`, `Product`, `CaseStudy`, `Tool`, `Post`. |
| `src/app/{services,products,case-studies,tools}/[slug]/page.tsx` (modify) | `generateMetadata` reads `seo`. |
| `supabase/migrations/20260710000008_blog_seo_fields.sql` (create) | `seo_title`, `og_title`, `og_description` on `posts`. |
| `src/lib/blog/queries.ts` (modify) | Map the new columns onto `Post`. |
| `src/app/blog/[category]/[slug]/page.tsx` (modify) | `generateMetadata` reads them. |
| `src/components/admin/post-editor.tsx` (modify) | Three new fields. |
| `src/lib/seo/types.ts`, `discovery.ts` (modify) | Delete dead `PageEntry.filePath` and `isDynamic`. |
| `src/lib/seo/audit.ts` (modify) | `missingOgImage` counts pillars only. |

---

### Task 1: One source of truth for robots.txt

**Files:**
- Modify: `src/lib/seo/routes.ts`
- Modify: `src/lib/seo/routes.test.ts`
- Modify: `src/app/robots.ts`

**Interfaces:**
- Consumes: `APP_PREFIXES` (module-private in `routes.ts`).
- Produces: `export const ROBOTS_DISALLOW_PREFIXES: readonly string[]`

- [ ] **Step 1: Write the failing test**

Append to `src/lib/seo/routes.test.ts`:

```ts
import { pageTypeOf, isPrivate, isIndexable, ROBOTS_DISALLOW_PREFIXES } from "./routes";

describe("ROBOTS_DISALLOW_PREFIXES", () => {
  it("contains only server-private subtrees, not app routes under public ones", () => {
    expect([...ROBOTS_DISALLOW_PREFIXES].sort()).toEqual(
      ["/admin", "/dashboard", "/login", "/profile", "/search", "/settings", "/success"].sort(),
    );
  });

  it("every disallowed prefix classifies as app", () => {
    for (const p of ROBOTS_DISALLOW_PREFIXES) {
      expect(pageTypeOf(p)).toBe("app");
    }
  });

  it("does NOT disallow app routes that must stay crawlable to be seen as noindex", () => {
    // Googlebot cannot read a `noindex` tag on a URL it is forbidden to fetch.
    // These are linked from public nav, so they must be crawlable AND noindexed.
    for (const route of ["/games/login", "/members/account", "/community/compose", "/unsubscribe"]) {
      expect(pageTypeOf(route)).toBe("app");
      expect(ROBOTS_DISALLOW_PREFIXES.some((p) => route.startsWith(p))).toBe(false);
    }
  });
});
```

Note the import line at the top of the file must be updated to include `ROBOTS_DISALLOW_PREFIXES`.

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run src/lib/seo/routes.test.ts`
Expected: FAIL — `ROBOTS_DISALLOW_PREFIXES` is not exported.

- [ ] **Step 3: Export it**

In `src/lib/seo/routes.ts`, change the `APP_PREFIXES` declaration to be the exported constant, and keep `pageTypeOf` using it:

```ts
/**
 * Subtrees that are entirely application UI, and that robots.txt disallows.
 *
 * Only these. App routes under public subtrees (`/games/login`,
 * `/members/account`) must stay crawlable: Googlebot cannot read a `noindex`
 * tag on a URL it is forbidden to fetch, so disallowing them would leave them
 * eligible for URL-only indexing from inbound links. They carry `noIndex`
 * metadata instead.
 */
export const ROBOTS_DISALLOW_PREFIXES = [
  "/admin",
  "/dashboard",
  "/login",
  "/settings",
  "/profile",
  "/success",
  "/search",
] as const;
```

Then replace the module-private `APP_PREFIXES` with `ROBOTS_DISALLOW_PREFIXES` inside `pageTypeOf`:

```ts
  if (ROBOTS_DISALLOW_PREFIXES.some((p) => route === p || route.startsWith(`${p}/`))) return "app";
```

- [ ] **Step 4: Make robots.ts consume it**

Replace `src/app/robots.ts` entirely:

```ts
import type { MetadataRoute } from "next";
import { site } from "@/lib/site";
import { ROBOTS_DISALLOW_PREFIXES } from "@/lib/seo/routes";

export default function robots(): MetadataRoute.Robots {
  // Only the server-private subtrees are disallowed. Other app routes
  // (/games/login, /members/account, ...) stay crawlable so Googlebot can read
  // the `noindex` each of them serves — a disallowed URL is never fetched, so
  // its noindex is never seen, and it can still be indexed URL-only.
  const disallow = [...ROBOTS_DISALLOW_PREFIXES];
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow },
      // AI crawlers are welcome on content, kept off private/app routes.
      { userAgent: ["GPTBot", "ClaudeBot", "PerplexityBot", "Google-Extended"], allow: "/", disallow },
    ],
    sitemap: `${site.url}/sitemap.xml`,
    host: site.url,
  };
}
```

- [ ] **Step 5: Verify**

Run: `npx vitest run src/lib/seo/routes.test.ts` — PASS.
Run: `npm run test` — PASS.
Run: `npx tsc --noEmit` — exit 0.

- [ ] **Step 6: Commit**

Subject: `refactor(seo): robots.txt consumes routes.ts instead of its own list`

---

### Task 2: buildMetadata grows OG overrides and a title template

**Files:**
- Modify: `src/lib/seo.ts`
- Modify: `src/lib/seo.test.ts`
- Modify: `src/app/layout.tsx`
- Modify: `src/app/page.tsx`

**Interfaces:**
- Produces: `buildMetadata({ ..., ogTitle?, ogDescription?, titleAbsolute? })`

- [ ] **Step 1: Write the failing tests**

Append to `src/lib/seo.test.ts`:

```ts
describe("buildMetadata OG overrides", () => {
  it("defaults the OG title to the branded full title", () => {
    const m = buildMetadata({ title: "SEO Consultant in India", path: "/x" });
    expect(m.openGraph?.title).toBe("SEO Consultant in India — Shubham Datarkar");
  });

  it("lets the OG title differ from the SERP title", () => {
    const m = buildMetadata({ title: "SEO Consultant in India", ogTitle: "I make Google notice you", path: "/x" });
    expect(m.title).toBe("SEO Consultant in India");
    expect(m.openGraph?.title).toBe("I make Google notice you");
    expect(m.twitter?.title).toBe("I make Google notice you");
  });

  it("defaults the OG description to the meta description", () => {
    const m = buildMetadata({ description: "A plain description.", path: "/x" });
    expect(m.openGraph?.description).toBe("A plain description.");
  });

  it("lets the OG description differ", () => {
    const m = buildMetadata({ description: "A plain description.", ogDescription: "A biting one.", path: "/x" });
    expect(m.description).toBe("A plain description.");
    expect(m.openGraph?.description).toBe("A biting one.");
    expect(m.twitter?.description).toBe("A biting one.");
  });

  it("titleAbsolute escapes the root title template", () => {
    const m = buildMetadata({ title: "Shubham Datarkar — Digital Marketer", titleAbsolute: true, path: "/" });
    expect(m.title).toEqual({ absolute: "Shubham Datarkar — Digital Marketer" });
  });

  it("noIndex still produces index:false, follow:false", () => {
    const m = buildMetadata({ title: "Login", noIndex: true, path: "/games/login" });
    expect(m.robots).toEqual({ index: false, follow: false });
  });
});
```

- [ ] **Step 2: Run and watch it fail**

Run: `npx vitest run src/lib/seo.test.ts`
Expected: FAIL — `ogTitle` is not a known property; `m.openGraph?.title` is the derived value.

- [ ] **Step 3: Implement**

In `src/lib/seo.ts`, replace the `SeoInput` type and `buildMetadata`:

```ts
type SeoInput = {
  /**
   * Keyword phrase, 15-40 chars, WITHOUT the brand name. The root layout's
   * `title.template` appends " — Shubham Datarkar" (20 chars), landing the
   * rendered <title> in the 30-60 window the audit checks. Writing the brand
   * into this argument double-brands the tag.
   */
  title?: string;
  description?: string;
  /** Social-card headline. Defaults to the branded full title. */
  ogTitle?: string;
  /** Social-card body. Defaults to `description`. */
  ogDescription?: string;
  /** Opt out of the root title template. The homepage needs this. */
  titleAbsolute?: boolean;
  path?: string;
  type?: "website" | "article" | "profile";
  publishedTime?: string;
  modifiedTime?: string;
  noIndex?: boolean;
};

export function buildMetadata({
  title,
  description = site.description,
  ogTitle,
  ogDescription,
  titleAbsolute,
  path = "/",
  type = "website",
  publishedTime,
  modifiedTime,
  noIndex,
}: SeoInput = {}): Metadata {
  const url = `${site.url}${path}`;
  const fullTitle = title ? `${title} — ${site.name}` : `${site.name} · ${site.alias}`;
  const socialTitle = ogTitle ?? fullTitle;
  const socialDescription = ogDescription ?? description;
  const plainTitle = title ?? `${site.name} · ${site.alias}`;

  return {
    title: titleAbsolute ? { absolute: plainTitle } : plainTitle,
    description,
    alternates: { canonical: url },
    robots: noIndex
      ? { index: false, follow: false }
      : { index: true, follow: true },
    openGraph: {
      type: type === "profile" ? "profile" : type,
      url,
      title: socialTitle,
      description: socialDescription,
      siteName: site.name,
      ...(publishedTime ? { publishedTime } : {}),
      ...(modifiedTime ? { modifiedTime } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description: socialDescription,
      creator: "@sndatarkar",
    },
  };
}
```

- [ ] **Step 4: Add the root title template**

In `src/app/layout.tsx`, after the `...buildMetadata()` spread, add an explicit `title` that overrides it:

```ts
export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  ...buildMetadata(),
  // Child pages export a bare keyword phrase; this appends the brand.
  // `buildMetadata({ titleAbsolute: true })` opts a page out (see /).
  title: {
    default: `${site.name} · ${site.alias}`,
    template: `%s — ${site.name}`,
  },
  applicationName: site.name,
  // ...rest unchanged
};
```

- [ ] **Step 5: Opt the homepage out of the template**

In `src/app/page.tsx`, find the `buildMetadata({...})` call and add `titleAbsolute: true`. Do **not** rewrite its title text — PR 4 does copy. If the homepage currently passes no `title`, leave it; the root `default` handles it and no template is applied to a default.

- [ ] **Step 6: Verify**

Run: `npx vitest run src/lib/seo.test.ts` — PASS.
Run: `npm run test` — PASS.
Run: `npx tsc --noEmit` — exit 0.

**Then check the rendered title with your own eyes.** Start the dev server on a spare port (`npx next dev -p 3100`), fetch `/about` and `/`, and print the `<title>` of each:

```bash
node -e "fetch('http://localhost:3100/about').then(r=>r.text()).then(h=>console.log('ABOUT:', h.match(/<title[^>]*>([^<]*)<\/title>/)[1]))"
node -e "fetch('http://localhost:3100/').then(r=>r.text()).then(h=>console.log('HOME :', h.match(/<title[^>]*>([^<]*)<\/title>/)[1]))"
```

`/about` must end with `— Shubham Datarkar`. `/` must NOT be double-branded. Report both strings verbatim. Kill the server.

- [ ] **Step 7: Commit**

Subject: `feat(seo): buildMetadata gains OG overrides; root title template`

---

### Task 3: noindex every app route that stays crawlable

**Files:**
- Modify: the `page.tsx` of every `app`-type route outside `/admin`.

**Interfaces:**
- Consumes: `buildMetadata({ noIndex: true })` (Task 2).

`/admin/*` is already `Disallow`ed and auth-gated; skip it. Every other app route must serve `noindex`.

- [ ] **Step 1: Enumerate the targets from the source of truth, not by hand**

Run this and paste the list into your report:

```bash
npx tsx -e "
import('./src/lib/seo/routes.ts').then(async (r) => {
  const d = await import('./src/lib/seo/discovery.ts');
  const pages = await d.discoverPages();
  const targets = pages
    .filter(p => p.pageType === 'app' && !p.route.startsWith('/admin'))
    .map(p => p.route).sort();
  console.log(targets.length, 'targets'); console.log(targets.join('\n'));
});"
```

- [ ] **Step 2: Write the failing test**

Create `src/lib/seo/noindex.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { discoverPages } from "./discovery";

/**
 * Every crawlable app route must serve `noindex`. robots.txt only disallows the
 * ROBOTS_DISALLOW_PREFIXES subtrees; the rest are fetched by Googlebot, so the
 * meta tag is the only thing that keeps them out of the index.
 */
describe("noindex coverage", () => {
  it("every app route outside /admin declares noIndex", async () => {
    const pages = await discoverPages();
    const targets = pages.filter((p) => p.pageType === "app" && !p.route.startsWith("/admin"));
    expect(targets.length).toBeGreaterThan(0);

    const missing: string[] = [];
    for (const page of targets) {
      const src = fs.readFileSync(path.join(process.cwd(), page.filePath), "utf-8");
      if (!/noIndex:\s*true/.test(src)) missing.push(page.route);
    }
    expect(missing).toEqual([]);
  });
});
```

Note this test reads `PageEntry.filePath`. Task 6 deletes that field — **Task 6 must therefore also delete or rewrite this test.** That is called out in Task 6.

- [ ] **Step 3: Run and watch it fail**

Run: `npx vitest run src/lib/seo/noindex.test.ts`
Expected: FAIL, listing every app route.

- [ ] **Step 4: Add `noIndex: true` to each**

For a page that already exports `metadata` via `buildMetadata`, add the flag. For a page that exports a bare `metadata` object, convert it to `buildMetadata`. For a page with no metadata at all, add:

```ts
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "<the page's existing H1 or an obvious minimal descriptor>",
  path: "<the route>",
  noIndex: true,
});
```

For dynamic templates (`/games/*/[puzzle]`, `/members/tools/[slug]`, `/members/resources/[slug]`, `/support/updates/[code]`), a static `export const metadata` is fine — the whole family is noindexed regardless of param. If a route already has `generateMetadata`, add `noIndex: true` to its `buildMetadata` call instead.

**Write no marketing copy.** A title like `"Sign in"` or `"Your account"` is correct here. PR 4 does not touch app routes.

- [ ] **Step 5: Verify the tag actually renders**

Tests passing is not proof the tag reaches the HTML. Start `npx next dev -p 3100`, then:

```bash
node -e "fetch('http://localhost:3100/games/login').then(r=>r.text()).then(h=>console.log(h.match(/<meta name=\"robots\"[^>]*>/)?.[0] ?? 'NO ROBOTS META'))"
```

Expect a tag containing `noindex`. Do the same for `/members/account` and `/unsubscribe`. Report all three verbatim. Kill the server.

- [ ] **Step 6: Verify robots.txt does NOT disallow them**

```bash
node -e "fetch('http://localhost:3100/robots.txt').then(r=>r.text()).then(console.log)"
```

`/games/login` and `/members/account` must NOT appear. `/admin` must. Paste the output.

- [ ] **Step 7: Run everything, then commit**

`npm run test`, `npx tsc --noEmit`.

Subject: `fix(seo): noindex every crawlable app route`

---

### Task 4: SEO fields on the static content data

**Files:**
- Modify: `src/lib/data/types.ts`
- Modify: `src/app/services/[slug]/page.tsx`
- Modify: `src/app/products/[slug]/page.tsx`
- Modify: `src/app/case-studies/[slug]/page.tsx`
- Modify: `src/app/tools/[slug]/page.tsx`
- Create: `src/lib/data/seo-fields.test.ts`

**Interfaces:**
- Produces: `SeoFields`; optional `seo?: SeoFields` on `Service`, `Product`, `CaseStudy`, `Tool`.

- [ ] **Step 1: Add the type**

In `src/lib/data/types.ts`:

```ts
/**
 * Per-entity SEO copy. Every field is optional and falls back to the entity's
 * own name/description, so adding this block breaks nothing. PR 4 fills it in.
 */
export type SeoFields = {
  /** Keyword phrase, 15-40 chars, no brand name (the root template appends it). */
  title?: string;
  /** 120-160 chars. */
  description?: string;
  /** Social-card headline. Defaults to the branded full title. */
  ogTitle?: string;
  /** Social-card body. Defaults to `description`. */
  ogDescription?: string;
  /** Visible page heading, when it should differ from the entity name. */
  h1?: string;
};
```

Add `seo?: SeoFields;` to `Service`, `Product`, `CaseStudy`, and `Tool`.

- [ ] **Step 2: Write the failing test**

Create `src/lib/data/seo-fields.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { services } from "./services";
import { products } from "./products";
import { caseStudies } from "./case-studies";
import { tools } from "./tools";

/**
 * The `seo` block is optional and empty today — PR 4 fills it. What this pins is
 * the copy rule: any title that IS set must fit the 15-40 char window, because
 * the root template appends 20 more, and must not double-brand.
 */
const all = [
  ...services.map((s) => ({ kind: "service", slug: s.slug, seo: s.seo })),
  ...products.map((p) => ({ kind: "product", slug: p.slug, seo: p.seo })),
  ...caseStudies.map((c) => ({ kind: "case-study", slug: c.slug, seo: c.seo })),
  ...tools.map((t) => ({ kind: "tool", slug: t.slug, seo: t.seo })),
];

describe("SeoFields copy rules", () => {
  it("a set title is 15-40 chars", () => {
    for (const e of all) {
      if (e.seo?.title) {
        expect(e.seo.title.length, `${e.kind}/${e.slug}`).toBeGreaterThanOrEqual(15);
        expect(e.seo.title.length, `${e.kind}/${e.slug}`).toBeLessThanOrEqual(40);
      }
    }
  });

  it("a set title never contains the brand name", () => {
    for (const e of all) {
      if (e.seo?.title) {
        expect(e.seo.title.toLowerCase(), `${e.kind}/${e.slug}`).not.toContain("shubham");
      }
    }
  });

  it("a set description is 120-160 chars", () => {
    for (const e of all) {
      if (e.seo?.description) {
        expect(e.seo.description.length, `${e.kind}/${e.slug}`).toBeGreaterThanOrEqual(120);
        expect(e.seo.description.length, `${e.kind}/${e.slug}`).toBeLessThanOrEqual(160);
      }
    }
  });
});
```

These pass vacuously today (no `seo` blocks exist yet) — that is intentional and honest: they are the guard rail PR 4's copy runs into. **Say so in the test's doc comment**, which the code above does.

- [ ] **Step 3: Wire the four `generateMetadata` functions**

For each of the four `[slug]` routes, change the `buildMetadata` call to prefer the `seo` block, falling back to today's derivation. Example for `src/app/services/[slug]/page.tsx` — apply the same shape to the other three, substituting each entity's existing name/description fields:

```ts
  return buildMetadata({
    title: service.seo?.title ?? service.name,
    description: service.seo?.description ?? service.description,
    ogTitle: service.seo?.ogTitle,
    ogDescription: service.seo?.ogDescription,
    path: `/services/${service.slug}`,
  });
```

Do not change any other argument these functions already pass.

- [ ] **Step 4: Verify and commit**

`npx vitest run src/lib/data/seo-fields.test.ts`, `npm run test`, `npx tsc --noEmit`.

Subject: `feat(seo): optional SeoFields on services, products, case studies, tools`

---

### Task 5: Blog posts get SEO columns

**Files:**
- Create: `supabase/migrations/20260710000008_blog_seo_fields.sql`
- Modify: `src/lib/data/types.ts`
- Modify: `src/lib/blog/queries.ts`
- Modify: `src/app/blog/[category]/[slug]/page.tsx`
- Modify: `src/components/admin/post-editor.tsx`

**Interfaces:**
- Produces: `Post` gains `seoTitle?`, `ogTitle?`, `ogDescription?`.

Blog content is entirely DB-driven, so PR 4's post copy has nowhere to live without this.

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260710000008_blog_seo_fields.sql`:

```sql
-- Per-post SEO copy. All nullable: an unset column falls back to the post's
-- title/excerpt, which is exactly today's behaviour.
alter table public.posts
  add column if not exists seo_title      text,
  add column if not exists og_title       text,
  add column if not exists og_description text;

comment on column public.posts.seo_title is
  'Keyword <title> phrase, 15-40 chars, no brand name (the layout template appends it). Falls back to title.';
comment on column public.posts.og_title is
  'Social-card headline. Falls back to the branded full title.';
comment on column public.posts.og_description is
  'Social-card body. Falls back to excerpt.';
```

**Do not apply it.** Read `src/lib/supabase/` and the existing migrations to match conventions (schema name, `if not exists` usage). Report the exact SQL in your report so the maintainer can run it.

- [ ] **Step 2: Extend the `Post` type**

In `src/lib/data/types.ts`, add to `Post`:

```ts
  /** Keyword <title> phrase; falls back to `title`. See SeoFields. */
  seoTitle?: string;
  /** Social-card headline; falls back to the branded full title. */
  ogTitle?: string;
  /** Social-card body; falls back to `excerpt`. */
  ogDescription?: string;
```

- [ ] **Step 3: Map the columns**

In `src/lib/blog/queries.ts`, find where a DB row becomes a `Post` and add the three fields. The columns are nullable, so map `row.seo_title ?? undefined`, not `?? ""` — an empty string would defeat the `??` fallbacks downstream.

If the query uses `select("*")` this is a mapping-only change. If it lists columns explicitly, add the three.

- [ ] **Step 4: Read them in `generateMetadata`**

In `src/app/blog/[category]/[slug]/page.tsx`:

```ts
  return buildMetadata({
    title: post.seoTitle ?? post.title,
    description: post.excerpt,
    ogTitle: post.ogTitle,
    ogDescription: post.ogDescription,
    path: `/blog/${post.category}/${post.slug}`,
    type: "article",
    publishedTime: post.date,
    modifiedTime: post.dateModified,
  });
```

- [ ] **Step 5: Add the three fields to the post editor**

In `src/components/admin/post-editor.tsx`, add `seoTitle`, `ogTitle`, and `ogDescription` inputs. Read the file first and follow its existing field pattern exactly — same label component, same state wiring, same save payload shape. Group them under an "SEO" heading.

**The editor must degrade gracefully if the migration has not been run.** A write to a missing column errors. Guard the save path so an error mentioning these columns surfaces a readable message rather than a raw Postgres error, or omit the fields from the payload when they are all empty. Say which you chose and why.

- [ ] **Step 6: Verify and commit**

`npm run test`, `npx tsc --noEmit`, and `npx next build --webpack` (exit code, unpiped).

You cannot verify the DB round-trip without running the migration. **Do not.** State plainly in your report that the migration is unapplied and the editor path is therefore unexercised against a real column.

Subject: `feat(seo): per-post SEO columns, editor fields, and metadata wiring`

---

### Task 6: Delete what PRs 1 and 2 orphaned

**Files:**
- Modify: `src/lib/seo/types.ts`
- Modify: `src/lib/seo/discovery.ts`
- Modify: `src/lib/seo/discovery.test.ts`
- Modify: `src/lib/seo/audit.ts`
- Modify: `src/lib/seo/audit.test.ts`
- Modify or delete: `src/lib/seo/noindex.test.ts`
- Modify: `src/lib/seo/scoring.test.ts`

**Interfaces:**
- `PageEntry` loses `filePath` and `isDynamic`.
- `AuditSummary.missingOgImage` counts pillars only.

- [ ] **Step 1: Confirm the fields really are dead**

```bash
grep -rn "\.filePath\|isDynamic" src/ --include=*.ts --include=*.tsx
```

Everything that turns up must be either the declaration, `discovery.ts` writing it, a test fixture, or `noindex.test.ts` (Task 3). **If any production code reads either field, stop and report — this task's premise is wrong.**

`noindex.test.ts` reads `filePath`. Rewrite it to derive the source path from the route with `discoverPages`-independent logic, or — simpler and better — replace the filesystem check with a rendered-HTML check that hits the dev server, which is what actually matters. If you take the simpler route, say so; a test that reads source to assert a rendered tag was always a proxy.

- [ ] **Step 2: Fix `missingOgImage`**

In `src/lib/seo/audit.ts`, the KPI counts every scored page whose OG image is not dedicated, but `seo-og-image` only applies to `pillar`. The dashboard number therefore does not match the score.

```ts
  const missingOgImage = scored.filter(
    (p) => p.entry.pageType === "pillar" && p.analysis.ogImageSource !== "dedicated",
  );
```

Add a test in `audit.test.ts` asserting that a `hub` page with no dedicated OG image does not count toward `missingOgImage`.

- [ ] **Step 3: Delete the dead fields**

Remove `filePath` and `isDynamic` from `PageEntry` in `types.ts`, stop writing them in all three `pages.push` branches in `discovery.ts`, and remove them from every test fixture (`discovery.test.ts`, `audit.test.ts`, `scoring.test.ts`).

- [ ] **Step 4: Verify and commit**

`npm run test`, `npx tsc --noEmit`, `npx next build --webpack` (exit code, unpiped).

Subject: `refactor(seo): drop fields orphaned by the rendered-HTML rewrite`

---

## What this PR deliberately leaves for PR 4

- **All marketing copy.** ~35 static pages × 5 fields, plus the `seo` blocks this PR made room for.
- **`/community/p/[id]`** — no metadata, not in the sitemap. Needs a `getPublishedPostIds()` query and a call on whether Google may index member posts.
- **The entity graph** — `personSchema()` still runs in the root layout on every page with no `@id`, and `articleSchema`/`serviceSchema`/`reviewSchema` each inline another full Person node. Google sees ~104 unlinked Person entities. Nothing on the dashboard measures this, and it is the highest-leverage remaining item.
- **`getOrigin()` Host-header hardening.**
- **The `total === 0 → 100` guard in `scoring.ts`** is unreachable today but silently inflates a category to 100 if a future `applies` predicate ever makes a whole category conditional.

## Self-Review Notes

- **Spec coverage:** implements §7.1 (`buildMetadata` OG fields), §7.2 (`title.template` and the copy rule), §7.3 (`SeoFields` on the data types), §7.6 (noindex on app routes), and §9.3 (blog migration + editor). §7.4 (`routes.ts`) landed in PR 2. §7.5 (sitemap additions) landed in PR 2; the community-post half is deferred.
- **The spec's §7.6 says "every `app`-profile route gains `noIndex: true`."** This plan narrows that: `/admin/*` is `Disallow`ed and auth-gated, so a tag it can never serve is pointless. The correction is documented above.
- **Type consistency:** `SeoFields` is declared in Task 4 and referenced by Task 5's `Post` doc comments. `ROBOTS_DISALLOW_PREFIXES` is declared in Task 1 and consumed by Task 1 only. `titleAbsolute` is declared in Task 2 and consumed by `src/app/page.tsx` in the same task.
- **Task 3 creates a test that Task 6 must change.** Called out in both places rather than left as a surprise.
