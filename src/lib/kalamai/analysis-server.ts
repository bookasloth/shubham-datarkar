import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase/server";
import { mapWithConcurrency } from "@/lib/seo/fetch-html";
import { extractPage, type Heading } from "./extract";
import { chunkText } from "./chunk";
import { embedTexts, toPgVector, EMBED_MODEL } from "./embed";
import { rankTerms, type TermPage, type RankedTerm } from "./terms";
import { distill, type ChunkVec, type DistillCluster } from "./distill";
import { runJson } from "./llm";
import { BRIEF_SCHEMA, FAKE_BRIEF, buildBriefPrompt, type Brief } from "./brief";
import { logEvent } from "./events-server";
import type { SerpProvider, SerpOrganic, SerpResult } from "./serp/provider";
import { DataForSeoProvider } from "./serp/dataforseo";
import { SerperProvider } from "./serp/serper";
import { FakeSerpProvider } from "./serp/fake";
import { crawlUrl, RobotsCache, type Crawler } from "./crawl";
import {
  weekBucket,
  monthBucket,
  serpCacheKey,
  serpCacheLookup,
  serpCacheStore,
  reserveSerpCall,
} from "./serp-cache";

// Offline pipeline for local dev / preview: no DataForSEO creds, no live crawl.
// Pair with KALAMAI_FAKE_LLM=1 to run the whole flow with zero spend.
function fakeCrawler(): Crawler {
  return async (url) =>
    `<html><head><title>Digital marketing in Nagpur</title>` +
    `<meta name="description" content="seo, ppc and content marketing"></head><body><main><article>` +
    `<h1>Digital Marketing Company in Nagpur</h1><h2>SEO Services</h2><h2>PPC</h2>` +
    `<p>digital marketing agency offering seo, ppc and content marketing for local businesses. ${url}</p>` +
    `</article></main></body></html>`;
}

function defaultSerp(): SerpProvider {
  // Config switch (not a runtime chain): flip SERP_PROVIDER in Vercel to fail
  // over. Unset → prefer whichever creds exist, DataForSEO first (primary).
  const which = process.env.SERP_PROVIDER;
  if (which === "serper") return new SerperProvider();
  if (which === "dataforseo") return new DataForSeoProvider();
  return process.env.DATAFORSEO_LOGIN ? new DataForSeoProvider() : new SerperProvider();
}

function defaultDeps(): { serp: SerpProvider; crawl: Crawler } {
  if (process.env.KALAMAI_FAKE_SERP === "1") return { serp: new FakeSerpProvider(), crawl: fakeCrawler() };
  return { serp: defaultSerp(), crawl: crawlUrl };
}

const BATCH = 6;
const CRAWL_CONCURRENCY = 6;
const MIN_CONFIDENT = 20; // < this many successful crawls → low_confidence banner
const STEP_LOCK_MS = 2 * 60_000; // reclaim a claim left behind by a crashed/timed-out step (maxDuration is 60s)

export type StepResult = { status: string; progress: number };
export type AnalysisDeps = { serp?: SerpProvider; crawl?: Crawler };

// Loose shape of a kalamai_analyses row (the client is untyped).
type AnalysisRow = {
  id: string;
  user_id: string;
  keyword: string;
  country: string;
  locale: string;
  status: string;
  progress: number;
  locked_at: string | null;
  crawl_cursor: number;
  serp_urls: SerpOrganic[];
  ai_overview_urls: string[];
  paa: string[];
  report: ReportPartial | null;
};

type Competitor = { url: string; rank: number; wordCount: number; h2Count: number; aiCited: boolean };
type ReportPartial = {
  terms: RankedTerm[];
  competitors: Competitor[];
  successes: number;
  total: number;
  clusters?: DistillCluster[]; // distill v2 subtopic centroids (for rescore semantic coverage)
};

/**
 * Run exactly one transition of the analysis job and persist it. The caller
 * (the step route) re-invokes until the status is terminal. Hard failures flip
 * status to 'failed', which drops the row out of the quota count — that's the
 * refund. Partial crawl failures are NOT hard failures.
 */
