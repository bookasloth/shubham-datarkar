import "server-only";

import { supabaseAdmin } from "@/lib/supabase/server";

export type MemberStats = {
  accounts: number;
  activePremium: number;
  giftedMembers: number;
  publishedResources: number;
  viewsLast30d: number;
  downloadsLast30d: number;
  openRequests: number;
};

const DAYS_30 = 30 * 24 * 60 * 60 * 1000;

export async function getMemberStats(): Promise<MemberStats> {
  const db = supabaseAdmin();
  const since = new Date(Date.now() - DAYS_30).toISOString();

  const nowIso = new Date().toISOString();
  const [profiles, premium, gifted, resources, views, downloads, requests] = await Promise.all([
    db.from("profiles").select("id", { count: "exact", head: true }),
    db
      .from("memberships")
      .select("id", { count: "exact", head: true })
      .eq("status", "active")
      .eq("source", "paid")
      .gt("current_period_end", nowIso),
    db
      .from("memberships")
      .select("id", { count: "exact", head: true })
      .eq("status", "active")
      .eq("source", "gift")
      .gt("current_period_end", nowIso),
    db
      .from("resources")
      .select("id", { count: "exact", head: true })
      .eq("status", "published"),
    db
      .from("resource_events")
      .select("id", { count: "exact", head: true })
      .eq("event", "view")
      .gte("created_at", since),
    db
      .from("resource_events")
      .select("id", { count: "exact", head: true })
      .eq("event", "download")
      .gte("created_at", since),
    db
      .from("member_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "open"),
  ]);

  return {
    accounts: profiles.count ?? 0,
    activePremium: premium.count ?? 0,
    giftedMembers: gifted.count ?? 0,
    publishedResources: resources.count ?? 0,
    viewsLast30d: views.count ?? 0,
    downloadsLast30d: downloads.count ?? 0,
    openRequests: requests.count ?? 0,
  };
}

export type PopularResource = {
  id: string;
  title: string;
  type: string;
  view_count: number;
  bookmark_count: number;
  download_count: number;
};

export async function getPopularResources(limit = 10): Promise<PopularResource[]> {
  const { data, error } = await supabaseAdmin()
    .from("resources")
    .select("id,title,type,view_count,bookmark_count,download_count")
    .eq("status", "published")
    .order("view_count", { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data ?? []) as PopularResource[];
}

export type TopSearch = { query: string; count: number };

/** Aggregate the last 500 search events in JS (no SQL group-by via PostgREST). */
export async function getTopSearches(limit = 10): Promise<TopSearch[]> {
  const { data, error } = await supabaseAdmin()
    .from("resource_events")
    .select("query")
    .eq("event", "search")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error || !data) return [];
  const counts = new Map<string, number>();
  for (const row of data) {
    const q = row.query?.toLowerCase().trim();
    if (!q) continue;
    counts.set(q, (counts.get(q) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([query, count]) => ({ query, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export type RequestBreakdown = { kind: string; open: number; total: number };

export async function getRequestBreakdown(): Promise<RequestBreakdown[]> {
  const { data, error } = await supabaseAdmin()
    .from("member_requests")
    .select("kind,status");
  if (error || !data) return [];
  const byKind = new Map<string, { open: number; total: number }>();
  for (const row of data) {
    const entry = byKind.get(row.kind) ?? { open: 0, total: 0 };
    entry.total += 1;
    if (row.status === "open") entry.open += 1;
    byKind.set(row.kind, entry);
  }
  return [...byKind.entries()].map(([kind, v]) => ({ kind, ...v }));
}
