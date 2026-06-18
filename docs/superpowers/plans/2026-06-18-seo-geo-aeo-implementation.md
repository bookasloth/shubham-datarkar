# SEO · GEO · AEO Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the SEO/GEO/AEO gaps in `shubhamdatarkar.com` from the June 2026 audit — starting with the high-leverage code fixes (entity graph, valid structured data, indexability) and extending through content structure, media, measurement, and off-page.

**Architecture:** All structured data lives in pure functions in `src/lib/seo.ts`, injected server-side via the existing `<JsonLd>` component (kept in initial HTML for crawlers). Site identity is centralized in `src/lib/site.ts`. Metadata flows through `buildMetadata()` and root `layout.tsx`. We add no new infrastructure for Phase 1 — only correct existing schema/metadata. Tests are pure-function assertions on schema/robots shape (vitest, node env), since the SEO surface is deterministic data.

**Tech Stack:** Next.js 16.2.9 (App Router, async `params`), React 19, TypeScript, vitest (node env, `src/**/*.test.ts`), Supabase (posts), Vercel (Speed Insights, hosting/env).

---

## Scope decision (read first)

The audit spans **four independent workstreams**. Per the writing-plans scope check, these should not be one monolithic build:

| Phase | Workstream | Nature | This doc's fidelity |
|---|---|---|---|
| **1** | This-week code batch (MUST) | Pure code | **Fully specified, TDD, ready to execute** |
| **2** | Structure + media + measurement (SHOULD) | Code + editorial | Scoped tasks; code given, editorial flagged |
| **3** | Upside schema/feeds (COULD) | Code | Scoped tasks |
| **4** | Off-page + external verification | Non-code | Ordered checklist |