export async function runStep(analysisId: string, deps: AnalysisDeps = {}): Promise<StepResult> {
  const fallback = defaultDeps();
  const serp = deps.serp ?? fallback.serp;
  const crawl = deps.crawl ?? fallback.crawl;
  const db = supabaseAdmin();

  const { data } = await db.from("kalamai_analyses").select("*").eq("id", analysisId).maybeSingle();
  const a = data as AnalysisRow | null;
  if (!a) throw new Error(`analysis ${analysisId} not found`);

  if (a.status === "complete" || a.status === "failed") {
    return { status: a.status, progress: a.progress }; // terminal → no-op
  }

  // Single-flight claim. Flip locked_at only if the row is still at this status
  // and not already locked (or the lock is stale past the function ceiling).
  // Concurrent /step calls race on this UPDATE; exactly one row comes back, so
  // one worker does the (paid, for R4) work and the rest no-op — a single quota
  // unit can no longer be fanned out into unbounded LLM spend.
  const staleBefore = new Date(Date.now() - STEP_LOCK_MS).toISOString();
  const { data: claimed } = await db
    .from("kalamai_analyses")
    .update({ locked_at: new Date().toISOString() })
    .eq("id", a.id)
    .eq("status", a.status)
    .or(`locked_at.is.null,locked_at.lt.${staleBefore}`)
    .select("id");
  if (!claimed?.length) {
    return { status: a.status, progress: a.progress }; // lost the race — someone else holds it
  }

  try {
    switch (a.status) {
      case "queued":
        return await stepR1(db, a, serp);
      case "crawling":
        return await stepR2(db, a, crawl);
      case "extracting":
        return await stepR3(db, a);
      case "analyzing":
        return await stepR4(db, a);
      default:
        return { status: a.status, progress: a.progress };
    }
  } catch (e) {
    const message = (e instanceof Error ? e.message : String(e)).slice(0, 500);
    await db.from("kalamai_analyses").update({ status: "failed", error: message, locked_at: null }).eq("id", a.id);
    await logEvent("analysis_failed", { userId: a.user_id, analysisId: a.id, meta: { at: a.status } });
    return { status: "failed", progress: a.progress };
  } finally {
    // Release the claim so the next transition can proceed at once. The step
    // already advanced status; this just nulls the lock (idempotent, cheap).
    await db.from("kalamai_analyses").update({ locked_at: null }).eq("id", a.id);
  }
}

// R1 — SERP fetch, weekly-cached + budget-gated. A provider throw or an exhausted
// budget is a hard failure here; empty results are allowed (niche keyword) and
// surface later as low confidence. Fake mode skips cache + budget entirely.
async function stepR1(db: SupabaseClient, a: AnalysisRow, serp: SerpProvider): Promise<StepResult> {
  const result = await fetchSerpCached(db, a, serp);
  await db
    .from("kalamai_analyses")
    .update({
      status: "crawling",
      serp_urls: result.organic,
      ai_overview_urls: result.aiOverviewUrls,
      paa: result.paa,
      crawl_cursor: 0,
      progress: 10,
    })
    .eq("id", a.id);
  return { status: "crawling", progress: 10 };
}

// Cache-first SERP fetch. HIT → reuse, zero cost. MISS → reserve one call against
// the monthly cap (fail closed), fetch live, then cache. Fake mode bypasses both.
async function fetchSerpCached(db: SupabaseClient, a: AnalysisRow, serp: SerpProvider): Promise<SerpResult> {
  if (process.env.KALAMAI_FAKE_SERP === "1") {
    return serp.fetch({ keyword: a.keyword, country: a.country, locale: a.locale });
  }
  const week = weekBucket();
  const key = serpCacheKey(a.keyword, a.locale, a.country, week);
  const cached = await serpCacheLookup(db, key);
  if (cached) return cached;

  const allowed = await reserveSerpCall(db, monthBucket());
  if (!allowed) throw new Error("serp_budget_exhausted"); // fail closed — no live fetch

  const result = await serp.fetch({ keyword: a.keyword, country: a.country, locale: a.locale });
  await serpCacheStore(db, { key, keyword: a.keyword, language: a.locale, country: a.country, week, serp: result });
  return result;
}

