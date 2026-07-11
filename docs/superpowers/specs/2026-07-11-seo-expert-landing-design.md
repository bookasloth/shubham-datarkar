# SEO Expert Landing Page — Design Spec

**Date:** 2026-07-11
**Branch:** `feat/seo-expert-landing`
**Scope of this spec:** the **national** page `/seo-expert-india` only. City pages
(`/locations/[city]`) are a deliberate follow-up cycle and are out of scope here — but
the copy type and schema builder are designed so the city template is a clean clone.

---

## 1. Goal

Ship a single, conversion-focused "SEO Expert in India" landing page that ranks for
classic SEO **and** gets lifted/cited by AI answer engines (AI Overviews, ChatGPT,
Perplexity). It must read identically to a human, Googlebot, and an LLM (the "dual-read"
test). It plugs into the site's existing funnel (first-touch attribution → contact form /
booking) and reuses the existing schema and section infrastructure rather than rebuilding it.

Success = a 100/100-shaped page that is **honest** (no fabricated ratings, reviews, NAP,
or metrics) and that establishes the reusable pattern for city pages.

---

## 2. Approach (chosen: A)

Bespoke **static** page at `src/app/seo-expert-india/page.tsx`, with all editorial copy in a
**typed const module** (`src/lib/data/landing/seo-expert-india.ts`, mirroring the shape of
`src/lib/data/services.ts`). Sections are composed from existing components plus three small
new presentational components. Proof (case studies, testimonials) is pulled **live from the
database** at build/ISR time via the existing `getPublishedEntities` queries. Schema reuses
existing builders plus one new builder for the Service + OfferCatalog.

Rejected alternatives:
- **B — ContentBlock[]-driven:** landing-specific sections (hero, answer block, pricing tiers,
  logo bar) have no block types, so it needs new blocks anyway; the block format is really the
  blog body and gives less layout control for a conversion page.
- **C — DB content entity + admin CRUD:** new table, migration, admin UI, queries — overkill
  for one national page (YAGNI). Revisit only if non-dev editing at city scale becomes real.

Page rendering config: `export const revalidate = 300` (match `services/[slug]/page.tsx` — ISR,
CDN-instant, refresh every 5 min). Static route → auto-registers in the sitemap via file
discovery (`src/lib/seo/discovery.ts`).

---

## 3. Page structure (render order, top → bottom)

`★` = the differentiator sections generic competitor pages skip.

| # | Section | Built with | Data source | Notes |
|---|---------|-----------|-------------|-------|
| 1 | Hero | `PageHero` (existing) | copy module | One `<h1>` = "SEO Expert in India". Subhead = outcome value-prop. Actions: **Book a call** (`site.bookingUrl`) + secondary **See pricing** (anchor to §8). |
| 2 | ★ Answer / TL;DR | **new** `AnswerBlock` | copy module | 40–60 words, self-contained: what an SEO expert in India does, rough cost, expected result. Placed immediately under hero. No fluff. This is the AEO passage engines lift. |
| 3 | Trust bar | **new** `TrustBar` | `/public/logos/*` + client names | Logos if files exist; **text client-name fallback** if not (never render broken `<img>`). No stars / no aggregateRating. |
| 4 | Services (7 blocks) | existing Card-grid pattern (`services/[slug]` "What you get") | copy module | Keyword Research, On-Page, Off-Page, Technical, Local, Content, Strategy. Each = `<h3>` + one extractable 1–2 sentence definition an LLM can quote. |
| 5 | ★ Proof / case studies | existing case-study card (`heroMetric` + `KpiRow[]`) | **live DB** `getPublishedEntities<CaseStudy>` | Filter to SEO-relevant published case studies. Show only what exists — do not fabricate. If only 2 exist, show 2. |
| 6 | Process | existing numbered `<ol>` pattern | copy module | Audit → Strategy → Execution → Reporting. Wins "how does SEO work" PAA. |
| 7 | Why us / differentiators | Card grid | copy module | Concrete only — every claim number-backed (years, tools, team size, response time). No adjective without a number. |
| 8 | Pricing tiers | **new** `PricingTiers` | copy module | Silver ₹6,999 / Gold ₹13,999 / Platinum ₹22,999. Feeds `OfferCatalog` schema. |
| 9 | ★ About / the expert | bio section + photo + `sameAs` links | `src/lib/site.ts` | Person schema already emitted globally — this is its **visible** counterpart, NOT a second Person node. |
| 10 | Testimonials | existing `TestimonialCard` | **live DB** `getPublishedEntities<Testimonial>` | Feeds `reviewSchema` (Review nodes, no rating). |
| 11 | FAQ | existing `Accordion` | copy module | 6–10 answer-first Qs targeting long-tail/PAA. **Must mirror `faqSchema` verbatim.** |
| 12 | Local signals | **SKIP** | — | City-pages-only. Never fake NAP. |
| 13 | Final CTA | existing `CtaBand` + `contact-form` | existing | Booking + short form; form carries first-touch attribution via `readFirstTouch()`. |
| 14 | Footer links | global footer + in-page links | existing | Internal links → `/services/seo`, `/case-studies`, `/about`. (City ↔ national cross-links added at city stage.) |

