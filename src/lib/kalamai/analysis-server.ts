import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase/server";
import { mapWithConcurrency } from "@/lib/seo/fetch-html";
import { extractPage, type Heading } from "./extract";
import { rankTerms, type TermPage, type RankedTerm } from "./terms";
import { runJson } from "./llm";
import { BRIEF_SCHEMA, FAKE_BRIEF, buildBriefPrompt, type Brief } from "./brief";
import { logEvent } from "./events-server";
import type { SerpProvider, SerpOrganic } from "./serp/provider";
import { DataForSeoProvider } from "./serp/dataforseo";
import { FakeSerpProvider } from "./serp/fake";
import { crawlUrl, RobotsCache, type Crawler } from "./crawl";

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

function defaultDeps(): { serp: SerpProvider; crawl: Crawler } {
  if (process.env.KALAMAI_FAKE_SERP === "1") return { serp: new FakeSerpProvider(), crawl: fakeCrawler() };
  return { serp: new DataForSeoProvider(), crawl: crawlUrl };
}

const BATCH = 6;
const CRAWL_CONCURRENCY = 6;
const MIN_CONFIDENT = 20; // < this many successful crawls → low_confidence banner

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
  crawl_cursor: number;
  serp_urls: SerpOrganic[];
  ai_overview_urls: string[];
  paa: string[];
  report: ReportPartial | null;
};

type Competitor = { url: string; rank: number; wordCount: number; h2Count: number; aiCited: boolean };
type ReportPartial = { terms: RankedTerm[]; competitors: Competitor[]; successes: number; total: number };

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
        return { status: a.status, progress: a.progress }; // complete / failed → no-op
    }
  } catch (e) {
    const message = (e instanceof Error ? e.message : String(e)).slice(0, 500);
    await db.from("kalamai_analyses").update({ status: "failed", error: message }).eq("id", a.id);
    await logEvent("analysis_failed", { userId: a.user_id, analysisId: a.id, meta: { at: a.status } });
    return { status: "failed", progress: a.progress };
  }
}

// R1 — SERP fetch. A provider throw is the only hard failure here; empty results
// are allowed (niche keyword) and surface later as low confidence.
async function stepR1(db: SupabaseClient, a: AnalysisRow, serp: SerpProvider): Promise<StepResult> {
  const result = await serp.fetch({ keyword: a.keyword, country: a.country, locale: a.locale });
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

  const report: ReportPartial = { terms: rankTerms(termPages), competitors, successes: ok.length, total: pages.length };
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
