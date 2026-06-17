# SEO · GEO · AEO — Audit & Checklist

**Site:** shubhamdatarkar.com · **Audited:** June 2026 · **Stack:** Next.js 16 App Router, Supabase, Vercel

This is a tailored checklist + audit of your actual codebase. Each item is tagged with its current
status and the discipline it serves. Work top-down: **Must** items are non-negotiable for being
found and cited, **Should** items are the difference between "indexed" and "preferred," **Could**
items are upside once the rest is solid.

**Status legend:** ✅ Done · 🟡 Partial · ❌ Missing
**Discipline tags:** `[SEO]` classic search · `[AEO]` answer engines (featured snippets, AI Overviews, "People Also Ask") · `[GEO]` generative engines (ChatGPT, Gemini, Perplexity, Claude)

---

## 0. How these four targets actually find and cite you

You can't optimize what you don't understand. None of the AI engines have a "submit" form — they pull
from crawlers + an underlying index:

| Target | Discovery path | What wins |
|---|---|---|
| **Google Search** | Googlebot → Google index | Relevance, E-E-A-T, links, Core Web Vitals |
| **Google AI Overviews / Gemini** | Google index + Gemini synthesis | Same as Search **plus** clean structure, schema, fact density |
| **ChatGPT (Search)** | **Bing index** + OAI-SearchBot/GPTBot | Bing ranking + **brand mentions** + topical authority |
| **Perplexity** | Own crawler (PerplexityBot) + multiple indexes | **Recency** + primary-source clarity + citable structure |

