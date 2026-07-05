# Razorpay Payments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Zoho Payments integration on `/support` with Razorpay (Orders API + hosted Checkout + handler-side signature verification), keeping the `supports` table, views, tiers, `/admin/payments`, and auto thank-you post unchanged.

**Architecture:** Server creates a Razorpay Order (amount recomputed server-side, INR→paise), client opens Razorpay Checkout, the success handler returns `order_id/payment_id/signature`, and a server confirm route verifies the HMAC-SHA256 signature before flipping the row to `paid` and posting the thank-you. No webhook, no polling. Credentials are env vars; no SDK dependency.

**Tech Stack:** Next.js 16 (App Router, Turbopack), TypeScript, Supabase (service-role writes), Razorpay REST (`https://api.razorpay.com/v1`) + Checkout (`https://checkout.razorpay.com/v1/checkout.js`), `node:crypto`, vitest.

## Global Constraints

- **Supabase:** owner's OWN project (ref `oyzzgjrefkppqkxjccot`) only — NEVER the BAS project. Schema changes = write a migration file + hand SQL to the owner to run manually; never apply directly.
- **Git:** branch `feat/razorpay-payments` (already created from `origin/main`). Commit per task. Never commit to `main`.
- **Next.js is modified here** — read the relevant guide in `node_modules/next/dist/docs/` before writing Next code.
- **Style:** monochrome, no emojis, Jakarta+Poppins, velocity-first. Brand color token `--brand: #ff4800`.
- **Env vars:** `RAZORPAY_KEY_ID` (public, returned to client), `RAZORPAY_KEY_SECRET` (server-only secret). Live keys (`rzp_live_…`).
- **Pure-crypto modules must NOT import `server-only`** so vitest can run them (mirror `src/lib/support/comment-auth-crypto.ts`).
- **Money:** DB stores whole-rupee INR (numeric). Razorpay wants paise → `Math.round(rupees * 100)`. `fee = Math.round(base * 0.02)`, `total = base + fee`.

---

### Task 1: DB migration — rename provider columns, drop Zoho objects

**Files:**
- Create: `supabase/migrations/20260704000001_razorpay_payments.sql`

**Interfaces:**
- Produces: `supports.razorpay_order_id`, `supports.razorpay_payment_id`, index `supports_rzp_order_idx`. Drops `public.zoho_integration`, `public.set_zoho_secret`, `public.get_zoho_secret`.

- [ ] **Step 1: Write the migration file**

```sql
-- Razorpay payments: rename supports provider columns + drop the dead Zoho
-- integration surface. Target: OWN project (oyzzgjrefkppqkxjccot). Idempotent.
-- No paid rows exist yet, so the column renames are safe.

-- supports: rename provider columns (guard so re-runs don't error)
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema='public' and table_name='supports' and column_name='zoho_session_id') then
    alter table public.supports rename column zoho_session_id to razorpay_order_id;
  end if;
  if exists (select 1 from information_schema.columns
             where table_schema='public' and table_name='supports' and column_name='zoho_payment_id') then
    alter table public.supports rename column zoho_payment_id to razorpay_payment_id;
  end if;
end $$;

alter index if exists public.supports_zoho_session_idx rename to supports_rzp_order_idx;

-- Drop the dead Zoho integration objects (Kit/Email keep supabase_vault).
drop function if exists public.set_zoho_secret(jsonb);
drop function if exists public.get_zoho_secret();
drop table if exists public.zoho_integration;
```

- [ ] **Step 2: Verify the file parses (syntax only — do NOT apply)**

Run: `node -e "const s=require('fs').readFileSync('supabase/migrations/20260704000001_razorpay_payments.sql','utf8'); if(!/rename column zoho_session_id/.test(s)||!/drop table if exists public.zoho_integration/.test(s)) throw new Error('missing statements'); console.log('migration OK, '+s.length+' bytes')"`
Expected: `migration OK, <n> bytes`

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260704000001_razorpay_payments.sql
git commit -m "feat(db): rename supports provider cols to razorpay + drop zoho integration"
```

> The owner runs this SQL manually in the Supabase SQL editor before the new code is exercised against live data. Local dev + unit tests do not require it to be applied (DB reads fail-safe to empty).

---

### Task 2: Razorpay signature verification util (TDD)

**Files:**
- Create: `src/lib/razorpay/verify.ts`
- Test: `src/lib/razorpay/verify.test.ts`

**Interfaces:**
- Produces: `verifyPaymentSignature(orderId: string, paymentId: string, signature: string): boolean` — reads `process.env.RAZORPAY_KEY_SECRET`, returns true iff `HMAC_SHA256(orderId+"|"+paymentId, secret)` hex equals `signature` (constant-time).

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/razorpay/verify.test.ts
import { describe, it, expect, beforeAll } from "vitest";
import { createHmac } from "node:crypto";
import { verifyPaymentSignature } from "./verify";

const SECRET = "test_secret_key_1234567890";
const ORDER = "order_ABC123";
const PAYMENT = "pay_XYZ789";
const goodSig = createHmac("sha256", SECRET).update(`${ORDER}|${PAYMENT}`).digest("hex");

beforeAll(() => {
  process.env.RAZORPAY_KEY_SECRET = SECRET;
});

describe("verifyPaymentSignature", () => {
  it("accepts a correct signature", () => {
    expect(verifyPaymentSignature(ORDER, PAYMENT, goodSig)).toBe(true);
  });
  it("rejects a tampered signature", () => {
    expect(verifyPaymentSignature(ORDER, PAYMENT, goodSig.replace(/.$/, "0"))).toBe(false);
  });
  it("rejects a signature for a different payment", () => {
    const other = createHmac("sha256", SECRET).update(`${ORDER}|pay_OTHER`).digest("hex");
    expect(verifyPaymentSignature(ORDER, PAYMENT, other)).toBe(false);
  });
  it("rejects empty/garbage signatures without throwing", () => {
    expect(verifyPaymentSignature(ORDER, PAYMENT, "")).toBe(false);
    expect(verifyPaymentSignature(ORDER, PAYMENT, "nope")).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/razorpay/verify.test.ts`
