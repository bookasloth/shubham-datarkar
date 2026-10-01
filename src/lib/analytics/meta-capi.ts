/**
 * Meta Conversions API (server-side events). Mirrors browser Pixel events from
 * the server so conversions survive ad-blockers, ITP, and iOS — and, for the
 * booking (`Schedule`), is the ONLY place the conversion is observable at all,
 * because the booking completes on bookasloth.com, not here.
 *
 * Pure-ish: hashing has no deps, the send is a plain fetch. No `server-only`
 * import so the hashing is unit-testable, but the access token is read from the
 * environment only at send time and never leaves the server.
 */
import { createHash } from "node:crypto";

const GRAPH_VERSION = "v21.0";
// Pixel ID is public (it ships in the browser snippet); the env var only lets it
// be overridden without a code change. Falls back to the hardcoded site pixel.
const PIXEL_ID = process.env.META_PIXEL_ID || "4568625823364495";

/** SHA-256 hex of a normalized value — Meta's required format for PII fields. */
function hash(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const normal = value.trim().toLowerCase();
  if (!normal) return undefined;
  return createHash("sha256").update(normal).digest("hex");
}

/** Phone → digits only (keep country code), then hashed. */
function hashPhone(phone: string | null | undefined): string | undefined {
  if (!phone) return undefined;
  const digits = phone.replace(/\D/g, "");
  return digits ? createHash("sha256").update(digits).digest("hex") : undefined;
}

export type CapiEvent = {
  eventName: "Lead" | "Schedule" | "ViewContent" | "InitiateCheckout";
  /** Shared with the browser Pixel event for deduplication. */
  eventId: string;
  eventSourceUrl?: string;
  /** Unix seconds; defaults to now. */
  eventTime?: number;
  email?: string | null;
  phone?: string | null;
  /** Meta browser cookies forwarded from the client for match quality. */
  fbc?: string | null;
  fbp?: string | null;
  clientIp?: string | null;
  userAgent?: string | null;
  customData?: Record<string, unknown>;
};

/**
 * Sends one event to the Conversions API. No-ops (returns false) when the access
 * token is unset — same fail-safe posture as email: a missing integration must
 * never break a booking or a lead. Never throws.
 */
export async function sendMetaEvent(ev: CapiEvent): Promise<boolean> {
  const token = process.env.META_CAPI_ACCESS_TOKEN;
  if (!token) return false;

  const userData: Record<string, unknown> = {};
  const em = hash(ev.email);
  const ph = hashPhone(ev.phone);
  if (em) userData.em = [em];
  if (ph) userData.ph = [ph];
  if (ev.fbc) userData.fbc = ev.fbc;
  if (ev.fbp) userData.fbp = ev.fbp;
  if (ev.clientIp) userData.client_ip_address = ev.clientIp;
  if (ev.userAgent) userData.client_user_agent = ev.userAgent;

  const body = {
    data: [
      {
        event_name: ev.eventName,
        event_time: ev.eventTime ?? Math.floor(Date.now() / 1000),
        event_id: ev.eventId,
        action_source: "website",
        ...(ev.eventSourceUrl ? { event_source_url: ev.eventSourceUrl } : {}),
        user_data: userData,
        ...(ev.customData ? { custom_data: ev.customData } : {}),
      },
    ],
  };

  try {
    const res = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${PIXEL_ID}/events?access_token=${encodeURIComponent(token)}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    if (!res.ok) {
      console.warn("[capi] send failed:", res.status, await res.text().catch(() => ""));
      return false;
    }
    return true;
  } catch (e) {
    console.warn("[capi] send threw:", (e as Error).message);
    return false;
  }
}

/** Exposed for unit tests — verifies PII is normalized + hashed, never sent raw. */
export const _test = { hash, hashPhone };
