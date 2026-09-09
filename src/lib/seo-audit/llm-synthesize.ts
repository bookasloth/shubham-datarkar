import "server-only";
import { runJson, KALAMAI_MODEL } from "@/lib/kalamai/llm";
import type { AuditReport, Finding, Severity } from "./types";
import type { PageExtract } from "./llm-extract";

// Final synthesis on Sonnet 5 (spec §16, §22, §24). Turns the deterministic
// scores + findings + per-page extracts into the commercially useful narrative:
// the biggest opportunity, a prioritized top-N, a topical map with gaps, an
// action plan, and evidence-based AEO findings. Interpretation only — it never
// sets the headline scores.

export type SynthesisInput = {
  domain: string;
  scores: { seo: number; ai: number; overall: number };
  classesPresent: string[];
  deterministicFindings: { title: string; severity: string; category: string }[];
  extracts: PageExtract[];
};

const SEVERITY: Severity[] = ["critical", "high", "medium", "low"];

const FINDING_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["title", "problem", "why", "evidence", "affectedUrls", "severity", "category", "recommendation"],
  properties: {
    title: { type: "string" },
    problem: { type: "string" },
    why: { type: "string" },
    evidence: { type: "string" },
    affectedUrls: { type: "array", items: { type: "string" } },
    severity: { type: "string", enum: SEVERITY },
    category: { type: "string", enum: ["seo", "ai"] },
    recommendation: { type: "string" },
  },
};

const SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["opportunitySummary", "opportunities", "topicMap", "actionPlan", "llmFindings"],
  properties: {
    opportunitySummary: { type: "string", description: "2-3 sentences: the single biggest visibility opportunity for this site" },
    opportunities: {
      type: "array",
      description: "5-10 prioritized by Impact x Confidence x Opportunity / Effort, rank 1 = do first",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["rank", "title", "summary", "impact", "category", "effort"],
        properties: {
          rank: { type: "number" },
          title: { type: "string" },
          summary: { type: "string" },
          impact: { type: "string", enum: SEVERITY },
          category: { type: "string", enum: ["seo", "ai"] },
          effort: { type: "string", enum: ["low", "medium", "high"] },
        },
      },
    },
    topicMap: {
      type: "array",
      description: "primary topics and the supporting branches; covered=true if the site addresses it",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["topic", "covered"],
        properties: {
          topic: { type: "string" },
          covered: { type: "boolean" },
          children: { type: "array", items: { type: "object", additionalProperties: false, required: ["topic", "covered"], properties: { topic: { type: "string" }, covered: { type: "boolean" } } } },
        },
      },
    },
    actionPlan: {
      type: "object",
      additionalProperties: false,
      required: ["now", "next", "later"],
      properties: { now: { type: "array", items: { type: "string" } }, next: { type: "array", items: { type: "string" } }, later: { type: "array", items: { type: "string" } } },
    },
    llmFindings: { type: "array", items: FINDING_SCHEMA },
  },
};

const SYSTEM = `You are a senior SEO + AI-search (AEO) consultant writing the analysis section of a free audit that leads into a paid visibility service. You are given deterministic scores, deterministic findings, and per-page AEO extracts. Produce a commercially useful, evidence-based report.

Rules:
- Be specific and evidence-based. Every finding needs a concrete problem, why it matters, evidence, affected URLs, severity, and a recommended action.
- The AEO angle is the differentiator: answerability, citability, entity clarity, topical gaps.
- Prioritize with Impact x Confidence x Opportunity / Effort. rank 1 = highest leverage.
- Build the topic map from the site's OWN subject: primary topic -> core service -> supporting branches (cost, process, alternatives, benefits, risks, who it's for, questions). Mark covered branches true.
- Google accuracy: never claim schema/FAQ/llms.txt guarantee rankings or AI citations; frame structured data as helping machines understand content that must match the visible page; frame AI-crawler access as readiness, not a guarantee.
- Do not reward content for being long. Do not invent facts not supported by the extracts.
Return strict JSON matching the schema.`;

export const FAKE_REPORT: AuditReport = {
  opportunitySummary:
    "The site has a reasonable technical base, but its commercial pages don't clearly answer the questions buyers ask before choosing a provider, which limits both search and AI-answer visibility.",
  opportunities: [
    { rank: 1, title: "Make service pages answer buyer questions", summary: "Add concise, factual answer sections (cost, process, who it's for) to commercial pages.", impact: "high", category: "ai", effort: "medium" },
    { rank: 2, title: "Add organisation entity schema", summary: "Declare Organization + sameAs so machines can identify you.", impact: "medium", category: "ai", effort: "low" },
  ],
  topicMap: [{ topic: "Core service", covered: true, children: [{ topic: "Cost", covered: false }, { topic: "Process", covered: false }, { topic: "Who it's for", covered: false }] }],
  actionPlan: { now: ["Add answer sections to top commercial pages"], next: ["Add entity schema and internal links"], later: ["Build supporting informational content"] },
  llmFindings: [
    { id: "aeo-answerability", title: "Weak direct-answer coverage", problem: "Commercial pages explain the service but don't answer common pre-purchase questions.", why: "AI systems extract direct answers; pages without them are rarely cited.", evidence: "Seen across the analysed commercial pages", affectedUrls: [], severity: "high", category: "ai", recommendation: "Add concise, factual answer sections supported by evidence.", source: "llm" },
  ],
};

/** Synthesize the deep report. Returns FAKE_REPORT when no API key (tests/dev). */
export async function synthesizeReport(input: SynthesisInput): Promise<AuditReport> {
  const user = JSON.stringify(
    {
      domain: input.domain,
      scores: input.scores,
      pagesCrawledClasses: input.classesPresent,
      deterministicFindings: input.deterministicFindings.slice(0, 20),
      pageExtracts: input.extracts.map((e) => ({
        url: e.url, type: e.pageType, summary: e.summary, entities: e.entities,
        answered: e.questionsAnswered, missing: e.questionsMissing, trust: e.trustSignals,
        citability: e.citability, citabilityIssues: e.citabilityIssues,
      })),
    },
    null,
    0,
  );

  const { data } = await runJson<Omit<AuditReport, "llmFindings"> & { llmFindings: Omit<Finding, "id" | "source">[] }>({
    system: SYSTEM,
    user,
    schema: SCHEMA,
    model: KALAMAI_MODEL,
    effort: "medium",
    fake: { ...FAKE_REPORT, llmFindings: FAKE_REPORT.llmFindings.map(({ id: _id, source: _s, ...rest }) => rest) },
  });

  return {
    ...data,
    llmFindings: data.llmFindings.map((f, i) => ({ ...f, id: `llm-${i}`, source: "llm" as const })),
  };
}
