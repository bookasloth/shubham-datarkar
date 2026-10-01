import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase/server";
import { sendMetaEvent } from "@/lib/analytics/meta-capi";
import { newEventId } from "@/lib/analytics/track-lead";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Booking webhook from the external scheduler (bookasloth.com). This is the ONLY
 * place a completed consultation is observable: the booking happens on another
 * origin, so without this call the campaign's primary conversion is invisible.
 *
 * On a verified booking it (1) records a row in `bookings` with the attribution
 * the scheduler carried across, so "how many bookings came from Instagram Reels"
 * is a SQL query, and (2) fires the Meta `Schedule` conversion via CAPI using the
 * stored fbclid/_fbc — which is what lets Meta credit the exact Reel ad and build
 * the "booked" audience to exclude from the retargeting ad set.
 *
 * Signature: HMAC-SHA256 (hex) of the RAW body with BOOKASLOTH_WEBHOOK_SECRET,
 * sent in `x-bookasloth-signature`. Idempotent on `external_id`.
 */

type Attribution = {
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_content?: string | null;
  utm_term?: string | null;
  fbclid?: string | null;
  gclid?: string | null;
  landing_page?: string | null;
  referrer?: string | null;
  ai_source?: string | null;
};

type BookingPayload = {
  external_id?: string;
  name?: string;
  email?: string;
  phone?: string;
  booked_at?: string;
  source?: string;
  attribution?: Attribution;
  fbc?: string;
  fbp?: string;
  event_id?: string;
};

function verify(rawBody: string, signature: string, secret: string): boolean {
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature ?? "", "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

const clip = (v: unknown, max: number) =>
  typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;

export async function POST(request: Request) {
  const secret = process.env.BOOKASLOTH_WEBHOOK_SECRET;
  if (!secret) {
    console.warn("[bookings] BOOKASLOTH_WEBHOOK_SECRET not set; webhook rejected");
    return NextResponse.json({ error: "Webhook not configured." }, { status: 503 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get("x-bookasloth-signature") ?? "";
  if (!verify(rawBody, signature, secret)) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  let p: BookingPayload;
  try {
    p = JSON.parse(rawBody) as BookingPayload;
  } catch {
    return NextResponse.json({ ok: true }); // verified but unparseable — ack
  }

  const externalId = clip(p.external_id, 200);
  if (!externalId) return NextResponse.json({ ok: true }); // nothing to key on

  const email = clip(p.email, 320)?.toLowerCase() ?? null;
  const a = p.attribution ?? {};
  const eventId = clip(p.event_id, 100) ?? newEventId();

  const admin = supabaseAdmin();
  // Idempotent: the scheduler may retry. onConflict external_id → no duplicate row,
  // and we only fire the CAPI conversion when a NEW row is actually inserted.
  const { data, error } = await admin
    .from("bookings")
    .upsert(
      {
        external_id: externalId,
        name: clip(p.name, 120),
        email,
        source: clip(p.source, 120) ?? clip(a.utm_source, 120),
        utm_source: clip(a.utm_source, 120),
        utm_medium: clip(a.utm_medium, 120),
        utm_campaign: clip(a.utm_campaign, 120),
        utm_content: clip(a.utm_content, 120),
        utm_term: clip(a.utm_term, 120),
        fbclid: clip(a.fbclid, 255),
        gclid: clip(a.gclid, 255),
        landing_page: clip(a.landing_page, 300),
        referrer: clip(a.referrer, 500),
        ai_source: clip(a.ai_source, 60),
        booked_at: clip(p.booked_at, 40),
        event_id: eventId,
        raw: p as unknown as Record<string, unknown>,
      },
      { onConflict: "external_id", ignoreDuplicates: true },
    )
    .select("id")
    .maybeSingle();

  if (error) {
    console.warn("[bookings] insert failed:", error.message);
    return NextResponse.json({ error: "Insert failed." }, { status: 500 });
  }
  // No row back → it was a duplicate retry; don't double-count the conversion.
  if (!data) return NextResponse.json({ ok: true, duplicate: true });

  await sendMetaEvent({
    eventName: "Schedule",
    eventId,
    email,
    phone: p.phone ?? null,
    fbc: p.fbc ?? null,
    fbp: p.fbp ?? null,
    eventSourceUrl: "https://shubhamdatarkar.com/book",
    customData: { content_name: "consultation", source: clip(p.source, 120) ?? clip(a.utm_source, 120) },
  });

  return NextResponse.json({ ok: true });
}
