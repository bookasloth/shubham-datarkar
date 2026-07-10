# SEO / GEO / AEO — Audit Accuracy + Entity Graph

**Date:** 2026-07-10
**Status:** Approved, ready for implementation planning
**Scope:** 4 sequential PRs

---

## 1. Problem

`/admin/seo/pages` scores 104 public pages across SEO, GEO, and AEO. The scores are not trustworthy, and the pages they describe have real, separate defects. Three distinct failures are tangled together.

### 1.1 The analyzer measures source, not output

[`src/lib/seo/analyzer.ts`](../../../src/lib/seo/analyzer.ts) reads each route's `page.tsx` with `fs.readFileSync` and applies regexes to the TypeScript source. Rendered HTML is never examined. Consequences, measured by running the real audit locally against `discoverPages` / `analyzePage` / `scorePage`:

| Check | Pages failing | Why the failure is an artifact |
| --- | --- | --- |
| `geo-word-count` (>300) | 104 / 104 | `estimateWordCount` counts words remaining in the TSX after stripping JSX, then multiplies by 0.4. Highest observed value is 113. No page can pass. |
| `aeo-word-count` (>200) | 104 / 104 | Same source. |
| `seo-h1-present` | 67 | The `<h1>` is rendered by `PageHero` ([`page-hero.tsx:38`](../../../src/components/layout/page-hero.tsx)), not written in `page.tsx`. |
| `aeo-h2-count` (>=2) | 82 | `<h2>` is rendered by `SectionHeading`, whose `as` prop defaults to `"h2"` ([`section-heading.tsx:10`](../../../src/components/layout/section-heading.tsx)). |
| `geo-internal-links` (>2) | 101 | Links live in the nav, footer, and `src/lib/data/*` arrays, not in page source. |
| `geo-schema` / `aeo-schema` | 47 each | `personSchema()` and `websiteSchema()` are emitted from the **root layout** ([`layout.tsx:96`](../../../src/app/layout.tsx)). Every rendered page already carries Person + WebSite JSON-LD. The analyzer cannot see it because it only opens `page.tsx`. |
| `seo-title-length`, `seo-desc-length` | 103 / 99 | For `generateMetadata` routes the analyzer explicitly gives up and leaves `title`/`description` null ([`analyzer.ts:88`](../../../src/lib/seo/analyzer.ts)), so those pages auto-**pass** the presence checks and auto-**fail** the length checks. |

Roughly 570 of ~1900 recorded failures are artifacts of the measurement technique. No amount of page work moves them.

### 1.2 The dashboard's issue counts are arithmetically wrong

[`audit.ts:31`](../../../src/lib/seo/audit.ts) aggregates `issuesByType` keyed on `check.label`. Labels are duplicated across categories:

- `"Has FAQ schema"` exists as both `geo-faq` and `aeo-faq` → reported as **194 failures across 104 pages**.
- `"Has description"` exists as `seo-has-desc`, `geo-description`, `aeo-description` → true count is 32 pages, displayed as 96.
- `"In sitemap"` exists as `seo-sitemap` and `geo-sitemap` → true count is 44 pages, displayed as 88.
- `"Has breadcrumbs"` exists as `geo-breadcrumbs` and `aeo-breadcrumbs` → true count is 48, displayed as 96.

### 1.3 `priority` is declared and never used

Every `Check` carries `priority: "high" | "medium" | "low"`. [`scoring.ts:65`](../../../src/lib/seo/scoring.ts) computes `passed.length / results.length`. A missing `<title>` (high) costs exactly as much as a missing Twitter card (low).

### 1.4 Real defects, currently obscured

