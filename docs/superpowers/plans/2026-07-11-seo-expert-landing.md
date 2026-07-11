# SEO Expert Landing Page (/seo-expert-india) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a conversion-focused, honest, AEO-optimised "SEO Expert in India" national landing page at `/seo-expert-india`, reusing the site's existing schema and section infrastructure.

**Architecture:** Bespoke **static** Next.js App Router page (`revalidate = 300`) composed from existing section/card components plus three small new presentational components. All editorial copy lives in a typed const module; proof (case studies, testimonials) is pulled live from Supabase at build/ISR time. Schema reuses existing builders plus one new `seoLandingSchema()`.

**Tech Stack:** Next.js 16.2.9 (App Router, `src/app/`), React 19, TypeScript, Tailwind v4, Vitest 4 (`npm test` → `vitest run`), Supabase (content via `getPublishedEntities`).

## Global Constraints

- **Read `node_modules/next/dist/docs/` before writing page/route code** — AGENTS.md warns this is a modified Next.js; APIs may differ from training data.
- Public routes live under `src/app/` (note the `src/` prefix), not `app/`.
- Exactly **one `<h1>`** per page, containing the exact primary keyword "SEO Expert in India".
- Titles via `buildMetadata({ title, description, path })` — `title` is a **bare keyword phrase, no brand** (root `title.template` appends " — Shubham Datarkar"). Rendered `<title>` must land under ~60 chars.
- **No fabricated data:** no `aggregateRating`/stars (no real GBP numbers), no `LocalBusiness`/NAP, no invented case-study metrics, no placeholder images rendered as broken `<img>`.
- **Do NOT emit a Person node on the page** — the canonical Person is already emitted globally by `siteGraph()` in the root layout; the repo deliberately collapsed duplicate Person nodes into one `@id` entity.
- FAQ visible copy must equal FAQ schema Q&As **verbatim**.
- `provider`/`itemReviewed` reference the Person by `@id` = `` `${site.url}/#person` `` (via `personRef`), never inlined.
- Pricing tiers (verbatim): **Silver ₹6,999 · Gold ₹13,999 · Platinum ₹22,999**, currency INR.
- Verify `next build` by its **own exit code**, never through a pipe (piping masks a non-zero exit — a client importing `server-only` typechecks fine but breaks the build).
- Branch: `feat/seo-expert-landing` (already created off `origin/main`). Frequent commits; PR flow — never commit to `main`.

---

### Task 1: `seoLandingSchema()` schema builder + OfferCatalog

**Files:**
- Modify: `src/lib/seo.ts` (add builder after `serviceSchema`, ~line 173)
- Test: `src/lib/seo.test.ts` (add a `describe` block; imports at top)

**Interfaces:**
- Consumes: `personRef` and `site` (already imported in `src/lib/seo.ts`).
- Produces:
  ```ts
  export type LandingOffer = { name: string; price: string; description: string };
  export function seoLandingSchema(input: {
    path: string;                                   // "/seo-expert-india"
    name: string;                                   // "SEO Expert Services in India"
    areaServed: { type: "Country" | "City"; name: string };
    offers: LandingOffer[];
  }): Record<string, unknown>;
  ```

- [ ] **Step 1: Write the failing tests**

Add to `src/lib/seo.test.ts` — extend the import from `@/lib/seo` to include `seoLandingSchema`, then append:

