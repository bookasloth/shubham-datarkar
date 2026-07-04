# Deployment

Production deploys run on **Vercel** (auto-deploy on push to `main`) against
**Shubham's own Supabase** project (ref `oyzzgjrefkppqkxjccot`) — **never** the
BAS project. Custom domain: shubhamdatarkar.com.

Run through this checklist on first deploy and whenever a step's inputs change
(new migration, new env var, Razorpay key rotation).

---

## 0. Go-live runbook — do in this order

The ordered first-deploy sequence. Each step links to its detailed section below.
Tick as you go.

**Before the day:** you already have your own Supabase project
(ref `oyzzgjrefkppqkxjccot`). You still need a **Vercel account** and the GitHub
repo `bookasloth/shubham-datarkar` to hand to it.

1. [ ] **Apply the database schema** (§2) in Supabase → SQL Editor:
   - Run [`supabase/deploy/full_setup.sql`](supabase/deploy/full_setup.sql).
   - Run [`supabase/migrations/20260617000003_support_updates.sql`](supabase/migrations/20260617000003_support_updates.sql),
     [`supabase/migrations/20260617000004_comment_verifications.sql`](supabase/migrations/20260617000004_comment_verifications.sql),
     and [`supabase/migrations/20260618000001_support_comments.sql`](supabase/migrations/20260618000001_support_comments.sql).
   - Run the §2 verify queries — all green.
2. [ ] **Create the Storage bucket** (§2): Supabase → Storage → New bucket →
   name `support-media` → toggle **Public**.
3. [ ] **Create a Vercel account** and **import** the GitHub repo. Framework
   auto-detects as Next.js. Do **not** deploy yet — it fails without env vars.
4. [ ] **Set all environment variables** in Vercel → Settings → Environment
   Variables, scope **Production** (§1):
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
     `SUPABASE_SERVICE_ROLE_KEY` — copy from Supabase → Settings → API.
   - `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` — Razorpay Dashboard →
     Settings → API Keys (start with the **test** keys).
   - `COMMENTER_TOKEN_SECRET`, `COMMENTER_OTP_PEPPER` — generate **fresh**
     production values: `openssl rand -base64 48` (run twice, distinct).
     Do **not** reuse the local-dev values.
   - `ADMIN_EMAIL` (optional) — lock `/admin` to your email.
5. [ ] **Deploy** (§3): push to `main` (or hit Deploy in Vercel). Confirm the
   build is green in the Vercel dashboard.
6. [ ] **Add the custom domain** shubhamdatarkar.com: Vercel → Settings →
   Domains → add → update DNS as instructed. Wait for the cert.
   (Currently on Hostinger — see §9 for the cutover that keeps GSC + email intact.)
7. [ ] **Enable Speed Insights** once (§3).
8. [ ] **Configure integrations** in `/admin/integrations` (sign in at `/login`
   first):
   - Payments (§4) — confirm `RAZORPAY_KEY_ID` + `RAZORPAY_KEY_SECRET` are set
     (test keys) and run a test payment end-to-end.
   - Kit / newsletter (§7) — Save + Test Connect.
   - Email / SMTP (§8) — Save + Test Connect.
9. [ ] **Smoke-test** on production (§6 + below):
   - Support payment in **test mode** → row flips `pending`→`paid` in
     `/admin/payments`, supporter shows on `/support/supporters`.
   - Newsletter signup → appears in Kit.
   - Contact form → row in `/admin/contacts` + notification email + auto-reply.
   - `/admin/updates` → create a text/image/video post → it appears on
     `/support/updates` and its `/support/updates/{code}` page resolves.
10. [ ] **Go live for payments**: once the test-mode flow is green end-to-end,
    set `RAZORPAY_KEY_ID` + `RAZORPAY_KEY_SECRET` (live) in Vercel; no webhook
    to register — Checkout returns a signature the `/api/support/confirm`
    route verifies.
11. [ ] **SEO go-live** (§9): confirm `/sitemap.xml` + `/robots.txt` serve the new
    site, submit the sitemap in Google Search Console, import to Bing, and
    spot-check a blog post in the Rich Results Test.

> Comments (the verify gate that uses `COMMENTER_*`) ship in a later sub-project;
> the vars are set now so nothing breaks when that lands.

---

## 0b. Local development (no Vercel, no live site)

Run the full app on your machine. It points at the **same** Supabase project as
production (there is no separate local database), so apply the schema once and
both local + prod use it.