- **44 pages absent from the sitemap**: all of `/games/*`, `/members/*`, `/community/*`, `/support/*`, plus `/link`, `/help`, `/privacy-policy`, `/terms-of-use`, `/unsubscribe`, `/subscriber-assets`.
- **14 pages emit no metadata at all** (`metadataSource: "none"`): `/community`, `/community/p/[id]`, `/games`, `/games/login`, `/games/leaderboard`, `/games/profile`, the three `[puzzle]` routes, `/members/login`, `/members/resources/[slug]`, `/members/tools/[slug]`.
- **21 pages use a bare `export const metadata`** rather than `buildMetadata`, so they ship no canonical URL, no Open Graph tags, and no Twitter card.
- **Titles are genuinely too short.** `buildMetadata` assigns `title` verbatim and puts the brand suffix only into Open Graph ([`seo.ts:30-33`](../../../src/lib/seo.ts)). `/about` ships `<title>About</title>` — five characters. There is no `title.template` in the root layout.
- **`/games`, `/members`, `/community` are application UI, not content.** They are absent from `PRIVATE_PREFIXES` and are scored as public content pages, depressing every average.
- **The Person entity is duplicated 104 times with no `@id`.** `personSchema()` runs in the root layout on every page, and `articleSchema`, `serviceSchema`, and `reviewSchema` each inline another full Person node. Google receives 104+ unlinked Person entities rather than one canonical entity referenced many times. Nothing in `seo.ts` emits `@id`. This is the single highest-leverage entity fix available, and it is not represented as a check on the dashboard at all.

---

## 2. Decisions

Settled during design. Recorded so implementation does not relitigate them.

| # | Decision | Chosen |
| --- | --- | --- |
| 1 | Scope | Fix the checks **and** the pages **and** rewrite the analyzer. |
| 2 | Rendered-HTML source | Analyzer fetches its own origin at request time, cached. |
| 3 | Indexable set | Landing pages **plus** individual community posts (`/community/p/[id]`). |
| 4 | Scoring model | Weight by `priority`; conditional checks leave the denominator. |
| 5 | Titles | Root `title.template` **plus** rewriting the short title args. |
| 6 | Definition of 100/100 | 100 = every check that **applies to the page's type**. |
| 7 | Packaging | One spec, four sequential PRs. |
| 8 | Headings | Every scored page must render exactly one `<h1>` and at least one `<h2>`. |

### 2.1 Why 100/100 is defined by page type

Under the current check set, a literal 100 requires FAQ schema (demanded by both `geo-faq` and `aeo-faq`), word count above 300, and a dedicated Open Graph image — **on every page**. Satisfying that on `/contact`, `/link`, `/unsubscribe`, and `/privacy-policy` means:

1. Emitting `FAQPage` markup for an FAQ that is not visible on the page. Google's structured-data policy requires the question-and-answer content be present and visible; fabricating it invites a manual action. Since 2023 Google renders FAQ rich results only for government and health domains, so the upside is approximately zero and the downside is a penalty.
2. Padding thin utility pages past 300 words, which is textbook thin-content inflation.

We own the checker. Optimising a score we define, by mutating pages to satisfy our own regexes, measures compliance with the regex rather than quality of the page. A score of 100 is only meaningful if every check counted toward it is a check the page genuinely ought to pass. Hence page-type profiles.

---

## 3. Non-goals

- No schema nodes for **Marketing Bug**, **ChaiPani**, **Corporate Puppet**, or **JNV Connect**. None has a URL on this site; an `Organization` node pointing nowhere is a dangling entity. They are mentioned in prose on `/about` until they earn a page.
- No `jsdom`, `cheerio`, or other HTML parser added to `dependencies`. `jsdom` is currently a devDependency and costs ~10 MB in production for work that regex performs reliably against rendered markup.
- No redesign of the `/admin/seo/pages` table or `page-detail` layout beyond the columns this spec requires.
- No changes to Google Search Console, Bing Webmaster Tools, or any external property.
- No new content pages. Copy work is confined to metadata, headings, and the existing `src/lib/data/*` arrays.

---

## 4. Architecture

```
Phase 1 (PR 1)  fetch-html.ts + parse-html.ts   →  analyzePage() reads rendered DOM
Phase 2 (PR 2)  routes.ts + page-type profiles + weighted scoring + issue dedupe,
                buildMetadata og fields, data types, title.template, sitemap, noindex
Phase 3 (PR 3)  entities.ts — @id-linked Person + 4 Organizations
Phase 4 (PR 4)  copy pass: 5 fields per page, heading backfill, blog migration
```

