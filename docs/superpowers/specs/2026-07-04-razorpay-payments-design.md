# Razorpay Payments — design (replace Zoho)

> 2026-07-04. Rip out the Zoho Payments integration entirely and replace it with
> Razorpay, using the Orders API + hosted Checkout with **handler-side signature
> verification** (no webhook). Live keys only; env-based credentials.

## Why

Zoho Payments only had a **live** merchant account (no sandbox), and the live
`account_id` handed to the API returned `invalid_account_id` on sandbox and
`Not An Authorized User` on live (sandbox-scoped token). Rather than untangle
Zoho's OAuth/self-client/account-id model, switch to Razorpay: simpler
credential model (key id + secret), signature-verified checkout that works on
localhost with no public webhook URL.

## Scope

Payment provider only. The `supports` table money/items model, all public views
(`public_supporters`, `support_lifetime`, `support_stats`), `/admin/payments`,
supporter tiers, and the auto thank-you post behaviour are unchanged. Only the
provider wiring (order creation, checkout widget, payment confirmation, and
credential storage) changes.

## Credentials (env vars, not Vault)

| Var | Visibility | Use |
|---|---|---|
| `RAZORPAY_KEY_ID` | public (returned to client) | Order creation Basic-auth user + Checkout `key` |
| `RAZORPAY_KEY_SECRET` | **server-only secret** | Order creation Basic-auth password + HMAC signature verification |

No webhook secret (handler-verify flow). Set in `.env.local` (local) and Vercel
(Production). Live keys (`rzp_live_…`). Razorpay is reached via `fetch` + REST
and `node:crypto` for HMAC — **no `razorpay` npm dependency**.

## Payment flow

```
support-panel.tsx
  └─ POST /api/support/order        (server: validate, insert pending, create RZP order)
        → { orderId, keyId, amount, currency, supportId, name, email }
  └─ openRazorpayCheckout()         (client: load checkout.js, open modal)
        handler(success)  → POST /api/support/confirm  → verify sig → paid + thank-you
        payment.failed    → POST /api/support/confirm  (failed) → row failed
        ondismiss         → cancelled toast (no server call)
```

### 1. `POST /api/support/order` (rename of the old `session` route)

- Parse + validate body (email regex, unit bounds — **unchanged** from the
  current session route).
- Recompute `base`, `fee` (`FEE_PCT`), `total` server-side (never trust client).
- `insertPendingSupport(...)` → pending row, get `supportId`.
- Create Razorpay order:
  - `POST https://api.razorpay.com/v1/orders`
  - Auth: `Authorization: Basic base64(RAZORPAY_KEY_ID:RAZORPAY_KEY_SECRET)`
  - Body: `{ amount: Math.round(total * 100), currency: "INR", receipt: supportId, notes: { support_id: supportId } }`
  - On failure: mark row `failed`, return 502 with a generic message (never leak
    the raw Razorpay error).
- `attachOrder(supportId, order.id)` → store `razorpay_order_id`.
- Return `{ supportId, orderId: order.id, keyId: RAZORPAY_KEY_ID, amount: total,
  currency, symbol }` (+ `name`, `email` come from the client already).

Amount is INR whole rupees in the DB; Razorpay wants paise → `× 100`. `fee` is
`Math.round(base × 0.02)`, `total = base + fee`, both integers, so `× 100` is
exact.

### 2. `openRazorpayCheckout()` (rewrite of `checkout.ts`)

- Load `https://checkout.razorpay.com/v1/checkout.js` once (same
  `loadScript` promise-cache pattern as the current Zoho loader).
- `new window.Razorpay({...})` with:
  - `key: keyId`, `order_id: orderId`, `amount: amount*100`, `currency`,
  - `name: "Shubham Datarkar"`, `description: "Support"`,
  - `prefill: { name, email }`, `theme: { color: "<brand>" }`,
  - `handler(resp)` → resolves `{ status: "paid", ...resp }` with
    `razorpay_payment_id/order_id/signature`,
  - `modal.ondismiss` → resolves `{ status: "cancelled" }`.
- Also bind `rzp.on("payment.failed", …)` → resolves
  `{ status: "failed", paymentId }`.
- Returns a `CheckoutOutcome` discriminated union:
  `paid | cancelled | failed | error`.

### 3. `POST /api/support/confirm` (new)

- Body: `{ supportId, razorpay_order_id, razorpay_payment_id, razorpay_signature }`
  for success; `{ supportId, razorpay_order_id, failed: true, paymentId? }` for
  failure.
- **Success:** compute `HMAC_SHA256(order_id + "|" + payment_id, key_secret)`
  (hex) via `node:crypto.timingSafeEqual`; if it matches `razorpay_signature`,
  `markSupportStatus({ orderId, status: "paid", paymentId })`; on the real
  pending→paid transition, `postThankyou(support)`. Return `{ ok: true }`.
  Invalid signature → 400 `{ ok: false }`, do **not** mark paid.
