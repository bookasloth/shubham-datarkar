import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { ContentBlock } from "@/lib/data/types";
import { supabaseAdmin } from "@/lib/supabase/server";
import { runJson, runText, type LlmUsage } from "./llm";
import { parseWithRepair, KalamaiHardFailure } from "./content-blocks";
import { scoreArticle } from "./score";
import { logEvent } from "./events-server";
import type { Brief } from "./brief";
import {
  OUTLINE_SCHEMA, CRITIQUE_SCHEMA,
  FAKE_OUTLINE, FAKE_CRITIQUE, FAKE_SECTION_DRAFT,
  buildOutlinePrompt, buildCritiquePrompt, buildSectionRewritePrompt, buildArticleMeta, extractSourceFacts, enforceWordCap,
  buildSectionDraftPrompt,
  type ArticleParams, type SectionPlan, type Critique, type ArticleMeta, type SourceFact,
} from "./writing";

const STEP_LOCK_MS = 2 * 60_000; // reclaim a claim left by a crashed/timed-out step (maxDuration is 60s)

export type StepResult = { status: string; progress: number };

type ArticleRow = {
  id: string;
  user_id: string;
  analysis_id: string;
  params: ArticleParams;
  status: string;
  progress: number;
  locked_at: string | null;
  stage_state: StageState;
};

type StageState = {
  plan?: SectionPlan;
  meta?: ArticleMeta;
  blocks?: ContentBlock[];
  critique?: Critique;
  sectionBlocks?: ContentBlock[][];
  draftCursor?: number;
  rewriteCursor?: number;
};

/**
 * Advance one transition of an article-writing job. Mirrors analysis-server's
 * runStep: single-flight claim, one stage per call, hard failures flip status to
 * 'failed' (which drops the row from the quota count — that's the refund). The
 * caller (the article-step route) re-invokes until the status is terminal.
 */
export async function runArticleStep(articleId: string): Promise<StepResult> {
  const db = supabaseAdmin();
  const { data } = await db.from("kalamai_articles").select("*").eq("id", articleId).maybeSingle();
  const a = data as ArticleRow | null;
  if (!a) throw new Error(`article ${articleId} not found`);
  if (a.status === "complete" || a.status === "failed") return { status: a.status, progress: a.progress };

  // Single-flight claim: only one worker advances the row; concurrent /step
  // calls no-op so one article quota unit can't fan out into repeated LLM spend.
  const staleBefore = new Date(Date.now() - STEP_LOCK_MS).toISOString();
  const { data: claimed } = await db
    .from("kalamai_articles")
    .update({ locked_at: new Date().toISOString() })
    .eq("id", a.id)
    .eq("status", a.status)
    .or(`locked_at.is.null,locked_at.lt.${staleBefore}`)
    .select("id");
  if (!claimed?.length) return { status: a.status, progress: a.progress };

  try {
    switch (a.status) {
      case "queued": return await stepOutline(db, a);
      case "outlining": return await stepDraft(db, a);
      case "drafting": return await stepCritique(db, a);
      case "reviewing": return await stepRewrite(db, a);
      case "scoring": return await stepScore(db, a);
      default: return { status: a.status, progress: a.progress };
    }
  } catch (e) {
    const message = (e instanceof Error ? e.message : String(e)).slice(0, 500);
    await db.from("kalamai_articles").update({ status: "failed", error: message, locked_at: null }).eq("id", a.id);
    await logEvent("article_failed", { userId: a.user_id, articleId: a.id, meta: { at: a.status } });
    return { status: "failed", progress: a.progress };
  } finally {
    await db.from("kalamai_articles").update({ locked_at: null }).eq("id", a.id);
  }
}

async function logCall(db: SupabaseClient, a: ArticleRow, stage: string, usage: LlmUsage): Promise<void> {
  await db.from("kalamai_llm_calls").insert({
    article_id: a.id,
    user_id: a.user_id,
    stage,
    input_tokens: usage.inputTokens,
    output_tokens: usage.outputTokens,
    cache_read_tokens: usage.cacheReadTokens,
    cache_write_tokens: usage.cacheWriteTokens,
    cost_usd: usage.costUsd,
    ms: usage.ms,
  });
}