Phase 1 lands first because every later phase is measured by it. Scoring and metadata plumbing share PR 2 because the `route → PageType` map lives in `routes.ts` and both consume it. Phase 2 precedes Phase 4 because the copy has nowhere to live until `buildMetadata` and the data types can hold it.

### 4.1 Module boundaries

| Module | Responsibility | Depends on |
| --- | --- | --- |
| `seo/routes.ts` (new) | Single source of truth: sitemap paths, `PageType` map, noindex list | `lib/data/*` |
| `seo/fetch-html.ts` (new) | Retrieve rendered HTML for a route; never throws | `next/headers` |
| `seo/parse-html.ts` (new) | Pure `(html) => PageAnalysis` | none |
| `seo/entities.ts` (new) | `@id` constants + Person/Organization nodes | `lib/site.ts` |
| `seo/analyzer.ts` | Orchestrate fetch → parse | fetch-html, parse-html |
| `seo/discovery.ts` | Enumerate routes, assign `PageType`, mark sitemap membership | routes.ts |
| `seo/scoring.ts` | Weighted, profile-aware scoring | constants.ts |
| `seo/audit.ts` | Aggregate + summarise | all of the above |
| `app/sitemap.ts` | Emit sitemap | routes.ts |

`routes.ts` exists to kill a specific bug. `SITEMAP_STATIC_PATHS` in [`discovery.ts:17`](../../../src/lib/seo/discovery.ts) is a hand-maintained mirror of `sitemap.ts`; its own comment concedes this. Because the audit's "In sitemap" check consults the mirror rather than the sitemap, it can be wrong in either direction. Both modules will import one list.

---

## 5. Page-type profiles

```ts
export type PageType = "pillar" | "hub" | "utility" | "app";
```

### 5.1 Assignment

| Profile | Routes |
| --- | --- |
| `pillar` | `/`, `/about`, `/my-story`, `/philosophy`, `/speaking`, `/services/[slug]` (6), `/products/[slug]` (9), `/case-studies/[slug]` (5), `/blog/[category]/[slug]` (all posts) |
| `hub` | `/work`, `/case-studies`, `/services`, `/products`, `/tools`, `/tools/[slug]` (8), `/blog`, `/blog/[category]` (7), `/resources`, `/testimonials`, `/newsletter`, `/changelog`, `/roadmap`, `/media-kit`, `/ai-experiments`, `/now`, `/uses`, `/components`, `/components/page-2`, `/faq`, `/games`, `/games/alfazy`, `/games/hit-and-blow`, `/games/integra`, `/members`, `/community`, `/community/p/[id]` |
| `utility` | `/contact`, `/book`, `/link`, `/help`, `/support`, `/support/supporters`, `/support/updates`, `/privacy-policy`, `/terms-of-use` |
| `app` | `/games/login`, `/games/profile`, `/games/leaderboard`, `/games/*/archive`, `/games/*/results`, `/games/*/leaderboard`, `/games/*/[puzzle]`, `/members/login`, `/members/account`, `/members/bookmarks`, `/members/downloads`, `/members/explore`, `/members/latest`, `/members/requests`, `/members/tools`, `/members/tools/[slug]`, `/members/resources/[slug]`, `/members/upgrade`, `/community/compose`, `/community/me`, `/community/bookmarks`, `/support/updates/[code]`, `/unsubscribe`, `/subscriber-assets` |

`app` routes receive `noIndex: true`, are excluded from the sitemap, and are **excluded from scoring entirely** — they do not appear in averages and produce no issues. `/members/upgrade` is classified `app` rather than `hub` because it sits behind authentication; revisit if it is ever made public.

### 5.2 Check matrix

`applies` returning `false` removes a check from **both** numerator and denominator. It is neither a pass nor a failure.

Weights: `high = 3`, `medium = 2`, `low = 1`.