1. **`.env.local`** in the project root (gitignored — never committed). Add all
   of §1's variables: Supabase URL/anon/service-role copied from Supabase →
   Settings → API, and `COMMENTER_TOKEN_SECRET` + `COMMENTER_OTP_PEPPER`
   generated with `openssl rand -base64 48` (run twice, distinct values).
2. **Schema + bucket**: apply §2 (full setup + the support-updates migrations) in
   your Supabase SQL editor and create the public `support-media` bucket. One
   time — shared with production.
3. **Install + run**:
   ```bash
   npm install
   npm run dev
   ```
4. Open `http://localhost:3000`. Sign in at `/login` to reach `/admin`.
   `/support/updates` (feed) and `/admin/updates` (authoring) work fully.

Before the schema is applied, every DB read fail-safes to empty, so the app
still boots and renders — you just see empty states until the tables exist.

---

## 1. Environment variables

Set these in **Vercel → Project → Settings → Environment Variables** (and mirror
in `.env.local` for local dev). All belong to your own Supabase project.

| Variable | Required | Where to get it | Notes |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Supabase → Settings → API → Project URL | Public (shipped to browser). |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | Supabase → Settings → API → `anon` public key | Public. RLS-restricted. |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | Supabase → Settings → API → `service_role` key | **Secret. Server-only.** Bypasses RLS; reads/writes the `supports` table. Never expose to the client. |
| `RAZORPAY_KEY_ID` | yes | Razorpay Dashboard → Settings → API Keys | Public (shipped to browser; used to open Checkout). |
| `RAZORPAY_KEY_SECRET` | yes | Razorpay Dashboard → Settings → API Keys | **Secret. Server-only.** Used to create orders and verify the Checkout signature. |
| `ADMIN_EMAIL` | optional | — | If set, only this email may access `/admin`. If unset, any authenticated Supabase user passes. |
| `COMMENTER_TOKEN_SECRET` | yes (for comments) | generate: `openssl rand -base64 48` | **Secret. Server-only.** HMAC key that signs the `sd_commenter` verified-commenter cookie. Rotating it invalidates every existing commenter session (forces re-verify). |
| `COMMENTER_OTP_PEPPER` | yes (for comments) | generate: `openssl rand -base64 48` (a **different** value) | **Secret. Server-only.** Pepper mixed into the email-verification OTP hash at rest. Rotating it invalidates any in-flight OTP codes. |

> The two `COMMENTER_*` vars gate commenting on support updates (the verify gate
> mounts in sub-project 4). Nothing reads them until comments ship, so they are
> safe to set now — but the comment flow will 500/refuse to verify without them.
> Generate each with `openssl rand -base64 48` (or
> `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`),
> use a distinct value for each, and never commit them.

> Razorpay keys are plain env vars (§1 above), not Vault-stored — only Kit and
> SMTP credentials are managed through `/admin/integrations` and encrypted in
> Supabase Vault.

---

## 2. Database — apply the schema

Run the **full setup script** in your own Supabase project once. It is
idempotent (`if not exists` / `or replace`), so re-running is safe.

1. Open **Supabase → SQL Editor** (your project, ref `oyzzgjrefkppqkxjccot`).
2. Paste the entire contents of [`supabase/deploy/full_setup.sql`](supabase/deploy/full_setup.sql) and **Run**.

This creates: `supports` + public views, admin auth helpers, `posts`,
`subscribers`, `content`, and the **Vault-backed Kit/Email integrations**
(Vault extension plus the `set_kit_secret`/`get_kit_secret` and
`set_email_secret`/`get_email_secret` service-role RPCs).

For incremental changes, apply only the new migration file(s) under
`supabase/migrations/` instead of the whole bundle.

### Support updates + comments (sub-projects 1–5)

Not yet in `full_setup.sql` — apply these three migrations (idempotent) in the SQL
editor:

- [`supabase/migrations/20260617000003_support_updates.sql`](supabase/migrations/20260617000003_support_updates.sql)
  — `support_updates` (DB-backed posts) + `support_settings` (the 5 reusable
  thank-you images).
- [`supabase/migrations/20260617000004_comment_verifications.sql`](supabase/migrations/20260617000004_comment_verifications.sql)
  — transient OTP store for commenter email verification (service-role only).
- [`supabase/migrations/20260618000001_support_comments.sql`](supabase/migrations/20260618000001_support_comments.sql)
  — `support_comments` (threaded comments; service-role only, email kept private).