Expected: FAIL — cannot find module `./verify`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/razorpay/verify.ts
/** Pure crypto for Razorpay payment verification. No server-only/next deps so vitest can run it. */
import { createHmac, timingSafeEqual } from "node:crypto";

function keySecret(): string {
  const s = process.env.RAZORPAY_KEY_SECRET;
  if (!s) throw new Error("Missing RAZORPAY_KEY_SECRET");
  return s;
}

/**
 * Verify a Razorpay Checkout success signature. Razorpay signs
 * `${order_id}|${payment_id}` with HMAC-SHA256 keyed by the API key secret and
 * returns the hex digest as `razorpay_signature`. Constant-time compare.
 */
export function verifyPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string,
): boolean {
  const expected = createHmac("sha256", keySecret())
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature ?? "", "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/razorpay/verify.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/razorpay/verify.ts src/lib/razorpay/verify.test.ts
git commit -m "feat(razorpay): payment signature verification util"
```

---

### Task 3: Razorpay order-creation client (TDD with fetch mock)

**Files:**
- Create: `src/lib/razorpay/client.ts`
- Test: `src/lib/razorpay/client.test.ts`

**Interfaces:**
- Consumes: env `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`.
- Produces:
  - `razorpayKeyId(): string` — returns `RAZORPAY_KEY_ID` or throws.
  - `createOrder(input: { amountPaise: number; currency: string; receipt: string; notes?: Record<string,string> }): Promise<{ ok: true; id: string } | { ok: false; error: string }>` — POSTs to Razorpay Orders API with Basic auth, returns the order id.

> `client.ts` imports `"server-only"` (never runs on the client). The test mocks `server-only` inline via `vi.mock` and mocks `global.fetch`.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/razorpay/client.test.ts
import { describe, it, expect, beforeAll, afterEach, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createOrder, razorpayKeyId } from "./client";

beforeAll(() => {
  process.env.RAZORPAY_KEY_ID = "rzp_test_KEYID";
  process.env.RAZORPAY_KEY_SECRET = "SECRET";
});
afterEach(() => vi.restoreAllMocks());

describe("razorpayKeyId", () => {
  it("returns the env key id", () => {
    expect(razorpayKeyId()).toBe("rzp_test_KEYID");
  });
});

describe("createOrder", () => {
  it("posts with Basic auth + paise body and returns the order id", async () => {
    const fetchMock = vi.fn(async (url: string, init: RequestInit) => {
      expect(url).toBe("https://api.razorpay.com/v1/orders");
      expect(init.method).toBe("POST");
      const auth = (init.headers as Record<string, string>)["Authorization"];
      expect(auth).toBe("Basic " + Buffer.from("rzp_test_KEYID:SECRET").toString("base64"));
      const body = JSON.parse(init.body as string);
      expect(body).toMatchObject({ amount: 2000, currency: "INR", receipt: "sup_1" });
      return { ok: true, json: async () => ({ id: "order_123", amount: 2000 }) } as Response;
    });
    vi.stubGlobal("fetch", fetchMock);

    const res = await createOrder({ amountPaise: 2000, currency: "INR", receipt: "sup_1" });
    expect(res).toEqual({ ok: true, id: "order_123" });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("returns ok:false on a non-2xx response", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: false,
      status: 400,
      json: async () => ({ error: { description: "bad amount" } }),
    } as Response)));
    const res = await createOrder({ amountPaise: 50, currency: "INR", receipt: "sup_2" });
    expect(res.ok).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/razorpay/client.test.ts`
Expected: FAIL — cannot find module `./client`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/razorpay/client.ts
import "server-only";

/**
 * Razorpay REST client (Orders API). No SDK — plain fetch with HTTP Basic auth
 * (key_id:key_secret). Server-only: the secret must never reach the browser.
 */

const ORDERS_URL = "https://api.razorpay.com/v1/orders";

function keyId(): string {
  const v = process.env.RAZORPAY_KEY_ID;
  if (!v) throw new Error("Missing RAZORPAY_KEY_ID");
  return v;
}
function keySecret(): string {
  const v = process.env.RAZORPAY_KEY_SECRET;
  if (!v) throw new Error("Missing RAZORPAY_KEY_SECRET");
  return v;
}

/** Public key id, returned to the client to open Checkout. */
export function razorpayKeyId(): string {
  return keyId();
}

export type CreateOrderResult = { ok: true; id: string } | { ok: false; error: string };

export async function createOrder(input: {
  amountPaise: number;
  currency: string;
  receipt: string;
  notes?: Record<string, string>;
}): Promise<CreateOrderResult> {
  const auth = Buffer.from(`${keyId()}:${keySecret()}`).toString("base64");
  let res: Response;
  try {
    res = await fetch(ORDERS_URL, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: input.amountPaise,
        currency: input.currency,
        receipt: input.receipt,
        notes: input.notes ?? {},
      }),
      cache: "no-store",
    });
  } catch (e) {
    return { ok: false, error: `Network error reaching Razorpay: ${(e as Error).message}` };
  }

  const json = (await res.json().catch(() => ({}))) as {
    id?: string;
    error?: { description?: string };
  };
  if (!res.ok || !json.id) {
    return { ok: false, error: json.error?.description || `Razorpay returned HTTP ${res.status}.` };
  }
  return { ok: true, id: String(json.id) };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/razorpay/client.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/razorpay/client.ts src/lib/razorpay/client.test.ts
