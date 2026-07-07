/** Pure crypto for Razorpay subscription + webhook verification. No server-only/next deps so vitest can run it. */
import { createHmac, timingSafeEqual } from "node:crypto";

function keySecret(): string {
  const s = process.env.RAZORPAY_KEY_SECRET;
  if (!s) throw new Error("Missing RAZORPAY_KEY_SECRET");
  return s;
}

function safeEqualHex(expected: string, given: string): boolean {
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(given ?? "", "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Verify a Checkout success for a SUBSCRIPTION. Razorpay signs
 * `${payment_id}|${subscription_id}` — note: the reverse order of the
 * orders flow (`order_id|payment_id`).
 */
export function verifySubscriptionSignature(
  paymentId: string,
  subscriptionId: string,
  signature: string,
): boolean {
  const expected = createHmac("sha256", keySecret())
    .update(`${paymentId}|${subscriptionId}`)
    .digest("hex");
  return safeEqualHex(expected, signature);
}

/** Verify a webhook: HMAC-SHA256 of the RAW request body with the webhook secret. */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string,
  secret: string,
): boolean {
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  return safeEqualHex(expected, signature);
}