Visible **"Last updated"** date rendered from a `updatedAt` string in the copy module (manual refresh).

---

## 4. Schema stack

Emitted on the page via `<JsonLd data={[...]} />` (`src/components/seo/json-ld.tsx`).

**Already global — nothing added:**
- Organization / ProfessionalService + WebSite + Person — emitted once per page by
  `siteGraph()` in the root layout (`src/app/layout.tsx`). **Do not re-emit Person** (the repo
  deliberately collapsed ~100 duplicate Person nodes into one `@id`-linked entity; reintroducing
  one is a regression).

**Page-level nodes:**
- **NEW `seoLandingSchema({ areaServed, offers, path, name?, serviceType? })`** in `src/lib/seo.ts`:
  a `Service` node — `serviceType: "Search Engine Optimization"`, `name: "SEO Expert Services in
  India"`, `provider: personRef`, `areaServed: { "@type": "Country", "name": "India" }`,
  `hasOfferCatalog` → an `OfferCatalog` of the three tier `Offer`s (`price`, `priceCurrency: "INR"`,
  `description`, `url`). `areaServed` is a **parameter** so the city template passes
  `{ "@type": "City", "name": "<city>" }` with no code change. **No `aggregateRating`.**
- `breadcrumbSchema([{Home,/}, {SEO Expert in India, /seo-expert-india}])` — reused.
- `faqSchema(faqs)` — reused; verbatim mirror of the visible §11 FAQ (Google guideline).
- `reviewSchema(testimonials)` — reused; `Review` nodes about the Person, **no star ratings**.

Validate the rendered page on Google Rich Results Test + Schema.org validator before merge.

---

## 5. Files touched

| File | Change |
|------|--------|
| `src/app/seo-expert-india/page.tsx` | **new** — the page (static, `revalidate = 300`) |
| `src/lib/data/landing/seo-expert-india.ts` | **new** — typed copy module |
| `src/lib/data/landing/types.ts` | **new** — `SeoLandingContent` type (shared with city template) |
| `src/lib/seo.ts` | **edit** — add `seoLandingSchema()` + OfferCatalog helper |
| `src/components/sections/answer-block.tsx` | **new** — small presentational |
| `src/components/sections/trust-bar.tsx` | **new** — logos + text fallback |
| `src/components/sections/pricing-tiers.tsx` | **new** — 3-tier pricing |
| `src/lib/seo/routes.ts` | **edit** — add `/seo-expert-india` to `PILLAR_ROUTES` |

The three new components are reused verbatim by the future city template, so they are extracted
now. The **full-page** `<SeoLandingPage>` extraction is deferred until the city stage (build
inline in `page.tsx` first, extract at 2nd use).

---

## 6. `SeoLandingContent` type (shape)

Drives both national and (later) city pages. Approximate fields:

