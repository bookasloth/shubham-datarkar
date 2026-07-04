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