Then create a **public** Storage bucket named **`support-media`** (Supabase →
Storage → New bucket → toggle **Public**) — it holds admin-uploaded post images
and thank-you images. Video posts embed YouTube/Vimeo URLs, so no upload there.

Verify:

```sql
select count(*) from public.support_updates;              -- expect 0
select id, thankyou_images from public.support_settings;  -- expect 1 row: (1, [])
select to_regclass('public.comment_verifications');       -- expect: comment_verifications (not null)
select to_regclass('public.support_comments');            -- expect: support_comments (not null)
```

Also set the `COMMENTER_TOKEN_SECRET` + `COMMENTER_OTP_PEPPER` env vars (section 1)
before the comment flow ships.

### Verify the schema applied

```sql
select exists (select 1 from pg_extension where extname = 'supabase_vault') as vault_installed;
select p.proname,
       has_function_privilege('service_role', p.oid, 'execute')  as service_role_can,
       has_function_privilege('authenticated', p.oid, 'execute') as authenticated_can
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname in ('set_kit_secret','get_kit_secret');
-- expect both functions: service_role_can=true, authenticated_can=false
```

---

## 3. Deploy to Vercel

Pushing to `main` triggers an automatic production build + deploy. To deploy:

```bash
git push origin main
```

Vercel builds (`next build`) and promotes to production. Confirm the deploy is
green in the Vercel dashboard before relying on it.

**Speed Insights**: enable once in **Vercel → Project → Speed Insights → Enable**
(the `<SpeedInsights />` component is already wired in the layout; it no-ops
until enabled).

---

## 4. Payments (Razorpay)

Credentials are plain environment variables (§1) — `RAZORPAY_KEY_ID` +
`RAZORPAY_KEY_SECRET` from Razorpay Dashboard → Settings → API Keys. No
`/admin/integrations` panel for payments, and no webhook to register.

The flow: `/api/support/order` creates a Razorpay order server-side, the
client opens Razorpay Checkout with that order, and Checkout returns a
signed payload (`razorpay_order_id`, `razorpay_payment_id`,
`razorpay_signature`) that `/api/support/confirm` verifies server-side
against `RAZORPAY_KEY_SECRET` before flipping the `supports` row to `paid`.

1. Set `RAZORPAY_KEY_ID` + `RAZORPAY_KEY_SECRET` (**test** keys first) in
   Vercel (§1) and `.env.local` for local dev.
2. Test with a real small payment on `/support`, then confirm the row in
   **/admin/payments** flips to `paid` and the supporter appears on
   `/support/supporters`.
