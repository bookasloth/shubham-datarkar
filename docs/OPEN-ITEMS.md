# Open Items — shubhamdatarkar.com

> Living handoff doc. Each workstream is written to be actioned cold by a fresh
> Claude session (or a human). Last updated 2026-10-01.
>
> **Status at last update:** site is LIVE in prod on `shubhamdatarkar.com`
> (Vercel, owner's own account — a SEPARATE Vercel account from the one the
> Vercel MCP connects to, which is Book A Sloth). Instagram Reel → consultation
> funnel measurement shipped + prod-verified (Workstream D). Older status: all 5
> `/support/updates` social sub-projects merged (PRs #24, #31); SEO Phase 1 code
> complete (6/6); support DB activated.

## Workstream D — Instagram Reel consultation funnel (DONE, 2026-10-01)

**Goal:** make the funnel Reel → `/book` → booked call measurable end to end, so
"how many consultation bookings came from Instagram Reels?" is answerable and Meta
can optimize for + exclude bookers.

**Shipped + prod-verified** (PR #428 funnel, PR #429 admin view; both merged, live):

- Site analytics already present: Meta Pixel `4568625823364495`, GA4
  `G-S7YQPEJWD2`, GTM `GTM-MK7RTJR`, Vercel Analytics (all in `src/app/layout.tsx`).
- First-touch attribution now captures `fbclid`/`gclid` + full `utm_*`
  (`src/lib/attribution.ts`, localStorage `sd_first_touch`), forwards `_fbp`/`_fbc`.
- `/book` uses `BookingLink` (fires `ViewContent` + `InitiateCheckout`, appends
  attribution+fbclid onto the bookasloth URL). Lead modal fires `Lead`; CTAs fire
  `ConsultCTAClick`. All events carry a shared `event_id` for Pixel↔CAPI dedup.
- Server CAPI: `src/lib/analytics/meta-capi.ts` (SHA-256 hashes PII, no-ops without
  token). Booking webhook `POST /api/bookings/webhook` (HMAC `x-bookasloth-signature`,
  idempotent on `external_id`) writes a `bookings` row + fires the `Schedule`
  conversion. Contact action fires a deduped server `Lead`.
- `bookings` table + `fbclid`/`gclid`/`utm_content`/`utm_term` columns on `contacts`
  (migration `20261001000001`, RUN on owner's Supabase).
- `/admin/bookings` — read-only table (source/campaign/creative + Paid-click badge +
  header count of total & Instagram bookings), under Audience nav.
- **Prod env SET** on the site's Vercel: `META_CAPI_ACCESS_TOKEN`,
  `BOOKASLOTH_WEBHOOK_SECRET` (= `K7mQ2xV9pL4zN8cR1tY6`), optional `META_PIXEL_ID`.
- Verified: prod webhook bad-sig→401 / valid→200; CAPI `Schedule` landed in Meta
  Events Manager (Test Events, Processed, Server); `/admin/bookings` live.

**Remaining (owner's side, separate bookasloth repo — owner has their own):**
bookasloth.com must, on a confirmed booking, POST `/api/bookings/webhook` with the
carried attribution, signed `HMAC-SHA256(rawBody, BOOKASLOTH_WEBHOOK_SECRET)` hex in
`x-bookasloth-signature`. Body keys: `external_id`, `name`, `email`, `phone`,
`booked_at`, `source`, `attribution{utm_*,fbclid,gclid,landing_page,referrer,ai_source}`,
`fbc`, `fbp`. Until that lands, `/admin/bookings` stays empty and no `Schedule`
conversions fire for real bookings.

**Deferred (P2):** consent banner (India DPDP), `BookingAbandoned` event,
attribution on the other ~14 site-wide booking CTAs (only `/book` + lead modal
instrumented). Context: memory `funnel-attribution-capi`.

**Rotate later:** the CAPI token + webhook secret were pasted in chat during setup —
regenerate (Events Manager / change the string both Vercels) if that transcript is
shared.

## Blueprint program — deferred item (added 2026-07-23)

**F3 — Partial Prerendering / Cache Components (NOT built; do later).** Enabling
`cacheComponents: true` in `next.config.ts` produced **71 build errors** across the
app — every Supabase-backed page must wrap uncached data in `use cache` or
`<Suspense>` first. It is a global rendering-model migration, not a drop-in
feature. Real Core Web Vitals upside (Google ranks speed), so it's worth doing —
but as its own dedicated, **tree-quiet** effort (no concurrent sessions), page by
page, with F11 `use cache` folded in. Everything else in the blueprint design
program is shipped + live. Context: memory `blueprint-design-system-program`.

## Ground rules (apply to all work)

- **Supabase:** use the owner's OWN project only. NEVER touch the connected BAS
  Supabase. Schema changes = write a migration file under `supabase/migrations/`
  + hand the SQL to the owner to run manually; never apply directly.
- **Git:** branch → PR → merge for every change. Never commit to `main`.
- **Next.js is modified here** — read the relevant guide in
  `node_modules/next/dist/docs/` before writing Next code (see `AGENTS.md`).
- **Style:** monochrome, no emojis, Jakarta+Poppins, velocity-first.
- Integration creds (Zoho, SMTP, Kit) live in the owner's Supabase via
  `/admin/integrations`, NOT in env — so they carry over to prod automatically
  (same DB).

---

## Workstream A — Production deploy to Vercel — ✅ DONE

Site is **live** on `shubhamdatarkar.com` via the owner's own Vercel account
(verified this session: public pages 200, `/admin` auth-gated + rendering). Prod
env vars set; Supabase points at the owner's own project; DNS cut over; **no
`middleware.ts`** (confirmed). Payments are **Razorpay**, not Zoho — the doc's old
"Zoho activation" step is obsolete; `src/lib/razorpay/*` + webhook
`/api/members/webhook` are wired. SMTP + integration creds live in the owner's
Supabase (`/admin/integrations`) and carry over.

> NOTE: the owner's site Vercel is a SEPARATE account from the one the Vercel MCP
> connects to in tooling (that one is Book A Sloth). Site env changes must be made
> in the owner's own Vercel, then redeploy.

---

## Workstream B — SEO external verification (GSC + Bing) — ✅ DONE (verify in consoles)

Per the 2026-07 SEO/GEO/AEO overhaul (memory `seo-aeo-geo-audit-2026-07`): sitemap
submitted to Google Search Console + Bing Webmaster. Verification meta-tag plumbing
exists (`google-site-verification` / `msvalidate.01`). This is external state — if
a fresh session needs certainty, log into GSC/Bing and confirm the property shows
verified and `https://shubhamdatarkar.com/sitemap.xml` is accepted.

---

## Workstream C — SEO Phases 2–4 — mostly ✅ DONE (audited 2026-10-01)

Full specs: `docs/superpowers/plans/2026-06-18-seo-geo-aeo-implementation.md`.
Most of this shipped in the 2026-07 SEO overhaul (PRs #281/#282/#284/#286, memory
`seo-aeo-geo-audit-2026-07`). Status below verified against the codebase
2026-10-01.

### Phase 2 — ✅ mostly done

- **2A** Per-post OG images — ✅ `src/app/blog/[category]/[slug]/opengraph-image.tsx`.
- **2B** `howToSchema` / `imageObjectSchema` / `videoObjectSchema` — ❌ NOT DONE.
  None in `src/lib/seo.ts` (only an inline logo `ImageObject` in `publisherOrg()`).
  Add if/when a how-to post or real video embed needs markup.
- **2C** FAQ schema — ⚠️ PARTIAL. `faqSchema()` emitted on `/services/[slug]` +
  11 other pages, but NOT on the `/services` index or `/products/[slug]`. Add there
  (needs Q&A copy **[EDITORIAL]**).
- **2D** Answer-first intros + question-style H2s on cornerstone pages —
  **[EDITORIAL]**, owner's words. Treated as part of the overhaul; re-review if
  targeting specific pages.
- **2E** Analytics + AI-referrer tracking — ✅ `@vercel/analytics` in
  `layout.tsx:16,113`; `AiReferrer` component fires `ai_referral`
  (`src/components/analytics/ai-referrer.tsx`). (Meta Pixel + GA4 + GTM also live —
  see Workstream D.)
- **2F** Real images via `next/image` + alt on flagship posts/case studies —
  **[ASSET]**, needs real images. Open.
- **2G** Visible freshness / `dateModified` — ✅ `updated_at` in `POST_COLS`,
  mapped to `post.dateModified`, "Updated <date>" surfaced + in article schema.
- **2H** `profilePageSchema()` on `/about` + `Person.knowsAbout` — ✅
  (`src/lib/seo.ts:88`, `src/app/about/page.tsx:66`, `src/lib/seo/entities.ts`).
- **2I** Title/description uniqueness audit (≤60 / ≤155) — **[EDITORIAL]**, open.

### Phase 3 — ✅ done except two

- ✅ `public/llms.txt` + `public/llms-full.txt`.
- ✅ IndexNow ping on publish (`src/lib/seo/indexnow.ts`, called from
  `src/lib/blog/actions.ts`).
- ✅ RSS feed `src/app/feed.xml/route.ts`.
- ✅ `Service` / `Product` / `Offer` / `Review` schema in `src/lib/seo.ts`.
- ❌ `Event` schema on `/speaking` — deferred BY DESIGN; `/speaking` emits an honest
  `Service` schema until concrete, dated talks exist (see comment in
  `src/lib/seo.ts`). Swap to `Event` when there are real talks.
- `hreflang` — only if a `.in`/Hindi variant is ever added. Not applicable now.

### Phase 4 (off-page) — non-code, ongoing

GSC/Bing verify = Workstream B (done). Remaining is relationship/authority work:
cross-link consistent profiles (match `sameAs` in `src/lib/site.ts`); earn brand
mentions; Wikidata/Wikipedia eligibility; off-site reviews; periodic AI-visibility
tracking (prompt ChatGPT/Perplexity/Gemini with target queries, log citations).

---

## What actually remains (the short list)

**Code:** 2B (HowTo/Video/ImageObject schema — only when content needs it), 2C
(faqSchema on `/services` index + `/products/[slug]`), Phase-3 `Event` schema on
`/speaking` (when real talks exist). **Assets/editorial:** 2F real images, 2D/2I
copy. **Owner/off-page:** confirm GSC/Bing still verified; Phase-4 authority work;
Workstream D's bookasloth→webhook call (owner has their own). **Infra deferred:**
Blueprint F3 Partial Prerendering (top of this doc).

**Acceptance (per task):** new schema validates in Google Rich Results Test;
`tsc` / `build` / tests green; editorial items reviewed by owner.
