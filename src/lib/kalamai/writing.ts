import type { ContentBlock } from "@/lib/data/types";
import type { Brief } from "./brief";
import { blocksToMarkdown } from "./serialize";
import { countWords } from "@/lib/blog/words";

/**
 * Prompt builders + offline fixtures for the writing engine (W1-W4). Pure string
 * assembly and constants, mirroring brief.ts; the behaviour is covered through
 * writing-server.test.ts driving the whole machine on fakes. The shared brief+
 * params block is the cache prefix — keep it byte-identical across W2-W4.
 */

export type ContentType = "blog" | "landing" | "product";
export const CONTENT_TYPES: readonly ContentType[] = ["blog", "landing", "product"];
export const CONTENT_LABELS: Record<ContentType, string> = {
  blog: "Blog",
  landing: "Landing Page",
  product: "Product Description",
};
const BANDS: Record<ContentType, [number, number]> = {
  blog: [1000, 2200],
  landing: [500, 1200],
  product: [120, 500],
};
export function bandFor(t: ContentType): [number, number] {
  return BANDS[t] ?? BANDS.blog;
}

export type ArticleParams = {
  targetWords: number;
  tone: string; // e.g. "professional", "conversational"
  audience: string; // e.g. "small business owners in Nagpur"
  brandFacts?: string; // optional facts about the client to weave in
  contentType?: ContentType; // default "blog" when absent
};

export type SectionPlan = {
  title: string; // chosen meta/H1 title
  description: string; // meta description
  ogTitle: string; // social-optimized share title
  ogDescription: string; // social-optimized share description
  sections: { heading: string; points: string[]; words: number }[];
};

export type Critique = {
  missingTerms: string[];
  missingSections: string[];
  issues: string[];
  ok: boolean;
};

export type ArticleMeta = { title: string; description: string; ogTitle: string; ogDescription: string; jsonld: string; contentType: ContentType };

/** Stable cached block shared by W2-W4: the brief + the writer's params. */
export function buildCachePrefix(brief: Brief, params: ArticleParams): string {
  return JSON.stringify({ brief, params });
}

export type SourceFact = { text: string; url: string };

/**
 * Real, quotable fact-sentences pulled from the crawled competitor pages so the
 * writer can ground claims instead of inventing "studies suggest…". Mechanical
 * (not LLM): keep mid-length sentences that carry a number/stat, drop boilerplate,
 * dedupe, competitor-rank order. Each fact carries its page URL so the writer can
 * backlink the stat to its source. Empty in → empty out (facts section skipped).
 */
export function extractSourceFacts(pages: { rank: number; bodyText: string; url: string }[], max = 18): SourceFact[] {
  const seen = new Set<string>();
  const facts: SourceFact[] = [];
  for (const p of [...pages].sort((a, b) => a.rank - b.rank)) {
    for (const raw of (p.bodyText || "").split(/(?<=[.!?])\s+/)) {
      const s = raw.trim().replace(/\s+/g, " ");
      if (s.length < 40 || s.length > 240) continue;
      if (!/\d/.test(s)) continue; // a real fact usually carries a number
      if (/(cookie|subscribe|sign\s?up|log\s?in|©|all rights reserved|privacy policy)/i.test(s)) continue;
      const key = s.toLowerCase().slice(0, 60);
      if (seen.has(key)) continue;
      seen.add(key);
      facts.push({ text: s, url: p.url });
      if (facts.length >= max) return facts;
    }
  }
  return facts;
}

function factsBlock(sourceFacts: SourceFact[]): string {
  if (!sourceFacts.length) return "";
  return [
    "",
    "Source facts (real excerpts from ranking pages — ground claims in these; do NOT invent figures or URLs). When you state one of these statistics, cite it by linking to its [source] URL:",
    ...sourceFacts.map((f) => `- "${f.text}" [source: ${f.url}]`),
  ].join("\n");
}

/**
 * Hard word-count ceiling. Keeps leading body blocks until the cap, always
 * preserving trailing faq/takeaways. Guarantees ≤ cap (assuming the preserved
 * tail alone is under it) — the prompt + critique aim for the band; this is the
 * backstop so a runaway draft can never ship over-length.
 */