| id | Category | Priority | Applies to |
| --- | --- | --- | --- |
| `seo-has-title` | seo | high | all scored |
| `seo-title-length` (30–60) | seo | medium | all scored |
| `seo-has-desc` | seo | high | all scored |
| `seo-desc-length` (120–160) | seo | medium | all scored |
| `seo-canonical` | seo | high | all scored |
| `seo-og` | seo | medium | all scored |
| `seo-twitter` | seo | low | all scored |
| `seo-og-image` (dedicated) | seo | low | `pillar` |
| `seo-breadcrumb` | seo | medium | all scored except `/` |
| `seo-h1-present` | seo | high | all scored |
| `seo-h1-single` | seo | medium | all scored |
| `seo-h2-present` (**new**, >=1) | seo | medium | all scored |
| `seo-sitemap` | seo | high | all scored |
| `geo-schema` | geo | high | all scored |
| `geo-author` | geo | medium | all scored |
| `geo-faq` | geo | medium | `/faq`, `/services/*` |
| `geo-breadcrumbs` | geo | medium | all scored except `/` |
| `geo-description` | geo | high | all scored |
| `geo-entity-schema` | geo | medium | `pillar`, `hub` |
| `geo-word-count` (>300) | geo | medium | `pillar` |
| `geo-internal-links` (>2) | geo | low | `pillar`, `hub` |
| `geo-content-schema` (**rewritten**) | geo | low | `pillar`, `hub` |
| `geo-sitemap` | geo | high | all scored |
| `aeo-faq` | aeo | high | `/faq`, `/services/*` |
| `aeo-breadcrumbs` | aeo | medium | all scored except `/` |
| `aeo-headings` (H1 + H2) | aeo | high | all scored |
| `aeo-word-count` (>200) | aeo | medium | `pillar`, `hub` |
| `aeo-description` | aeo | medium | all scored |
| `aeo-lists` (**rewritten**) | aeo | low | `pillar`, `hub` |
| `aeo-h2-count` (>=2) | aeo | medium | `pillar`, `hub` |
| `aeo-schema` | aeo | high | all scored |

Two checks stop being proxies now that rendered HTML is available:

- `aeo-lists` currently tests `h2Count >= 2 || internalLinks > 3`. It becomes a count of `<ul>`, `<ol>`, and `<table>` elements inside `<main>`.
- `geo-content-schema` currently tests `schemas.length > 1`, which becomes meaningless once the root layout's Person + WebSite are visible on every page. It becomes: the page carries at least one schema `@type` outside `{Person, WebSite, BreadcrumbList}`.

`seo-h2-present` is new, satisfying decision 8. `aeo-headings` already tests `h1Count >= 1 && h2Count >= 1`; the new SEO check makes the requirement explicit and weighted in the category where heading structure is judged.

### 5.3 Scoring formula

```
score(category) = Σ weight(c) for c in checks(category) where c.applies ∧ c.passed
                  ─────────────────────────────────────────────────────────────── × 100
                  Σ weight(c) for c in checks(category) where c.applies

overall = seo × 0.5 + geo × 0.3 + aeo × 0.2
```

Unchanged: category blend, the `scoreColor` thresholds (green ≥85, yellow ≥70, orange ≥50, red below).

If every applicable check in a category passes, that category is 100. A `utility` page reaches 100 with no FAQ schema, no dedicated OG image, and no word-count floor, because none of those apply to it. A `/services/seo` page must carry FAQ schema, because it renders a visible FAQ.

---

## 6. Phase 1 — Rendered-HTML analyzer (PR 1)

### 6.1 `src/lib/seo/fetch-html.ts`

Single export:

```ts
export async function getRenderedHtml(route: string): Promise<string | null>
```

- **Origin** is derived from `headers()` (`x-forwarded-proto` + `host`). The audit page is already `export const dynamic = "force-dynamic"`, so request headers are available. Development therefore hits `http://localhost:3000` and production hits the deployed host, with no environment variable to drift out of sync.
- **Concurrency is capped at 6.** A 60-way self-fetch fan-out against a single dev server wedges it. Requests are batched.
- **Timeout of 10 seconds** per route via `AbortSignal.timeout`.
- **Caching** via `fetch(url, { next: { revalidate: 3600, tags: ["seo-audit"] } })`. The audit page gains a "Re-run audit" button that calls `revalidateTag("seo-audit")`.
- **Never throws.** Any non-2xx response, timeout, or network error returns `null`.