```
type SeoLandingContent = {
  areaName: string;              // "India" | "Kochi"
  areaServedType: "Country" | "City";
  path: string;                  // "/seo-expert-india"
  h1: string;                    // "SEO Expert in India"
  metaTitle: string;             // keyword phrase, no brand (buildMetadata appends brand)
  metaDescription: string;       // ~150 chars, keyword + CTA
  subhead: string;
  answer: string;                // 40-60 words, self-contained
  serviceBlocks: { h3: string; definition: string }[];   // 7
  process: { step: string; detail: string }[];           // 4
  differentiators: { label: string; value: string }[];   // number-backed
  pricingTiers: { name: string; price: string; currency: "INR"; features: string[] }[]; // 3
  faqs: { question: string; answer: string }[];           // 6-10, answer-first
  caseStudySlugs?: string[];     // optional filter into DB case studies
  updatedAt: string;             // "2026-07-11"
};
```

Content depth target: 2,000–3,000 words for the national pillar. Copy hand-drafted answer-first.

---

## 7. Explicitly out of scope / skipped

- `aggregateRating` / any star markup — no real Google Business Profile data exists (matches the
  repo's existing deliberate omission in `seo.ts`). Honesty gate.
- `LocalBusiness` schema and the local-signals section — city-page concern; never fabricate NAP.
- Embedded video / map — skip until a real asset exists (no placeholders).
- KalamAI copy generation — this page is hand-drafted; KalamAI is optional when scaling to cities.
- DB-editable landing entity (Approach C) — deferred.
- City pages `/locations/[city]` — separate cycle (needs data array + `DYNAMIC_EXPANSIONS`
  entry in `discovery.ts` + `generateStaticParams`).

---

## 8. Content / SEO rules baked in

- Exactly one `<h1>`, exact primary keyword, keyword-first.
- Title via `buildMetadata({ title, description, path })` — bare keyword phrase (brand appended by
  the root `title.template`); rendered `<title>` under ~60 chars.
- Meta description ~150 chars, keyword + CTA.
- Every section answer-first (first sentence answers completely).
- Concrete proof only; dated real numbers; no invented metrics.
- Named expert with photo + `sameAs`.
- FAQ visible copy === FAQ schema, verbatim.
- Visible "Last updated" date.
- Mobile-first; Core Web Vitals already pass site-wide (static + ISR keeps LCP fast).
- Internal links national ↔ services ↔ case studies (↔ cities later).

---

## 9. Acceptance criteria

1. `/seo-expert-india` renders all sections 1–11 + 13–14 (12 skipped by design).
2. Exactly one `<h1>` containing "SEO Expert in India".
3. `<title>` = "SEO Expert in India — Shubham Datarkar", under 60 chars; canonical + OG set.
4. Page appears in `sitemap.xml`; crawlable in `robots.txt`; classified pillar-grade.
5. JSON-LD emitted: page-level Service+OfferCatalog+Breadcrumb+FAQPage+Review; global
   Org/WebSite/Person present; **no duplicate Person node**; **no aggregateRating**; passes
   Rich Results Test with no errors.
6. FAQ schema Q&As match the visible FAQ text exactly.
7. Case studies + testimonials render from live DB (no hardcoded fake proof).
8. Trust bar degrades to text names when logo files are absent (no broken images).
9. `next build` exits 0 (verify by its own exit code, not piped output).
10. Booking CTA → `site.bookingUrl`; contact form carries first-touch attribution.

---

## 10. Items the user owns (not code)

- **Client logo files** in `/public/logos/` (else text-name fallback ships).
- **Pricing reconciliation:** this page's ₹6,999–22,999 tiers vs `/services/seo`'s ₹1.5L/month
  retainer are inconsistent and both indexable. Decide later how to reconcile (reframe the
  retainer page, or position tiers as productized entry). Not a build blocker.
- **Real case-study coverage:** only ~2 SEO-relevant case studies exist today; the proof section
  is only as strong as the real data. More dated case studies strengthen E-E-A-T.
- Post-deploy: submit to Google Search Console / Bing; validate schema on the live URL.