// R2 — crawl one batch of up to 6 URLs. Idempotent: the unique(analysis_id,url)
// upsert means re-running the same window can't double-count.
async function stepR2(db: SupabaseClient, a: AnalysisRow, crawl: Crawler): Promise<StepResult> {
  const organic = a.serp_urls ?? [];
  const total = organic.length;
  const aiSet = new Set(a.ai_overview_urls ?? []);
  const batch = organic.slice(a.crawl_cursor, a.crawl_cursor + BATCH);
  const robots = new RobotsCache();

  const rows = await mapWithConcurrency(batch, CRAWL_CONCURRENCY, async (o) => {
    let html: string | null = null;
    try {
      html = await crawl(o.url, robots);
    } catch {
      html = null;
    }
    if (!html) {
      return { analysis_id: a.id, url: o.url, rank: o.rank, ok: false, ai_overview_cited: aiSet.has(o.url) };
    }
    const ex = extractPage(html);
    return {
      analysis_id: a.id,
      url: o.url,
      rank: o.rank,
      ok: true,
      title: ex.title,
      meta_description: ex.metaDescription,
      headings: ex.headings,
      word_count: ex.wordCount,
      jsonld_types: ex.jsonldTypes,
      body_text: ex.bodyText,
      ai_overview_cited: aiSet.has(o.url),
    };
  });

  if (rows.length) await db.from("kalamai_pages").upsert(rows, { onConflict: "analysis_id,url" });

  const cursor = a.crawl_cursor + batch.length;
  const done = cursor >= total;
  const progress = 10 + Math.round((total ? cursor / total : 1) * 50);
  const status = done ? "extracting" : "crawling";
  await db.from("kalamai_analyses").update({ crawl_cursor: cursor, status, progress }).eq("id", a.id);
  return { status, progress };
}

// R3 — pure-code TF-IDF over successful crawls + competitor snapshot. No LLM.
async function stepR3(db: SupabaseClient, a: AnalysisRow): Promise<StepResult> {
  const { data: pageData } = await db.from("kalamai_pages").select("*").eq("analysis_id", a.id);
  const pages = (pageData ?? []) as {
    url: string;
    rank: number;
    ok: boolean;
    title: string | null;
    meta_description: string | null;
    headings: Heading[] | null;
    word_count: number | null;
    body_text: string | null;
    ai_overview_cited: boolean;
  }[];
  const ok = pages.filter((p) => p.ok);

  // distill v2 corpus = ok competitors with enough body to count (≥250 words).
  const competitors250 = ok.filter((p) => (p.word_count ?? 0) >= 250);

  // Embed competitor chunks (semantic clustering + rescore) and get the vectors
  // back for distill. Runs once at extracting; idempotent (clears prior chunks).
  const chunkVectors = await embedCompetitorChunks(db, a.id, competitors250);

  // distill v2: log-odds + hard 60% gate + IQR target ranges + clusters. Written
  // ALONGSIDE v1 rankTerms (D2) — persisted to kalamai_term_signals + report.clusters,
  // shadow until the rank harness validates. Background prior is uniform until the
  // corpus script populates kalamai_corpus_terms.
  const targetLength = median(competitors250.map((p) => p.word_count ?? 0)) || 1000;
  const background = await loadBackground(db, a.locale);
  const distilled = distill({
    pages: competitors250.map((p) => ({ rank: p.rank, bodyText: p.body_text ?? "", wordCount: p.word_count ?? 0 })),
    targetLength,
    background,
    chunkVectors,
  });
  await db.from("kalamai_term_signals").delete().eq("analysis_id", a.id);
  if (distilled.terms.length) {
    await db.from("kalamai_term_signals").insert(
      distilled.terms.map((t) => ({
        analysis_id: a.id,
        term: t.term,
        ngram: t.ngram,
        z: t.z,
        delta: t.delta,
        doc_freq: t.docFreq,
        coverage: t.coverage,
        freq_lo: t.freqLo,
        freq_hi: t.freqHi,
      })),
    );
  }

  const termPages: TermPage[] = ok.map((p) => ({
    rank: p.rank,
    aiCited: p.ai_overview_cited,
    headings: p.headings ?? [],
    metaTitle: p.title,
    metaDescription: p.meta_description,
    bodyText: p.body_text ?? "",
  }));

  const competitors: Competitor[] = ok
    .map((p) => ({
      url: p.url,
      rank: p.rank,
      wordCount: p.word_count ?? 0,
      h2Count: (p.headings ?? []).filter((h) => h.level === 2).length,
      aiCited: p.ai_overview_cited,
    }))
    .sort((x, y) => x.rank - y.rank);

  const report: ReportPartial = {
    terms: rankTerms(termPages),
    competitors,
    successes: ok.length,
    total: pages.length,
    clusters: distilled.clusters,
  };
  const successRate = pages.length ? Math.round((ok.length / pages.length) * 1000) / 1000 : 0;

  await db
    .from("kalamai_analyses")
    .update({
      report,
      crawl_success_rate: successRate,
      low_confidence: ok.length < MIN_CONFIDENT,
      status: "analyzing",
      progress: 75,
    })
    .eq("id", a.id);
  return { status: "analyzing", progress: 75 };
}

