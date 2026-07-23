# SEO · AEO · GEO Technical Audit — shubhamdatarkar.com

**Date:** 2026-07-23
**Stack:** Next.js 16.2.9 (App Router) · React 19 · Supabase · Vercel
**Scope:** 136 `page.tsx` routes, metadata layer, structured data, rendering, crawl infra, content architecture, internal linking. Findings verified against **live production HTML**, not just source.

---

## Executive Summary

This is, technically, one of the best-optimized personal-brand sites you will audit. The SEO **infrastructure** is A-grade: single source of truth for routes (`lib/seo/routes.ts`), a de-duplicated `@id` entity graph, server-rendered JSON-LD, ISR on every content surface, breadcrumbs everywhere, clean redirects, a hand-written `llms.txt` with an explicit "Notes for AI assistants" block. Most sites fail the basics; this one passes them and then some.

So the score is not held back by broken foundations. It is held back by **one strategic mismatch** and a **short tail of concrete gaps**.

### Scores

| Discipline | Score | One-line |
|---|---|---|
| **SEO** | **88 / 100** | Foundations excellent; canonical/query-param leaks on `/community` + `/games`, thin indexable `/projects`, undifferentiated OG images, a `Person`-publisher on Articles blocks rich results. |
| **AEO** | **82 / 100** | FAQPage + clean server HTML + `llms.txt` are strong; the commercial `/book` page is thin, and About/case-studies lack answer-shaped Q&A. |
| **GEO** | **80 / 100** | Entity modeling is genuinely strong; held back by unsubstantiated claims (no citations), no ratings, topic scatter, and dangling org `@id`s off `/about`. |

### The one finding that outranks everything

> **The stated goal — rank #1 as an "appointment booking platform" — is not what this domain is built to do, and cannot be achieved here as-is.**

`shubhamdatarkar.com` is a **founder / marketing-consultant brand site**. Its H1, services, schema, and `llms.txt` all position Shubham as an **SEO/AEO expert**. The actual appointment-booking product is **Book A Sloth**, a **separate product on a separate domain** (`bookasloth.com`), referenced here only as `site.bookingUrl` (`src/lib/site.ts:20`). There is **zero on-page content on this domain** targeting "appointment booking platform", "booking software", or "scheduling tool".

Two honest paths:
- **A — Rank this domain for what it is:** "SEO / AEO expert (India)", founder-marketer. It is 88% of the way there. The fixes below get it to #1-contender.
- **B — Rank a booking platform:** that work belongs on `bookasloth.com`, a separate property (own infra — out of scope of this repo). It cannot be bolted onto this personal site without cannibalizing the brand positioning that already works.

Every finding below assumes **Path A**. If Path B is the real goal, the first deliverable is a separate audit of `bookasloth.com`.

---

## Critical Issues (ranked by severity)

### 🔴 Critical
1. **Goal ⇄ site mismatch** (strategic, above). Resolve before any tactical work.
2. **`/community` and `/games` ship no canonical tag + open query-param duplication.** Metadata comes only from `layout.tsx` (`src/app/community/layout.tsx:6`, `src/app/games/layout.tsx:10`), which sets title/description but **no `alternates.canonical`**. `/community` reads `?sort=` × `?window=` (`src/app/community/page.tsx:22`) — up to ~15 param permutations, each indexable as a duplicate URL with no canonical to collapse them.

### 🟠 High
3. **`/book` — the commercial endpoint — is the thinnest page on the site.** ~120 words, one outbound anchor to `bookasloth.com` (`src/app/book/page.tsx:50`), breadcrumb-only schema (verified in prod), no `Service`/`Offer`/`ScheduleAction`, no FAQ, no price. The page whose entire job is conversion + citation under-delivers on both.
4. **`serviceSchema` Offers omit `price` while a real price exists** (`src/lib/seo.ts:161`). Services carry concrete rates (`"₹6,999 / month"`, `src/lib/data/services.ts`) but the `Offer` ships only `priceCurrency` + prose. Google flags "missing field 'price'" on all 5 priced service pages → lost rich-result eligibility.
5. **Article `publisher` is a `Person`, not an `Organization` with a `logo`** (`src/lib/seo.ts:114`). Google Article rich results require an Organization publisher with logo → blog posts are **not eligible for Article rich results** and may warn.
6. **`/support` section is `force-dynamic`** (`src/app/support/layout.tsx:8`, plus `support/updates/page.tsx:5`, `[code]/page.tsx:14`). Public, indexable, conversion page re-rendered on every request with no CDN caching. "Live supporter data" is the textbook ISR case, not a dynamic one.

