# Deployment

Production deploys run on **Vercel** (auto-deploy on push to `main`) against
**Shubham's own Supabase** project (ref `oyzzgjrefkppqkxjccot`) — **never** the
BAS project. Custom domain: shubhamdatarkar.com.

Run through this checklist on first deploy and whenever a step's inputs change
(new migration, new env var, Zoho credential rotation).

---

## 0. Go-live runbook — do in this order

The ordered first-deploy sequence. Each step links to its detailed section below.
Tick as you go.

**Before the day:** you already have your own Supabase project
(ref `oyzzgjrefkppqkxjccot`). You still need a **Vercel account** and the GitHub
repo `bookasloth/shubham-datarkar` to hand to it.

1. [ ] **Apply the database schema** (§2) in Supabase → SQL Editor:
   - Run [`supabase/deploy/full_setup.sql`](supabase/deploy/full_setup.sql).
   - Run [`supabase/migrations/20260617000003_support_updates.sql`](supabase/migrations/20260617000003_support_updates.sql)
     and [`supabase/migrations/20260617000004_comment_verifications.sql`](supabase/migrations/20260617000004_comment_verifications.sql).
   - Run the §2 verify queries — all green.
2. [ ] **Create the Storage bucket** (§2): Supabase → Storage → New bucket →
   name `support-media` → toggle **Public**.
3. [ ] **Create a Vercel account** and **import** the GitHub repo. Framework
   auto-detects as Next.js. Do **not** deploy yet — it fails without env vars.
4. [ ] **Set all environment variables** in Vercel → Settings → Environment
   Variables, scope **Production** (§1):
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
     `SUPABASE_SERVICE_ROLE_KEY` — copy from Supabase → Settings → API.
   - `COMMENTER_TOKEN_SECRET`, `COMMENTER_OTP_PEPPER` — generate **fresh**
     production values: `openssl rand -base64 48` (run twice, distinct).
     Do **not** reuse the local-dev values.
   - `ADMIN_EMAIL` (optional) — lock `/admin` to your email.
5. [ ] **Deploy** (§3): push to `main` (or hit Deploy in Vercel). Confirm the
   build is green in the Vercel dashboard.
6. [ ] **Add the custom domain** shubhamdatarkar.com: Vercel → Settings →
   Domains → add → update DNS as instructed. Wait for the cert.
7. [ ] **Enable Speed Insights** once (§3).
8. [ ] **Configure integrations** in `/admin/integrations` (sign in at `/login`
   first):
   - Zoho Payments — **sandbox** first (§4), then **Test Connect**.
   - Register the Zoho **webhook** (§4 step 5):
     `https://shubhamdatarkar.com/api/support/webhook`, events
     `payment.succeeded` + `payment.failed`.
   - Kit / newsletter (§7) — Save + Test Connect.
   - Email / SMTP (§8) — Save + Test Connect.
9. [ ] **Smoke-test** on production (§6 + below):
   - Support payment in **sandbox** → row flips `pending`→`paid` in
     `/admin/payments`, supporter shows on `/support/supporters`.
   - Newsletter signup → appears in Kit.
   - Contact form → row in `/admin/contacts` + notification email + auto-reply.
   - `/admin/updates` → create a text/image/video post → it appears on
     `/support/updates` and its `/support/updates/{code}` page resolves.
10. [ ] **Go live for payments**: once the sandbox flow is green end-to-end,
    flip Zoho **Live mode** on, swap in live credentials + a `ZohoPay.*` refresh
    token, Save, Test Connect, and repoint the webhook (§4 step 6).

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
| `SUPABASE_SERVICE_ROLE_KEY` | yes | Supabase → Settings → API → `service_role` key | **Secret. Server-only.** Bypasses RLS; reads/writes the Vault-backed Zoho credentials and the `supports` table. Never expose to the client. |
| `ADMIN_EMAIL` | optional | — | If set, only this email may access `/admin`. If unset, any authenticated Supabase user passes. |
| `COMMENTER_TOKEN_SECRET` | yes (for comments) | generate: `openssl rand -base64 48` | **Secret. Server-only.** HMAC key that signs the `sd_commenter` verified-commenter cookie. Rotating it invalidates every existing commenter session (forces re-verify). |
| `COMMENTER_OTP_PEPPER` | yes (for comments) | generate: `openssl rand -base64 48` (a **different** value) | **Secret. Server-only.** Pepper mixed into the email-verification OTP hash at rest. Rotating it invalidates any in-flight OTP codes. |

> The two `COMMENTER_*` vars gate commenting on support updates (the verify gate
> mounts in sub-project 4). Nothing reads them until comments ship, so they are
> safe to set now — but the comment flow will 500/refuse to verify without them.
> Generate each with `openssl rand -base64 48` (or
> `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`),
> use a distinct value for each, and never commit them.

> Zoho Payments credentials are **not** environment variables — they are stored
> encrypted in Supabase Vault and managed through `/admin/integrations`
> (see step 4).

---

## 2. Database — apply the schema

Run the **full setup script** in your own Supabase project once. It is
idempotent (`if not exists` / `or replace`), so re-running is safe.

1. Open **Supabase → SQL Editor** (your project, ref `oyzzgjrefkppqkxjccot`).
2. Paste the entire contents of [`supabase/deploy/full_setup.sql`](supabase/deploy/full_setup.sql) and **Run**.