- **Failure:** `markSupportStatus({ orderId, status: "failed", paymentId })`.
  Return `{ ok: true }`. No signature to verify (failure isn't a value we trust
  for money; it only moves a row off `pending`).

### 4. `support-panel.tsx` changes

- Call `/api/support/order` instead of `/session`.
- After `openRazorpayCheckout`:
  - `paid` → `POST /api/support/confirm` with the three RZP fields; only show the
    success toast when confirm returns `ok` (server is source of truth). If
    confirm fails signature, show a "couldn't verify payment — contact us" error.
  - `failed` → fire-and-forget confirm(failed), show failed toast.
  - `cancelled` → cancelled toast, no server call.

## Data model migration (hand SQL to owner — manual)

New migration `supabase/migrations/20260704000001_razorpay_payments.sql`
(idempotent) + `full_setup.sql` edits for fresh installs:

```sql
-- supports: rename provider columns (no paid rows exist yet; safe)
alter table public.supports rename column zoho_session_id to razorpay_order_id;
alter table public.supports rename column zoho_payment_id to razorpay_payment_id;
alter index if exists supports_zoho_session_idx rename to supports_rzp_order_idx;

-- drop the dead Zoho integration surface
drop function if exists public.set_zoho_secret(jsonb);
drop function if exists public.get_zoho_secret();
drop table if exists public.zoho_integration;
-- (Vault secret 'zoho_payments' is orphaned; optional cleanup via vault API)
```

The `attachOrder`, `insertPendingSupport`, and `markSupportStatus` functions in
`src/lib/support/server.ts` are updated to the new column names; the idempotency
guard (`neq status`) is unchanged.

## Files

**Delete:**
- `src/lib/zoho/{store,webhook,config,session,actions,oauth}.ts`
- `src/components/admin/zoho-integration-form.tsx`
- `src/app/api/support/webhook/route.ts`

**Add:**
- `src/lib/razorpay/client.ts` — env key access + `createOrder()` (REST fetch).
- `src/lib/razorpay/verify.ts` — `verifyPaymentSignature(orderId, paymentId, sig)`.
- `src/lib/support/thankyou.ts` — `postThankyou(support)` extracted from the old
  webhook route (shared, `"server-only"`).
- `src/app/api/support/order/route.ts` — replaces the old `session` route.
- `src/app/api/support/confirm/route.ts` — signature verify + mark paid/failed.

**Edit:**
- `src/lib/support/checkout.ts` — `openRazorpayCheckout` (replaces Zoho loader).
- `src/lib/support/server.ts` — renamed columns; `attachOrder`; `markSupportStatus`
  keyed by `razorpay_order_id`.
- `src/components/support/support-panel.tsx` — order → checkout → confirm.
- `src/app/admin/integrations/page.tsx` — drop the Zoho section + import; Kit
  becomes the first card (remove its top border/padding).
- `.env.example` — add `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET`; remove the Zoho
  note.
- `supabase/deploy/full_setup.sql` — remove the Zoho integration block only
  (`zoho_integration` table + `set_zoho_secret`/`get_zoho_secret`). **Keep** the
  `supabase_vault` extension — Kit (`set_kit_secret`) and Email/SMTP still use it.
  Rename the `supports` provider columns to the Razorpay names.
- `DEPLOYMENT.md` — rewrite the payments section (§0 steps 8/10, §4) for Razorpay
  env vars + no webhook.
- `src/app/{privacy-policy,terms-of-use,help}/page.tsx` — replace "Zoho" mentions
  with "Razorpay".

**Delete the old migration file?** No — `20260616000001_zoho_integration.sql`
already ran on the DB; deleting the file doesn't un-apply it. The new migration
drops the objects. Leave the historical file in place.

## Testing

- Unit: `src/lib/razorpay/verify.test.ts` — signature verify passes for a known
  `order|payment` + secret vector, fails on tamper. (vitest, mirrors the existing
  zoho test setup.)
- Unit: order route amount recompute (paise conversion, fee) — extend/mirror any
  existing amount tests.
- Manual live smoke: run local dev, open `/support`, pick the minimum (₹20
  coffee), pay with a real method, confirm the row flips `pending→paid` in
  `/admin/payments`, supporter appears on `/support/supporters`, and a `thankyou`
  post appears on `/support/updates`. (Live = real ₹; refund after.)

## Non-goals

- No webhook, no pg_cron reconcile (handler-verify only, per decision). A
  tab-closed-before-handler payment stays `pending` — acceptable; reconcile can
  be a later add.
- No Razorpay Vault/admin card (env-based).
- No changes to newsletter (Kit) or SMTP integrations.