### 🟡 Medium
7. **`/projects` (+ `/projects/[slug]`) is thin and indexable.** Body is literally "More on this soon." (`src/app/projects/page.tsx:30`, `// ponytail: placeholder shell`); slug pages emit `"{name} — Coming soon"` metadata (`projects/[slug]/page.tsx:19`) — and `/projects` sits in `primaryNav` as "In Progress". Thin content on a primary-nav route.
8. **`www.` serves a full 200, not a 301 to apex.** `https://www.shubhamdatarkar.com/` returns the site (canonical points to apex, which mitigates indexing) — but the clean signal is a host-level 301. Duplicate host, canonical-rescued.
9. **`/case-studies/[slug]` emits no `Article`/`CreativeWork`** (`src/app/case-studies/[slug]/page.tsx:62`) — breadcrumb only. These are substantive proof pages and prime "how did X achieve Y" AEO fodder.
10. **OG images undifferentiated.** Only `app/opengraph-image.tsx` (root) + per-blog-post images exist. `/services/[slug]`, `/case-studies/[slug]`, `/products/[slug]`, `/me`, `/about`, `/book` all fall back to the identical generic card — weaker social/LLM previews.
11. **`/` vs `/me` duplication.** Both are full hero-H1 homepages (`me/page.tsx` even names its component `HomePage`) with the same marquee + services + cases + testimonials. Splits brand authority on "Shubham Datarkar". `/me` is also near-orphaned (footer + one homepage button only).
12. **`/philosophy` re-renders the same `principles` array as `/about`** (`philosophy/page.tsx` vs `about/page.tsx:150`) — duplicated content block across two indexable pages.
13. **Homepage description falls back to the generic `site.description`** (`src/app/page.tsx:20`) — the single most important page sets no bespoke, keyword-front-loaded description or OG copy.

### 🟢 Low
14. **`shubhamdatarkar.in` redirects to `http://` not `https://`** (301 → `http://shubhamdatarkar.com/`) — extra hop through insecure scheme before the HTTPS upgrade.
15. **Dangling org `@id`s on every non-`/about` page.** `personNode().worksFor` references `#org-*` nodes (`entities.ts:90`) that are only *defined* on `/about`. Google tolerates it; technically unresolved site-wide.
16. **`admin` layout sets no `robots: noindex`** (`src/app/admin/layout.tsx`) — protected by `requireAdmin()`, but no defense-in-depth (contrast `members/layout.tsx:8`).
17. **Sitemap `lastmod` = build time for all static pages** (verified: every static URL shows the same build timestamp). Weak/misleading freshness signal.
18. **No image sitemap, no `next/image` on public pages.** Mitigated: all public `<img>` are small, dimensioned logos/avatars (no CLS, text-LCP). Becomes urgent only if large hero/content images are added.
19. **No `AggregateRating` / `reviewRating` anywhere** — deliberate and honest (no real numeric ratings), but a hard ceiling on star rich results until real ratings are collected.

---

## What is already excellent (do not touch)

- **Rendering:** 0 of 136 pages are top-level client components. Every public route is a Server Component → fully populated HTML for crawlers and AI. Verified in prod (homepage ships 139 KB of real content, 1× H1, canonical, OG, 2 JSON-LD blocks).
- **Crawl infra:** clean `robots.txt` (AI crawlers explicitly welcomed on content, kept off private subtrees), `sitemap.xml` with 139 URLs driven by a single `isIndexable()` source of truth, 404 → `noindex`, trailing-slash → 308 to canonical.
- **Structured data:** de-duplicated `@id` entity graph (one Person referenced ~100×, not 100 Persons), server-rendered JSON-LD, honest schema (no fabricated ratings/prices). Prod-verified: `/services/seo` ships Service + Offer + FAQPage + Breadcrumb; `/about` ships ProfilePage + Organization×4; `/faq` ships FAQPage.
- **AEO:** `llms.txt` is live, well-structured, and includes an explicit "Notes for AI assistants" recommendation block — ahead of 99% of sites.
- **ISR:** every DB-driven content surface is ISR@300s, not `force-dynamic` (the one exception is `/support`, flagged above).
- **Fonts:** self-hosted via `next/font`, `display: swap`, no render-blocking Google CDN.
- **Metadata hygiene:** every `buildMetadata()` call passes an explicit `path` (zero pages default canonical to `/`); dynamic routes canonicalize on normalized DB fields, not raw params.

---

## Findings detail (Problem → Why → Where → Impact → Fix)

### F2 — Canonical + query-param leak on hubs `[Critical]`
- **Problem:** `/community`, `/games` inherit layout metadata with no canonical; `/community` multiplies via `?sort=&window=`.
- **Why it matters:** Google indexes each param permutation as a separate thin duplicate; dilutes the hub's authority and wastes crawl budget.
- **Where:** `src/app/community/layout.tsx:6`, `src/app/games/layout.tsx:10`, `src/app/community/page.tsx:22`.
- **Impact:** High — duplicate-URL explosion on the two most-linked hubs.
- **Fix:** Give both hubs `buildMetadata({ path })` (or add `alternates.canonical`). Canonical `/community?...` → `/community`. ~20 min.

