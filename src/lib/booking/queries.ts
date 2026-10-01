import "server-only";

import { supabaseAuthServer } from "@/lib/supabase/auth-server";

export type Booking = {
  id: string;
  createdAt: string;
  bookedAt: string | null;
  externalId: string;
  name: string | null;
  email: string | null;
  source: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  utmTerm: string | null;
  fbclid: string | null;
  gclid: string | null;
  landingPage: string | null;
  referrer: string | null;
  aiSource: string | null;
};

type Row = {
  id: string;
  created_at: string;
  booked_at: string | null;
  external_id: string;
  name: string | null;
  email: string | null;
  source: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  fbclid: string | null;
  gclid: string | null;
  landing_page: string | null;
  referrer: string | null;
  ai_source: string | null;
};

const COLS =
  "id,created_at,booked_at,external_id,name,email,source,utm_source,utm_medium,utm_campaign,utm_content,utm_term,fbclid,gclid,landing_page,referrer,ai_source";

function mapRow(r: Row): Booking {
  return {
    id: r.id,
    createdAt: r.created_at,
    bookedAt: r.booked_at,
    externalId: r.external_id,
    name: r.name,
    email: r.email,
    source: r.source,
    utmSource: r.utm_source,
    utmMedium: r.utm_medium,
    utmCampaign: r.utm_campaign,
    utmContent: r.utm_content,
    utmTerm: r.utm_term,
    fbclid: r.fbclid,
    gclid: r.gclid,
    landingPage: r.landing_page,
    referrer: r.referrer,
    aiSource: r.ai_source,
  };
}

/** All consultation bookings, newest first (admin only — RLS authenticated read). */
export async function getBookings(limit = 200): Promise<Booking[]> {
  try {
    const sb = await supabaseAuthServer();
    const { data, error } = await sb
      .from("bookings")
      .select(COLS)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return ((data as Row[]) ?? []).map(mapRow);
  } catch (e) {
    console.warn("[booking] getBookings failed; returning empty:", (e as Error)?.message ?? e);
    return [];
  }
}

/** Count of bookings whose first-touch source looks like Instagram — the headline
 *  campaign number ("how many bookings came from Reels?"). */
export function instagramBookingCount(rows: Booking[]): number {
  return rows.filter((b) => /instagram|\big\b|reel/i.test(`${b.source ?? ""} ${b.utmSource ?? ""} ${b.utmMedium ?? ""}`)).length;
}