// Chunk + embed each competitor page, store vectors in kalamai_chunks, and RETURN
// the vectors (with competitor index) for distill's clustering — avoids re-reading
// + parsing pgvector. Idempotent: clears this analysis's competitor chunks first,
// so a reclaimed step can't double-insert. Fake-embed mode (no GEMINI_API_KEY) uses
// hashed vectors, so this runs offline with zero spend.
async function embedCompetitorChunks(
  db: SupabaseClient,
  analysisId: string,
  pages: { body_text: string | null }[],
): Promise<ChunkVec[]> {
  await db.from("kalamai_chunks").delete().eq("analysis_id", analysisId).eq("source_type", "competitor");

  const rows: Record<string, unknown>[] = [];
  const chunkVectors: ChunkVec[] = [];
  for (let pi = 0; pi < pages.length; pi++) {
    const chunks = chunkText(pages[pi].body_text ?? "");
    if (!chunks.length) continue;
    const vectors = await embedTexts(
      chunks.map((c) => c.text),
      "RETRIEVAL_DOCUMENT",
    );
    chunks.forEach((c, i) => {
      rows.push({
        source_type: "competitor",
        analysis_id: analysisId,
        chunk_index: c.index,
        text: c.text,
        token_count: c.tokenCount,
        embedding: toPgVector(vectors[i]),
        embedding_model: EMBED_MODEL,
      });
      chunkVectors.push({ vector: vectors[i], competitorIndex: pi, text: c.text });
    });
  }
  if (rows.length) await db.from("kalamai_chunks").insert(rows);
  return chunkVectors;
}

// Background term frequencies for distill's Dirichlet prior. Empty until the
// corpus script populates kalamai_corpus_terms → distill uses a uniform prior.
// ponytail: loads the whole language vocab; add a `term in (gated)` filter if the
// corpus grows large enough that this read matters.
async function loadBackground(
  db: SupabaseClient,
  language: string,
): Promise<{ counts: Map<string, number>; total: number }> {
  const [{ data: terms }, { data: totals }] = await Promise.all([
    db.from("kalamai_corpus_terms").select("term, count").eq("language", language),
    db.from("kalamai_corpus_totals").select("total_tokens").eq("language", language).maybeSingle(),
  ]);
  const counts = new Map<string, number>();
  for (const row of (terms ?? []) as { term: string; count: number }[]) counts.set(row.term, Number(row.count));
  const total = Number((totals as { total_tokens: number } | null)?.total_tokens ?? 0);
  return { counts, total };
}

function median(nums: number[]): number {
  if (!nums.length) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

// R4 — one Sonnet call turns the code-derived signal into the brief. Malformed
// JSON (after the SDK's own constraint) throwing here is a hard failure → refund.
async function stepR4(db: SupabaseClient, a: AnalysisRow): Promise<StepResult> {
  const report = a.report as ReportPartial;
  const { data: pageData } = await db
    .from("kalamai_pages")
    .select("rank, headings")
    .eq("analysis_id", a.id)
    .eq("ok", true)
    .order("rank")
    .limit(10);
  const headingTrees = ((pageData ?? []) as { rank: number; headings: Heading[] | null }[]).map((p) => ({
    rank: p.rank,
    headings: p.headings ?? [],
  }));
  const aiUrls = a.ai_overview_urls ?? [];

  const { system, user } = buildBriefPrompt({
    keyword: a.keyword,
    country: a.country,
    locale: a.locale,
    terms: report.terms,
    headingTrees,
    paa: a.paa ?? [],
    aiOverview: { present: aiUrls.length > 0, count: aiUrls.length },
  });

  const { data: brief, usage } = await runJson<Brief>({ system, user, schema: BRIEF_SCHEMA, effort: "low", fake: FAKE_BRIEF });

  await db
    .from("kalamai_analyses")
    .update({ report: { ...report, brief }, status: "complete", progress: 100 })
    .eq("id", a.id);
  await db.from("kalamai_llm_calls").insert({
    analysis_id: a.id,
    user_id: a.user_id,
    stage: "R4",
    input_tokens: usage.inputTokens,
    output_tokens: usage.outputTokens,
    cache_read_tokens: usage.cacheReadTokens,
    cache_write_tokens: usage.cacheWriteTokens,
    cost_usd: usage.costUsd,
    ms: usage.ms,
  });
  await logEvent("analysis_completed", { userId: a.user_id, analysisId: a.id });
  return { status: "complete", progress: 100 };
}
