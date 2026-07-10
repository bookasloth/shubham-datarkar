import "server-only";

import { supabaseAuthServer } from "@/lib/supabase/auth-server";
import { normalizeEmail } from "./types";
import type { Person, TimelineEntry } from "./types";

export type { Person, TimelineEntry } from "./types";

/** Every distinct person across contacts, subscribers, supports, and accounts. */
export async function getPeople(): Promise<Person[]> {
  try {
    const supabase = await supabaseAuthServer();
    const { data, error } = await supabase.rpc("get_people");
    if (error) throw error;
    return (data ?? []).map((r: Record<string, unknown>) => ({
      email: String(r.email),
      displayName: String(r.display_name ?? ""),
      userId: (r.user_id as string | null) ?? null,
      verified: Boolean(r.verified),
      contacted: Boolean(r.contacted),
      contactCount: Number(r.contact_count ?? 0),
      subscribed: Boolean(r.subscribed),
      donated: Boolean(r.donated),
      donationTotal: Number(r.donation_total ?? 0),
      isGamer: Boolean(r.is_gamer),
      planKey: (r.plan_key as string | null) ?? null,
      membershipStatus: (r.membership_status as string | null) ?? null,
      firstSeen: (r.first_seen as string | null) ?? null,
      lastSeen: (r.last_seen as string | null) ?? null,
    }));
  } catch (e) {
    console.warn("[people] getPeople failed; returning empty:", (e as Error)?.message ?? e);
    return [];
  }
}

/** Merged chronological activity for one email. */
export async function getPersonTimeline(email: string): Promise<TimelineEntry[]> {
  try {
    const supabase = await supabaseAuthServer();
    const { data, error } = await supabase.rpc("get_person_timeline", { p_email: normalizeEmail(email) });
    if (error) throw error;
    return (data ?? []).map((r: Record<string, unknown>) => ({
      kind: String(r.kind),
      occurredAt: (r.occurred_at as string | null) ?? null,
      title: String(r.title ?? ""),
      detail: (r.detail as string | null) ?? null,
    }));
  } catch (e) {
    console.warn("[people] getPersonTimeline failed; returning empty:", (e as Error)?.message ?? e);
    return [];
  }
}