git commit -m "feat(razorpay): order-creation REST client"
```

---

### Task 4: Extract the thank-you post into a shared module

**Files:**
- Create: `src/lib/support/thankyou.ts`

**Interfaces:**
- Consumes: `SupportRow` from `src/lib/support/server.ts`; `insertUpdate`, `getThankyouImages` from `src/lib/support/updates.ts`; `thankyouAuthor` from `src/lib/support/aliases.ts`.
- Produces: `postThankyou(support: SupportRow): Promise<void>` — best-effort, never throws.

> This lifts the `postThankyou` helper + caption out of the old webhook route (which Task 10 deletes) so the confirm route can call it.

- [ ] **Step 1: Write the module**

```ts
// src/lib/support/thankyou.ts
import "server-only";

import { randomInt } from "node:crypto";
import { insertUpdate, getThankyouImages } from "@/lib/support/updates";
import { thankyouAuthor } from "@/lib/support/aliases";
import type { SupportRow } from "@/lib/support/server";

const THANKYOU_CAPTION =
  "Thank you for the support. Every coffee and toffee keeps the free tools, writing, and experiments coming.";

/**
 * Post a system thank-you to the updates feed for a freshly-paid support.
 * Best-effort: fully guarded so a failure never breaks the payment confirm.
 */