### 6.2 `src/lib/seo/parse-html.ts`

Pure function, no I/O, no dependencies:

```ts
export function parseHtml(html: string): PageAnalysis
```

**From `<head>`:** `<title>`, `meta[name=description]`, `link[rel=canonical]`, `meta[property^=og:]`, `meta[name=twitter:card]`, `meta[name=robots]`, and every `<script type="application/ld+json">` — each `JSON.parse`d and walked for `@type`, handling both top-level arrays and `@graph` containers.

**From the body region only:** heading counts, word count, internal and external links, image count, missing `alt` count, and list/table count.

The body region is extracted from `<main id="main"` through the **last** occurrence of `</main>`. The match must be greedy: `app/games/layout.tsx`, `app/community/layout.tsx`, and `components/members/shell.tsx` each render their own `<main>` nested inside the root layout's, and a lazy match closes the region at the inner tag.

Scoping to `<main>` is the point of the exercise. Counting links across the whole document means every page passes `geo-internal-links` on the strength of the nav bar alone, and every page's word count includes the footer.

`<script>` and `<style>` blocks are stripped before word counting.

### 6.3 Changes to existing modules

- `PageAnalysis.schemas` stops holding scraped function names (`"faq"`, `"breadcrumb"`) and holds real schema.org `@type` values (`"FAQPage"`, `"BreadcrumbList"`). Every `schemas.includes(...)` predicate in `scoring.ts` is rewritten accordingly.
- `SCHEMA_FUNCTIONS` and `SCHEMA_DISPLAY_NAMES` are **deleted** from `constants.ts`. They exist solely to serve source scraping.
- `PageAnalysis` gains `listCount: number` and `schemaParseErrors: number`.
- `analyzePage(entry)` becomes `fetch → parse`, returning `PageAnalysis | null`.
- `PageAuditEntry.analysis` becomes `PageAnalysis | null`; `scores` becomes `PageScores | null`.
- `fs` and `path` imports leave `analyzer.ts`. `discovery.ts` keeps its filesystem walk — it enumerates routes, which is a source-level question.

### 6.4 Failure surfacing

When `analysis` is `null`, `pages-table.tsx` renders a "Could not fetch" row with a muted tone, and `buildSummary` excludes that page from every average and from `issuesByType`. A scoring engine that reports `0` when it means *"I do not know"* is precisely the defect this phase exists to remove.

---

## 7. Phase 2 — Metadata plumbing (PR 2)

### 7.1 `buildMetadata` gains Open Graph overrides

```ts
type SeoInput = {
  title?: string;           // keyword phrase, 15–40 chars, no brand name
  description?: string;     // 120–160 chars
  ogTitle?: string;         // creative; defaults to `${title} — ${site.name}`
  ogDescription?: string;   // biting; defaults to description
  path?: string;
  type?: "website" | "article" | "profile";
  publishedTime?: string;
  modifiedTime?: string;
  noIndex?: boolean;
};
```

Today OG title is mechanically derived from the meta title and OG description reuses the meta description verbatim ([`seo.ts:42-52`](../../../src/lib/seo.ts)). Both remain the defaults; the new fields override them.

### 7.2 Root `title.template` and the resulting copy rule

The root layout declares:

```ts
title: { default: "Shubham Datarkar — Digital Marketer, SEO Strategist & Founder",
         template: "%s — Shubham Datarkar" }
```

The template appends **20 characters**. For the rendered `<title>` to land inside the 30–60 window, each page's `title` argument must be **15–40 characters and must not contain the brand name**.

- `"About"` (5) → `"About — Shubham Datarkar"` (24). **Fails.**
- `"Founder, Marketer & Copywriter"` (30) → `"Founder, Marketer & Copywriter — Shubham Datarkar"` (49). **Passes.**
- `"About Shubham Datarkar"` → `"About Shubham Datarkar — Shubham Datarkar"`. Double-branded. **Never do this.**

The homepage escapes the template with `title.absolute`. `generateMetadata` routes inherit the template automatically.