**Three consequences that drive this whole list:**
1. **Bing matters as much as Google.** ChatGPT runs on Bing's index. If you're not in Bing Webmaster Tools, you're invisible to ChatGPT Search regardless of content quality.
2. **Crawlers must be allowed.** One blocked AI bot = invisible to that engine. (You're fine here — see audit.)
3. **Being *cited* is the new ranking.** A citation in an AI answer drives up to ~35% CTR lift, and off-site brand mentions are the single strongest predictor of ChatGPT citations.

---

## 1. Audit summary — where you stand

**Already strong (genuinely above average):**
- ✅ Per-route metadata via `generateMetadata` + a clean `buildMetadata()` helper (`src/lib/seo.ts`)
- ✅ Canonical URLs on every page; `metadataBase` set
- ✅ `sitemap.ts` (dynamic, covers posts/case-studies/services/tools/products) + `robots.ts`
- ✅ AI crawlers **not** blocked — `robots.ts` explicitly welcomes GPTBot, ClaudeBot, PerplexityBot, Google-Extended; `*` rule allows the rest (OAI-SearchBot, Applebot, Bingbot)
- ✅ Structured data wired server-side: `Person` (root), `Article` + `BreadcrumbList` (blog posts), `FAQPage` (FAQ), `Organization`
- ✅ `public/llms.txt` (curated, with an "instructions for AI assistants" block — well done)
- ✅ OG image generation via file convention; Twitter card metadata; PWA manifest
- ✅ Fast SSR HTML with inline JSON-LD (no hydration needed to parse), semantic landmarks, skip-link, `display: swap` fonts, Speed Insights

**Top gaps (fix these first — details in the checklist):**
| # | Gap | Impact | Status |
|---|---|---|---|
| 1 | Not verified in Google Search Console **or Bing Webmaster Tools** | Google AI Overviews + ChatGPT can't reliably retrieve you | ❌ |
| 2 | `sameAs` social links are placeholder root URLs (`https://x.com/`, `https://linkedin.com/in/`…) | Breaks entity/knowledge-graph recognition — core to GEO for a personal brand | ❌ |
| 3 | `Article` schema `image` points to `/og/default.png`, which **does not exist** | Invalid structured-data image; weakens rich results | ❌ |
| 4 | No `WebSite` + `sameAs` on Organization; no `ProfilePage`/sameAs depth | Weaker entity graph | 🟡 |
| 5 | Imagery is generative SVG placeholders, not real images/video | Multimodal pages get ~3x higher AI-Overview selection | 🟡 |
| 6 | No per-post OG images (all share one) | Lower social/AI card CTR | 🟡 |
| 7 | No analytics for AI-referral traffic | Can't measure GEO/AEO progress | ❌ |

---

## 2. MUST — non-negotiable foundation

> If any of these is missing you are leaving discoverability on the table that no amount of content fixes.

### Indexability & retrieval
- ❌ `[SEO][AEO][GEO]` **Verify in Google Search Console** and submit `sitemap.xml`. Add the verification token via Next metadata: `verification: { google: "…" }` in `src/lib/seo.ts` / root `metadata`.
- ❌ `[GEO]` **Verify in Bing Webmaster Tools** and submit the sitemap. This is the retrieval path for **ChatGPT Search** — equally important as Google here, and currently absent. (You can import the GSC property to save time.)
- ✅ `[SEO]` Sitemap exists and is referenced in `robots.ts`. Keep `lastModified` accurate (you already drive post dates from data).
- ✅ `[GEO]` AI crawlers allowed (GPTBot, OAI-SearchBot, PerplexityBot, ClaudeBot, Applebot, Bingbot). Nothing is blocked — confirmed in `robots.ts`. **Do not** add disallows for these.
- ✅ `[SEO]` Canonical URL on every route (`alternates.canonical`). Keep it; prevents duplicate-content dilution.
- 🟡 `[SEO]` Private/app routes kept out of the index. `robots.ts` disallows `/dashboard /profile /settings /login /success /search` — **add `/admin`** (currently crawlable).

### Crawlable, fast, valid HTML
- ✅ `[SEO][AEO]` Server-rendered content (App Router SSR) — AI crawlers mostly don't run JS, so server HTML is essential. You're good.
- ✅ `[SEO]` Core Web Vitals instrumented (Speed Insights). **Keep LCP < 2.5s, INP < 200ms, CLS < 0.1.** Verify on real production URLs after launch.
- ✅ `[SEO]` Mobile-first / responsive + viewport set. Confirmed.
- ✅ `[SEO]` `lang="en"` on `<html>`. Confirmed.

### Per-page metadata (every indexable page)
- ✅ `[SEO]` Unique `<title>` (≤60 chars) + meta description (≤155 chars). `buildMetadata` enforces a pattern — audit each page's actual `title`/`description` for uniqueness and keyword intent.
- ✅ `[SEO][GEO]` OpenGraph + Twitter card on every page. Present.
- 🟡 `[SEO]` One `<h1>` per page, headings in order. Confirmed on blog; **spot-check marketing pages** for single-h1 discipline.

### Structured data (JSON-LD) — the AEO/GEO backbone
- ✅ `[AEO][GEO]` `Person` schema sitewide — your core entity. Good.
- ❌ `[AEO][GEO]` **Fix the broken `Article.image`.** In `src/lib/seo.ts`, `articleSchema` falls back to `${site.url}/og/default.png` which 404s. Either pass each post's OG image, point it at the route's generated `opengraph-image`, or add a real `/og/default.png`. Broken image URLs can invalidate the whole rich result.
- ❌ `[GEO]` **Fix `sameAs`.** In `src/lib/site.ts` the social `href`s are bare domains (`https://x.com/`, `https://linkedin.com/in/`, `https://github.com/`, `https://youtube.com/`). Put the **real profile URLs** there — `sameAs` is how Google/LLMs disambiguate "Shubham Datarkar" into a known entity. This is the highest-leverage one-line fix in the repo.
- ✅ `[AEO]` `BreadcrumbList` on posts; `FAQPage` on FAQ. Keep, and **reuse `faqSchema` anywhere you have Q&A** (services, products, support).
- ✅ `[SEO]` Validate everything in Google's **Rich Results Test** + **Schema Markup Validator** before relying on it.

### E-E-A-T (Experience, Expertise, Authoritativeness, Trust)
- ✅ `[SEO][GEO]` Visible author byline + avatar on posts (`author` from data). Good.
- 🟡 `[GEO]` **Author entity depth.** Ensure the byline links to a real author/about page, and the `Person` schema carries `sameAs`, `jobTitle`, `knowsAbout` (it does) — extend `knowsAbout` to match your actual topics and link author → `/about`.
- ✅ `[SEO]` Contact, privacy, terms pages exist (trust signals). Confirmed.

---

## 3. SHOULD — the difference between indexed and preferred

### Content structure for AI extraction (AEO/GEO)
- 🟡 `[AEO][GEO]` **Answer-first blocks.** Open key sections / posts with a self-contained **40–70 word** direct answer, then expand. This is the single most-cited GEO tactic — AI engines lift these verbatim.
- 🟡 `[AEO]` **Phrase H2/H3s as real questions** people ask ("How much does SEO cost in India?") and answer immediately beneath. Aligns with "People Also Ask" and prompt phrasing.
- 🟡 `[AEO][GEO]` **FAQ sections on money pages** (services, products, each service `[slug]`), each emitting `faqSchema`. Pages with FAQPage schema are ~3.2x more likely to surface in AI Overviews.
- ❌ `[AEO]` **`HowTo` schema** for your guide/playbook posts and free-tool walkthroughs. Add a `howToSchema` helper alongside the others.
- 🟡 `[GEO]` **Fact density** — concrete stats, dates, numbers, named entities, and primary-source citations inside the prose. LLMs preferentially cite quantified, sourced claims over vague ones.

### Entity & graph signals
- ❌ `[SEO][GEO]` Add **`WebSite` schema** with `SearchAction` (sitelinks search box) and **`Organization` `sameAs`** (currently `Organization` lacks `logo` + complete `sameAs`). Strengthens the brand entity for all engines.
- 🟡 `[GEO]` **Consistent NAP/identity** — same name, alias ("The Kalamwala"), role, and location everywhere on-site and off-site. You're consistent on-site; mirror it on every off-site profile.
- ❌ `[GEO]` Consider a dedicated **`ProfilePage`** schema on `/about` (Google's recommended type for "about a person/creator" pages).

### Media (multimodal) — a real ranking lever now
- 🟡 `[SEO][AEO]` **Real images with descriptive `alt` text and `next/image`.** The site currently uses asset-free SVG placeholders and **zero `next/image`**; pages combining text + original images + schema see materially higher AI-Overview selection. Add genuine diagrams/screenshots to flagship posts and case studies.
- 🟡 `[GEO]` **Per-post / per-page OG images.** Today every page shares one generated OG image. Generate per-post images (Next `opengraph-image` per route) for better social + AI card CTR.
- ❌ `[AEO]` Add **`ImageObject`/`VideoObject`** schema where you embed media; mark up any YouTube embeds.

### Freshness & internal links
- 🟡 `[GEO]` **Freshness cadence.** Perplexity especially is recency-biased. Show and maintain real `dateModified`, and refresh cornerstone posts on a 30–90 day cycle (publish/update dates already flow from data — surface "Updated" visibly).
- 🟡 `[SEO]` **Internal linking / topic clusters.** Pillar pages ↔ supporting posts with descriptive anchor text (your "SEO is infrastructure" post already models this). Make sure every new post links up to a pillar and sideways to siblings.
- ✅ `[SEO]` Clean, readable URL slugs. Confirmed.

### Measurement
- ❌ `[SEO][GEO]` **Add analytics** (GA4 or privacy-light Plausible) and track AI referrers — `chat.openai.com`, `perplexity.ai`, `gemini.google.com`, `copilot.microsoft.com`. You can't manage GEO you can't see. (Your privacy policy already discloses aggregate analytics, so this is consistent.)
- ❌ `[GEO]` **AI-visibility tracking** — periodically prompt ChatGPT/Perplexity/Gemini with your target queries ("best founder-marketer in Nagpur", "SEO consultant India") and log whether/how you're cited.

---

## 4. COULD — upside once the foundation is solid

- ✅/🟡 `[GEO]` **Keep `llms.txt` (you have it).** Honest expectation: Google ignores it, crawlers fetch it rarely, but Perplexity/Anthropic show modest citation uplift and the cost is ~zero. Keep it curated and in sync with your sitemap. *Don't* expect it to do heavy lifting.
- ❌ `[GEO]` **`llms-full.txt`** — a longer machine-readable digest of cornerstone content, for engines that do consume it.
- ❌ `[SEO]` **`IndexNow`** ping (Bing/Yandex) on publish — instant index notification, helps the Bing-backed ChatGPT path. Cheap to wire into your publish action.
- ❌ `[AEO]` **`Service`, `Product`, `Offer`, `Review`/`AggregateRating`** schema on services/products/testimonials for richer results.
- ❌ `[AEO]` **`Event` schema** for `/speaking` engagements.
- ❌ `[SEO]` **`hreflang`** — only if you add languages/regions (e.g., a Hindi or India-specific variant). Not needed for single-locale today.
- ❌ `[GEO]` **Original research / proprietary data / frameworks** published as standalone, quotable pages — the most durable way to earn LLM citations (your "original frameworks" angle in `llms.txt` is exactly this; turn each into a page).
- ❌ `[SEO]` **RSS/Atom feed** for the blog — aids syndication and some AI ingestion.
- 🟡 `[SEO]` **404 / soft-404 hygiene** and a useful `not-found.tsx` (you have one) — keep redirects (`/subscribe → /newsletter` already done) tidy as routes change.

---

## 5. Off-page — what the codebase can't fix (but matters most for GEO)

AI citation correlates more with **off-site presence** than on-site tweaks. For a personal brand, prioritize:
- **Brand mentions** across third-party sites, podcasts, guest posts, and communities (strongest predictor of ChatGPT citation).
- **Complete, consistent profiles** on LinkedIn, X, GitHub, YouTube, Crunchbase, and relevant Indian startup/marketing directories — all linked from (and linking to) your `sameAs`.
- **Wikipedia/Wikidata entity** eligibility over time (notability permitting) — the backbone of knowledge-graph recognition.
- **Earned links** from reputable marketing/SaaS publications.
- **Reviews/testimonials** on independent platforms (you have on-site testimonials; get some off-site too).

---

## 6. Prioritized action plan (do in this order)

**This week (high impact, low effort — mostly code):**
1. Fix `sameAs` real profile URLs in `src/lib/site.ts`. *(one-line, highest leverage)*
2. Fix the broken `Article.image` in `src/lib/seo.ts`.
3. Add `/admin` to robots disallow.
4. Verify Google Search Console + **Bing Webmaster Tools**; submit sitemap to both.
5. Add `WebSite` + `SearchAction` schema and complete `Organization` (`logo`, `sameAs`).

**Next 2–4 weeks (structure + measurement):**
6. Add answer-first 40–70 word intros + question-style H2s to top posts and service pages.
7. Add FAQ sections (with `faqSchema`) to services/products; add a `howToSchema` helper for guides.
8. Install analytics + start logging AI-referrer traffic and manual citation checks.
9. Add real images (`next/image` + alt) and per-post OG images to flagship content.

**Ongoing:**
10. Freshness cadence on cornerstone posts; publish original frameworks as quotable pages; build off-site brand mentions and profiles.

---

*Sources informing the 2026 GEO/AEO guidance in this document: Search Engine Land, Pepper Content, Single Grain, Pixelmojo, Shadow, Sapt, Presenc AI / SE Ranking llms.txt study, and Google's public statements on llms.txt. Validate all structured data in Google's Rich Results Test before relying on it.*