export async function postThankyou(support: SupportRow): Promise<void> {
  try {
    const images = await getThankyouImages();
    const image = images.length ? images[randomInt(0, images.length)] : null;
    await insertUpdate({
      type: "thankyou",
      body: THANKYOU_CAPTION,
      media: image ? { url: image } : {},
      author: thankyouAuthor({ name: support.name, anonymous: support.anonymous }),
    });
  } catch (e) {
    console.warn("[support] thank-you post failed:", (e as Error).message);
  }
}
```

- [ ] **Step 2: Typecheck the new module**

Run: `npx tsc --noEmit`
Expected: no errors referencing `thankyou.ts`. (Pre-existing errors elsewhere, if any, are addressed in Task 12; there should be none here.)

- [ ] **Step 3: Commit**

```bash
git add src/lib/support/thankyou.ts
git commit -m "refactor(support): extract postThankyou into shared module"
```

---

### Task 5: Update `support/server.ts` to the Razorpay columns

**Files:**
- Modify: `src/lib/support/server.ts`

**Interfaces:**
- Consumes: `supabaseAdmin` (unchanged).
- Produces:
  - `insertPendingSupport(input: PendingInput)` — unchanged signature.
  - `attachOrder(id: string, orderId: string): Promise<void>` — renamed from `attachSession`; writes `razorpay_order_id`.
  - `markSupportStatus(opts: { orderId?: string | null; supportId?: string | null; status: "paid" | "failed"; paymentId?: string | null }): Promise<{ updated: boolean; support?: SupportRow }>` — matches by `razorpay_order_id`; writes `razorpay_payment_id`.
  - `SupportRow` — unchanged.

- [ ] **Step 1: Replace `attachSession` with `attachOrder`**

Replace lines 51-57 (the `attachSession` function) with:

```ts
export async function attachOrder(id: string, orderId: string): Promise<void> {
  const { error } = await supabaseAdmin()
    .from("supports")
    .update({ razorpay_order_id: orderId })
    .eq("id", id);
  if (error) console.warn("[support] attachOrder failed:", error.message);
}
```

- [ ] **Step 2: Update `markSupportStatus` to the new columns/keys**

In `markSupportStatus`, replace the option key `sessionId` with `orderId`, and swap the column names. The function body becomes:

```ts
export async function markSupportStatus(opts: {
  orderId?: string | null;
  supportId?: string | null;
  status: "paid" | "failed";
  paymentId?: string | null;
}): Promise<{ updated: boolean; support?: SupportRow }> {
  const patch: Record<string, unknown> = { status: opts.status };
  if (opts.paymentId) patch.razorpay_payment_id = opts.paymentId;

  let q = supabaseAdmin().from("supports").update(patch);
  if (opts.orderId) q = q.eq("razorpay_order_id", opts.orderId);
  else if (opts.supportId) q = q.eq("id", opts.supportId);
  else return { updated: false };

  // Idempotency guard: skip rows already at the target status.
  q = q.neq("status", opts.status);

  const { data, error } = await q.select("id, name, anonymous");
  if (error) {
    console.warn("[support] markSupportStatus failed:", error.message);
    return { updated: false };
  }
  const row = data?.[0] as { id: string; name: string | null; anonymous: boolean } | undefined;
  if (!row) return { updated: false };
  return {
    updated: true,
    support: { id: String(row.id), name: row.name, anonymous: !!row.anonymous },
  };
}
```

- [ ] **Step 3: Update the file's top comment**

Change the header comment (lines 5-9) from the Zoho/webhook wording to:

```ts
/**
 * Server-only writes to the `supports` table (service-role, RLS bypass).
 * A support is created `pending` by the order route and flipped to
 * `paid`/`failed` by the confirm route after Razorpay signature verification.
 */
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: errors ONLY in files not yet updated that still call `attachSession`/`markSupportStatus({sessionId})` (the old `session.ts`/`webhook` — deleted in Task 10) — those files are removed/replaced in later tasks. No errors within `server.ts` itself. Note the count to confirm it drops to zero by Task 12.

- [ ] **Step 5: Commit**

```bash
git add src/lib/support/server.ts
git commit -m "refactor(support): key support writes by razorpay_order_id"
```

---

### Task 6: `/api/support/order` route (replaces `session`)

**Files:**
- Create: `src/app/api/support/order/route.ts`
- (Deletion of the old `session/route.ts` happens in Task 10.)

**Interfaces:**
- Consumes: `ITEMS`, `FEE_PCT`, `CURRENCY` (`@/lib/support/config`); `insertPendingSupport`, `attachOrder`, `markSupportStatus` (`@/lib/support/server`); `createOrder`, `razorpayKeyId` (`@/lib/razorpay/client`).
- Produces: `POST` returning `{ supportId, orderId, keyId, amount, currency, symbol }` on success.

- [ ] **Step 1: Write the route**

```ts
// src/app/api/support/order/route.ts
import { NextResponse } from "next/server";

import { ITEMS, FEE_PCT, CURRENCY } from "@/lib/support/config";
import { createOrder, razorpayKeyId } from "@/lib/razorpay/client";
import { insertPendingSupport, attachOrder, markSupportStatus } from "@/lib/support/server";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PRICE = Object.fromEntries(ITEMS.map((i) => [i.key, i.unitPrice])) as Record<string, number>;
const MAX_UNITS = 1000;

/**
 * Start a support payment: validate + recompute the amount server-side (never
 * trust the client), insert a pending row, create a Razorpay order, and hand the
 * client what Checkout needs. The confirm route is the source of truth for paid.
 */
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const email = String(body.email ?? "").trim().toLowerCase();
  const coffeeUnits = Math.max(0, Math.min(MAX_UNITS, Math.floor(Number(body.coffeeUnits) || 0)));
  const toffeeUnits = Math.max(0, Math.min(MAX_UNITS, Math.floor(Number(body.toffeeUnits) || 0)));
  const coversFee = Boolean(body.coversFee);
  const anonymous = Boolean(body.anonymous);
  const name = body.name ? String(body.name).trim().slice(0, 120) || null : null;
  const message = body.message ? String(body.message).trim().slice(0, 250) || null : null;

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
  }

  const base = coffeeUnits * PRICE.coffee + toffeeUnits * PRICE.toffee;
  if (base <= 0) {
    return NextResponse.json({ error: "Pick at least one coffee or toffee." }, { status: 400 });
  }
  const fee = coversFee ? Math.round(base * FEE_PCT) : 0;
  const total = base + fee;

  // 1. Pending row.
  const inserted = await insertPendingSupport({
    name, email, message, coffeeUnits, toffeeUnits,
    currency: CURRENCY.code, baseAmount: base, feeAmount: fee, totalAmount: total,
    coversFee, anonymous,
  });
  if ("error" in inserted) {
    return NextResponse.json({ error: "Could not record support." }, { status: 500 });
  }
  const supportId = inserted.id;

  // 2. Razorpay order (amount in paise).
  const order = await createOrder({
    amountPaise: Math.round(total * 100),
    currency: CURRENCY.code,
    receipt: supportId,
    notes: { support_id: supportId },
  });
  if (!order.ok) {
    await markSupportStatus({ supportId, status: "failed" });
    return NextResponse.json({ error: "Could not start the payment. Please try again." }, { status: 502 });
  }

  await attachOrder(supportId, order.id);

  return NextResponse.json({
    supportId,
    orderId: order.id,
    keyId: razorpayKeyId(),
    amount: total,
    currency: CURRENCY.code,
    symbol: CURRENCY.symbol,
  });
}
```

