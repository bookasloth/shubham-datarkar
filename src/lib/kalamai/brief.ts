import type { RankedTerm } from "./terms";
import type { Heading } from "./extract";

/** The R4 content brief — the single LLM output of the research pipeline. */
export type Brief = {
  entities: string[];
  termClusters: { name: string; terms: string[] }[];
  outline: { h2: string; h3: string[] }[];
  questions: string[];
  aeoInsights: string[];
  metaTitles: string[];
  metaDescriptions: string[];
  schemaType: string;
  schemaJsonLd: string;
};

export type BriefInput = {
  keyword: string;
  country: string;
  locale: string;
  terms: RankedTerm[];
  headingTrees: { rank: number; headings: Heading[] }[];
  paa: string[];
  aiOverview: { present: boolean; count: number };
};

/** JSON Schema for structured output. Flat + non-recursive, so it's a clean fit. */
export const BRIEF_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: [
    "entities",
    "termClusters",
    "outline",
    "questions",
    "aeoInsights",
    "metaTitles",
    "metaDescriptions",
    "schemaType",
    "schemaJsonLd",
  ],
  properties: {
    entities: { type: "array", items: { type: "string" } },
    termClusters: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "terms"],
        properties: { name: { type: "string" }, terms: { type: "array", items: { type: "string" } } },
      },
    },
    outline: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["h2", "h3"],
        properties: { h2: { type: "string" }, h3: { type: "array", items: { type: "string" } } },
      },
    },
    questions: { type: "array", items: { type: "string" } },
    aeoInsights: { type: "array", items: { type: "string" } },
    metaTitles: { type: "array", items: { type: "string" } },
    metaDescriptions: { type: "array", items: { type: "string" } },
    schemaType: { type: "string" },
    schemaJsonLd: { type: "string" },
  },
};

function headingLine(t: { rank: number; headings: Heading[] }): string {
  const by = (lvl: number) =>
    t.headings.filter((h) => h.level === lvl).map((h) => h.text).slice(0, 8).join(", ");
  const parts = [`H1:${by(1)}`, `H2:${by(2)}`, `H3:${by(3)}`].filter((p) => !p.endsWith(":"));
  return `#${t.rank} ${parts.join(" | ")}`;
}

/** Build the compressed R4 prompt. Corpus stays well under the 30K-token budget. */
export function buildBriefPrompt(input: BriefInput): { system: string; user: string } {
  const system =
    "You are an SEO/AEO/GEO content strategist. Produce a content brief as JSON that matches the schema. " +
    "Base every field strictly on the provided SERP data — do not invent competitors, citations, or statistics. " +
    "Meta titles must be <= 60 characters and meta descriptions <= 155 characters. " +
    "The outline's H2/H3 structure should cover the topic more completely than the competitors, in a logical order. " +
    "aeoInsights should describe structural patterns that help AI engines cite the page (direct-answer paragraphs, " +
    "FAQ blocks, schema, stats/citations). schemaJsonLd must be a valid JSON-LD snippet for the recommended schemaType.";

  const terms = input.terms
    .slice(0, 40)
    .map((t) => `${t.term} [${t.placement}] ${t.freq.min}-${t.freq.max}x`)
    .join("\n");
  const headings = input.headingTrees.slice(0, 10).map(headingLine).join("\n");
  const paa = input.paa.slice(0, 15).map((q) => `- ${q}`).join("\n");

  const user = [
    `Keyword: ${input.keyword}`,
    `Location: ${input.country} / ${input.locale}`,
    `AI Overview: ${input.aiOverview.present ? `present, ${input.aiOverview.count} cited URLs` : "none"}`,
    "",
    "Recommended terms (term [placement] freq):",
    terms || "(none)",
    "",
    "Competitor headings (by rank):",
    headings || "(none)",
    "",
    "People Also Ask:",
    paa || "(none)",
  ].join("\n");

  return { system, user };
}

/** Canned brief for fake mode (offline tests + local dev). */
export const FAKE_BRIEF: Brief = {
  entities: ["Digital marketing", "SEO", "Nagpur", "PPC", "Content marketing"],
  termClusters: [
    { name: "Core services", terms: ["digital marketing", "seo services", "ppc", "content marketing"] },
    { name: "Local", terms: ["nagpur", "local seo", "google business profile"] },
  ],
  outline: [
    { h2: "What a digital marketing company in Nagpur does", h3: ["Core services", "Who it's for"] },
    { h2: "How to choose an agency", h3: ["Questions to ask", "Pricing"] },
    { h2: "Local SEO for Nagpur businesses", h3: ["Google Business Profile", "Local citations"] },
  ],
  questions: [
    "How much does digital marketing cost in Nagpur?",
    "Which is the best digital marketing agency in Nagpur?",
    "What does a digital marketing company do?",
  ],
  aeoInsights: [
    "Top pages open each section with a direct one-sentence answer.",
    "Cited pages include an FAQ block with FAQPage schema.",
    "LocalBusiness schema with address and area served is common.",
  ],
  metaTitles: [
    "Digital Marketing Company in Nagpur",
    "Nagpur Digital Marketing Agency",
    "SEO & Digital Marketing, Nagpur",
  ],
  metaDescriptions: [
    "A results-driven digital marketing company in Nagpur offering SEO, PPC, and content marketing for local businesses.",
    "Grow your Nagpur business with data-backed SEO and paid campaigns from a local agency.",
  ],
  schemaType: "LocalBusiness",
  schemaJsonLd: '{"@context":"https://schema.org","@type":"LocalBusiness","name":"Example","areaServed":"Nagpur"}',
};
