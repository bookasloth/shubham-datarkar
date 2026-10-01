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

## Workstream A — Production deploy to Vercel (owner + light code)

**Goal:** Get the site live on `shubhamdatarkar.com` via the owner's own Vercel
account. Currently no Vercel account; site not live.

**Reference:** `DEPLOYMENT.md` §0 (ordered go-live runbook), §0b (local dev),
§2 (migrations), §9 (Hostinger→Vercel DNS cutover + SEO go-live).

**Steps:**

1. Create Vercel account → Import GitHub repo `bookasloth/shubham-datarkar` →
   framework auto-detects Next.js.
2. Set **Production env vars** in Vercel (the only env-based config; everything
   else is DB-stored). Full list is in `.env.example`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ADMIN_EMAIL` (the one allowed to sign into `/admin`)
   - `COMMENTER_TOKEN_SECRET` — **generate FRESH** (local values were exposed in
     chat; do not reuse):
     `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`
   - `COMMENTER_OTP_PEPPER` — **generate FRESH** (same command)
   - `GOOGLE_SITE_VERIFICATION` / `BING_SITE_VERIFICATION` — optional, only if
     doing meta-tag verification (see Workstream B).
3. Confirm the Supabase URL/keys point to the owner's OWN project (the one the 3
   support migrations + bucket were applied to), not BAS.
4. Deploy. Confirm the build is green on Vercel.
5. **DNS cutover** per `DEPLOYMENT.md` §9 — point `shubhamdatarkar.com`
   (currently Hostinger) at Vercel; add the domain in Vercel.
6. **Zoho Payments activation** (needed for payments + the auto thank-you post):
   activate the Zoho account, then in `/admin/integrations` confirm the webhook
   secret and update the Zoho webhook URL to
   `https://shubhamdatarkar.com/api/support/webhook`. (Zoho is fully built —
   only activation + prod URL left.)
7. **SMTP:** already stored in the owner's Supabase via `/admin/integrations` →
   carries over. Confirm a test send works (powers comment OTP + notifications).

**Acceptance:** site loads on the custom domain; `/admin` login works; posting a
support update appears at `/support/updates`; a real test payment flips the
support to paid AND auto-posts a `thankyou` update; OTP comment verification
email arrives.

---

## Workstream B — SEO Task 6 external verification (owner)

**Goal:** Finish SEO Phase 1 — verify the site in Google Search Console + Bing
Webmaster, submit the sitemap. The CODE shipped in PR #31 (`src/app/layout.tsx`
renders env-gated `google-site-verification` / `msvalidate.01` meta tags;
`.env.example` documents the vars). Only the external tokens + verify remain.

**Depends on:** Workstream A (site live on the domain).

**Two verification paths — pick one:**

- **DNS (recommended at cutover):** do GSC/Bing TXT-record verification during
  the DNS step. The env meta tags are then redundant (see `DEPLOYMENT.md` §9
  note). Leave `GOOGLE_/BING_SITE_VERIFICATION` empty.
- **Meta tag:** in GSC add property → "HTML tag" method → copy the `content`
  value → set `GOOGLE_SITE_VERIFICATION` in Vercel → redeploy → Verify. Repeat
  in Bing Webmaster (or import the property from GSC) → `BING_SITE_VERIFICATION`.

**Then (both paths):** submit `https://shubhamdatarkar.com/sitemap.xml` in GSC
and Bing. Bing is the retrieval path for ChatGPT Search.

**Reference:** SEO plan Phase 4 §1–2 in
`docs/superpowers/plans/2026-06-18-seo-geo-aeo-implementation.md`.

**Acceptance:** both GSC and Bing show the property verified; sitemap submitted
and accepted in both.

---

## Workstream C — SEO Phases 2–4 (code + editorial, large)

**Goal:** Execute the deferred SEO/GEO/AEO roadmap. Full task specs already exist
in `docs/superpowers/plans/2026-06-18-seo-geo-aeo-implementation.md` — read it
first. Phase 1 is done (6/6 code; only Workstream B is external). Per the plan,
**pick one phase, spin it into its own focused plan + PR** (don't do all at
once). Items tagged **[EDITORIAL]** need the owner's actual words; **[ASSET]**
needs real images.

### Phase 2 (SHOULD) — structure, media, measurement

- **2A** Per-post OG images: `src/app/blog/[category]/[slug]/opengraph-image.tsx`
  (model on `src/app/opengraph-image.tsx`), then pass `image` into
  `articleSchema()` in the post page.
- **2B** `howToSchema` + `imageObjectSchema` + `videoObjectSchema` in
  `src/lib/seo.ts` (mark up the YouTube embed in the SEO pillar post; replace its
  placeholder video id).
- **2C** FAQ schema on money pages — `faqSchema()` already exists; add FAQ
  sections + emit on `/services`, each `/services/[slug]`, `/products/[slug]`.
  **[EDITORIAL]** for the Q&A copy.
- **2D** Answer-first 40–70-word intros + question-style H2s on cornerstone
  posts/services. **[EDITORIAL]** — highest-leverage GEO tactic.
- **2E** Analytics + AI-referrer tracking: add `@vercel/analytics` next to the
  existing `<SpeedInsights/>` in `layout.tsx`; track AI referrers
  (chat.openai.com, perplexity.ai, gemini.google.com, copilot.microsoft.com).
- **2F** Real images via `next/image` + alt on flagship posts/case studies.
  **[ASSET]**.
- **2G** Visible freshness / `dateModified`: add `updated_at` to `POST_COLS` in
  `src/lib/blog/queries.ts`, map to `post.dateModified`, pass into
  `articleSchema`, surface "Updated <date>". No DB migration (column exists).
- **2H** `profilePageSchema()` (`@type: ProfilePage`) on `/about`; extend
  `Person.knowsAbout`.
- **2I** Title/description uniqueness audit (≤60 / ≤155). **[EDITORIAL]**.

### Phase 3 (COULD) — all code

`public/llms-full.txt`; IndexNow ping on publish; RSS feed at
`src/app/feed.xml/route.ts`; `Service`/`Product`/`Offer`/`Review` schema;
`Event` schema on `/speaking`; `hreflang` only if a `.in`/Hindi variant is added.

### Phase 4 (off-page) — non-code

GSC/Bing verify (= Workstream B); cross-link consistent profiles (must match
`sameAs` in `src/lib/site.ts`); earn brand mentions; Wikidata/Wikipedia
eligibility; off-site reviews; periodic AI-visibility tracking (prompt
ChatGPT/Perplexity/Gemini with target queries, log citations).

**Acceptance (per task):** new schema validates in Google Rich Results Test;
`tsc` / `build` / tests green; editorial items reviewed by owner.
