import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { randomInt } from "node:crypto";

import { getZohoCredentials } from "@/lib/zoho/store";
import { verifyZohoSignature, parseZohoEvent } from "@/lib/zoho/webhook";
import { markSupportStatus, type SupportRow } from "@/lib/support/server";
import { insertUpdate, getThankyouImages } from "@/lib/support/updates";
import { thankyouAuthor } from "@/lib/support/aliases";

export const dynamic = "force-dynamic";

const THANKYOU_CAPTION =
  "Thank you for the support. Every coffee and toffee keeps the free tools, writing, and experiments coming.";

/**
 * Post a system thank-you to the updates feed for a freshly-paid support.
 * Best-effort: a failure here must never break the webhook ack, so it's fully
 * guarded. The feed/post pages are force-dynamic, so no revalidation is needed.
 */
async function postThankyou(support: SupportRow): Promise<void> {
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
    console.warn("[webhook] thank-you post failed:", (e as Error).message);
  }
}

/**
 * Zoho Payments webhook. Verifies the HMAC signature against the stored
 * webhook secret, then flips the matching support row to paid/failed. Must
 * return a 2xx quickly (Zoho times out after ~15s).
 */
export async function POST(request: Request) {
  // Raw body is required for signature verification — read it before parsing.
  const raw = await request.text();
  const sig = (await headers()).get("x-zoho-webhook-signature");

  const creds = await getZohoCredentials();
  if (!creds?.webhookSecret) {
    return NextResponse.json({ error: "not configured" }, { status: 503 });
  }

  if (!verifyZohoSignature(raw, sig, creds.webhookSecret)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let body: unknown = {};
  try {
    body = JSON.parse(raw);
  } catch {
    /* keep empty — verified but unparseable; ack and move on */
  }

  const evt = parseZohoEvent(body);

  if (evt.type === "payment.succeeded") {
    const res = await markSupportStatus({
      sessionId: evt.sessionId,
      supportId: evt.referenceNumber,
      status: "paid",
      paymentId: evt.paymentId,
    });
    // Only on the real pending→paid transition (idempotent against re-delivery).
    if (res.updated && res.support) await postThankyou(res.support);
  } else if (evt.type === "payment.failed") {
    await markSupportStatus({
      sessionId: evt.sessionId,
      supportId: evt.referenceNumber,
      status: "failed",
      paymentId: evt.paymentId,
    });
  }

  // Ack everything (including unhandled event types) so Zoho doesn't retry.
  return NextResponse.json({ received: true });
}