This creates: `supports` + public views, admin auth helpers, `posts`,
`subscribers`, `content`, and the **Zoho integration** (Vault extension,
`zoho_integration` metadata table, and the `set_zoho_secret` / `get_zoho_secret`
service-role RPCs).

For incremental changes, apply only the new migration file(s) under
`supabase/migrations/` instead of the whole bundle.

### Support updates + commenter verification (sub-projects 1 & 3)

Not yet in `full_setup.sql` — apply these two migrations (idempotent) in the SQL
editor:

- [`supabase/migrations/20260617000003_support_updates.sql`](supabase/migrations/20260617000003_support_updates.sql)
  — `support_updates` (DB-backed posts) + `support_settings` (the 5 reusable
  thank-you images).
- [`supabase/migrations/20260617000004_comment_verifications.sql`](supabase/migrations/20260617000004_comment_verifications.sql)
  — transient OTP store for commenter email verification (service-role only).

Then create a **public** Storage bucket named **`support-media`** (Supabase →
Storage → New bucket → toggle **Public**) — it holds admin-uploaded post images
and thank-you images. Video posts embed YouTube/Vimeo URLs, so no upload there.

Verify:

```sql
select count(*) from public.support_updates;              -- expect 0
select id, thankyou_images from public.support_settings;  -- expect 1 row: (1, [])
select to_regclass('public.comment_verifications');       -- expect: comment_verifications (not null)
```

Also set the `COMMENTER_TOKEN_SECRET` + `COMMENTER_OTP_PEPPER` env vars (section 1)
before the comment flow ships.

### Verify the schema applied

```sql
select exists (select 1 from pg_extension where extname = 'supabase_vault') as vault_installed;
select id, mode, configured from public.zoho_integration;            -- expect 1 row: id=1, sandbox, false
select p.proname,
       has_function_privilege('service_role', p.oid, 'execute')  as service_role_can,
       has_function_privilege('authenticated', p.oid, 'execute') as authenticated_can
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname in ('set_zoho_secret','get_zoho_secret');
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

## 4. Configure Zoho Payments (post-deploy, in the admin)

Credentials are entered through the UI, not env vars. Start in **sandbox**.

1. Sign in to `/login`, go to **`/admin/integrations`**.
2. Leave **Live mode** off (sandbox). Fill in:

   | Field | Where to find it |
   |---|---|
   | Account ID | Zoho Payments → Settings → Developer Space |
   | API Key | Zoho Payments → Settings → Developer Space → API Keys |
   | OAuth Client ID | Zoho API Console (api-console.zoho.in) → your Self Client app |
   | OAuth Client Secret | same Self Client app |
   | OAuth Refresh Token | exchange a grant token once (scope `ZohoPaySandbox.*` for sandbox, `ZohoPay.*` for live) |
   | Webhook Secret | Zoho Payments → Settings → Webhooks → signing secret |

3. **Save credentials** (secrets are encrypted into Vault; blank fields keep the
   existing value on later edits).
4. Click **Test Connect** — it exchanges the refresh token for an access token.
   Green = credentials valid. No money moves.
5. **Register the webhook** in Zoho Payments → Settings → Webhooks:
   - URL: `https://shubhamdatarkar.com/api/support/webhook`
   - Events: `payment.succeeded`, `payment.failed`
   - Copy the signing secret into the **Webhook Secret** field in the admin and Save.
6. To go live later: flip **Live mode** on, replace the credentials with live
   values (and a `ZohoPay.*`-scoped refresh token), Save, Test Connect again, and
   point the webhook at the live events.

---

## 6. Smoke-test the payment flow (sandbox)

The full payment write path is built:

- `src/app/api/support/session/route.ts` — validates + recomputes the amount
  server-side, inserts a pending `supports` row, mints a Zoho token, creates a
  payment session.
- `src/lib/support/checkout.ts` + `support-panel.tsx` — open the Zoho checkout
  widget with the returned session.
- `src/app/api/support/webhook/route.ts` — verifies the HMAC signature and flips
  the row to `paid`/`failed`.

After credentials + webhook are configured (steps 4–5), test on production in
**sandbox** mode:

1. Go to `/support`, pick a coffee/toffee, enter an email, submit.
2. The Zoho sandbox widget opens — complete a sandbox payment.
3. Confirm the row in **/admin/payments** flips from `pending` to `paid`
   (the webhook does this; allow a few seconds).
4. Confirm the supporter appears on `/support/supporters`.

If the row stays `pending`, the webhook isn't reaching the server — re-check the
webhook URL + signing secret. Only flip to live mode once the sandbox flow is
green end-to-end.

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
   - Common: Zoho Mail `smtp.zoho.in` 465; Gmail `smtp.gmail.com` 465 with an
     app password. The from email must be allowed by the SMTP host.
2. **Save** (encrypted into Vault), then **Test Connect** — verifies the SMTP
   login without sending. Green = good.
3. Verify end-to-end: submit `/contact`, confirm the row in **/admin/contacts**
   (marked emailed), the notification lands in your inbox, and the sender gets
   the auto-reply.

> Note: SMTP runs from Vercel's Node functions (ports 465/587). Fine for
> contact-form volume.
