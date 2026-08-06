import { NextResponse } from "next/server";

import { verifyPaymentSignature } from "@/lib/razorpay/verify";
import { markSupportStatus } from "@/lib/support/server";
import { postThankyou } from "@/lib/support/thankyou";
import { postCommunitySupporter } from "@/lib/community/auto/supporter";
import { allow, clientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * Confirm a Razorpay payment. Success requires a valid HMAC signature over
 * `${order_id}|${payment_id}` before the row is flipped to paid; only the real
 * pending→paid transition triggers the one-time auto thank-you post. A failure
 * body just moves the row off `pending` (no signature — it grants nothing).
 */
export async function POST(request: Request) {
  // The failure path flips a pending order to `failed` without a signature
  // (Razorpay's client failure callback carries none). markSupportStatus already
  // restricts it to pending rows and a real signed success still overrides it,
  // but a rate limit blunts a scripted grief-flood against guessed order ids.
  if (!(await allow(`support-confirm:${clientIp(request.headers)}`, 15, 60_000))) {
    return NextResponse.json({ ok: false, error: "Too many attempts. Please wait a minute." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }
  const fields = body as Record<string, unknown>;

  const orderId = String(fields.razorpay_order_id ?? "").trim();
  if (!orderId) {
    return NextResponse.json({ ok: false, error: "Missing order id." }, { status: 400 });
  }

  // Failure path: move off pending, no thank-you.
  if (fields.failed === true) {
    await markSupportStatus({
      orderId,
      status: "failed",
      paymentId: fields.paymentId ? String(fields.paymentId) : null,
    });
    return NextResponse.json({ ok: true });
  }

  // Success path: verify signature first.
  const paymentId = String(fields.razorpay_payment_id ?? "").trim();
  const signature = String(fields.razorpay_signature ?? "").trim();
  if (!paymentId || !signature) {
    return NextResponse.json({ ok: false, error: "Missing payment fields." }, { status: 400 });
  }
  if (!verifyPaymentSignature(orderId, paymentId, signature)) {
    return NextResponse.json({ ok: false, error: "Signature verification failed." }, { status: 400 });
  }

  const res = await markSupportStatus({ orderId, status: "paid", paymentId });
  if (res.updated && res.support) {
    await postThankyou(res.support);
    await postCommunitySupporter(res.support);
  }

  return NextResponse.json({ ok: true });
}