```ts
describe("seoLandingSchema", () => {
  const input = {
    path: "/seo-expert-india",
    name: "SEO Expert Services in India",
    areaServed: { type: "Country" as const, name: "India" },
    offers: [
      { name: "Silver SEO Package", price: "6999", description: "1-3 keywords, audit, on-page + off-page, monthly report." },
      { name: "Gold SEO Package", price: "13999", description: "5-10 keywords, technical SEO, content, competitor analysis." },
      { name: "Platinum SEO Package", price: "22999", description: "15+ keywords, advanced technical + content, CRO, link building." },
    ],
  };

  it("is a Service provided by the canonical Person (by @id)", () => {
    const s = seoLandingSchema(input);
    expect(s["@type"]).toBe("Service");
    expect(s.serviceType).toBe("Search Engine Optimization");
    expect(s.provider).toEqual({ "@id": `${site.url}/#person` });
    expect(s.url).toBe(`${site.url}/seo-expert-india`);
  });

  it("sets areaServed as a Country for the national page", () => {
    const s = seoLandingSchema(input);
    expect(s.areaServed).toEqual({ "@type": "Country", name: "India" });
  });

  it("reuses the same builder for a City area (city template)", () => {
    const s = seoLandingSchema({ ...input, areaServed: { type: "City", name: "Kochi" } });
    expect(s.areaServed).toEqual({ "@type": "City", name: "Kochi" });
  });

  it("emits an OfferCatalog of three INR Offers and no fabricated rating", () => {
    const s = seoLandingSchema(input);
    const cat = s.hasOfferCatalog as { "@type": string; itemListElement: Record<string, unknown>[] };
    expect(cat["@type"]).toBe("OfferCatalog");
    expect(cat.itemListElement).toHaveLength(3);
    expect(cat.itemListElement[0]).toMatchObject({ "@type": "Offer", name: "Silver SEO Package", price: "6999", priceCurrency: "INR" });
    expect("aggregateRating" in s).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/seo.test.ts -t seoLandingSchema`
Expected: FAIL — `seoLandingSchema is not a function` (not yet exported).

- [ ] **Step 3: Write minimal implementation**

Append to `src/lib/seo.ts` (after `serviceSchema`, before `productSchema`):

```ts
export type LandingOffer = { name: string; price: string; description: string };

/**
 * SEO landing-page Service node. Unlike serviceSchema (bound to the Service DB
 * type + /services URL, areaServed "Worldwide"), this targets a geography and
 * carries productized tiers as an OfferCatalog. `areaServed` is a parameter so
 * the city template passes { type: "City", name } with no code change.
 * No aggregateRating: no real numeric ratings exist to mark up honestly.
 */
export function seoLandingSchema(input: {
  path: string;
  name: string;
  areaServed: { type: "Country" | "City"; name: string };
  offers: LandingOffer[];
}): Record<string, unknown> {
  const url = `${site.url}${input.path}`;
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    serviceType: "Search Engine Optimization",
    name: input.name,
    url,
    provider: personRef,
    areaServed: { "@type": input.areaServed.type, name: input.areaServed.name },
    ...(input.offers.length
      ? {
          hasOfferCatalog: {
            "@type": "OfferCatalog",
            name: input.name,
            itemListElement: input.offers.map((o) => ({
              "@type": "Offer",
              name: o.name,
              price: o.price,
              priceCurrency: "INR",
              description: o.description,
              url: `${url}#pricing`,
            })),
          },
        }
      : {}),
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/seo.test.ts`
Expected: PASS (new `seoLandingSchema` block + all existing seo.ts tests still green).

- [ ] **Step 5: Commit**

```bash
git add src/lib/seo.ts src/lib/seo.test.ts
git commit -m "feat(seo): seoLandingSchema builder (Service + areaServed + OfferCatalog)"
```

---

### Task 2: Classify `/seo-expert-india` as a pillar route

**Files:**
- Modify: `src/lib/seo/routes.ts:79` (`PILLAR_ROUTES` set)
- Test: `src/lib/seo/routes.test.ts` (add one `it`)

**Interfaces:**
- Consumes: nothing new. Produces: `pageTypeOf("/seo-expert-india") === "pillar"`, `isIndexable("/seo-expert-india") === true`. The static page auto-registers in the sitemap via file discovery; this makes it face pillar-grade audit checks (word count, dedicated OG image) rather than the `hub` default.

- [ ] **Step 1: Write the failing test**

Add to `src/lib/seo/routes.test.ts` inside the `describe("pageTypeOf", ...)` block:

```ts
it("classifies the SEO Expert national landing as a pillar", () => {
  expect(pageTypeOf("/seo-expert-india")).toBe("pillar");
  expect(isIndexable("/seo-expert-india")).toBe(true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/seo/routes.test.ts -t "SEO Expert national"`
Expected: FAIL — received `"hub"`, expected `"pillar"`.

- [ ] **Step 3: Write minimal implementation**

In `src/lib/seo/routes.ts:79`, add the route to the set:

```ts
const PILLAR_ROUTES = new Set(["/", "/me", "/about", "/my-story", "/philosophy", "/speaking", "/seo-expert-india"]);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/seo/routes.test.ts`
Expected: PASS (new test + existing route tests green).

- [ ] **Step 5: Commit**

```bash
git add src/lib/seo/routes.ts src/lib/seo/routes.test.ts
git commit -m "feat(seo): classify /seo-expert-india as an indexable pillar route"
```

---

### Task 3: `SeoLandingContent` type + national copy module

**Files:**
- Create: `src/lib/data/landing/types.ts`
- Create: `src/lib/data/landing/seo-expert-india.ts`
- Test: `src/lib/data/landing/seo-expert-india.test.ts`

**Interfaces:**
- Produces:
  ```ts
  // types.ts
  export type SeoLandingContent = {
    areaName: string;                      // "India"
    areaServedType: "Country" | "City";
    path: string;                          // "/seo-expert-india"
    h1: string;                            // "SEO Expert in India"
    metaTitle: string;                     // bare keyword phrase, no brand
    metaDescription: string;               // ~150 chars, keyword + CTA
    subhead: string;
    answer: string;                        // 40-60 words, self-contained
    serviceBlocks: { h3: string; definition: string }[];         // exactly 7
    process: { step: string; detail: string }[];                 // 4
    differentiators: { label: string; value: string }[];         // number-backed
    pricingTiers: { name: string; price: string; currency: "INR"; features: string[] }[]; // 3
    faqs: { question: string; answer: string }[];                // 6-10, answer-first
    caseStudySlugs?: string[];             // filter into DB case_studies
    trustNames: string[];                  // client names for the trust-bar text fallback
    updatedAt: string;                     // "2026-07-11"
  };
  // seo-expert-india.ts
  export const seoExpertIndia: SeoLandingContent;
  ```
- Consumed by: Task 5 (page) and, later, the city template.

- [ ] **Step 1: Write the failing content-contract test**

Create `src/lib/data/landing/seo-expert-india.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { seoExpertIndia } from "./seo-expert-india";

describe("seoExpertIndia content contract", () => {
  it("has the exact keyword-first H1", () => {
    expect(seoExpertIndia.h1).toBe("SEO Expert in India");
  });
  it("answer block is a self-contained 40-60 word passage", () => {
    const words = seoExpertIndia.answer.trim().split(/\s+/).length;
    expect(words).toBeGreaterThanOrEqual(40);
    expect(words).toBeLessThanOrEqual(60);
  });
  it("has exactly 7 service blocks with extractable definitions", () => {
    expect(seoExpertIndia.serviceBlocks).toHaveLength(7);
    for (const b of seoExpertIndia.serviceBlocks) expect(b.definition.length).toBeGreaterThan(40);
  });
  it("has three INR pricing tiers with positive numeric prices", () => {
    expect(seoExpertIndia.pricingTiers).toHaveLength(3);
    for (const t of seoExpertIndia.pricingTiers) {
      expect(t.currency).toBe("INR");
      expect(Number(t.price)).toBeGreaterThan(0);
    }
    expect(seoExpertIndia.pricingTiers.map((t) => t.price)).toEqual(["6999", "13999", "22999"]);
  });
  it("has 6-10 answer-first FAQs", () => {
    expect(seoExpertIndia.faqs.length).toBeGreaterThanOrEqual(6);
    expect(seoExpertIndia.faqs.length).toBeLessThanOrEqual(10);
  });
  it("carries a visible ISO updated date", () => {
    expect(seoExpertIndia.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/data/landing/seo-expert-india.test.ts`
Expected: FAIL — cannot resolve `./seo-expert-india`.

- [ ] **Step 3: Create the type**

Create `src/lib/data/landing/types.ts` with the `SeoLandingContent` type exactly as in **Interfaces → Produces** above.

- [ ] **Step 4: Author the copy module**

Create `src/lib/data/landing/seo-expert-india.ts`. Write **real, answer-first copy** (national pillar depth: aim 2,000–3,000 words rendered). Structure:

```ts
import type { SeoLandingContent } from "./types";

export const seoExpertIndia: SeoLandingContent = {
  areaName: "India",
  areaServedType: "Country",
  path: "/seo-expert-india",
  h1: "SEO Expert in India",
  metaTitle: "SEO Expert in India",
  metaDescription: "Work with an SEO expert in India who grows organic traffic and qualified leads — technical SEO, content, and AEO. See packages and book a call.",
  subhead: "I grow qualified organic traffic and leads for Indian businesses — through technical SEO, answer-first content, and optimisation for the AI engines that now answer your customers.",
  answer:
    // 40-60 words, self-contained: what an SEO expert in India does + rough cost + expected result.
    "An SEO expert in India improves your visibility on Google and AI answer engines through technical fixes, keyword-driven content, and authority building. Packages typically run ₹6,999–₹22,999 per month depending on scope. Most sites see measurable ranking movement within 3–4 months and meaningful lead growth by month six.",
  serviceBlocks: [
    { h3: "Keyword Research", definition: "I map the exact commercial and question queries your buyers use — including the long-tail terms that now trigger AI Overviews — and prioritise them by intent and winnability." },
    { h3: "On-Page SEO", definition: "I optimise titles, headings, internal links, and answer-first copy so each page targets one intent cleanly and is easy for search engines and LLMs to extract and cite." },
    { h3: "Off-Page SEO", definition: "I earn relevant links and mentions through digital PR and outreach, building the domain authority that lets competitive pages rank." },
    { h3: "Technical SEO", definition: "I fix crawlability, indexation, site speed, Core Web Vitals, and schema so search engines can access, understand, and trust every page." },
    { h3: "Local SEO", definition: "I optimise Google Business Profiles, local citations, and location pages so you rank in map packs and city-level searches where you operate." },
    { h3: "Content Strategy", definition: "I build topic clusters and answer-first articles engineered to compound in traffic and to be quoted by ChatGPT, Perplexity, and AI Overviews." },
    { h3: "SEO Strategy & Reporting", definition: "I set the roadmap, instrument tracking, and report on rankings, traffic, and leads every month so you can see what the work returns." },
  ],
  process: [
    { step: "Audit", detail: "A full technical, content, and competitor audit to find what's broken and what's winnable in 30 days." },
    { step: "Strategy", detail: "A prioritised roadmap tied to the keywords and pages that drive qualified leads, not vanity traffic." },
    { step: "Execution", detail: "Technical fixes, on-page optimisation, content, and link building shipped on a fixed monthly cadence." },
    { step: "Reporting", detail: "Monthly reporting on rankings, organic traffic, and leads, with the next month's priorities agreed together." },
  ],
  differentiators: [
    // Every value must be a real number/fact — replace any you cannot back honestly.
    { label: "Years in SEO & growth", value: "8+ years" },
    { label: "Answer-engine coverage", value: "Optimised for Google + 4 AI engines" },
    { label: "Reporting cadence", value: "Monthly, with live dashboards" },
    { label: "Typical first results", value: "3–4 months" },
  ],
  pricingTiers: [
    { name: "Silver SEO Package", price: "6999", currency: "INR", features: ["1–3 target keywords", "SEO audit", "On-page + off-page", "Monthly report"] },
    { name: "Gold SEO Package", price: "13999", currency: "INR", features: ["5–10 target keywords", "Technical SEO", "Content optimisation", "Competitor analysis"] },
    { name: "Platinum SEO Package", price: "22999", currency: "INR", features: ["15+ target keywords", "Advanced technical + content", "CRO", "Link building", "Quarterly review"] },
  ],
  faqs: [
    { question: "How much does an SEO expert cost in India?", answer: "SEO expert services in India typically range from ₹6,999 to ₹22,999 per month depending on keyword count and scope. Packages usually cover audit, on-page, off-page, technical SEO, and monthly reporting." },
    { question: "How long does SEO take to show results?", answer: "Most sites see measurable ranking movement in 3–4 months and meaningful traffic gains by month six, depending on competition, domain age, and content velocity." },
    { question: "Is hiring an SEO expert worth it for a small business?", answer: "Yes. A focused SEO expert targets high-intent local and commercial keywords, which drives qualified leads at a lower long-term cost than paid ads for most small businesses." },
    { question: "What's the difference between SEO and AEO/GEO?", answer: "SEO ranks your pages in Google's classic results; AEO/GEO optimises the same content to be quoted by AI answer engines like ChatGPT, Perplexity, and AI Overviews. I build for both together." },
    { question: "Do you guarantee first-page rankings?", answer: "No credible SEO expert guarantees specific rankings, because Google controls the algorithm. I guarantee the process, transparent reporting, and work focused on the keywords that drive revenue." },
    { question: "Which industries do you work with?", answer: "I work with local service businesses, e-commerce, and B2B/SaaS across India. The approach adapts to your buyers' search behaviour and competition, not a fixed template." },
    { question: "How do you report on SEO progress?", answer: "You get a monthly report covering keyword rankings, organic traffic, and leads, plus a live dashboard and an agreed set of priorities for the next month." },
  ],
  caseStudySlugs: ["occasion-cakes-local-seo", "stone-and-acres-land-stories"],
  trustNames: [
    // Real client names only — pulled from your case studies / testimonials.
    "Occasion Cakes", "Stone & Acres",
  ],
  updatedAt: "2026-07-11",
};
```

> The `differentiators` values and `trustNames` are seeded with placeholders you must replace with **real, defensible** numbers/names before merge. The content-contract test does not police truthfulness — you do.

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/lib/data/landing/seo-expert-india.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/data/landing/
git commit -m "feat(seo): SeoLandingContent type + /seo-expert-india copy module"
```

---

### Task 4: Three new section components (AnswerBlock, TrustBar, PricingTiers)

**Files:**
- Create: `src/components/sections/answer-block.tsx`
- Create: `src/components/sections/trust-bar.tsx`
- Create: `src/components/sections/pricing-tiers.tsx`

**Interfaces:**
- Produces (all reused verbatim by the future city template):
  ```ts
  export function AnswerBlock(props: { text: string }): JSX.Element;
  export function TrustBar(props: { names: string[] }): JSX.Element; // text fallback; logo support added when assets exist
  export function PricingTiers(props: {
    tiers: { name: string; price: string; currency: "INR"; features: string[] }[];
  }): JSX.Element;
  ```
- Consumes: existing `Container`/`Section` (`@/components/layout/container`), `Card` (`@/components/ui/card`), `Reveal` (`@/components/motion/reveal`), `site.bookingUrl`, `buttonVariants`, `cn`. These have no unit-render harness in this repo — verification is typecheck + build + browser preview in Task 5.

- [ ] **Step 1: Write AnswerBlock**

`src/components/sections/answer-block.tsx`:

```tsx
import { Container, Section } from "@/components/layout/container";
import { Reveal } from "@/components/motion/reveal";

/** The AEO "TL;DR" passage: a self-contained answer engines can lift and cite. */
export function AnswerBlock({ text }: { text: string }) {
  return (
    <Section className="pt-0">
      <Container>
        <Reveal>
          <p className="mx-auto max-w-3xl border-l-2 border-foreground/20 pl-5 text-lg leading-8 text-foreground/90 md:text-xl">
            {text}
          </p>
        </Reveal>
      </Container>
    </Section>
  );
}
```

> Confirm `Section` accepts a `className` prop by reading `src/components/layout/container.tsx`. If it does not, wrap in a `div` with the class instead.

- [ ] **Step 2: Write TrustBar**

`src/components/sections/trust-bar.tsx`:

```tsx
import { Container, Section } from "@/components/layout/container";

/**
 * Trust bar. Renders client names as text — no star ratings, no aggregateRating
 * (no real GBP numbers exist). Swap in <img> logos from /public/logos/ once real
 * asset files are added; until then text names ship (never a broken image).
 */
export function TrustBar({ names }: { names: string[] }) {
  if (names.length === 0) return null;
  return (
    <Section className="py-8">
      <Container>
        <p className="text-center text-xs uppercase tracking-[0.14em] text-muted-foreground">Trusted by</p>
        <ul className="mt-4 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
          {names.map((n) => (
            <li key={n} className="text-sm font-medium text-foreground/70">{n}</li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}
```

- [ ] **Step 3: Write PricingTiers**

`src/components/sections/pricing-tiers.tsx`:

```tsx
import { Card } from "@/components/ui/card";
import { Container, Section } from "@/components/layout/container";
import { Reveal } from "@/components/motion/reveal";
import { BrandIcon } from "@/components/ui/brand-icon";
import { buttonVariants } from "@/components/ui/button";
import { site } from "@/lib/site";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

const inr = (price: string) => `₹${Number(price).toLocaleString("en-IN")}`;

export function PricingTiers({
  tiers,
}: {
  tiers: { name: string; price: string; currency: "INR"; features: string[] }[];
}) {
  return (
    <Section id="pricing">
      <Container>
        <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">Packages</h2>
        <div className="mt-6 grid gap-6 md:grid-cols-3">
          {tiers.map((t) => (
            <Reveal key={t.name}>
              <Card className="flex h-full flex-col p-6">
                <h3 className="font-semibold">{t.name}</h3>
                <div className="mt-2 flex items-baseline gap-1.5">
                  <span className="font-display text-3xl font-extrabold tracking-tight">{inr(t.price)}</span>
                  <span className="text-xs text-muted-foreground">/ month</span>
                </div>
                <ul className="mt-5 flex flex-1 flex-col gap-2.5 text-sm">
                  {t.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5">
                      <Check className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <a
                  href={site.bookingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(buttonVariants({ size: "lg" }), "mt-6 w-full")}
                >
                  <BrandIcon name="CalendarCheck" />
                  Book a call
                </a>
              </Card>
            </Reveal>
          ))}
        </div>
      </Container>
    </Section>
  );
}
```

> `Card`, `buttonVariants`, `BrandIcon`, `Reveal`, `Section id=` usage all mirror `src/app/services/[slug]/page.tsx`. Confirm `Section` supports `id` (read `container.tsx`); if not, add `id="pricing"` to an inner `div` so the hero "See pricing" anchor works.

- [ ] **Step 4: Typecheck the new components**

Run: `npx tsc --noEmit`
Expected: no errors referencing the three new files. (Full page wiring is verified in Task 5.)

- [ ] **Step 5: Commit**

```bash
git add src/components/sections/answer-block.tsx src/components/sections/trust-bar.tsx src/components/sections/pricing-tiers.tsx
git commit -m "feat(seo): AnswerBlock, TrustBar, PricingTiers landing sections"
```

---

### Task 5: The `/seo-expert-india` page + full verification

**Files:**
- Create: `src/app/seo-expert-india/page.tsx`

**Interfaces:**
- Consumes: `seoExpertIndia` (Task 3), `seoLandingSchema` (Task 1), `AnswerBlock`/`TrustBar`/`PricingTiers` (Task 4), and existing `buildMetadata`, `breadcrumbSchema`, `faqSchema`, `reviewSchema`, `JsonLd`, `PageHero`, `Container`/`Section`, `Card`, `Accordion*`, `CtaBand`, `CaseStudyCard`, `TestimonialCard`, `getPublishedEntities`, `site`, `buttonVariants`, `cn`, `BrandIcon`.
- Table names for `getPublishedEntities`: `"case_studies"` (→ `CaseStudy[]`), `"testimonials"` (→ `Testimonial[]`).

- [ ] **Step 1: Read the component props you'll wire**

Read these to get exact props (existing components — mirror their current usage, do not invent props):
- `src/components/layout/page-hero.tsx` — `PageHero` (used with `eyebrow`, `title`, `description`, `crumbs`, `actions` in `services/[slug]/page.tsx:62-79`). **`PageHero`'s `title` must render the page's single `<h1>`** — confirm it does; if it renders a lower tag, render the `<h1>` yourself and don't pass a duplicate.
- `src/components/cards/case-study-card.tsx` and `src/components/cards/testimonial-card.tsx` — mirror how `src/app/page.tsx` maps `CaseStudy[]` / `Testimonial[]` into them.
- `src/components/layout/container.tsx` — confirm `Section` `className`/`id` support (see Task 4 notes).

- [ ] **Step 2: Write the page**

Create `src/app/seo-expert-india/page.tsx`. Compose in the render order from the spec. Skeleton (fill section markup mirroring `services/[slug]/page.tsx` patterns — Card grid for §4/§7, numbered `<ol>` for §6, `Accordion` for §11):

```tsx
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { BrandIcon } from "@/components/ui/brand-icon";
import { site } from "@/lib/site";
import { buildMetadata, breadcrumbSchema, faqSchema, reviewSchema, seoLandingSchema } from "@/lib/seo";
import type { CaseStudy, Testimonial } from "@/lib/data/types";
import { getPublishedEntities } from "@/lib/content/queries";
import { seoExpertIndia as c } from "@/lib/data/landing/seo-expert-india";
import { Container, Section } from "@/components/layout/container";
import { PageHero } from "@/components/layout/page-hero";
import { Card } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { buttonVariants } from "@/components/ui/button";
import { CtaBand } from "@/components/sections/cta-band";
import { AnswerBlock } from "@/components/sections/answer-block";
import { TrustBar } from "@/components/sections/trust-bar";
import { PricingTiers } from "@/components/sections/pricing-tiers";
import { CaseStudyCard } from "@/components/cards/case-study-card";
import { TestimonialCard } from "@/components/cards/testimonial-card";
import { cn } from "@/lib/utils";

export const revalidate = 300; // ISR — CDN-instant, refresh every 5 min

export const metadata = buildMetadata({
  title: c.metaTitle,          // "SEO Expert in India" (brand appended by root template)
  description: c.metaDescription,
  path: c.path,
});

export default async function SeoExpertIndiaPage() {
  const [caseStudies, testimonials] = await Promise.all([
    getPublishedEntities<CaseStudy>("case_studies"),
    getPublishedEntities<Testimonial>("testimonials"),
  ]);
  const seoCases = (c.caseStudySlugs?.length
    ? caseStudies.filter((cs) => c.caseStudySlugs!.includes(cs.slug))
    : caseStudies.filter((cs) => cs.featured)
  ).slice(0, 3);
  const shownTestimonials = testimonials.slice(0, 3);

  return (
    <>
      <JsonLdWrapper
        cases={seoCases}
        testimonials={shownTestimonials}
      />
      <PageHero
        eyebrow="SEO Expert"
        title={c.h1}
        description={c.subhead}
        crumbs={[{ label: "Home", href: "/" }, { label: c.h1 }]}
        actions={
          <>
            <a href={site.bookingUrl} target="_blank" rel="noopener noreferrer" className={cn(buttonVariants({ size: "lg" }))}>
              <BrandIcon name="CalendarCheck" />
              Book a call
            </a>
            <Link href="#pricing" className={cn(buttonVariants({ variant: "outline", size: "lg" }))}>
              See pricing
              <ArrowRight />
            </Link>
          </>
        }
      />

      <AnswerBlock text={c.answer} />
      <TrustBar names={c.trustNames} />

      {/* §4 Services grid — mirror the "What you get" Card grid in services/[slug]/page.tsx */}
      {/* §5 Proof — seoCases.map((cs) => <CaseStudyCard ... />); render nothing (not a fake) if empty */}
      {/* §6 Process — numbered <ol> over c.process */}
      {/* §7 Why us — Card grid over c.differentiators */}
      <PricingTiers tiers={c.pricingTiers} />
      {/* §9 About — bio + photo + sameAs from src/lib/site.ts (NO Person JSON-LD here) */}
      {/* §10 Testimonials — shownTestimonials.map((t) => <TestimonialCard ... />) */}

      {/* §11 FAQ */}
      <Section>
        <Container>
          <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">FAQ</h2>
          <Accordion type="single" collapsible className="mt-2">
            {c.faqs.map((f) => (
              <AccordionItem key={f.question} value={f.question}>
                <AccordionTrigger>{f.question}</AccordionTrigger>
                <AccordionContent>{f.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Container>
      </Section>

      {/* §14 internal links */}
      <Section className="py-8">
        <Container>
          <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <Link href="/services/seo" className="hover:text-foreground">SEO service</Link>
            <Link href="/case-studies" className="hover:text-foreground">Case studies</Link>
            <Link href="/about" className="hover:text-foreground">About Shubham</Link>
          </nav>
          <p className="mt-4 text-xs text-muted-foreground">Last updated {c.updatedAt}</p>
        </Container>
      </Section>

      <CtaBand
        title="Ready to grow your organic traffic?"
        description="Book a call or send a brief — I'll tell you honestly what SEO can do for your business and how fast."
      />
    </>
  );
}
```

Replace the `JsonLdWrapper` placeholder with an inline `<JsonLd data={[...]} />` (import `JsonLd` from `@/components/seo/json-ld`) carrying exactly:

```tsx
<JsonLd
  data={[
    seoLandingSchema({
      path: c.path,
      name: "SEO Expert Services in India",
      areaServed: { type: c.areaServedType, name: c.areaName },
      offers: c.pricingTiers.map((t) => ({ name: t.name, price: t.price, description: t.features.join(", ") })),
    }),
    breadcrumbSchema([
      { name: "Home", path: "/" },
      { name: c.h1, path: c.path },
    ]),
    faqSchema(c.faqs),
    ...(shownTestimonials.length ? [{ /* reviewSchema returns an array */ }] : []),
  ]}
/>
```

For reviews, `reviewSchema(shownTestimonials)` returns an **array** of Review nodes — spread it into the `data` array: `...reviewSchema(shownTestimonials)`. Do **not** add any Person node (it's global) and do **not** add `aggregateRating`.

Fill the four commented sections (§4, §6, §7, §10) with real markup mirroring the referenced existing patterns. Keep every FAQ answer identical to `c.faqs` (schema is generated from the same source, so they stay in sync by construction).

- [ ] **Step 3: Lint + typecheck**

Run: `npm run lint`
Expected: no errors in the new files.
Run: `npx tsc --noEmit`
Expected: no type errors.

- [ ] **Step 4: Build — verify by exit code (never pipe)**

Run: `npm run build && echo BUILD_OK`
Expected: the build completes and prints `BUILD_OK` on the last line. If `BUILD_OK` is absent, the build failed — fix before continuing (do not judge success from earlier log lines; a `server-only` import in a client path fails the build while passing tsc).

- [ ] **Step 5: Verify in the browser preview**

Start the dev server and drive the page (use the Browser pane tools, not Bash):
1. `preview_start { name: "dev" }` (add a `dev` entry to `.claude/launch.json` if absent: `npm run dev`, port 3000).
2. `navigate` to `http://localhost:3000/seo-expert-india`.
3. `read_console_messages` — expect no errors.
4. `read_page` — assert: exactly one `<h1>` = "SEO Expert in India"; the answer block, pricing tiers (₹6,999/₹13,999/₹22,999), FAQ, and CTA are present.
5. `javascript_tool`: `document.querySelectorAll('h1').length` → expect `1`. `[...document.querySelectorAll('script[type="application/ld+json"]')].map(s=>JSON.parse(s.textContent)['@type']||(JSON.parse(s.textContent)['@graph']&&'graph'))` → expect to see the global graph plus `Service`, `BreadcrumbList`, `FAQPage`, and `Review` nodes; confirm **no** `AggregateRating` and only one Person (in the global graph).
6. `computer { action: "screenshot" }` — capture the rendered page as proof.

- [ ] **Step 6: Validate structured data**

Copy the page's rendered HTML (or the deployed URL after merge) into Google's Rich Results Test and the Schema.org validator. Expected: no errors; Service, FAQPage, BreadcrumbList detected.

- [ ] **Step 7: Commit**

```bash
git add src/app/seo-expert-india/page.tsx .claude/launch.json
git commit -m "feat(seo): /seo-expert-india national landing page"
```

---

### Task 6: Open PR

- [ ] **Step 1: Push and open the PR**

```bash
git push -u origin feat/seo-expert-landing
gh pr create --base main --title "feat(seo): /seo-expert-india national landing page" --body "$(cat <<'EOF'
National "SEO Expert in India" landing page — Approach A (bespoke static page + typed copy module), per docs/superpowers/specs/2026-07-11-seo-expert-landing-design.md.

- New: /seo-expert-india (static, ISR 300s), typed copy module, seoLandingSchema (Service + areaServed + OfferCatalog), 3 section components.
- Reuses existing schema builders + section/card components; proof pulled live from DB.
- Honest by design: no aggregateRating/stars, no LocalBusiness/NAP, no fabricated metrics.
- City-page template deferred to a follow-up cycle.

Vitest green; `next build` exits 0; verified in browser preview + Rich Results Test.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 2: Note deploy gate**

Do NOT deploy to production automatically — Vercel git auto-deploy is dormant; deployment is a per-deploy manual gate the user triggers. Stop after the PR.

---

## Self-Review

**Spec coverage:**
- §3 sections 1–11, 13, 14 → Task 5 (page composition); §2 answer block → Task 4 `AnswerBlock` + Task 5; §3 trust bar → Task 4 `TrustBar`; §8 pricing → Task 4 `PricingTiers`; §5/§10 proof → Task 5 live DB. §12 local signals → intentionally skipped (documented). ✅
- §4 schema: `seoLandingSchema` → Task 1; breadcrumb/faq/review reuse → Task 5; global Person untouched → Global Constraints + Task 5 note. ✅
- §5 files: all eight files mapped across Tasks 1–5. ✅
- §9 acceptance criteria: single h1 (Task 5 Step 5.4/5.5), title<60 (buildMetadata + Task 3), sitemap/pillar (Task 2), JSON-LD + no dupe Person + no aggregateRating (Task 1 tests + Task 5 Step 5.5), FAQ verbatim (single source, Task 5), live proof (Task 5), logo fallback (Task 4 TrustBar), build exit 0 (Task 5 Step 4), booking + attribution (Task 5 CtaBand/CTA). ✅
- §10 user-owned items: surfaced as inline warnings in Task 3 (differentiators/trustNames must be real) and left to the user (logos, pricing reconciliation). ✅

**Placeholder scan:** The `JsonLdWrapper` in Task 5 Step 2 is explicitly replaced in the same step with the concrete `<JsonLd data={[...]} />`; the four commented page sections carry explicit "mirror pattern X at path Y" instructions, not vague TODOs. Seed values in the copy module are flagged as replace-with-real, which is a truthfulness gate (human judgment), not a code placeholder. Acceptable.

**Type consistency:** `SeoLandingContent` fields used in Task 5 (`h1`, `subhead`, `answer`, `path`, `metaTitle`, `metaDescription`, `pricingTiers{name,price,currency,features}`, `faqs{question,answer}`, `caseStudySlugs`, `trustNames`, `areaServedType`, `areaName`, `updatedAt`) all match the Task 3 type. `seoLandingSchema` param shape (`{path,name,areaServed{type,name},offers[{name,price,description}]}`) matches Task 1 and its call site in Task 5. `getPublishedEntities<T>(table)` matches the real signature. `reviewSchema` returns an array (spread) — noted. ✅