export function enforceWordCap(blocks: ContentBlock[], cap = 2200): ContentBlock[] {
  if (countWords(blocks) <= cap) return blocks;
  const tail = blocks.filter((b) => b.type === "faq" || b.type === "takeaways");
  const body = blocks.filter((b) => b.type !== "faq" && b.type !== "takeaways");
  const kept: ContentBlock[] = [];
  for (const b of body) {
    kept.push(b);
    if (countWords([...kept, ...tail]) > cap) {
      kept.pop();
      break;
    }
  }
  return [...kept, ...tail];
}

/** Meta is a straight pull from the brief + the plan the model already chose. */
export function buildArticleMeta(brief: Brief, plan: SectionPlan, contentType: ContentType = "blog"): ArticleMeta {
  const title = plan.title || brief.metaTitles[0] || "";
  const description = plan.description || brief.metaDescriptions[0] || "";
  return {
    title,
    description,
    ogTitle: plan.ogTitle || title,
    ogDescription: plan.ogDescription || description,
    jsonld: brief.schemaJsonLd || "",
    contentType,
  };
}

const BLOCK_SPEC =
  "Allowed block types (emit a JSON array of these objects, nothing else):\n" +
  '{"type":"h2","text":string} {"type":"h3","text":string} {"type":"p","text":string} ' +
  '{"type":"lead","text":string} {"type":"ul","items":string[]} {"type":"ol","items":string[]} ' +
  '{"type":"quote","text":string,"cite"?:string} {"type":"callout","variant"?:"info"|"tip"|"warning","title"?:string,"text":string} ' +
  '{"type":"table","columns":string[],"rows":string[][]} {"type":"steps","items":[{"title":string,"detail":string}]} ' +
  '{"type":"takeaways","title"?:string,"items":string[]} {"type":"faq","items":[{"q":string,"a":string}]}\n' +
  'Any "text" value may be a string OR an array mixing strings and link spans, e.g. ' +
  '["Answer engines convert ", {"t":"a","text":"4.4x higher","href":"https://source.example/page"}, " than organic."] — ' +
  "use a link span ONLY to cite a Source fact's exact [source] URL. Never invent a URL.";

/* — W1: section plan (runJson) — */

