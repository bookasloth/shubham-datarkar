import "server-only";

import { supabaseAdmin } from "@/lib/supabase/server";
import { KALAMAI_MODEL } from "./llm";

// Sonnet list price. Cache reads bill at 0.1x input, writes at 1.25x (matches
// llm.ts costUsd) — so a cached brief really is cheaper, and the ledger shows it.
const USD_PER_MTOK_IN = 3;
const USD_PER_MTOK_OUT = 15;
const USD_PER_MTOK_CACHE_READ = 0.3;
const USD_PER_MTOK_CACHE_WRITE = 3.75;
const INR_PER_USD = 84; // ponytail: static rate — good enough for a spend ledger

/** Fallback estimate when a row has no logged cost_usd. Prices all four token
 *  buckets, so a cached run comes out cheaper than a full-price one. */
export function estCostInr(inTok: number, outTok: number, cacheRead = 0, cacheWrite = 0): number {
  const usd =
    (inTok * USD_PER_MTOK_IN + outTok * USD_PER_MTOK_OUT + cacheRead * USD_PER_MTOK_CACHE_READ + cacheWrite * USD_PER_MTOK_CACHE_WRITE) /
    1_000_000;
  return Math.round(usd * INR_PER_USD * 100) / 100;
}

export type KalamaiUsageRow = {
  id: string;
  kind: "analysis" | "article";
  user: string;
  keyword: string;
  model: string;
  inTokens: number;
  outTokens: number;
  cacheReadTokens: number;
  costInr: number;
  result: string;
  createdAt: string;
};

type Agg = { inTok: number; outTok: number; cacheRead: number; cacheWrite: number; costUsd: number };

/**
 * KalamAI usage ledger for the admin. One row per run — each analysis (its R4
 * brief call) and each article (its W1–W4 calls) — with the user, keyword,
 * model, summed tokens, an estimated ₹ cost, and the result. Aggregates
 * kalamai_llm_calls by analysis_id / article_id in code (service-role, bypasses
 * RLS). Throws on DB failure so the page shows an explicit error, never a
 * misleading empty list.
 */
export async function getKalamaiUsage(limit = 100): Promise<KalamaiUsageRow[]> {
  const db = supabaseAdmin();

  const [analysesRes, articlesRes, callsRes] = await Promise.all([
    db.from("kalamai_analyses").select("id, user_id, keyword, status, created_at").order("created_at", { ascending: false }).limit(limit),
    db.from("kalamai_articles").select("id, analysis_id, user_id, status, score, created_at").order("created_at", { ascending: false }).limit(limit),
    db.from("kalamai_llm_calls").select("analysis_id, article_id, input_tokens, output_tokens, cache_read_tokens, cache_write_tokens, cost_usd").order("created_at", { ascending: false }).limit(2000),
  ]);
  if (analysesRes.error) throw new Error(`analyses: ${analysesRes.error.message}`);
  if (articlesRes.error) throw new Error(`articles: ${articlesRes.error.message}`);
  if (callsRes.error) throw new Error(`llm_calls: ${callsRes.error.message}`);

  const analyses = (analysesRes.data ?? []) as { id: string; user_id: string; keyword: string; status: string; created_at: string }[];
  const articles = (articlesRes.data ?? []) as { id: string; analysis_id: string; user_id: string; status: string; score: { overall?: number } | null; created_at: string }[];
  const calls = (callsRes.data ?? []) as {
    analysis_id: string | null; article_id: string | null;
    input_tokens: number | null; output_tokens: number | null;
    cache_read_tokens: number | null; cache_write_tokens: number | null; cost_usd: number | null;
  }[];

  // Sum tokens + logged cost per analysis (brief) and per article (writing stages).
  const empty = (): Agg => ({ inTok: 0, outTok: 0, cacheRead: 0, cacheWrite: 0, costUsd: 0 });
  const byAnalysis = new Map<string, Agg>();
  const byArticle = new Map<string, Agg>();
  for (const c of calls) {
    const bucket = c.article_id ? byArticle : c.analysis_id ? byAnalysis : null;
    const key = c.article_id ?? c.analysis_id;
    if (!bucket || !key) continue;
    const a = bucket.get(key) ?? empty();
    a.inTok += c.input_tokens ?? 0;
    a.outTok += c.output_tokens ?? 0;
    a.cacheRead += c.cache_read_tokens ?? 0;
    a.cacheWrite += c.cache_write_tokens ?? 0;
    a.costUsd += c.cost_usd ?? 0;
    bucket.set(key, a);
  }
  // Real ₹ cost: prefer the cost logged at call time (already cache-aware);
  // fall back to a four-bucket estimate for older rows with no logged cost.
  const costOf = (a: Agg): number =>
    a.costUsd > 0 ? Math.round(a.costUsd * INR_PER_USD * 100) / 100 : estCostInr(a.inTok, a.outTok, a.cacheRead, a.cacheWrite);

  // Resolve user_id → username.
  const userIds = [...new Set([...analyses, ...articles].map((r) => r.user_id))];
  const nameById = new Map<string, string>();
  if (userIds.length) {
    const { data: profs } = await db.from("profiles").select("id, username").in("id", userIds);
    for (const p of (profs ?? []) as { id: string; username: string }[]) nameById.set(p.id, p.username);
  }
  const nameOf = (id: string) => nameById.get(id) ?? `${id.slice(0, 8)}…`;
  const keywordByAnalysis = new Map(analyses.map((a) => [a.id, a.keyword]));

  const rows: KalamaiUsageRow[] = [];
  for (const a of analyses) {
    const agg = byAnalysis.get(a.id) ?? empty();
    rows.push({
      id: a.id, kind: "analysis", user: nameOf(a.user_id), keyword: a.keyword, model: KALAMAI_MODEL,
      inTokens: agg.inTok, outTokens: agg.outTok, cacheReadTokens: agg.cacheRead, costInr: costOf(agg),
      result: a.status, createdAt: a.created_at,
    });
  }
  for (const art of articles) {
    const agg = byArticle.get(art.id) ?? empty();
    const score = art.score?.overall;
    rows.push({
      id: art.id, kind: "article", user: nameOf(art.user_id),
      keyword: keywordByAnalysis.get(art.analysis_id) ?? "—", model: KALAMAI_MODEL,
      inTokens: agg.inTok, outTokens: agg.outTok, cacheReadTokens: agg.cacheRead, costInr: costOf(agg),
      result: score != null ? `${art.status} · ${score}/100` : art.status, createdAt: art.created_at,
    });
  }
  rows.sort((x, y) => y.createdAt.localeCompare(x.createdAt));
  return rows.slice(0, limit);
}
