// Shared types for the public SEO + AI-visibility audit engine.
// Distinct from src/lib/seo/* (which grades this site's own known routes).
// Types are added slice by slice; this file is the single import surface.

/** Coarse page role, inferred from URL + content. Drives crawl priority + scoring thresholds. */
export type PageClass =
  | "home"
  | "service"
  | "product"
  | "category"
  | "location"
  | "about"
  | "contact"
  | "author"
  | "article"
  | "other";

/** One URL selected for the crawl, with its class and a sort priority (lower = crawl sooner). */
export type DiscoveredUrl = {
  url: string;
  class: PageClass;
  priority: number;
};

export type ScoreColor = "red" | "orange" | "yellow" | "green";

/** One check inside a category. `ratio` in [0,1]; `weight` sets its contribution. */
export type Check = {
  id: string;
  label: string;
  ratio: number;
  weight: number;
  detail?: string;
};

export type CategoryScore = {
  key: string;
  label: string;
  weight: number; // contribution to its parent (SEO or AI) score
  score: number; // 0-100
  checks: Check[];
};

export type AuditScores = {
  seo: number;
  ai: number;
  overall: number;
  color: ScoreColor;
  seoCategories: CategoryScore[];
  aiCategories: CategoryScore[];
};

export type Severity = "critical" | "high" | "medium" | "low";

/** An evidence-based finding (spec §15). Deterministic ones come from scoring; LLM ones from synthesis. */
export type Finding = {
  id: string;
  title: string;
  problem: string;
  why: string;
  evidence: string;
  affectedUrls: string[];
  severity: Severity;
  category: "seo" | "ai";
  recommendation: string;
  source: "deterministic" | "llm";
};

/** A prioritized opportunity for the paid-service narrative (spec §16, §22). */
export type Opportunity = {
  rank: number;
  title: string;
  summary: string;
  impact: Severity;
  category: "seo" | "ai";
  effort: "low" | "medium" | "high";
};

/** A branch of the topical map (spec §10). `covered` = the site addresses it. */
export type TopicNode = { topic: string; covered: boolean; children?: TopicNode[] };

export type ActionPlan = { now: string[]; next: string[]; later: string[] };

/** The deep, LLM-generated report unlocked after the email gate. */
export type AuditReport = {
  opportunitySummary: string;
  opportunities: Opportunity[];
  topicMap: TopicNode[];
  actionPlan: ActionPlan;
  llmFindings: Finding[];
};

/** The public, gated projection of an audit row returned by the status route. */
export type AuditView = {
  id: string;
  url: string;
  domain: string;
  status: string;
  progress: number;
  reportStatus: "free" | "unlocked";
  pageCount: number | null;
  scores: AuditScores | null;
  findings: Finding[]; // top few pre-unlock; all post-unlock
  findingsTotal: number;
  report: AuditReport | null; // only post-unlock
};
