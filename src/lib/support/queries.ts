import "server-only";

import { supabaseAnon } from "@/lib/supabase/server";

/**
 * Live support reads, served from the email-free public views
 * (`public_supporters`, `support_lifetime`, `support_stats`).
 *
 * Every query is fail-safe: if the env is missing or the migration hasn't
 * been applied yet, it logs once and returns an empty result so the page
 * still renders its empty state instead of throwing.
 */

export type Supporter = {
  /** sha256(email) from the view — stable, email-free React key. */
  key: string;
  name: string | null;
  lifetime: number;
  coffees: number;
  toffees: number;
};

export type RecentSupporter = { id: string; name: string | null };

export type SupportStats = {
  supporters: number;
  coffees: number;
  toffees: number;
  /** Supports recorded in the current calendar month. */
  thisMonth: number;
};

const EMPTY_STATS: SupportStats = { supporters: 0, coffees: 0, toffees: 0, thisMonth: 0 };

function warn(where: string, e: unknown) {
  console.warn(`[support] ${where} failed; returning empty:`, (e as Error)?.message ?? e);
}

/** All supporters by lifetime contribution (desc) — feeds the tiered wall. */
export async function getSupporters(): Promise<Supporter[]> {
  try {
    const { data, error } = await supabaseAnon()
      .from("support_lifetime")
      .select("supporter_key,name,lifetime_amount,lifetime_coffees,lifetime_toffees")
      .order("lifetime_amount", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((r) => ({
      key: String(r.supporter_key),
      name: (r.name as string | null) ?? null,
      lifetime: Number(r.lifetime_amount ?? 0),
      coffees: Number(r.lifetime_coffees ?? 0),
      toffees: Number(r.lifetime_toffees ?? 0),
    }));
  } catch (e) {
    warn("getSupporters", e);
    return [];
  }
}

/** Latest N paid supports — feeds the social-proof strip. */
export async function getRecentSupporters(limit = 8): Promise<RecentSupporter[]> {
  try {
    const { data, error } = await supabaseAnon()
      .from("public_supporters")
      .select("id,name")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []).map((r) => ({ id: String(r.id), name: (r.name as string | null) ?? null }));
  } catch (e) {
    warn("getRecentSupporters", e);
    return [];
  }
}

/** Headline metrics for the StatsBar + profile supporter count. */
export async function getSupportStats(): Promise<SupportStats> {
  try {
    const sb = supabaseAnon();
    const { data, error } = await sb
      .from("support_stats")
      .select("supporters_total,coffees_total,toffees_total")
      .single();
    if (error) throw error;

    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
    const { count } = await sb
      .from("public_supporters")
      .select("id", { count: "exact", head: true })
      .gte("created_at", monthStart);

    return {
      supporters: Number(data?.supporters_total ?? 0),
      coffees: Number(data?.coffees_total ?? 0),
      toffees: Number(data?.toffees_total ?? 0),
      thisMonth: count ?? 0,
    };
  } catch (e) {
    warn("getSupportStats", e);
    return EMPTY_STATS;
  }
}