async function loadBrief(db: SupabaseClient, a: ArticleRow): Promise<Brief> {
  const { data } = await db.from("kalamai_analyses").select("report").eq("id", a.analysis_id).maybeSingle();
  const brief = (data?.report as { brief?: Brief } | null)?.brief;
  if (!brief) throw new KalamaiHardFailure("source analysis has no brief");
  return brief;
}

function mergeState(a: ArticleRow, patch: Partial<StageState>): StageState {
  return { ...a.stage_state, ...patch };
}

// W1 — section plan (cheap JSON). Also fixes the meta the rest of the flow uses.
async function stepOutline(db: SupabaseClient, a: ArticleRow): Promise<StepResult> {
  const brief = await loadBrief(db, a);
  const { system, user } = buildOutlinePrompt(brief, a.params);
  const { data: plan, usage } = await runJson<SectionPlan>({ system, user, schema: OUTLINE_SCHEMA, effort: "low", fake: FAKE_OUTLINE });
  await logCall(db, a, "W1", usage);
  const meta = buildArticleMeta(brief, plan);
  await db.from("kalamai_articles").update({ stage_state: mergeState(a, { plan, meta }), status: "outlining", progress: 15 }).eq("id", a.id);
  return { status: "outlining", progress: 15 };
}

// Real fact-sentences from the crawled competitors, so W2/W3 can ground claims
// instead of inventing them. Top-10 ok pages by rank; empty if none stored.
async function loadSourceFacts(db: SupabaseClient, analysisId: string): Promise<SourceFact[]> {
  const { data } = await db
    .from("kalamai_pages")
    .select("rank, url, body_text")
    .eq("analysis_id", analysisId)
    .eq("ok", true)
    .order("rank")
    .limit(10);
  const pages = ((data ?? []) as { rank: number; url: string; body_text: string | null }[]).map((p) => ({ rank: p.rank, url: p.url, bodyText: p.body_text ?? "" }));
  return extractSourceFacts(pages);
}

// W2 — draft ONE section per call, accumulating in stage_state.sectionBlocks. Stays
// at 'outlining' until every section is drafted, so no single LLM call can exceed the
// 60s route ceiling. Then assembles blocks and advances to 'drafting'.
async function stepDraft(db: SupabaseClient, a: ArticleRow): Promise<StepResult> {
  const brief = await loadBrief(db, a);
  const plan = a.stage_state.plan!;
  const sections = plan.sections ?? [];
  const facts = await loadSourceFacts(db, a.analysis_id);
  const sectionBlocks = a.stage_state.sectionBlocks ? [...a.stage_state.sectionBlocks] : [];
  const cursor = a.stage_state.draftCursor ?? 0;

  if (sections.length === 0) {
    await db.from("kalamai_articles").update({ stage_state: mergeState(a, { blocks: [], sectionBlocks: [], draftCursor: 0 }), status: "drafting", progress: 40 }).eq("id", a.id);
    return { status: "drafting", progress: 40 };
  }

  const priorHeadings = sections.slice(0, cursor).map((s) => s.heading);
  const { system, user, cachePrefix } = buildSectionDraftPrompt(brief, a.params, plan, cursor, priorHeadings, facts);
  const SECTION_TOKENS = 8000; // one section is small; ample headroom, finishes well under 60s
  const { text, usage } = await runText({ system, user, cachePrefix, fake: FAKE_SECTION_DRAFT, maxTokens: SECTION_TOKENS });
  await logCall(db, a, "W2", usage);
  const blocks = await parseWithRepair(text, async () => {
    const r = await runText({ system, user: user + "\n\nReturn ONLY a valid JSON array of ContentBlocks.", cachePrefix, fake: FAKE_SECTION_DRAFT, maxTokens: SECTION_TOKENS });
    return r.text;
  });
  sectionBlocks[cursor] = blocks;
  const nextCursor = cursor + 1;
  const progress = 15 + Math.round((25 * nextCursor) / sections.length);

  if (nextCursor < sections.length) {
    await db.from("kalamai_articles").update({ stage_state: mergeState(a, { sectionBlocks, draftCursor: nextCursor }), progress }).eq("id", a.id);
    return { status: "outlining", progress };
  }
  const assembled = sectionBlocks.flat();
  await db.from("kalamai_articles").update({ stage_state: mergeState(a, { sectionBlocks, draftCursor: nextCursor, blocks: assembled }), status: "drafting", progress: 40 }).eq("id", a.id);
  return { status: "drafting", progress: 40 };
}