export const OUTLINE_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["title", "description", "ogTitle", "ogDescription", "sections"],
  properties: {
    title: { type: "string" },
    description: { type: "string" },
    ogTitle: { type: "string" },
    ogDescription: { type: "string" },
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
  const ct: ContentType = params.contentType ?? "blog";
  const [lo, hi] = bandFor(ct);
  let system: string;
  if (ct === "landing") {
    system =
      "You are an expert conversion copywriter. Produce a section-by-section landing-page plan as JSON matching the schema. " +
      `Allocate 'words' across sections to total about ${params.targetWords} — the whole page must stay between ${lo} and ${hi} words, never over ${hi}. ` +
      "Structure the page for conversion: open with a hero value-proposition, then benefits, then features, then social proof, then objection handling, and END with a strong call to action. " +
      "Lead with benefits (what the reader gains), not neutral explanation. Ground claims in the brief's entities and recommended terms. " +
      "title must be <= 60 chars; description 120-160 chars. Also produce ogTitle (<= 70 chars) and ogDescription (110-160 chars) that are punchier and curiosity-driven. Do not invent facts.";
  } else if (ct === "product") {
    system =
      "You are an expert e-commerce product copywriter. Produce a section-by-section product-description plan as JSON matching the schema. " +
      `Allocate 'words' across sections to total about ${params.targetWords} — the whole description must stay between ${lo} and ${hi} words, never over ${hi}. ` +
      "Keep it short and scannable: open with a benefit hook, then key features, then specifications, then a use case, and END with a call to action. " +
      "Lead with concrete benefits and features, not filler. Ground claims in the brief's entities and recommended terms. " +
      "title must be <= 60 chars; description 120-160 chars. Also produce ogTitle (<= 70 chars) and ogDescription (110-160 chars). Do not invent facts.";
  } else {
    system =
      "You are an expert SEO/AEO content strategist. Produce a section-by-section writing plan as JSON matching the schema. " +
      `Allocate 'words' across sections to total ${params.targetWords} — the whole article must stay between 1000 and 2200 ` +
      "words, never over 2200. Ground every section in the brief's outline, entities, and recommended terms. " +
      "The FINAL section must be a Conclusion that takes a clear point of view (a recommendation the writer stands behind, " +
      "not a neutral summary) and calls out the low-hanging fruit — the highest-leverage actions the reader can act on " +
      "immediately. title must be <= 60 chars; description 120-160 chars. " +
      "Also produce ogTitle and ogDescription — social-share variants that are punchier and more curiosity-driven than the meta title/description (ogTitle <= 70 chars; ogDescription 110-160 chars). " +
      "Do not invent facts.";
  }
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
  sourceFacts: SourceFact[] = [],
): { system: string; user: string; cachePrefix: string } {
  const wordCount = countWords(blocks);
  const ct: ContentType = params.contentType ?? "blog";
  const [lo, hi] = bandFor(ct);
  const system =
    ct === "blog"
      ? "You are a demanding SEO/AEO editor. Compare the draft against the brief and source facts, and return JSON per the " +
        "schema. In 'issues', flag every instance of:\n" +
        "1. A statistic or factual claim NOT supported by the source facts, or hedged with 'studies/surveys/experts suggest' " +
        "and similar with no concrete figure or named source — quote the offending phrase.\n" +
        "2. A statistic drawn from a source fact that is NOT backlinked to its source URL — those claims must cite their source.\n" +
        "3. Any single keyword or phrase repeated so often it reads as stuffing — name the term and roughly how many times.\n" +
        "4. Generic filler that could apply to any topic — demand a concrete specific, example, or figure instead.\n" +
        "5. Any section that does not open with a direct one-sentence answer.\n" +
        "6. A missing or weak Conclusion — it must state a genuine point of view and list low-hanging-fruit actions.\n" +
        `7. Length outside ${lo}-${hi} words (this draft is ${wordCount} words) — flag if over ${hi} or under ${lo}.\n` +
        "Also list recommended terms not used and brief outline sections not covered. Set ok=true ONLY if the draft is " +
        "specific, grounded, backlinked, free of stuffing, within the word band, ends with a POV conclusion, and every " +
        "section leads with a direct answer. A merely competent, generic draft is NOT ok — be strict."
      : "You are a demanding conversion-copy editor. Compare the draft against the brief and source facts, and return JSON per the " +
        "schema. In 'issues', flag every instance of:\n" +
        "1. A statistic or factual claim NOT supported by the source facts, or hedged with 'studies/surveys/experts suggest' — quote the offending phrase.\n" +
        "2. A statistic drawn from a source fact that is NOT backlinked to its source URL.\n" +
        "3. Any single keyword or phrase repeated so often it reads as stuffing — name the term.\n" +
        "4. Generic filler that could describe any product/offer — demand a concrete benefit, feature, or figure instead.\n" +
        "5. Copy that explains instead of persuading — it must lead with benefits to the reader.\n" +
        "6. A missing or weak call to action — the copy must end asking the reader to act.\n" +
        `7. Length outside ${lo}-${hi} words (this draft is ${wordCount} words) — flag if over ${hi} or under ${lo}.\n` +
        "Also list recommended terms not used. Set ok=true ONLY if the copy is specific, grounded, backlinked, benefit-led, " +
        "free of stuffing, within the word band, and ends with a clear call to action. A generic draft is NOT ok — be strict.";
  const user = ["Draft (markdown):", blocksToMarkdown(blocks), factsBlock(sourceFacts)].join("\n");
  return { system, user, cachePrefix: buildCachePrefix(brief, params) };
}

/* — W2 (section-by-section): draft ONE section — */

