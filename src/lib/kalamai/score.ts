import type { ContentBlock } from "@/lib/data/types";
import { countWords } from "@/lib/blog/words";
import type { Brief } from "./brief";

/**
 * W5 — score the finished article against the brief. Own Check[]/WEIGHT shape,
 * copied from src/lib/seo/scoring.ts rather than generalized: that framework is
 * typed to PageEntry/PageAnalysis, and forcing a shared abstraction over two
 * unrelated callers is exactly the kind of coupling to skip.
 */

export type ArticleScoreInput = {
  blocks: ContentBlock[];
  meta: { title?: string; description?: string; jsonld?: string };
  brief: Pick<Brief, "termClusters" | "outline" | "questions">;
  targetWords: number;
};

export type ArticleScore = {
  overall: number;
  passed: string[];
  failed: string[];
  details: { termCoverage: number; outlineCoverage: number; wordCount: number };
};

const WEIGHT = { high: 3, medium: 2, low: 1 } as const;
type Facts = {
  text: string; // lowercased full article text
  headings: string; // lowercased heading text, joined
  wordCount: number;
  hasFaq: boolean;
  termCoverage: number;
  outlineCoverage: number;
  meta: ArticleScoreInput["meta"];
  targetWords: number;
};

type Check = { label: string; priority: keyof typeof WEIGHT; test: (f: Facts) => boolean };

const CHECKS: Check[] = [
  { label: "Covers recommended terms", priority: "high", test: (f) => f.termCoverage >= 0.6 },
  { label: "Follows the recommended outline", priority: "high", test: (f) => f.outlineCoverage >= 0.7 },
  { label: "Meets the target word count", priority: "medium", test: (f) => f.wordCount >= f.targetWords * 0.8 },
  { label: "Has FAQ section", priority: "medium", test: (f) => f.hasFaq },
  { label: "Has JSON-LD schema", priority: "medium", test: (f) => !!f.meta.jsonld && f.meta.jsonld.length > 0 },
  { label: "Meta title 15-60 chars", priority: "low", test: (f) => (f.meta.title?.length ?? 0) >= 15 && (f.meta.title?.length ?? 0) <= 60 },
  { label: "Meta description 120-160 chars", priority: "low", test: (f) => (f.meta.description?.length ?? 0) >= 120 && (f.meta.description?.length ?? 0) <= 160 },
];

function textOf(rt: unknown): string {
  if (typeof rt === "string") return rt;
  if (Array.isArray(rt)) return rt.map((n) => (typeof n === "string" ? n : (n as { text?: string }).text ?? "")).join(" ");
  return "";
}

// Flatten all human-readable text from the blocks for term matching.
function articleText(blocks: ContentBlock[]): string {
  const parts: string[] = [];
  for (const b of blocks) {
    if ("text" in b) parts.push(textOf(b.text));
    if ("items" in b && Array.isArray(b.items)) {
      for (const it of b.items) {
        if (typeof it === "string") parts.push(it);
        else if (it && typeof it === "object") parts.push(textOf((it as { text?: unknown; a?: unknown }).text ?? (it as { a?: unknown }).a));
      }
    }
  }
  return parts.join(" ").toLowerCase();
}

function headingText(blocks: ContentBlock[]): string {
  return blocks
    .filter((b): b is Extract<ContentBlock, { type: "h2" | "h3" | "h4" }> => b.type === "h2" || b.type === "h3" || b.type === "h4")
    .map((b) => b.text)
    .join(" | ")
    .toLowerCase();
}

function coverage(needles: string[], haystack: string): number {
  if (needles.length === 0) return 1;
  const hit = needles.filter((n) => haystack.includes(n.toLowerCase())).length;
  return Math.round((hit / needles.length) * 100) / 100;
}

export function scoreArticle(input: ArticleScoreInput): ArticleScore {
  const text = articleText(input.blocks);
  const headings = headingText(input.blocks);
  const terms = input.brief.termClusters.flatMap((c) => c.terms);
  const outlineH2s = input.brief.outline.map((o) => o.h2);

  const facts: Facts = {
    text,
    headings,
    wordCount: countWords(input.blocks),
    hasFaq: input.blocks.some((b) => b.type === "faq"),
    termCoverage: coverage(terms, text),
    outlineCoverage: coverage(outlineH2s, headings),
    meta: input.meta,
    targetWords: input.targetWords,
  };

  const results = CHECKS.map((c) => ({ label: c.label, priority: c.priority, passed: c.test(facts) }));
  const earned = results.filter((r) => r.passed).reduce((s, r) => s + WEIGHT[r.priority], 0);
  const total = results.reduce((s, r) => s + WEIGHT[r.priority], 0);

  return {
    overall: total === 0 ? 100 : Math.round((earned / total) * 100),
    passed: results.filter((r) => r.passed).map((r) => r.label),
    failed: results.filter((r) => !r.passed).map((r) => r.label),
    details: { termCoverage: facts.termCoverage, outlineCoverage: facts.outlineCoverage, wordCount: facts.wordCount },
  };
}
