import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { SerpResult } from "./serp/provider";

// Weekly SERP cache + fail-closed budget reservation (module `search`).
// SERPs barely move day-to-day; a weekly bucket multiplies effective DataForSEO
// budget ~7x. The Rs.2000/mo cap is a SERP-only ledger enforced in Postgres via
// kalamai_reserve_serp_call (atomic, fail-closed). See docs/kalamai/spec/search.md.

/** ISO-8601 year-week in UTC, e.g. "2026-W29". Cache TTL = bucket rollover. */
export function weekBucket(d: Date = new Date()): string {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = (t.getUTCDay() + 6) % 7; // Mon=0 .. Sun=6
  t.setUTCDate(t.getUTCDate() - day + 3); // Thursday of this week decides the ISO year
  const isoYear = t.getUTCFullYear();
  const firstThu = new Date(Date.UTC(isoYear, 0, 4));
  const firstDay = (firstThu.getUTCDay() + 6) % 7;
  firstThu.setUTCDate(firstThu.getUTCDate() - firstDay + 3); // Thursday of ISO week 1
  const week = 1 + Math.round((t.getTime() - firstThu.getTime()) / (7 * 86_400_000));
  return `${isoYear}-W${String(week).padStart(2, "0")}`;
}

/** Calendar month in UTC, e.g. "2026-07". Budget ledger key. */
export function monthBucket(d: Date = new Date()): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function serpCacheKey(keyword: string, language: string, country: string, week: string): string {
  return `${keyword.trim().toLowerCase()}|${language}|${country}|${week}`;
}

export async function serpCacheLookup(db: SupabaseClient, key: string): Promise<SerpResult | null> {
  const { data } = await db.from("kalamai_serp_cache").select("serp").eq("cache_key", key).maybeSingle();
  return (data?.serp as SerpResult | undefined) ?? null;
}

export async function serpCacheStore(
  db: SupabaseClient,
  args: { key: string; keyword: string; language: string; country: string; week: string; serp: SerpResult },
): Promise<void> {
  // ignoreDuplicates: concurrent misses race to insert the same cache_key; first wins, rest no-op.
  await db.from("kalamai_serp_cache").upsert(
    {
      cache_key: args.key,
      keyword: args.keyword,
      language: args.language,
      country: args.country,
      week_bucket: args.week,
      serp: args.serp,
      source: "dataforseo",
    },
    { onConflict: "cache_key", ignoreDuplicates: true },
  );
}

/**
 * Atomically reserve one SERP call against the monthly cap. Returns true if the
 * call is allowed, false if the cap is reached (fail closed — caller must NOT
 * fetch). The reservation is a spend guard, not a receipt: it is not refunded on
 * a later provider error (a decrement path invites double-spend races; a rare
 * over-count of 1 is cheaper than the race). See spec search.md step 6.
 */
export async function reserveSerpCall(db: SupabaseClient, month: string): Promise<boolean> {
  const { data, error } = await db.rpc("kalamai_reserve_serp_call", { p_month: month });
  if (error) throw new Error(`serp_budget_rpc_failed: ${error.message}`);
  return typeof data === "number" && data >= 0;
}
