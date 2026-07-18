import type { ContentBlock } from "@/lib/data/types";
import type { Brief } from "./brief";
import { blocksToMarkdown } from "./serialize";

/**
 * Prompt builders + offline fixtures for the writing engine (W1-W4). Pure string
 * assembly and constants, mirroring brief.ts; the behaviour is covered through
 * writing-server.test.ts driving the whole machine on fakes. The shared brief+
 * params block is the cache prefix — keep it byte-identical across W2-W4.
 */

export type ArticleParams = {
  targetWords: number;
  tone: string; // e.g. "professional", "conversational"
  audience: string; // e.g. "small business owners in Nagpur"
  brandFacts?: string; // optional facts about the client to weave in
};

export type SectionPlan = {
  title: string; // chosen meta/H1 title
  description: string; // meta description
  sections: { heading: string; points: string[]; words: number }[];
};

export type Critique = {
  missingTerms: string[];
  missingSections: string[];
  issues: string[];
  ok: boolean;
};

export type ArticleMeta = { title: string; description: string; jsonld: string };

/** Stable cached block shared by W2-W4: the brief + the writer's params. */
export function buildCachePrefix(brief: Brief, params: ArticleParams): string {
  return JSON.stringify({ brief, params });
}

/** Meta is a straight pull from the brief + the plan the model already chose. */
export function buildArticleMeta(brief: Brief, plan: SectionPlan): ArticleMeta {
  return {
    title: plan.title || brief.metaTitles[0] || "",
    description: plan.description || brief.metaDescriptions[0] || "",
    jsonld: brief.schemaJsonLd || "",
  };
}

const BLOCK_SPEC =
  "Allowed block types (emit a JSON array of these objects, nothing else):\n" +
  '{"type":"h2","text":string} {"type":"h3","text":string} {"type":"p","text":string} ' +
  '{"type":"lead","text":string} {"type":"ul","items":string[]} {"type":"ol","items":string[]} ' +
  '{"type":"quote","text":string,"cite"?:string} {"type":"callout","variant"?:"info"|"tip"|"warning","title"?:string,"text":string} ' +
  '{"type":"table","columns":string[],"rows":string[][]} {"type":"steps","items":[{"title":string,"detail":string}]} ' +
  '{"type":"takeaways","title"?:string,"items":string[]} {"type":"faq","items":[{"q":string,"a":string}]}';

/* — W1: section plan (runJson) — */

export const OUTLINE_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["title", "description", "sections"],
  properties: {
    title: { type: "string" },
    description: { type: "string" },
    sections: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["heading", "points", "words"],
        properties: {
          heading: { type: "string" },
          points: { type: "array", items: { type: "string" } },
          words: { type: "integer" },
        },
      },
    },
  },
};

export function buildOutlinePrompt(brief: Brief, params: ArticleParams): { system: string; user: string } {
  const system =
    "You are an expert SEO/AEO content strategist. Produce a section-by-section writing plan as JSON matching the schema. " +
    `Allocate 'words' across sections to total about ${params.targetWords}. Ground every section in the brief's outline, ` +
    "entities, and recommended terms. title must be <= 60 chars; description 120-160 chars. Do not invent facts.";
  const user = [
    `Tone: ${params.tone}. Audience: ${params.audience}.`,
    params.brandFacts ? `Brand facts: ${params.brandFacts}` : "",
    "Brief outline:",
    brief.outline.map((o) => `- ${o.h2}${o.h3.length ? ` (${o.h3.join(", ")})` : ""}`).join("\n"),
    "Recommended terms:",
    brief.termClusters.flatMap((c) => c.terms).slice(0, 30).join(", "),
    "Questions to answer:",
    brief.questions.map((q) => `- ${q}`).join("\n"),
  ].filter(Boolean).join("\n");
  return { system, user };
}

/* — W2: draft body (runText) — */

