import { NextResponse } from "next/server";

import { ITEMS, FEE_PCT, CURRENCY } from "@/lib/support/config";
import { getZohoCredentials } from "@/lib/zoho/store";
import { fetchAccessToken } from "@/lib/zoho/oauth";
import { createPaymentSession } from "@/lib/zoho/session";
import {
  insertPendingSupport,
  attachSession,
  markSupportStatus,
} from "@/lib/support/server";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PRICE = Object.fromEntries(ITEMS.map((i) => [i.key, i.unitPrice])) as Record<string, number>;
const MAX_UNITS = 1000;

/**
 * Start a support payment: validate + recompute the amount server-side (never
 * trust the client), insert a pending row, mint a Zoho access token, create a
 * payment session, and hand the client what the checkout widget needs.
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

  const creds = await getZohoCredentials();
  if (!creds) {
    return NextResponse.json({ error: "Payments are not configured yet." }, { status: 503 });
  }

  // 1. Pending row.
  const inserted = await insertPendingSupport({
    name,
    email,
    message,
    coffeeUnits,
    toffeeUnits,
    currency: CURRENCY.code,
    baseAmount: base,
    feeAmount: fee,
    totalAmount: total,
    coversFee,
    anonymous,
  });
  if ("error" in inserted) {
    return NextResponse.json({ error: "Could not record support." }, { status: 500 });
  }
  const supportId = inserted.id;

  // 2. Access token.
  const token = await fetchAccessToken(creds);
  if (!token.ok) {
    await markSupportStatus({ supportId, status: "failed" });
    return NextResponse.json({ error: "Payment gateway authentication failed." }, { status: 502 });
  }

  // 3. Payment session.
  const session = await createPaymentSession(creds, token.token, {
    amount: total,
    currency: CURRENCY.code,
    description: `Support: ${coffeeUnits} coffee, ${toffeeUnits} toffee`,
    referenceNumber: supportId,
  });
  if (!session.ok) {
    await markSupportStatus({ supportId, status: "failed" });
    return NextResponse.json({ error: session.error }, { status: 502 });
  }

  await attachSession(supportId, session.sessionId);

  return NextResponse.json({
    supportId,
    paymentsSessionId: session.sessionId,
    accessKey: session.accessKey,
    accountId: creds.accountId,
    apiKey: creds.apiKey,
    mode: creds.mode,
    amount: total,
    currency: CURRENCY.code,
    symbol: CURRENCY.symbol,
  });
}