- [ ] **Step 2: Typecheck the route**

Run: `npx tsc --noEmit`
Expected: no new errors from `order/route.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/support/order/route.ts
git commit -m "feat(support): razorpay order route (server-recomputed amount)"
```

---

### Task 7: `/api/support/confirm` route (signature verify → paid/failed)

**Files:**
- Create: `src/app/api/support/confirm/route.ts`

**Interfaces:**
- Consumes: `verifyPaymentSignature` (`@/lib/razorpay/verify`); `markSupportStatus` (`@/lib/support/server`); `postThankyou` (`@/lib/support/thankyou`).
- Produces: `POST` accepting either a success body `{ razorpay_order_id, razorpay_payment_id, razorpay_signature }` or a failure body `{ razorpay_order_id, failed: true, paymentId? }`.

- [ ] **Step 1: Write the route**

```ts
// src/app/api/support/confirm/route.ts
import { NextResponse } from "next/server";

import { verifyPaymentSignature } from "@/lib/razorpay/verify";
import { markSupportStatus } from "@/lib/support/server";
import { postThankyou } from "@/lib/support/thankyou";

export const dynamic = "force-dynamic";

/**
 * Confirm a Razorpay payment. Success requires a valid HMAC signature over
 * `${order_id}|${payment_id}` before the row is flipped to paid; only the real
 * pending→paid transition triggers the one-time auto thank-you post. A failure
 * body just moves the row off `pending` (no signature — it grants nothing).
 */
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const orderId = String(body.razorpay_order_id ?? "").trim();
  if (!orderId) {
    return NextResponse.json({ ok: false, error: "Missing order id." }, { status: 400 });
  }

  // Failure path: move off pending, no thank-you.
  if (body.failed === true) {
    await markSupportStatus({
      orderId,
      status: "failed",
      paymentId: body.paymentId ? String(body.paymentId) : null,
    });
    return NextResponse.json({ ok: true });
  }

  // Success path: verify signature first.
  const paymentId = String(body.razorpay_payment_id ?? "").trim();
  const signature = String(body.razorpay_signature ?? "").trim();
  if (!paymentId || !signature) {
    return NextResponse.json({ ok: false, error: "Missing payment fields." }, { status: 400 });
  }
  if (!verifyPaymentSignature(orderId, paymentId, signature)) {
    return NextResponse.json({ ok: false, error: "Signature verification failed." }, { status: 400 });
  }

  const res = await markSupportStatus({ orderId, status: "paid", paymentId });
  if (res.updated && res.support) await postThankyou(res.support);

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Typecheck the route**

Run: `npx tsc --noEmit`
Expected: no new errors from `confirm/route.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/support/confirm/route.ts
git commit -m "feat(support): razorpay confirm route (verify signature, mark paid/failed)"
```

---

### Task 8: Client checkout — `openRazorpayCheckout`

**Files:**
- Modify (full replace): `src/lib/support/checkout.ts`

**Interfaces:**
- Produces:
  - `type CheckoutSession = { orderId: string; keyId: string; amount: number; currency: string; email: string; name?: string }`
  - `type CheckoutOutcome = { status: "paid"; orderId: string; paymentId: string; signature: string } | { status: "failed"; orderId: string; paymentId?: string } | { status: "cancelled" } | { status: "error"; message: string }`
  - `openRazorpayCheckout(s: CheckoutSession): Promise<CheckoutOutcome>`

- [ ] **Step 1: Replace the file contents**

```ts
// src/lib/support/checkout.ts
/**
 * Client-side Razorpay Checkout. Loads checkout.js once, opens the modal for a
 * created order, and reports the outcome. The confirm route (server) is the
 * source of truth — a "paid" outcome here carries the fields it must verify.
 */

type RazorpaySuccess = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type RazorpayInstance = {
  open: () => void;
  on: (event: string, cb: (resp: unknown) => void) => void;
};

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance;
  }
}