export function buildDraftPrompt(
  brief: Brief,
  params: ArticleParams,
  plan: SectionPlan,
): { system: string; user: string; cachePrefix: string } {
  const system =
    `You are an expert ${params.tone} SEO writer for an audience of ${params.audience}. ` +
    `Write a complete, original ~${params.targetWords}-word article as a JSON array of ContentBlocks. ` +
    "Open with a 'lead' block, use 'h2'/'h3' for the planned sections, weave the recommended terms in naturally, " +
    "and include a 'faq' block near the end answering the brief's questions. Return ONLY the JSON array.\n" +
    BLOCK_SPEC;
  const user = [
    "Writing plan:",
    ...plan.sections.map((s) => `## ${s.heading} (~${s.words}w)\n${s.points.map((p) => `- ${p}`).join("\n")}`),
    "",
    "Recommended terms to include:",
    brief.termClusters.flatMap((c) => c.terms).slice(0, 30).join(", "),
  ].join("\n");
  return { system, user, cachePrefix: buildCachePrefix(brief, params) };
}

/* — W3: critique (runJson) — */

export const CRITIQUE_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["missingTerms", "missingSections", "issues", "ok"],
  properties: {
    missingTerms: { type: "array", items: { type: "string" } },
    missingSections: { type: "array", items: { type: "string" } },
    issues: { type: "array", items: { type: "string" } },
    ok: { type: "boolean" },
  },
};

export function buildCritiquePrompt(
  brief: Brief,
  params: ArticleParams,
  blocks: ContentBlock[],
): { system: string; user: string; cachePrefix: string } {
  const system =
    "You are a strict SEO editor. Compare the draft against the brief and return JSON per the schema: recommended terms " +
    "not used, brief outline sections not covered, and concrete writing issues (thin sections, missing direct answers, " +
    "keyword stuffing). Set ok=true only if the draft is already publish-ready.";
  const user = ["Draft (markdown):", blocksToMarkdown(blocks)].join("\n");
  return { system, user, cachePrefix: buildCachePrefix(brief, params) };
}

/* — W4: rewrite to final (runText) — */

export function buildRewritePrompt(
  brief: Brief,
  params: ArticleParams,
  blocks: ContentBlock[],
  critique: Critique,
): { system: string; user: string; cachePrefix: string } {
  const system =
    "You are an expert SEO writer revising a draft. Apply every critique point, keep everything that already works, and " +
    "return the COMPLETE revised article as a JSON array of ContentBlocks. Return ONLY the JSON array.\n" +
    BLOCK_SPEC;
  const user = [
    "Critique to apply:",
    critique.missingTerms.length ? `- Add terms: ${critique.missingTerms.join(", ")}` : "",
    critique.missingSections.length ? `- Add sections: ${critique.missingSections.join(", ")}` : "",
    ...critique.issues.map((i) => `- Fix: ${i}`),
    "",
    "Current draft (JSON):",
    JSON.stringify(blocks),
  ].filter(Boolean).join("\n");
  return { system, user, cachePrefix: buildCachePrefix(brief, params) };
}

/* — Offline fixtures (fake mode) — */

export const FAKE_OUTLINE: SectionPlan = {
  title: "Digital Marketing Company in Nagpur",
  description: "A results-driven digital marketing company in Nagpur offering SEO, PPC, and content marketing for local businesses that grow.",
  sections: [
    { heading: "What a digital marketing company in Nagpur does", points: ["Core services", "Who it's for"], words: 400 },
    { heading: "How to choose an agency", points: ["Questions to ask", "Pricing"], words: 400 },
    { heading: "Local SEO for Nagpur businesses", points: ["Google Business Profile", "Local citations"], words: 400 },
  ],
};

const FAKE_BLOCKS: ContentBlock[] = [
  { type: "lead", text: "A digital marketing company in Nagpur helps local businesses grow online." },
  { type: "h2", text: "What a digital marketing company in Nagpur does" },
  { type: "p", text: "It offers seo services, ppc, and content marketing tailored to local businesses." },
  { type: "h2", text: "How to choose an agency" },
  { type: "p", text: "Ask about local seo experience, reporting, and pricing before you commit." },
  { type: "h2", text: "Local SEO for Nagpur businesses" },
  { type: "p", text: "Local seo and a strong Google Business Profile drive Nagpur foot traffic." },
  { type: "faq", items: [{ q: "How much does digital marketing cost in Nagpur?", a: "It depends on scope and channels." }] },
];

export const FAKE_DRAFT: string = JSON.stringify(FAKE_BLOCKS);

export const FAKE_CRITIQUE: Critique = { missingTerms: [], missingSections: [], issues: [], ok: true };

export const FAKE_REWRITE: string = JSON.stringify(FAKE_BLOCKS);
