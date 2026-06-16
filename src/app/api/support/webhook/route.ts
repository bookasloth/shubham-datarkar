import { NextResponse } from "next/server";
import { headers } from "next/headers";

import { getZohoCredentials } from "@/lib/zoho/store";
import { verifyZohoSignature, parseZohoEvent } from "@/lib/zoho/webhook";
import { markSupportStatus } from "@/lib/support/server";

export const dynamic = "force-dynamic";

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
    await markSupportStatus({
      sessionId: evt.sessionId,
      supportId: evt.referenceNumber,
      status: "paid",
      paymentId: evt.paymentId,
    });
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