// W3 — critique the draft against the brief (flat JSON).
async function stepCritique(db: SupabaseClient, a: ArticleRow): Promise<StepResult> {
  const brief = await loadBrief(db, a);
  const facts = await loadSourceFacts(db, a.analysis_id);
  const { system, user, cachePrefix } = buildCritiquePrompt(brief, a.params, a.stage_state.blocks!, facts);
  const { data: critique, usage } = await runJson<Critique>({ system, user, schema: CRITIQUE_SCHEMA, effort: "low", cachePrefix, fake: FAKE_CRITIQUE });
  await logCall(db, a, "W3", usage);
  await db.from("kalamai_articles").update({ stage_state: mergeState(a, { critique }), status: "reviewing", progress: 60 }).eq("id", a.id);
  return { status: "reviewing", progress: 60 };
}

// W4 — rewrite ONE section per call when the critique failed, mirroring stepDraft so a
// rewrite can't exceed the 60s ceiling either. If the critique passed, skip straight to
// scoring (no spend). Stays at 'reviewing' until all sections are rewritten.
async function stepRewrite(db: SupabaseClient, a: ArticleRow): Promise<StepResult> {
  const critique = a.stage_state.critique!;
  if (critique.ok) {
    await db.from("kalamai_articles").update({ status: "scoring", progress: 85 }).eq("id", a.id);
    return { status: "scoring", progress: 85 };
  }

  const brief = await loadBrief(db, a);
  const plan = a.stage_state.plan!;
  const sections = plan.sections ?? [];
  const sectionBlocks = a.stage_state.sectionBlocks ? [...a.stage_state.sectionBlocks] : [];
  const cursor = a.stage_state.rewriteCursor ?? 0;

  if (sections.length === 0 || cursor >= sections.length) {
    const assembled = sectionBlocks.flat();
    await db.from("kalamai_articles").update({ stage_state: mergeState(a, { blocks: assembled }), status: "scoring", progress: 85 }).eq("id", a.id);
    return { status: "scoring", progress: 85 };
  }

  const priorHeadings = sections.slice(0, cursor).map((s) => s.heading);
  const { system, user, cachePrefix } = buildSectionRewritePrompt(brief, a.params, sectionBlocks[cursor] ?? [], critique, sections[cursor].heading, priorHeadings);
  const SECTION_TOKENS = 8000;
  const { text, usage } = await runText({ system, user, cachePrefix, fake: FAKE_SECTION_DRAFT, maxTokens: SECTION_TOKENS });
  await logCall(db, a, "W4", usage);
  sectionBlocks[cursor] = await parseWithRepair(text, async () => {
    const r = await runText({ system, user: user + "\n\nReturn ONLY a valid JSON array of ContentBlocks.", cachePrefix, fake: FAKE_SECTION_DRAFT, maxTokens: SECTION_TOKENS });
    return r.text;
  });
  const nextCursor = cursor + 1;
  const progress = 60 + Math.round((25 * nextCursor) / sections.length);

  if (nextCursor < sections.length) {
    await db.from("kalamai_articles").update({ stage_state: mergeState(a, { sectionBlocks, rewriteCursor: nextCursor }), progress }).eq("id", a.id);
    return { status: "reviewing", progress };
  }
  const assembled = sectionBlocks.flat();
  await db.from("kalamai_articles").update({ stage_state: mergeState(a, { sectionBlocks, rewriteCursor: nextCursor, blocks: assembled }), status: "scoring", progress: 85 }).eq("id", a.id);
  return { status: "scoring", progress: 85 };
}

// W5 — pure-code score + finalize. No LLM.
async function stepScore(db: SupabaseClient, a: ArticleRow): Promise<StepResult> {
  const brief = await loadBrief(db, a);
  // Hard ceiling backstop: never ship over 2200 words even if the model ran long.
  const blocks = enforceWordCap(a.stage_state.blocks ?? []);
  const meta = a.stage_state.meta ?? { title: "", description: "", ogTitle: "", ogDescription: "", jsonld: "" };
  const score = scoreArticle({ blocks, meta, brief, targetWords: a.params.targetWords });
  await db.from("kalamai_articles").update({ blocks, meta, score, status: "complete", progress: 100 }).eq("id", a.id);
  await logEvent("article_completed", { userId: a.user_id, articleId: a.id });
  return { status: "complete", progress: 100 };
}