### 7.3 SEO fields on dynamic-route data

`src/lib/data/types.ts` gains an optional block on `Service`, `Product`, `CaseStudy`, and `Tool`:

```ts
seo?: {
  title?: string;
  description?: string;
  ogTitle?: string;
  ogDescription?: string;
  h1?: string;
};
```

Absent fields fall back to today's derivation, so this change is non-breaking on its own. It exists so Phase 4's copy has somewhere to live for the 28 dynamic routes without hand-writing 28 `generateMetadata` bodies.

### 7.4 `src/lib/seo/routes.ts`

Exports the sitemap path list, the `route → PageType` map, and the noindex route list. Consumed by `app/sitemap.ts` and `seo/discovery.ts`, replacing `SITEMAP_STATIC_PATHS`.

### 7.5 Sitemap additions

Newly added, per decision 3: `/games`, `/games/alfazy`, `/games/hit-and-blow`, `/games/integra`, `/members`, `/community`, `/link`, `/help`, `/support`, `/support/supporters`, `/support/updates`, `/privacy-policy`, `/terms-of-use`, plus every `/community/p/[id]` post, queried from the database the way blog posts already are.

Indexing user-generated community posts is a deliberate acceptance of moderation responsibility: whatever a member publishes becomes eligible for Google's index.

### 7.6 Metadata backfill

The 21 bare `export const metadata` pages move to `buildMetadata`, gaining canonical, OG, and Twitter tags. The 14 pages with no metadata gain some. `/community/p/[id]` gains `generateMetadata` sourced from the post body. Every `app`-profile route gains `noIndex: true`.

---

## 8. Phase 3 — Entity graph (PR 3)

### 8.1 Stable identifiers

New `src/lib/seo/entities.ts`:

