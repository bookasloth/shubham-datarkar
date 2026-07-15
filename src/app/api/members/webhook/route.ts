import { NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/razorpay/subscription-verify";
import { syncMembershipFromWebhook } from "@/lib/members/membership-server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { classifyChargeKind, notifyMembershipEvent } from "@/lib/members/membership-notify";

type WebhookPayload = {
  event?: string;
  payload?: {
    subscription?: {
      entity?: { id?: string; current_end?: number | null };
    };
  };
};

/**
 * Razorpay subscription webhook. Signature = HMAC-SHA256 of the RAW body with
 * the webhook secret. Always 200 after a verified event (Razorpay retries
 * non-2xx); unverified requests get 401.
 */
export async function POST(request: Request) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    console.warn("[members] RAZORPAY_WEBHOOK_SECRET not set; webhook rejected");
    return NextResponse.json({ error: "Webhook not configured." }, { status: 503 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature") ?? "";
  if (!verifyWebhookSignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  let payload: WebhookPayload;
  try {
    payload = JSON.parse(rawBody) as WebhookPayload;
  } catch {
    return NextResponse.json({ ok: true }); // verified but unparseable — ack, nothing to do
  }

  const sub = payload.payload?.subscription?.entity;
  const subscriptionId = sub?.id;
  if (!subscriptionId) return NextResponse.json({ ok: true });

  switch (payload.event) {
    case "subscription.activated": {
      await syncMembershipFromWebhook(subscriptionId, "active", sub?.current_end ?? undefined);
      await notifyMembershipEvent(subscriptionId, "activated");
      break;
    }
    case "subscription.charged": {
      const { data: prior } = await supabaseAdmin()
        .from("memberships")
        .select("current_period_end")
        .eq("razorpay_subscription_id", subscriptionId)
        .maybeSingle();
      await syncMembershipFromWebhook(subscriptionId, "active", sub?.current_end ?? undefined);
      await notifyMembershipEvent(subscriptionId, classifyChargeKind(prior?.current_period_end ?? null));
      break;
    }
    case "subscription.cancelled":
    case "subscription.completed":
      // Access continues until current_period_end; only the status flips.
      await syncMembershipFromWebhook(subscriptionId, "cancelled");
      break;
    case "subscription.halted":
    case "subscription.paused":
      await syncMembershipFromWebhook(subscriptionId, "expired");
      await notifyMembershipEvent(subscriptionId, "failed");
      break;
    default:
      break; // authenticated but unhandled — ack
  }

  return NextResponse.json({ ok: true });
}
