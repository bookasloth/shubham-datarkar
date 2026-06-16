# Deployment

Production deploys run on **Vercel** (auto-deploy on push to `main`) against
**Shubham's own Supabase** project (ref `oyzzgjrefkppqkxjccot`) — **never** the
BAS project. Custom domain: shubhamdatarkar.com.

Run through this checklist on first deploy and whenever a step's inputs change
(new migration, new env var, Zoho credential rotation).

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
5. To go live later: flip **Live mode** on, replace the credentials with live
   values (and a `ZohoPay.*`-scoped refresh token), Save, Test Connect again.

---

## 5. Status / not-yet-live

The Zoho **credentials admin + connection test** are deployed. The actual
**payment write path is not built yet** — `support-panel.tsx` still uses a mocked
submit, and these are pending:

- `src/app/api/support/session/route.ts` — insert pending `supports` row + create Zoho payment session
- `src/app/api/support/webhook/route.ts` — verify Zoho signature → mark row paid/failed
- wire the support form to call the session route and open the Zoho checkout widget

Until those ship, `/support` collects no real payments and records no rows.
