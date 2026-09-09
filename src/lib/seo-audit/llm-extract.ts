import "server-only";
import { runJson } from "@/lib/kalamai/llm";

// Cheap, high-volume per-page extraction on Haiku (spec §24). Turns one page's
// structured signal + trimmed body into a compact machine-readable record the
// synthesis step reasons over. We never send raw HTML — only cleaned, bounded
// content — so cost and noise stay low.
const HAIKU = "claude-haiku-4-5-20251001";
const MAX_BODY_CHARS = 6000;

export type PageExtractInput = {
  url: string;
  pageClass: string;
  title: string | null;
  h1: string | null;
  headings: string[];
  schemaTypes: string[];
  body: string;
};

export type PageExtract = {
  url: string;
  pageType: string;
  summary: string;
  entities: string[];
  questionsAnswered: string[];
  questionsMissing: string[];
  trustSignals: string[];
  citability: number; // 0-100: how self-contained / extractable a useful answer is
  citabilityIssues: string[];
};

const SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["pageType", "summary", "entities", "questionsAnswered", "questionsMissing", "trustSignals", "citability", "citabilityIssues"],
  properties: {
    pageType: { type: "string", description: "what this page is for a buyer, e.g. 'implant service page'" },
    summary: { type: "string", description: "one sentence: what the page is about and who it's for" },
    entities: { type: "array", items: { type: "string" }, description: "named org/person/service/product/place entities the page makes clear" },
    questionsAnswered: { type: "array", items: { type: "string" }, description: "buyer questions the page clearly answers" },
    questionsMissing: { type: "array", items: { type: "string" }, description: "obvious buyer questions the page does NOT answer" },
    trustSignals: { type: "array", items: { type: "string" }, description: "credibility signals present (credentials, evidence, dates, testimonials)" },
    citability: { type: "number", description: "0-100: can an AI extract a useful, self-contained answer?" },
    citabilityIssues: { type: "array", items: { type: "string" }, description: "why content is hard to extract (vague, promotional, context-dependent)" },
  },
};

const SYSTEM = `You analyze a single web page for AI-search (AEO) readiness. You are given the page's structured signal and a trimmed body. Judge only from the given content — never invent facts. Discover the obvious questions a potential customer would ask about this page's topic FROM THE PAGE'S OWN SUBJECT, then decide which the page answers and which it misses. Rate how easily an AI system could extract a useful, self-contained answer (citability): reward clear definitions, direct answers, facts, numbers, named entities, descriptive headings; penalize vague, promotional, repetitive, context-dependent content. Do not reward length. Return strict JSON matching the schema.`;

export const FAKE_EXTRACT: PageExtract = {
  url: "",
  pageType: "service page",
  summary: "A service page describing the offering.",
  entities: ["Example Co", "SEO service"],
  questionsAnswered: ["What is the service?"],
  questionsMissing: ["How much does it cost?", "How long does it take?", "Who is it for?"],
  trustSignals: ["about link"],
  citability: 55,
  citabilityIssues: ["Answers are buried in promotional copy"],
};

/** Extract one page. Returns FAKE_EXTRACT (with url set) when no API key (tests/dev). */
export async function extractPageForAi(input: PageExtractInput): Promise<PageExtract> {
  const user = [
    `URL: ${input.url}`,
    `Page class: ${input.pageClass}`,
    `Title: ${input.title ?? "(none)"}`,
    `H1: ${input.h1 ?? "(none)"}`,
    `Headings: ${input.headings.slice(0, 25).join(" | ") || "(none)"}`,
    `Schema types: ${input.schemaTypes.join(", ") || "(none)"}`,
    `Body:\n${input.body.slice(0, MAX_BODY_CHARS)}`,
  ].join("\n");

  const { data } = await runJson<PageExtract>({ system: SYSTEM, user, schema: SCHEMA, model: HAIKU, effort: "low", fake: { ...FAKE_EXTRACT, url: input.url } });
  return { ...data, url: input.url };
}