const SCRIPT_SRC = "https://checkout.razorpay.com/v1/checkout.js";
let scriptPromise: Promise<void> | null = null;

function loadScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("No window."));
  if (window.Razorpay) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = SCRIPT_SRC;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      scriptPromise = null;
      reject(new Error("Failed to load the Razorpay checkout script."));
    };
    document.head.appendChild(s);
  });
  return scriptPromise;
}

export type CheckoutSession = {
  orderId: string;
  keyId: string;
  amount: number; // rupees
  currency: string;
  email: string;
  name?: string;
};

export type CheckoutOutcome =
  | { status: "paid"; orderId: string; paymentId: string; signature: string }
  | { status: "failed"; orderId: string; paymentId?: string }
  | { status: "cancelled" }
  | { status: "error"; message: string };

export async function openRazorpayCheckout(s: CheckoutSession): Promise<CheckoutOutcome> {
  try {
    await loadScript();
  } catch (e) {
    return { status: "error", message: (e as Error).message };
  }
  if (!window.Razorpay) {
    return { status: "error", message: "Razorpay checkout is unavailable right now." };
  }

  return new Promise<CheckoutOutcome>((resolve) => {
    let settled = false;
    const done = (o: CheckoutOutcome) => {
      if (!settled) {
        settled = true;
        resolve(o);
      }
    };

    const rzp = new window.Razorpay!({
      key: s.keyId,
      order_id: s.orderId,
      amount: Math.round(s.amount * 100),
      currency: s.currency,
      name: "Shubham Datarkar",
      description: "Support",
      prefill: { name: s.name ?? "", email: s.email },
      theme: { color: "#ff4800" },
      handler: (resp: unknown) => {
        const r = resp as RazorpaySuccess;
        done({
          status: "paid",
          orderId: r.razorpay_order_id,
          paymentId: r.razorpay_payment_id,
          signature: r.razorpay_signature,
        });
      },
      modal: {
        ondismiss: () => done({ status: "cancelled" }),
      },
    });

    rzp.on("payment.failed", (resp: unknown) => {
      const r = (resp as { error?: { metadata?: { payment_id?: string } } })?.error;
      done({ status: "failed", orderId: s.orderId, paymentId: r?.metadata?.payment_id });
    });

    rzp.open();
  });
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: errors only in `support-panel.tsx` (still calls the old `openZohoCheckout`) — fixed in Task 9.

- [ ] **Step 3: Commit**

```bash
git add src/lib/support/checkout.ts
git commit -m "feat(support): razorpay checkout widget loader"
```

---

### Task 9: Wire `support-panel.tsx` — order → checkout → confirm

**Files:**
- Modify: `src/components/support/support-panel.tsx`

**Interfaces:**
- Consumes: `openRazorpayCheckout`, `CheckoutOutcome` (`@/lib/support/checkout`).

- [ ] **Step 1: Update the import**

Change line 14 from:

```ts
import { openZohoCheckout } from "@/lib/support/checkout";
```

to:

```ts
import { openRazorpayCheckout } from "@/lib/support/checkout";
```

- [ ] **Step 2: Replace the submit body (the `try` block inside `onSupport`)**

Replace the `try { … }` block (currently lines 49-105, from `const res = await fetch("/api/support/session"…` through the `else { toast(...) }` for the error outcome) with:

```ts
    try {
      const res = await fetch("/api/support/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          coffeeUnits: coffeeQty,
          toffeeUnits: toffeeQty,
          coversFee,
          anonymous,
          email,
          name: name || undefined,
          message: message || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        toast({
          title: "Couldn't start payment",
          description: data?.error ?? "Please try again.",
          variant: "danger",
        });
        return;
      }

      const outcome = await openRazorpayCheckout({
        orderId: data.orderId,
        keyId: data.keyId,
        amount: data.amount,
        currency: data.currency,
        email,
        name: name || undefined,
      });

      if (outcome.status === "paid") {
        const confirm = await fetch("/api/support/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            razorpay_order_id: outcome.orderId,
            razorpay_payment_id: outcome.paymentId,
            razorpay_signature: outcome.signature,
          }),
        });
        const confirmData = await confirm.json().catch(() => ({}));
        if (confirm.ok && confirmData?.ok) {
          toast({
            title: "Thank you!",
            description: `Your ${formatMoney(amount.base)} support means a lot.`,
            variant: "success",
          });
          setCoffeeQty(coffee.defaultQty);
          setToffeeQty(toffee.defaultQty);
          setMessage("");
        } else {
          toast({
            title: "Couldn't verify payment",
            description: "If you were charged, email me and I'll sort it out.",
            variant: "danger",
          });
        }
      } else if (outcome.status === "failed") {
        // Best-effort: move the row off pending. Fire-and-forget.
        void fetch("/api/support/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            razorpay_order_id: outcome.orderId,
            failed: true,
            paymentId: outcome.paymentId,
          }),
        });
        toast({ title: "Payment failed", description: "No worries — try again when ready.", variant: "danger" });
      } else if (outcome.status === "cancelled") {
        toast({
          title: "Payment cancelled",
          description: "No charge was made — your details are still here.",
        });
      } else {
        toast({ title: "Payment failed", description: outcome.message, variant: "danger" });
      }
    } catch {
```

(Leave the existing `catch { … }` and `finally { setLoading(false); }` blocks below intact.)

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors from `support-panel.tsx`.

- [ ] **Step 4: Commit**

```bash
git add src/components/support/support-panel.tsx
git commit -m "feat(support): drive razorpay order→checkout→confirm from the panel"
```

---

### Task 10: Delete Zoho code; trim the admin integrations page

**Files:**
- Delete: `src/lib/zoho/store.ts`, `src/lib/zoho/webhook.ts`, `src/lib/zoho/config.ts`, `src/lib/zoho/session.ts`, `src/lib/zoho/actions.ts`, `src/lib/zoho/oauth.ts`
- Delete: `src/components/admin/zoho-integration-form.tsx`
- Delete: `src/app/api/support/webhook/route.ts`
- Delete: `src/app/api/support/session/route.ts`
- Modify: `src/app/admin/integrations/page.tsx`

- [ ] **Step 1: Delete the Zoho + old-route files**

```bash
git rm src/lib/zoho/store.ts src/lib/zoho/webhook.ts src/lib/zoho/config.ts \
       src/lib/zoho/session.ts src/lib/zoho/actions.ts src/lib/zoho/oauth.ts \
       src/components/admin/zoho-integration-form.tsx \
       src/app/api/support/webhook/route.ts \
       src/app/api/support/session/route.ts
```

- [ ] **Step 2: Rewrite `src/app/admin/integrations/page.tsx`** (drop Zoho import + section; Kit becomes first card with no top border)

```tsx
import { getKitStatus } from "@/lib/kit/store";
import { getEmailStatus } from "@/lib/email/store";
import { KitIntegrationForm } from "@/components/admin/kit-integration-form";
import { EmailIntegrationForm } from "@/components/admin/email-integration-form";

export const dynamic = "force-dynamic";

export default async function AdminIntegrationsPage() {
  const [kit, email] = await Promise.all([getKitStatus(), getEmailStatus()]);

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Integrations</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Credentials are encrypted at rest and never shown again after saving.
        Payments run on Razorpay, configured via environment variables.
      </p>

      <section className="mt-8 max-w-xl">
        <h2 className="text-lg font-semibold">Kit (email)</h2>
        <p className="mb-4 mt-0.5 text-sm text-muted-foreground">
          Newsletter signups are added to your Kit form (alongside the Supabase
          subscribers table).
        </p>
        <KitIntegrationForm status={kit} />
      </section>

      <section className="mt-12 max-w-xl border-t border-border pt-8">
        <h2 className="text-lg font-semibold">Email (SMTP)</h2>
        <p className="mb-4 mt-0.5 text-sm text-muted-foreground">
          Sends contact-form notifications to you + an auto-reply to the sender.
        </p>
        <EmailIntegrationForm status={email} />
      </section>
    </div>
  );
}
```

- [ ] **Step 3: Confirm no stray Zoho references remain in `src/`**

Run: `grep -rniE "zoho|openZohoCheckout|attachSession|/api/support/(session|webhook)" src/ || echo "clean"`
Expected: `clean` (no matches).

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors (all Zoho consumers gone).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore(support): remove zoho integration + trim admin integrations page"
```

---

### Task 11: Docs, env example, full_setup.sql, policy copy

**Files:**
- Modify: `.env.example`
- Modify: `supabase/deploy/full_setup.sql`
- Modify: `DEPLOYMENT.md`
- Modify: `src/app/privacy-policy/page.tsx`, `src/app/terms-of-use/page.tsx`, `src/app/help/page.tsx`

- [ ] **Step 1: `.env.example` — replace the Zoho note + add Razorpay keys**

Replace lines 1-8 (the header comment + Supabase block stays; edit the Zoho note lines 1-3) so the top reads:

```bash
# Copy to .env.local and fill in. Never commit real secrets.
# Kit + SMTP credentials are stored in the DB via /admin/integrations, not here.

# Razorpay (payments) — from Razorpay Dashboard -> Settings -> API Keys
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=

# Supabase (your OWN project — never the connected BAS project)
NEXT_PUBLIC_SUPABASE_URL=
```

(Keep the rest of `.env.example` — Supabase keys, ADMIN_EMAIL, COMMENTER_*, site verification — unchanged.)

- [ ] **Step 2: `full_setup.sql` — remove the Zoho block, rename supports columns**

In `supabase/deploy/full_setup.sql`:
- Find the `supports` table definition and change the two provider columns to `razorpay_order_id text,` and `razorpay_payment_id text,`; rename the unique index `supports_zoho_session_idx` → `supports_rzp_order_idx` and its column reference to `razorpay_order_id`.
- Delete the entire Zoho integration block (the `zoho_integration` table, the `set_zoho_secret`/`get_zoho_secret` function definitions, and any grants on them). **Keep** the `create extension if not exists supabase_vault` line — Kit/Email still use Vault.

Run after editing: `grep -niE "zoho" supabase/deploy/full_setup.sql || echo "no zoho in full_setup"`
Expected: `no zoho in full_setup`.

- [ ] **Step 3: `DEPLOYMENT.md` — rewrite the payments sections**

- §1 env table: remove nothing Supabase; ADD rows for `RAZORPAY_KEY_ID` (public, Razorpay Dashboard → Settings → API Keys) and `RAZORPAY_KEY_SECRET` (secret, same place).
- §0 go-live: replace step 8's "Zoho Payments — sandbox first / register webhook" and step 10's "go live for payments" with: "Set `RAZORPAY_KEY_ID` + `RAZORPAY_KEY_SECRET` (live) in Vercel; no webhook to register — Checkout returns a signature the `/api/support/confirm` route verifies."
- §4: replace the whole "Configure Zoho Payments" section with a short "Payments (Razorpay)" section: keys are env vars; the flow is order → Checkout → signature-verified confirm; test with a real small payment and refund.
- Remove references to `/api/support/webhook` and the Zoho webhook secret.

Run after editing: `grep -niE "zoho" DEPLOYMENT.md || echo "no zoho in deployment"`
Expected: `no zoho in deployment`.

- [ ] **Step 4: Replace "Zoho" with "Razorpay" in policy/help copy**

In each of `src/app/privacy-policy/page.tsx`, `src/app/terms-of-use/page.tsx`, `src/app/help/page.tsx`, find the user-facing mentions of the Zoho payment processor and change the processor name to "Razorpay" (keep surrounding sentence structure). If a page links to Zoho's policy URL, update it to `https://razorpay.com/privacy/` (privacy) / `https://razorpay.com/terms/` (terms).

Run after editing: `grep -rniE "zoho" src/ || echo "clean"`
Expected: `clean`.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "docs(payments): razorpay env + deployment + policy copy; drop zoho from full_setup"
```

---

### Task 12: Green gate — types, lint, tests, build + manual smoke

**Files:** none (verification only).

- [ ] **Step 1: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: no errors, no warnings (repo policy is zero-warning — commit `3b2220d`).

- [ ] **Step 3: Full test suite**

Run: `npx vitest run`
Expected: all pass, including `src/lib/razorpay/verify.test.ts` (4) and `src/lib/razorpay/client.test.ts` (3).

- [ ] **Step 4: Production build**

Run: `npm run build`
Expected: build completes; `/api/support/order` and `/api/support/confirm` appear as routes; no `/api/support/webhook` or `/session`.

- [ ] **Step 5: Manual live smoke (owner runs, with real ₹)**

Preconditions: migration from Task 1 applied in Supabase; `RAZORPAY_KEY_ID` + `RAZORPAY_KEY_SECRET` (live) in `.env.local`; `npm run dev`.

1. Open `http://localhost:3000/support`, pick 1 coffee (₹20), enter an email, submit.
2. Razorpay Checkout opens → pay with a real method.
3. Verify in `/admin/payments`: the row is `paid` (not `pending`).
4. Verify `/support/supporters` shows the supporter (or anonymous).
5. Verify `/support/updates` shows a new `thankyou` post.
6. Refund the test payment from the Razorpay Dashboard.
7. Negative check: start another payment, close the modal → toast "Payment cancelled", row stays `pending`.

- [ ] **Step 6: Final commit (if any doc/tweak fixups)**

```bash
git add -A
git commit -m "chore(support): razorpay green-gate fixups" --allow-empty
```

- [ ] **Step 7: Push + open PR**

```bash
git push -u origin feat/razorpay-payments
gh pr create --base main --title "feat(support): replace Zoho Payments with Razorpay" \
  --body "Swaps the /support payment provider from Zoho to Razorpay (Orders API + Checkout + handler signature verify, no webhook). Env-based creds. DB migration renames supports provider columns + drops the zoho integration objects (run supabase/migrations/20260704000001 manually). See docs/superpowers/specs/2026-07-04-razorpay-payments-design.md."
```

---

## Notes for the executor

- The migration (Task 1) is applied **manually by the owner** in Supabase — do not attempt to apply it from code. Unit tests and `npm run build` do not need it applied. The manual live smoke (Task 12, Step 5) does.
- Between Task 5 and Task 10 the tree has intentional dangling references (old `session.ts`/`webhook` still import the removed `attachSession`/`sessionId`); `tsc` is only fully green after Task 10. Each task's typecheck note says where residual errors are expected.
- Razorpay live keys mean real charges. Keep smoke amounts minimal and refund.
