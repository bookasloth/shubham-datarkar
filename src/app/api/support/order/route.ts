import { NextResponse } from "next/server";

import { ITEMS, FEE_PCT, CURRENCY } from "@/lib/support/config";
import { createOrder, razorpayKeyId } from "@/lib/razorpay/client";
import { insertPendingSupport, attachOrder, markSupportStatus } from "@/lib/support/server";

import { EMAIL_RE } from "@/lib/validation/email";
import { allow, clientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const PRICE = Object.fromEntries(ITEMS.map((i) => [i.key, i.unitPrice])) as Record<string, number>;
const MAX_UNITS = 1000;

/**
 * Start a support payment: validate + recompute the amount server-side (never
 * trust the client), insert a pending row, create a Razorpay order, and hand the
 * client what Checkout needs. The confirm route is the source of truth for paid.
 */
export async function POST(request: Request) {
  // Unauthenticated + creates a live Razorpay order per call — throttle by IP so
  // it can't be scripted into a supports-table flood / provider-API hammer.
  if (!allow(`support-order:${clientIp(request.headers)}`, 5, 60_000)) {
    return NextResponse.json({ error: "Too many attempts. Please wait a minute." }, { status: 429 });
  }

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
    console.warn(
      `[support] Razorpay order failed (keyId=${process.env.RAZORPAY_KEY_ID ?? "MISSING"}):`,
      order.error,
    );
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