export function buildSectionDraftPrompt(
  brief: Brief,
  params: ArticleParams,
  plan: SectionPlan,
  sectionIndex: number,
  priorHeadings: string[],
  sourceFacts: SourceFact[] = [],
): { system: string; user: string; cachePrefix: string } {
  const section = plan.sections[sectionIndex];
  const isFirst = sectionIndex === 0;
  const isLast = sectionIndex === plan.sections.length - 1;
  const ct: ContentType = params.contentType ?? "blog";
  // ponytail: non-last sections never emit a faq block, so drop it from the allowed-type list
  // rather than confusing the model with an option it must ignore; landing/product never emit
  // faq at all (they use a CTA paragraph on the last section instead).
  const stripFaq = !isLast || ct !== "blog";
  const sectionBlockSpec = stripFaq ? BLOCK_SPEC.replace(' {"type":"faq","items":[{"q":string,"a":string}]}', "") : BLOCK_SPEC;
  const answerRule = ct === "blog" ? "then a direct one-sentence answer, then expand; " : "";
  const voice =
    ct === "landing" ? "Write benefit-led, persuasive conversion copy. "
    : ct === "product" ? "Write concise, scannable product copy that leads with benefits and features. "
    : "";
  const lastRule = !isLast ? "" :
    ct === "blog"
      ? "Because this is the FINAL section, AFTER the section content also emit a closing 'faq' block answering the brief's questions. "
      : "Because this is the FINAL section, AFTER the section content emit a closing call-to-action paragraph. ";
  const system =
    `You are an expert ${params.tone} SEO writer for an audience of ${params.audience}. ` +
    voice +
    "Write ONLY the ONE section described below, as a JSON array of ContentBlocks — not the whole article. " +
    `Aim for about ${section?.words ?? 400} words for this section. ` +
    `Open the section with its 'h2' heading, ${answerRule}use 'h3' for sub-points. ` +
    (isFirst ? "Because this is the FIRST section, emit an opening 'lead' block BEFORE the section's h2. " : "") +
    lastRule +
    "Do NOT repeat anything already covered by the earlier sections listed under 'Already written'. \n" +
    "GROUNDING: base any statistic, percentage, year, or factual claim on the Source facts below; never invent numbers " +
    "or cite unnamed 'studies'. When you state a statistic from a Source fact, BACKLINK it with an " +
    '{"t":"a","text":…,"href":…} span pointing to that fact\'s exact [source] URL. Only link to provided source URLs. ' +
    "Weave recommended terms in naturally; do not over-repeat any single term. Return ONLY the JSON array.\n" +
    sectionBlockSpec;
  const user = [
    `Section to write: ## ${section?.heading ?? ""} (~${section?.words ?? 400}w)`,
    ...(section?.points ?? []).map((p) => `- ${p}`),
    "",
    priorHeadings.length ? `Already written (do NOT repeat): ${priorHeadings.join("; ")}` : "This is the first section.",
    "",
    "Recommended terms to include (use naturally, do not stuff):",
    brief.termClusters.flatMap((c) => c.terms).slice(0, 30).join(", "),
    factsBlock(sourceFacts),
  ].join("\n");
  return { system, user, cachePrefix: buildCachePrefix(brief, params) };
}

/* — W4 (section-by-section): rewrite ONE section — */

export function buildSectionRewritePrompt(
  brief: Brief,
  params: ArticleParams,
  sectionBlocks: ContentBlock[],
  critique: Critique,
  sectionHeading: string,
  priorHeadings: string[],
): { system: string; user: string; cachePrefix: string } {
  const system =
    "You are an expert SEO writer revising ONE section of an article. Apply the critique points that pertain to this " +
    "section, keep what already works, and return ONLY this section's revised ContentBlocks as a JSON array. " +
    "Do not repeat content from the earlier sections listed under 'Already written'. Return ONLY the JSON array.\n" +
    BLOCK_SPEC;
  const user = [
    `Section being revised: ${sectionHeading}`,
    priorHeadings.length ? `Already written (do NOT repeat): ${priorHeadings.join("; ")}` : "",
    "",
    "Critique to apply:",
    critique.missingTerms.length ? `- Ensure these terms appear where natural: ${critique.missingTerms.join(", ")}` : "",
    critique.issues.length ? `- Fix these issues: ${critique.issues.join(" | ")}` : "",
    "",
    "Current section (markdown):",
    blocksToMarkdown(sectionBlocks),
  ].filter(Boolean).join("\n");
  return { system, user, cachePrefix: buildCachePrefix(brief, params) };
}

/** Per-section fake output (fake-LLM mode) — a small chunk, NOT the whole article. */
export const FAKE_SECTION_DRAFT: string = JSON.stringify([
  { type: "h2", text: "Section heading" },
  { type: "p", text: "A direct answer, then a concrete detail for this section." },
]);

/* — Offline fixtures (fake mode) — */

export const FAKE_OUTLINE: SectionPlan = {
  title: "Digital Marketing Company in Nagpur",
  description: "A results-driven digital marketing company in Nagpur offering SEO, PPC, and content marketing for local businesses that grow.",
  ogTitle: "Grow Your Nagpur Business Online",
  ogDescription: "SEO, PPC, and content that actually move the needle for local Nagpur businesses — here's how to pick the right partner.",
  sections: [
    { heading: "What a digital marketing company in Nagpur does", points: ["Core services", "Who it's for"], words: 400 },
    { heading: "How to choose an agency", points: ["Questions to ask", "Pricing"], words: 400 },
    { heading: "Local SEO for Nagpur businesses", points: ["Google Business Profile", "Local citations"], words: 400 },
  ],
};

export const FAKE_CRITIQUE: Critique = { missingTerms: [], missingSections: [], issues: [], ok: true };