**Recommendation:** Execute **Phase 1 as a single PR now** (it is self-contained and independently shippable). Treat Phases 2–4 as a roadmap — when you pick one up, spin it into its own focused plan (especially Phase 2's editorial items, which need your words, not mine).

**House rules honored:** branch → PR → merge for every change (no direct `main` commits); monochrome/no-emoji output; no Supabase schema changes in Phase 1; the connected BAS Supabase is never touched.

**One input required before executing Phase 1, Task 2:** the four real social profile URLs (you said the handle-derived defaults are partly wrong). Defaults are pre-filled from the handles already in `site.ts`; confirm/replace at execution.

---

## File Structure

**Phase 1 — modify (no new runtime files):**
- `src/lib/site.ts` — real `socials[].href` (drives `sameAs`).
- `src/lib/seo.ts` — fix `articleSchema` image fallback; add `websiteSchema()`; add `logo` to `organizationSchema()`.
- `src/app/robots.ts` — add `/admin` to `privatePaths`.
- `src/app/layout.tsx` — inject `websiteSchema()`; add `verification` to root `metadata`.

**Phase 1 — create (tests):**
- `src/lib/site.test.ts`
- `src/lib/seo.test.ts`
- `src/app/robots.test.ts`

**Phase 1 — create (config/docs):**
- `.env.example` entries for `GOOGLE_SITE_VERIFICATION`, `BING_SITE_VERIFICATION` (and set real values in Vercel + `.env.local`).

**Phase 2+ — create (later):**
- `src/app/blog/[category]/[slug]/opengraph-image.tsx` (per-post OG)
- `src/lib/seo.ts` additions (`howToSchema`, `imageObjectSchema`, `profilePageSchema`, `serviceSchema`, …)
- `public/llms-full.txt`, `src/app/feed.xml/route.ts` (RSS), analytics wiring.

---

# PHASE 1 — This-week code batch (MUST)

Each task is bite-sized: write failing test → confirm fail → implement → confirm pass → commit. Run from repo root. Test runner: `npx vitest run <file>`; full suite `npm test`; types `npx tsc --noEmit`; build `npm run build`.

---

### Task 0: Branch

- [ ] **Step 1: Create the feature branch**

```bash
git checkout main
git pull
git checkout -b feat/seo-geo-aeo-phase-1
```

---

### Task 1: Fix broken `Article.image` fallback

The fallback `${site.url}/og/default.png` 404s (`public/` has no such file). Point it at the existing root generated OG image (`/opengraph-image`, a valid 1200×630 PNG from `src/app/opengraph-image.tsx`). Keep the per-post override path open for Phase 2.

**Files:**
- Modify: `src/lib/seo.ts:97`
- Test: `src/lib/seo.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/seo.test.ts
import { describe, it, expect } from "vitest";
import { articleSchema } from "@/lib/seo";
import { site } from "@/lib/site";

describe("articleSchema", () => {
  const base = { title: "T", description: "D", path: "/blog/seo/x", datePublished: "2026-01-01" };

  it("falls back to a real, existing image (never /og/default.png)", () => {
    const s = articleSchema(base);
    expect(s.image).toBe(`${site.url}/opengraph-image`);
    expect(String(s.image)).not.toContain("/og/default.png");
  });

  it("uses a provided per-post image when passed", () => {
    const s = articleSchema({ ...base, image: `${site.url}/blog/seo/x/opengraph-image` });
    expect(s.image).toBe(`${site.url}/blog/seo/x/opengraph-image`);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/seo.test.ts`
Expected: FAIL on the first assertion — `s.image` is `https://shubhamdatarkar.com/og/default.png`.

- [ ] **Step 3: Implement the minimal fix**

In `src/lib/seo.ts`, change the `articleSchema` image line:

```ts
    image: input.image ?? `${site.url}/opengraph-image`,
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/seo.test.ts`
Expected: PASS (both `articleSchema` tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/seo.ts src/lib/seo.test.ts
git commit -m "fix(seo): point Article.image at real OG image, not 404 default"
```

---

### Task 2: Real `sameAs` profile URLs

`socials[].href` are bare domains (`https://x.com/` …), which breaks entity disambiguation. `sameAs` is derived from these. Replace with full profile URLs. **Defaults below are derived from the handles already in the file — confirm/replace each with Shubham's real URL before committing.**

**Files:**
- Modify: `src/lib/site.ts:154-159`
- Test: `src/lib/site.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/site.test.ts
import { describe, it, expect } from "vitest";
import { socials, sameAs } from "@/lib/site";

describe("social links / sameAs", () => {
  it("every href is a full profile URL, not a bare domain root", () => {
    for (const s of socials) {
      const u = new URL(s.href); // throws if not a valid URL
      expect(u.pathname.replace(/\/+$/, "")).not.toBe(""); // must have a path beyond "/"
    }
  });

  it("sameAs mirrors the social hrefs exactly", () => {
    expect(sameAs).toEqual(socials.map((s) => s.href));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/site.test.ts`
Expected: FAIL — current hrefs (`https://x.com/`) have empty path.

- [ ] **Step 3: Implement — replace with real profile URLs**

In `src/lib/site.ts`, update `socials` (replace any URL that differs from Shubham's real profile):

```ts
export const socials: SocialLink[] = [
  { label: "X / Twitter", href: "https://x.com/kalamwala", handle: "@kalamwala" },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/shubhamdatarkar", handle: "in/shubhamdatarkar" },
  { label: "GitHub", href: "https://github.com/shubhamdatarkar", handle: "@shubhamdatarkar" },
  { label: "YouTube", href: "https://www.youtube.com/@thekalamwala", handle: "@thekalamwala" },
];
```

- [ ] **Step 4: Confirm each URL resolves (no 404)**

Open each of the four URLs in a browser (or `curl -I`). A `sameAs` pointing at a 404 is worse than a placeholder for entity recognition. Fix any that don't resolve before continuing.

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/lib/site.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/site.ts src/lib/site.test.ts
git commit -m "fix(seo): real social profile URLs so sameAs disambiguates the entity"
```

---

### Task 3: Disallow `/admin` in robots

`src/app/admin/layout.tsx` exists and is crawlable; `privatePaths` omits `/admin`. Add it (applies to both the `*` rule and the AI-crawler rule, which share `privatePaths`).

**Files:**
- Modify: `src/app/robots.ts:5`
- Test: `src/app/robots.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/app/robots.test.ts
import { describe, it, expect } from "vitest";
import robots from "@/app/robots";

describe("robots", () => {
  it("disallows /admin for every rule group", () => {
    const { rules } = robots();
    const groups = Array.isArray(rules) ? rules : [rules];
    for (const g of groups) {
      const disallow = Array.isArray(g.disallow) ? g.disallow : [g.disallow];
      expect(disallow).toContain("/admin");
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/app/robots.test.ts`
Expected: FAIL — `/admin` not present.

- [ ] **Step 3: Implement**

In `src/app/robots.ts`, add `/admin` to `privatePaths`:

```ts
  const privatePaths = ["/admin", "/dashboard", "/profile", "/settings", "/login", "/success", "/search"];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/app/robots.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/robots.ts src/app/robots.test.ts
git commit -m "fix(seo): disallow /admin in robots"
```

---

### Task 4: Add `WebSite` + `SearchAction` schema

No `WebSite` schema exists. Add `websiteSchema()` with a sitelinks SearchAction targeting the existing `/search?q=` route (search client reads the `q` param). Inject it sitewide in the root layout alongside `personSchema()`.

**Files:**
- Modify: `src/lib/seo.ts` (add function after `organizationSchema`)
- Modify: `src/app/layout.tsx:6,75`
- Test: `src/lib/seo.test.ts`

- [ ] **Step 1: Write the failing test (append to seo.test.ts)**

```ts
import { websiteSchema } from "@/lib/seo";

describe("websiteSchema", () => {
  it("is a WebSite with a SearchAction targeting /search?q=", () => {
    const s = websiteSchema();
    expect(s["@type"]).toBe("WebSite");
    expect(s.url).toBe(site.url);
    expect(JSON.stringify(s.potentialAction)).toContain(`${site.url}/search?q={search_term_string}`);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/seo.test.ts`
Expected: FAIL — `websiteSchema` is not exported.

- [ ] **Step 3: Implement `websiteSchema()` in `src/lib/seo.ts`**

```ts
export function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: site.name,
    alternateName: site.alias,
    url: site.url,
    publisher: { "@type": "Person", name: site.name },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${site.url}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}
```

- [ ] **Step 4: Inject it sitewide in `src/app/layout.tsx`**

Update the import (line 6) and the JsonLd call (line 75):

```tsx
import { buildMetadata, personSchema, websiteSchema } from "@/lib/seo";
```

```tsx
        <JsonLd data={[personSchema(), websiteSchema()]} />
```

- [ ] **Step 5: Run test + typecheck**

Run: `npx vitest run src/lib/seo.test.ts && npx tsc --noEmit`
Expected: PASS, no type errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/seo.ts src/app/layout.tsx src/lib/seo.test.ts
git commit -m "feat(seo): add WebSite schema with sitelinks SearchAction"
```

---

### Task 5: Complete `Organization` with a `logo`

`organizationSchema()` already has `sameAs` (now fixed via Task 2) but lacks `logo`. Add a valid logo URL. No dedicated logo raster exists, so point at the on-brand root OG image (`/opengraph-image`) — valid and existing. (A dedicated square logo asset is a Phase 2 nice-to-have.)

**Files:**
- Modify: `src/lib/seo.ts` (`organizationSchema`)
- Test: `src/lib/seo.test.ts`

- [ ] **Step 1: Write the failing test (append to seo.test.ts)**

```ts
import { organizationSchema } from "@/lib/seo";

describe("organizationSchema", () => {
  it("includes a logo URL on our domain", () => {
    const s = organizationSchema();
    expect(typeof s.logo).toBe("string");
    expect(String(s.logo)).toContain(site.url);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/seo.test.ts`
Expected: FAIL — `logo` is undefined.

- [ ] **Step 3: Implement — add `logo` to `organizationSchema()`**

```ts
export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "The Bogus Company",
    founder: { "@type": "Person", name: site.name },
    url: site.url,
    logo: `${site.url}/opengraph-image`,
    sameAs,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/seo.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/seo.ts src/lib/seo.test.ts
git commit -m "feat(seo): add logo to Organization schema"
```

---

### Task 6: Wire Google + Bing verification meta tags

GSC and Bing Webmaster need an HTML verification tag (Bing is ChatGPT Search's retrieval path). Add a `verification` field to root metadata, sourced from env vars so no token is committed. Verification tokens are public meta tags, but env keeps them out of source and lets Vercel manage them.

**Files:**
- Modify: `src/app/layout.tsx` (`metadata` object)
- Create/Modify: `.env.example`

- [ ] **Step 1: Add env placeholders to `.env.example`**

```bash
# SEO — site verification (public meta tags; set real values in Vercel + .env.local)
GOOGLE_SITE_VERIFICATION=
BING_SITE_VERIFICATION=
```

- [ ] **Step 2: Add `verification` to root `metadata` in `src/app/layout.tsx`**

Append these keys inside the existing `metadata` object (after `icons`):

```ts
  verification: {
    ...(process.env.GOOGLE_SITE_VERIFICATION
      ? { google: process.env.GOOGLE_SITE_VERIFICATION }
      : {}),
    ...(process.env.BING_SITE_VERIFICATION
      ? { other: { "msvalidate.01": process.env.BING_SITE_VERIFICATION } }
      : {}),
  },
```

Next renders `<meta name="google-site-verification">` and `<meta name="msvalidate.01">` when the env vars are set; nothing when they're empty (safe default).

- [ ] **Step 3: Typecheck + build**

Run: `npx tsc --noEmit && npm run build`
Expected: clean build (no `verification` type errors).

- [ ] **Step 4: Commit**

```bash
git add src/app/layout.tsx .env.example
git commit -m "feat(seo): wire Google + Bing site-verification meta via env"
```

> **External follow-up (not code):** in GSC and Bing Webmaster Tools, copy the HTML-tag verification token into Vercel env (`GOOGLE_SITE_VERIFICATION`, `BING_SITE_VERIFICATION`), redeploy, then click Verify. Submit `https://shubhamdatarkar.com/sitemap.xml` in both. See Phase 4.

---

### Task 7: Phase 1 verification + PR

- [ ] **Step 1: Full suite, types, lint, build**

```bash
npm test
npx tsc --noEmit
npm run lint
npm run build
```
Expected: all green.

- [ ] **Step 2: Validate structured data**

After deploying the branch preview (or against a local `npm run build && npm start`), paste these into Google's **Rich Results Test** and the **Schema Markup Validator**:
- `/` (Person + WebSite + Organization)
- one blog post `/blog/seo/seo-is-infrastructure-not-traffic` (Article — confirm `image` resolves + BreadcrumbList)
- `/faq` (FAQPage)
Expected: no errors; `Article.image` loads.

- [ ] **Step 3: Push and open PR**

```bash
git push -u origin feat/seo-geo-aeo-phase-1
gh pr create --title "SEO/GEO/AEO Phase 1: entity graph, valid schema, indexability" \
  --body "Fixes from the June 2026 audit: real sameAs URLs, Article.image (no 404), /admin disallow, WebSite+SearchAction, Organization logo, GSC/Bing verification hooks."
```

- [ ] **Step 4: Merge after review** (squash or merge per repo norm), then delete the branch.

---

# PHASE 2 — Structure, media, measurement (SHOULD)

Spin into its own plan when picked up. Code-complete items have snippets; editorial items are flagged **[EDITORIAL — your words]** and external ones **[EXTERNAL]**.

### 2A. Per-post OG images + per-post `Article.image`
**Code.** Create `src/app/blog/[category]/[slug]/opengraph-image.tsx` (ImageResponse, reads `getPublishedPost(slug)` for the title — model on `src/app/opengraph-image.tsx`; async `params: Promise<{category,slug}>`, `await params`). Then in `src/app/blog/[category]/[slug]/page.tsx`, pass `image: \`${site.url}/blog/${post.category}/${post.slug}/opengraph-image\`` into `articleSchema(...)`. Verify with `npm run build` (params shape) + Rich Results Test. Same pattern optionally for `/case-studies/[slug]`, `/services/[slug]`, `/products/[slug]`.

### 2B. `howToSchema` + media schema helpers
**Code.** Add to `src/lib/seo.ts`: `howToSchema({name, steps[]})` (`@type: HowTo`) for guide/playbook posts and tool walkthroughs; `imageObjectSchema(...)` and `videoObjectSchema(...)` (mark up the YouTube embed in the "SEO Is Infrastructure" post — `id: dQw4w9WgXcQ` placeholder there should become the real video). Unit-test each like Phase 1. Emit from the relevant pages via `<JsonLd>`.

### 2C. FAQ schema on money pages
**Code + [EDITORIAL].** `faqSchema()` already exists. Add FAQ sections (and emit `faqSchema`) to `/services`, each `/services/[slug]`, and `/products/[slug]`. The Q&A copy is yours to write — wire-up is mechanical (reuse the `/faq` page pattern at `src/app/faq/page.tsx`). Pages with FAQPage are ~3.2× likelier to surface in AI Overviews.

### 2D. Answer-first intros + question-style H2s
**[EDITORIAL].** Open cornerstone posts and service pages with a self-contained 40–70 word direct answer, then expand. Phrase H2/H3s as real questions ("How much does SEO cost in India?"). This is the single most-cited GEO tactic and is pure copy — no schema needed. Apply to the SEO pillar post, top services, and the FAQ answers.

### 2E. Analytics + AI-referrer tracking
**Code + [EXTERNAL].** Lowest-friction, privacy-light, and consistent with `@vercel/speed-insights` already installed: add `@vercel/analytics` (`npm i @vercel/analytics`, render `<Analytics/>` in `layout.tsx` next to `<SpeedInsights/>`). Then, to measure GEO, track AI referrers (`chat.openai.com`, `perplexity.ai`, `gemini.google.com`, `copilot.microsoft.com`) — either via a custom event on first load reading `document.referrer`, or in Vercel Analytics' referrer breakdown. Privacy policy already discloses aggregate analytics.

### 2F. Real images with `next/image` + alt
**Code + [EDITORIAL/asset].** The site uses asset-free SVG placeholders and zero `next/image`. Add genuine diagrams/screenshots (with descriptive `alt`) to flagship posts and case studies via `next/image`. Multimodal text+image+schema pages get materially higher AI-Overview selection. Requires real image assets from you.

### 2G. Visible freshness / `dateModified`
**Code.** `DbRow` already has `updated_at`, but `POST_COLS` in `src/lib/blog/queries.ts` doesn't select it and `toPost` doesn't map it (no DB migration needed — column exists). Add `updated_at` to `POST_COLS`, map to `post.dateModified`, pass into `articleSchema({ dateModified })`, and surface an "Updated <date>" line on the post header. Refresh cornerstone posts on a 30–90 day cadence.

### 2H. `ProfilePage` schema on `/about`; author entity depth
**Code.** Add `profilePageSchema()` (`@type: ProfilePage` wrapping the `Person`) to `src/app/about/page.tsx`. Ensure the post byline links to `/about`, and extend `Person.knowsAbout` to match real topics.

### 2I. Title/description uniqueness audit
**[EDITORIAL].** `buildMetadata` enforces the pattern; audit each page's actual `title` (≤60) and `description` (≤155) for uniqueness/keyword intent. Spot-check single-`h1` on marketing pages.

---

# PHASE 3 — Upside (COULD)

Own plan when picked up. All code.

- **`llms-full.txt`** — longer machine-readable digest of cornerstone content at `public/llms-full.txt`; keep in sync with sitemap. (`public/llms.txt` already exists.)
- **IndexNow ping on publish** — POST changed URLs to IndexNow (Bing/Yandex) from the post publish action; helps the Bing-backed ChatGPT path. Needs an IndexNow key file in `public/`.
- **RSS/Atom feed** — `src/app/feed.xml/route.ts` route handler emitting the blog feed from `getPublishedPosts()`; link from `<head>`.
- **`Service` / `Product` / `Offer` / `Review`/`AggregateRating`** — schema on services/products/testimonials for richer results.
- **`Event` schema** — on `/speaking` engagements.
- **`hreflang`** — only if a Hindi or India-specific (`shubhamdatarkar.in`) variant is added; not needed single-locale. Note `altUrl` already exists in `site.ts`.

---

# PHASE 4 — Off-page + external (non-code checklist)

Cannot be done in the repo; strongest lever for GEO citation. Ordered:

1. **[EXTERNAL]** Verify in **Google Search Console** — paste token into `GOOGLE_SITE_VERIFICATION` (Vercel), redeploy, Verify, submit sitemap.
2. **[EXTERNAL]** Verify in **Bing Webmaster Tools** (import GSC property to save time) — `BING_SITE_VERIFICATION`, submit sitemap. Retrieval path for ChatGPT Search.
3. **[EXTERNAL]** Complete + cross-link consistent profiles (LinkedIn, X, GitHub, YouTube, Crunchbase, Indian startup/marketing directories) — must match `sameAs` and on-site NAP/identity ("The Kalamwala", Nagpur).
4. **[EXTERNAL]** Earn brand mentions (podcasts, guest posts, communities) — strongest predictor of ChatGPT citation.
5. **[EXTERNAL]** Pursue Wikidata/Wikipedia entity eligibility over time (notability permitting).
6. **[EXTERNAL]** Get off-site reviews/testimonials on independent platforms.
7. **[ONGOING]** AI-visibility tracking — periodically prompt ChatGPT/Perplexity/Gemini with target queries ("SEO consultant India", "founder-marketer Nagpur") and log whether/how you're cited.

---

## Self-review (run against the audit)

**Spec coverage** — every audit item maps to a task:
- §2 MUST: GSC/Bing → T6 + P4·1-2; sitemap → already done; AI crawlers allowed → already done; canonical → already done; `/admin` disallow → **T3**; SSR/CWV/mobile/lang → already done; per-page meta → done (uniqueness audit P2I); Person → done; **Article.image → T1**; **sameAs → T2**; Breadcrumb/FAQ → done (reuse P2C); E-E-A-T author depth → P2H.
- §3 SHOULD: answer-first → P2D; question H2s → P2D; FAQ on money pages → P2C; HowTo → P2B; fact density → P2D; **WebSite+SearchAction → T4**; **Organization logo/sameAs → T5/T2**; NAP consistency → P4·3; ProfilePage → P2H; real images → P2F; per-post OG → P2A; ImageObject/VideoObject → P2B; freshness → P2G; internal links → P2D/editorial; analytics + AI referrers → P2E.
- §4 COULD: llms.txt → exists; llms-full.txt, IndexNow, RSS, Service/Product/Offer/Review, Event, hreflang → P3.
- §5 off-page → P4.

No gaps.

**Placeholder scan** — Phase 1 steps all contain real code/commands/expected output. The only deliberate "confirm value" steps are Task 2 (your real social URLs) and Task 6 (your verification tokens) — these are data you own, gated by explicit confirm/verify steps, not code placeholders. Phase 2–4 editorial/external items are flagged, not faked.

**Type consistency** — `websiteSchema`/`organizationSchema`/`articleSchema` names match across implementation, tests, and `layout.tsx` import. `socials`/`sameAs` exports match `site.ts`. `robots` default import matches `src/app/robots.ts`.

---

## Execution handoff

Phase 1 is the recommended scope for the first PR. Two ways to run it:

1. **Subagent-Driven (recommended)** — fresh subagent per task, two-stage review between tasks. Sub-skill: superpowers:subagent-driven-development.
2. **Inline Execution** — run tasks in this session with checkpoints. Sub-skill: superpowers:executing-plans.