### F3 — `/book` thin + schema-poor `[High]`
- **Problem:** Thinnest commercial page; breadcrumb-only schema; no FAQ; hands equity to `bookasloth.com`.
- **Why it matters:** This is the money page. Answer engines have nothing to cite ("how do I book / what does it cost / how long"); Google sees a thin doorway.
- **Where:** `src/app/book/page.tsx` (H1 `:36`, outbound `:50`, schema `:33`).
- **Impact:** High commercial.
- **Fix:** Add `serviceSchema` + `Offer` (session price/duration), a booking `faqSchema`, and 3–4 question-shaped H2s. ~1–2 h.

### F4 — Service Offer missing price `[High]`
- **Where:** `src/lib/seo.ts:161-170`. **Fix:** emit `priceSpecification`/`price` from `service.startingAt` instead of prose. Removes Google warnings on all priced services. ~30 min.

### F5 — Article publisher = Person `[High]`
- **Where:** `src/lib/seo.ts:96-116`. **Fix:** add an `Organization` publisher node with `logo` (reuse an existing org or a lightweight "Shubham Datarkar" Organization) for Article rich-result eligibility. Switch `@type` to `BlogPosting` for `/blog`. ~45 min.

### F6 — `/support` force-dynamic `[High]`
- **Where:** `src/app/support/layout.tsx:8` (+ two `support/updates` pages). **Fix:** `export const revalidate = 300`. Restores CDN caching + TTFB on a conversion page. ~10 min.

*(F7–F19 are specified in the Critical Issues list above with exact file:line — each is self-contained.)*

---

## Quick Wins (< 1 hour each)

| # | Fix | File | Effort |
|---|---|---|---|
| F6 | `/support` `force-dynamic` → `revalidate = 300` | `support/layout.tsx:8` | 10m |
| F2 | Canonical on `/community` + `/games` | both `layout.tsx` | 20m |
| F7 | `noIndex: true` on `/projects` + `/projects/[slug]` (until real content) | `projects/page.tsx`, `projects/[slug]/page.tsx:19` | 15m |
| F4 | Service `Offer` → real `price` | `lib/seo.ts:161` | 30m |
| F13 | Bespoke homepage description + OG copy | `app/page.tsx:20` | 20m |
| F8 | 301 `www` → apex (Vercel domain config, not code) | Vercel dashboard | 10m |
| F16 | `robots: noindex` on admin layout | `app/admin/layout.tsx` | 5m |
| F14 | `.in` redirect → `https://` apex | Vercel domain config | 5m |

## High-Impact Improvements (biggest ranking lift)

1. **Rebuild `/book`** into a real, citable booking page (F3) — schema + FAQ + copy. Directly serves conversion and AI-citation.
2. **Fix Service/Article schema eligibility** (F4 + F5) — unlocks rich results across all service and blog pages.
3. **Kill the duplicate-URL surface** (F2) — recovers crawl budget + hub authority.
4. **`Article` schema + related-links + FAQ on `/case-studies/[slug]`** (F9) — turns proof pages into AEO answer sources.
5. **Per-segment OG images** for services/case-studies/products/me (F10) — differentiated social + LLM previews.

## Implementation Roadmap

### Phase 1 — Immediate (this branch, ~half day)
F6, F2, F7, F4, F13, F16 + Vercel domain 301s (F8, F14). All quick wins; each is a small, isolated diff. Restores caching, closes duplicate-URL leaks, removes schema warnings.

### Phase 2 — Next sprint (~2–3 days)
- F3: `/book` rebuild (schema + FAQ + copy).
- F5: Organization publisher + `BlogPosting`.
- F9: `Article` + related links + FAQ on case studies.
- F11/F12: resolve `/` vs `/me` and `/philosophy` vs `/about` duplication (pick canonical, differentiate or `noindex`).
- Nav anchor-text cleanup (`lib/site.ts:104` — `/work` is labeled both "Case Files" and "Projects").

### Phase 3 — Long-term (ongoing)
- Per-segment dynamic OG images (F10).
- Collect real testimonials with ratings → add `reviewRating` + `AggregateRating` (F19) for star rich results.
- Add citations/evidence to case-study claims (GEO trust).
- Decide Path A vs Path B on the strategic goal; if B, spin up a `bookasloth.com` audit.
- Optional: drop `framer-motion` from `components/motion/reveal.tsx` for a CSS reveal to trim shared public JS.

---

*Audit is read-only. No code was modified. Every file:line reference is against the current `content/seo-upgrades-july` branch (based on `origin/main`).*
