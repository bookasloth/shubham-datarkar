import "server-only";

import crypto from "node:crypto";

/**
 * Zoho Payments webhook verification + event parsing.
 *
 * Signature header `X-Zoho-Webhook-Signature` has the form `t=<ts>,v=<hexhmac>`.
 * The signed data is `${t}.${rawBody}`, HMAC-SHA256 with the webhook signing
 * secret. Compare in constant time.
 */

export function verifyZohoSignature(
  rawBody: string,
  header: string | null,
  signingKey: string,
): boolean {
  if (!header || !signingKey) return false;

  const parts: Record<string, string> = {};
  for (const kv of header.split(",")) {
    const i = kv.indexOf("=");
    if (i === -1) continue;
    parts[kv.slice(0, i).trim()] = kv.slice(i + 1).trim();
  }
  const t = parts.t;
  const v = parts.v;
  if (!t || !v) return false;

  const expected = crypto
    .createHmac("sha256", signingKey)
    .update(`${t}.${rawBody}`)
    .digest("hex");

  let a: Buffer;
  let b: Buffer;
  try {
    a = Buffer.from(expected, "hex");
    b = Buffer.from(v, "hex");
  } catch {
    return false;
  }
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export type ZohoEvent = {
  type: string | null;
  sessionId: string | null;
  paymentId: string | null;
  referenceNumber: string | null;
};

/** Pull the event type + payment identifiers out of the webhook envelope. */
export function parseZohoEvent(body: unknown): ZohoEvent {
  const b = (body ?? {}) as Record<string, unknown>;
  const type = (b.event_type ?? b.eventType ?? null) as string | null;

  // The payment object may sit at a few paths depending on the envelope.
  const data = (b.data ?? {}) as Record<string, unknown>;
  const p = ((data.payment ?? b.payment ?? data) ?? {}) as Record<string, unknown>;

  const str = (val: unknown) => (val === undefined || val === null ? null : String(val));

  return {
    type: type ? String(type) : null,
    sessionId: str(p.payments_session_id ?? p.payment_session_id),
    paymentId: str(p.payment_id),
    referenceNumber: str(p.reference_number),
  };
}