```ts
export const PERSON_ID  = `${site.url}/#person`;
export const WEBSITE_ID = `${site.url}/#website`;
export const ORG_IDS = {
  timewheel:   `${site.url}/#org-timewheel`,
  bogus:       `${site.url}/#org-bogus`,
  bookASloth:  `${site.url}/#org-bookasloth`,
  greyHawks:   `${site.url}/#org-greyhawks`,
} as const;
```

### 8.2 One graph, emitted once

The root layout emits a single `@graph` containing the Person node and the WebSite node, with `WebSite.publisher = { "@id": PERSON_ID }`.

The Person node carries:

- `alternateName: ["The Kalamwala", "Shubham N Datarkar"]`
- `jobTitle`: Digital Marketer, SEO Consultant, AI Marketing Strategist, Copywriter, Founder, Full Stack Developer
- `address`: `addressLocality: "Nagpur"`, `addressRegion: "Maharashtra"`, `addressCountry: "IN"`
- `sameAs`: existing social profiles
- `knowsAbout`: expanded from the current 13 entries to the topical clusters — SEO (technical, on-page, off-page, local, programmatic, semantic, content), GEO, AEO, digital marketing, growth marketing, performance marketing, content marketing, copywriting, conversion copywriting, email marketing, AI workflows, AI agents, marketing automation, SaaS strategy, product marketing, MVP development, Next.js, React, Supabase, PostgreSQL, Node.js, branding, entrepreneurship, topical authority, internal linking
- `worksFor`: `[{ "@id": ORG_IDS.timewheel }, { "@id": ORG_IDS.bogus }, { "@id": ORG_IDS.bookASloth }, { "@id": ORG_IDS.greyHawks }]`

The four Organization nodes are emitted **once**, on `/about`, each with `founder` or `employee` edges referencing `{ "@id": PERSON_ID }`:

| Org | Role | Focus |
| --- | --- | --- |
| Timewheel Internet | Founder & CEO | SaaS, internet products, booking / membership / event software |
| The Bogus Company | Founder | Advertising, branding, copywriting, creative strategy |
| Book A Sloth | CMO | Booking software, scheduling, business automation |
| Grey Hawks Media | Co-Founder | Performance marketing, SEO, content marketing |

### 8.3 References replace duplicates

`articleSchema.author`, `serviceSchema.provider`, `reviewSchema.itemReviewed`, and `organizationSchema.founder` stop inlining a Person object and reference `{ "@id": PERSON_ID }`. `profilePageSchema` keeps `mainEntity` but references by `@id` rather than embedding a second copy.

Net effect: Google receives one canonical Person entity referenced from every page, rather than 104 unlinked near-duplicates.

---

## 9. Phase 4 — Copy pass (PR 4)

Five distinct strings per scored page:

1. **`<title>`** — keyword phrase, 15–40 chars, no brand (template appends it).
2. **Meta description** — 120–160 chars, keyword-bearing, written for the SERP click.
3. **`<h1>`** — the `PageHero title` prop, already independent of the meta title.
4. **OG title** — creative and biting; this is the social card, not the SERP.
5. **OG description** — creative and biting.

Roughly 35 static pages are hand-written. The 28 dynamic routes get `seo` blocks in `src/lib/data/{services,products,case-studies,tools}.ts`.

### 9.1 Heading backfill

`PageHero` renders the `<h1>` and `SectionHeading` defaults to `<h2>`, so every page using both already satisfies decision 8. The gap is the `utility` profile and any page that hand-rolls its markup: `/link`, `/help`, `/support`, `/support/supporters`, `/support/updates`, `/privacy-policy`, `/terms-of-use`, `/contact`, `/book`. Each gains a real, visible `<h2>` section heading. Headings added purely to satisfy the checker — visually hidden, or labelling nothing — are not acceptable; if a page has no second section, it needs one or it does not need the heading.

Exact per-page gaps are determined by running the Phase 1 audit, not by reading source. That is the entire point of Phase 1.

### 9.2 Keyword mapping

- `pillar` pages take head terms: `Shubham Datarkar`, `The Kalamwala`, `SEO Consultant India`, `AI Marketing Consultant`, `Digital Marketing Consultant India`.
- `/services/*` take commercial-intent phrases: `Technical SEO Expert`, `Performance Marketing Expert`, `SaaS Marketing Consultant`, `AI for Digital Marketing`.
- `/case-studies/*` take `SEO Case Studies` plus industry modifiers drawn from the work itself (gaming, bakery, real estate, franchise).
- `hub` pages take category terms: `Marketing Systems`, `Startup Growth Frameworks`, `GEO Optimization`, `Answer Engine Optimization`.

Every page reinforces one entity narrative: *Shubham N Datarkar — the founder who builds growth systems by combining marketing, software, and AI.*

### 9.3 Database migration

Blog posts are entirely database-driven, so per-post OG copy requires new columns:

```
supabase/migrations/20260710000008_blog_seo_fields.sql
  ALTER TABLE posts
    ADD COLUMN og_title       text,
    ADD COLUMN og_description text,
    ADD COLUMN seo_title      text;
```

Per this project's established workflow the migration file is written and the SQL is handed to the maintainer to run manually against Supabase. **Phase 4 cannot fully land until that SQL has been run.** The post editor in `/admin` gains the three fields.

---

## 10. Error handling

| Condition | Behaviour |
| --- | --- |
| Route fetch fails, times out, or returns non-2xx | `getRenderedHtml` returns `null`; `analyzePage` returns `null`; the table row reads "Could not fetch"; the page is excluded from averages and from `issuesByType`. |
| A `<script type="application/ld+json">` block fails `JSON.parse` | That block is skipped, `schemaParseErrors` increments, the audit continues. Surfaced on the page-detail view. |
| No `<main id="main">` in the response | Body-region metrics are computed against the full `<body>`, and the page-detail view warns that counts include chrome. |
| `discovery.ts` finds a route with no `PageType` mapping | Defaults to `hub` and logs. A missing mapping must not silently un-score a page. |

---

## 11. Testing

| File | Covers |
| --- | --- |
| `parse-html.test.ts` (new) | HTML fixtures: links outside `<main>` are not counted; nested `<main>` does not truncate the region; `@graph` JSON-LD yields all `@type`s; multiple `<h1>`; malformed JSON-LD increments `schemaParseErrors`; `<script>` content excluded from word count. |
| `scoring.test.ts` (extend) | `high`/`medium`/`low` weighting; a check whose `applies` is false leaves both numerator and denominator; a page passing all applicable checks scores exactly 100; profile assignment changes the denominator. |
| `entities.test.ts` (new) | Every `@id` referenced anywhere in the graph resolves to a node that is actually emitted; no duplicate `@id`; Person emitted exactly once per page. |
| `audit.test.ts` (new) | `issuesByType` keyed by `check.id`, so `geo-faq` and `aeo-faq` count separately and neither exceeds the page count; `null` analyses excluded from averages. |
| `routes.test.ts` (new) | Every route returned by `discoverPages` has a `PageType`; the sitemap list and the discovery list agree. |

`fetch-html.ts` is not unit-tested — it is verified by loading `/admin/seo/pages` against a running server.

Each PR is verified with `npm run test` and with `next build`'s own exit code. Piping `next build` masks its exit status; check the code directly.

---

## 12. Rollout

| PR | Title | Ships |
| --- | --- | --- |
| 1 | `feat(seo): audit reads rendered HTML` | `fetch-html.ts`, `parse-html.ts`, analyzer rewrite, null-analysis surfacing, `parse-html.test.ts` |
| 2 | `feat(seo): weighted profile-aware scoring + metadata plumbing` | `routes.ts`, page-type profiles, weighted scoring, `issuesByType` dedupe, `buildMetadata` OG fields, `title.template`, data-type `seo` block, sitemap additions, noindex on `app` routes |
| 3 | `feat(seo): @id-linked entity graph` | `entities.ts`, single root `@graph`, four Organization nodes on `/about`, reference-not-duplicate refactor of existing schema builders |
| 4 | `feat(seo): per-page keyword + OG copy` | ~35 static pages, `seo` blocks on 28 dynamic routes, heading backfill, blog migration + admin editor fields |

PR 2 folds the original Phase-2 scoring changes together with metadata plumbing because the `PageType` map lives in `routes.ts` and both need it.

Deployment to production is gated on explicit instruction, per standing project policy. No PR in this sequence deploys itself.

---

## 13. Expected outcome

Scores will move in **both** directions after PR 1, and that is the evidence it worked.

- Pages currently failing `geo-word-count`, `aeo-word-count`, `seo-h1-present`, `aeo-h2-count`, `geo-internal-links`, `geo-schema`, and `aeo-schema` on measurement artifacts will pass on real data. That is ~570 recorded failures plus 94 schema failures.
- Pages currently flattered by `generateMetadata` auto-passing `seo-has-title` and `seo-has-desc` will be measured against their real rendered `<title>` and may drop.
- `issuesByType` counts will fall to at most the page count. "Has FAQ schema: 194" cannot recur.

No target baseline is predicted here. The current numbers are wrong in both directions by an unknown margin; the first honest run **is** the deliverable of PR 1. The 100/100 objective is assessed against the profile-aware denominator defined in §5, after PR 2.

---

## 14. Risks

| Risk | Mitigation |
| --- | --- |
| Self-fetching 60 routes stalls the dev server | Concurrency capped at 6; 10 s timeout; results cached for an hour behind a `revalidateTag` button. |
| Regex HTML parsing is brittle against markup changes | Confined to one pure module with fixture tests. If it becomes a maintenance burden, `linkedom` is a ~200 KB drop-in — cheaper than `jsdom`, deferred until proven necessary. |
| Indexing `/community/p/[id]` exposes user content to Google | Accepted knowingly (decision 3). Existing moderation tooling from the community feature governs it. |
| Rewriting `schemas` from function names to `@type` values silently breaks `scoring.ts` predicates | All predicates changed in the same PR; `scoring.test.ts` asserts against `@type` strings. |
| Blog migration not run → Phase 4 half-landed | Migration and required SQL are called out explicitly in the PR 4 description; post editor degrades gracefully when the columns are absent. |
| `title.template` double-brands a page whose author writes the name into the title | Copy rule documented in §7.2; a `scoring.ts` check already fails titles above 60 chars, which is what double-branding produces. |