3. Test a refund from the Razorpay Dashboard and confirm it reflects there
   (refunds don't currently write back to `supports`).
4. To go live: swap in the **live** `RAZORPAY_KEY_ID` + `RAZORPAY_KEY_SECRET`
   in Vercel. Nothing else changes — same routes, no webhook to repoint.

---

## 6. Smoke-test the payment flow (test mode)

The full payment write path is built:

- `src/app/api/support/order/route.ts` — validates + recomputes the amount
  server-side, inserts a pending `supports` row, creates a Razorpay order.
- `src/lib/support/checkout.ts` + `support-panel.tsx` — open Razorpay Checkout
  with the returned order.
- `src/app/api/support/confirm/route.ts` — verifies the Checkout signature and
  flips the row to `paid`/`failed`.

After `RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET` (test keys) are set (§4), test on
production in **test mode**:

1. Go to `/support`, pick a coffee/toffee, enter an email, submit.
2. The Razorpay Checkout widget opens — complete a payment with a Razorpay test
   card.
3. Confirm the row in **/admin/payments** flips from `pending` to `paid`
   (the confirm route does this immediately after Checkout succeeds).
4. Confirm the supporter appears on `/support/supporters`.

If the row stays `pending`, the client never called `/api/support/confirm` (or
the signature check failed) — check the browser console / server logs. Only
switch to live keys once the test-mode flow is green end-to-end.

---

## 7. Configure Kit (email/newsletter)

Newsletter signups dual-write: they always save to the Supabase `subscribers`
table, and are also pushed to a Kit form. Kit is no-op until configured (signups
still save to Supabase in the meantime).

1. In **`/admin/integrations` → Kit (email)**, fill in:
   - **API Key** — Kit → Settings → Advanced → API → your V4 API Key
   - **Form ID** — Kit → Grow → Forms → open the form → numeric ID in the URL
2. **Save** (encrypted into Vault), then **Test Connect** — hits the Kit account
   endpoint; green = key valid.
3. Verify end-to-end: submit the newsletter form on the site, then confirm the
   subscriber appears in the Kit form's subscribers. The push is fail-safe — a
   Kit error is logged but never blocks the Supabase signup.

---

## 8. Configure Email (SMTP) for the contact form

Contact-form submissions always save to the `contacts` table (visible in
**/admin/contacts**). When SMTP is configured they also email a notification to
you + an auto-reply to the sender. Email is fail-safe and no-ops until set up.

1. In **`/admin/integrations` → Email (SMTP)**, set the SSL/TLS toggle (on = 465,
   off = 587) and fill in: SMTP host, port, username, password, from name,
   from email, and the notify email (where submissions are sent to you).
   - Common: Gmail `smtp.gmail.com` 465 with an app password; Outlook/Microsoft 365
     `smtp.office365.com` 587. The from email must be allowed by the SMTP host.
2. **Save** (encrypted into Vault), then **Test Connect** — verifies the SMTP
   login without sending. Green = good.
3. Verify end-to-end: submit `/contact`, confirm the row in **/admin/contacts**
   (marked emailed), the notification lands in your inbox, and the sender gets
   the auto-reply.

> Note: SMTP runs from Vercel's Node functions (ports 465/587). Fine for
> contact-form volume.

---

## 9. DNS cutover (Hostinger → Vercel) & SEO go-live

The current shubhamdatarkar.com runs on **Hostinger** (the old site). This repo is
the **new** site, deployed on **Vercel**. The SEO work in `src/lib/seo.ts`,
`src/lib/site.ts`, and `src/app/robots.ts` (PR #30) is live in code but only takes
effect once the domain points at the Vercel deployment.

### Pointing the domain at Vercel — pick one

Google Search Console verifies **shubhamdatarkar.com** with a **DNS TXT record** in
the domain's DNS zone. Switching the *host* doesn't touch it; switching the *DNS
zone* does. So:

- **A) Keep DNS at Hostinger (recommended).** In Vercel → Settings → Domains, add
  `shubhamdatarkar.com`; Vercel shows the exact records. At Hostinger DNS, repoint
  only the **A** (`@`) and **CNAME** (`www`) records to the values Vercel gives.
  Leave everything else. The GSC verification TXT record and your **MX/email**
  records stay put → **GSC stays verified, email keeps working**, zero migration.

- **B) Move nameservers to Vercel.** Hostinger's DNS zone goes dead, so you must
  re-create in Vercel DNS: the **GSC verification TXT record** (same value — *not* a
  new property), all **MX records** (or `hello@shubhamdatarkar.com` breaks), plus
  SPF/other TXT. More work, more breakage surface — only if you want Vercel to
  manage DNS.

> Either way you **never need a new GSC property** — it is the same domain. Use the
> exact A/CNAME values Vercel shows (they have changed over time — don't hard-code
> an IP).

### The `verification` meta code is redundant with DNS

The codebase also wires optional Google/Bing verification `<meta>` tags via the
`GOOGLE_SITE_VERIFICATION` / `BING_SITE_VERIFICATION` env vars (in
`src/app/layout.tsx`, commit `785d63e` on the support branch). If you verify with
the **DNS domain property** (the recommended path above), this is **not needed** —
the tags only render when those env vars are set, and the DNS route never sets them.
Harmless to leave (it emits nothing when unset). Only set the env vars if you ever
switch to **URL-prefix / HTML-tag** verification instead of DNS.

### SEO go-live checklist (run at cutover, not before)

Doing these before the new site is live would point engines at the **old** site.

1. [ ] Domain resolves to the Vercel deployment; TLS cert issued.
2. [ ] `https://shubhamdatarkar.com/sitemap.xml` serves the **new** sitemap
   (from `src/app/sitemap.ts`) and `/robots.txt` shows the new rules (incl. the
   `/admin` disallow).
3. [ ] Google Search Console → **Sitemaps** → submit `sitemap.xml`.
4. [ ] Bing Webmaster Tools → **Import from Google Search Console** (carries the
   DNS verification + sitemap), or verify the domain directly.
5. [ ] Run a live blog post URL through Google's **Rich Results Test** — confirm
   Person / WebSite / Organization / Article render and `Article.image` resolves.

> Bing verification is what lets **ChatGPT Search** retrieve the site, so don't
> skip step 4.
