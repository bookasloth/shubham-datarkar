# Open Items — shubhamdatarkar.com

> Living handoff doc. Each workstream is written to be actioned cold by a fresh
> Claude session (or a human). Last updated 2026-07-16.
>
> **Status at last update:** all 5 `/support/updates` social sub-projects built +
> merged (PRs #24, #31). SEO Phase 1 code complete (6/6). DB activated (3
> support migrations + `support-media` bucket) and verified. Site not yet live.

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
