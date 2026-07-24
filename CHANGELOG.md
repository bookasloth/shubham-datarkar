# Changelog

Engineering changelog. The user-facing version history lives on-site at
[`/changelog`](https://shubhamdatarkar.com/changelog) (sourced from
`src/lib/data/site-content.ts`); this file tracks the technical detail.

## v3.6 — 2026-07-24 — Dual-brain nav + first-paint perf

### Navigation
- **Dual-brain header** — the single mega-menu is replaced by two entry points:
  a left burger ("Growth & Systems": services, proof, products) and a right
  kebab ("Ideas & Play": content, community, story). Nav data moves to
  `leftBrain`/`rightBrain` groups in `site.ts`; dead `navGroups`/`primaryNav`
  dropped. `DesktopNav`, the old `BurgerMenu`, and `MoreMenu` are removed and
  folded into the new menu. (#308)
- Both menus render as a **centered panel under the navbar** — three columns on
  desktop (one per group), a bare title stack on mobile — with a single
  one-line action row (YouTube · Spotify · Book a call on the left; socials ·
  Book a call on the right). The latest-cases / recent-writing aside is gone,
  so the header no longer pulls `caseStudies` or `getLatestPostsForNav`. (#308)

### Performance
- `experimental.inlineCss` — Tailwind's atomic CSS is emitted as `<style>` in
  `<head>` instead of a render-blocking `<link>` (~-570ms render block, shorter
  font critical chain). Trade-off: no separate CSS cache for repeat visits. (#309)
- `browserslist` pinned to Chrome/Edge 111+, Firefox 111+, Safari 16.4+ — stops
  SWC injecting core-js polyfills for natively-supported methods, dropping the
  ~14KiB legacy-JS payload. (#309)

## v3.5 — 2026-07-23 — Real tools + growth loop + OG redesign

Made every free tool real (they were mostly hash-of-input demos), wrapped them
in a lead/share/embed loop, positioned the games against their analogs, and
rebuilt every social-share card.

### Tools made real
- **Readability** — real Flesch Reading Ease + Flesch–Kincaid, in-browser
  (`lib/tools/readability.ts`, tested). (#295)
- **SEO Audit** — reuses the internal `analyzePage`/`scorePage` engine on
  external URLs via an SSRF-safe fetch (`lib/tools/safe-fetch.ts` + tested
  `lib/tools/ip.ts`: private-IP/redirect/size/time guards) → `/api/tools/seo-audit`. (#297)
- **Copy Analyzer + Headline Tester** — real analysis via Claude **Haiku**
  (`lib/tools/ai-analyze.ts`, pure tested `ai-parse.ts`) → `/api/tools/analyze`. (#299)
- **Content Brief** — real brief via Haiku (`lib/tools/ai-brief.ts`, tested
  `brief-parse.ts`) → `/api/tools/content-brief`. Removed the dead
  `DemoAnalyzer`/`demoConfigs`/`scoreFrom` — zero fake results remain. (#306)

### Growth loop
- **Lead capture** on results, reusing `subscribe()` (tagged `tool:{slug}`); the
  SEO audit gates its full report behind an email. (#303)
- **Shareable result cards** — `/tools/share` Satori route → 1080×1350 score
  card + native-share/download button. (#304)
- **Embeddable widgets** for UTM/ROAS/Schema at `/tools/[slug]/embed` (bare,
  noindex, backlink); CSP updated so only embed routes are frameable
  (negative-lookahead source keeps the rest at `frame-ancestors 'none'`). (#301)
- **`/tools` hub** emits an `ItemList` of the free tools. (#295)

### SEO / positioning
- Tools got `SoftwareApplication` + `FAQPage` schema and real on-page content
  (overview / how-to / FAQ). (#292)
- Games positioned against Wordle / Bulls-and-Cows / Nerdle — `VideoGame` schema
  (`sameAs`), keyword metadata, per-game About/FAQ. (#292)
- Community + games hub reframed for the marketer/founder/developer audience. (#292)

### Design
- Every OG / social-share card rebuilt: dark charcoal + diagonal panel, orange
  accent, real Jakarta/Poppins, per-page icon, real Sd logo (`lib/seo/og.tsx`). (#289)

## v3.4 — 2026-07-23 — SEO / AEO / GEO overhaul

A full technical-SEO, Answer-Engine, and Generative-Engine optimization pass,
driven by the audit in [`docs/SEO-AEO-GEO-AUDIT-2026-07.md`](docs/SEO-AEO-GEO-AUDIT-2026-07.md).
Shipped across PRs #281, #282, #284, #286.

### Structured data
- Blog posts emit `BlogPosting` with an `Organization` publisher + logo (was a
  `Person` publisher — ineligible for Article rich results).
- `serviceSchema` Offers now carry a numeric `price` (`parseStartingPrice`),
  clearing Google's "missing field price" warnings.
- New `caseStudySchema` (Article) on `/case-studies/[slug]`; `ItemList` +
  `CreativeWork` on `/projects`; free `Service` + zero-price `Offer` + `FAQPage`
  on `/book`.
- The four `Organization` nodes moved into the site-wide graph so `worksFor`
  resolves on every page (were dangling everywhere but `/about`).
- Real `AggregateRating` (5.0 / 30+ reviews) on the Person + 5★ `reviewRating`
  on each Review.
- Entity FAQ (`FAQPage`) on `/about`; data-driven FAQ on case studies.

### Crawl / indexation
- Canonicals on `/community` + `/games` (kills the `?sort=&window=` duplicate
  URLs); `/support` moved from `force-dynamic` to ISR.
- `www` + `.in` → `https://shubhamdatarkar.com` redirects; `noindex` on admin.
- Sitemap `lastMod` uses real dates (blog `dateModified` + DB `updated_at`),
  omitted on static pages; image sitemap added (per-page OG cards).

### Content
- `/projects`: eight real, indexable pages (was a placeholder), each with a
  live/building state, overview, and a Support deep-link.
- `/me` reframed as the build-in-public hub, de-duplicated from the buyer home
  `/`.
- `/philosophy` expanded so it no longer duplicates `/about`; bespoke homepage
  description; consistent nav anchor text.
- Case-study "how this was measured" methodology note.
- Per-project logos: Shubham Datarkar uses the email footer mark; Marketing Bug
  uses a Bug-icon tile.

### Performance
- Scroll reveal reimplemented with IntersectionObserver + CSS instead of
  framer-motion — no animation-library JS on marketing pages.

### Fixes
- Synced `nav-config.test` with the real admin sidebar headings (was red on
  `main`); suite back to green.

### Ops
- Verification meta tags wired via `GOOGLE_SITE_VERIFICATION` /
  `BING_SITE_VERIFICATION` env; sitemap submitted to Google Search Console
  (148 pages) and Bing (147 URLs), both processed successfully.
