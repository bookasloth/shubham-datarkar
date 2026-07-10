import type { PageType } from "./routes";

export type PageEntry = {
  route: string;
  filePath: string;
  isDynamic: boolean;
  isPrivate: boolean;
  inSitemap: boolean;
  pageType: PageType;
};

/**
 * Analysis derived from a route's rendered HTML.
 */
export type PageAnalysis = {
  title: string | null;
  titleLength: number;
  description: string | null;
  descriptionLength: number;
  hasCanonical: boolean;
  hasOgTags: boolean;
  hasTwitterCard: boolean;
  robotsIndex: boolean;
  robotsFollow: boolean;

  /** schema.org `@type` values, e.g. "BreadcrumbList", "FAQPage". */
  schemas: string[];
  hasBreadcrumbs: boolean;
  /** JSON-LD blocks that failed `JSON.parse`. */
  schemaParseErrors: number;

  ogImageSource: "dedicated" | "root-fallback" | "none";

  h1Count: number;
  h2Count: number;
  h3Count: number;
  wordCount: number;
  readingTime: number;
  internalLinks: number;
  externalLinks: number;
  imageCount: number;
  missingAltCount: number;
  /** `<ul>`, `<ol>`, and `<table>` elements inside the main region. */
  listCount: number;
  /** False when no `<main id="main">` was found and metrics include chrome. */
  mainRegionFound: boolean;
};

export type ScoreColor = "red" | "orange" | "yellow" | "green";

export type CheckResult = {
  id: string;
  label: string;
  passed: boolean;
  category: "seo" | "geo" | "aeo";
  priority: "high" | "medium" | "low";
};

export type ScoreBreakdown = {
  score: number;
  passed: string[];
  failed: string[];
};

export type PageScores = {
  seo: ScoreBreakdown;
  geo: ScoreBreakdown;
  aeo: ScoreBreakdown;
  overall: number;
  color: ScoreColor;
  checks: CheckResult[];
};

export type PageAuditEntry = {
  entry: PageEntry;
  analysis: PageAnalysis | null;
  scores: PageScores | null;
};

export type AuditSummary = {
  totalPages: number;
  indexedPages: number;
  notIndexedPages: number;
  missingMetadata: number;
  missingSchema: number;
  missingOgImage: number;
  /** Routes whose HTML could not be fetched. Excluded from every average. */
  unreachablePages: number;
  avgSeoScore: number;
  avgGeoScore: number;
  avgAeoScore: number;
  issuesByType: { label: string; count: number }[];
  colorDistribution: Record<ScoreColor, number>;
};

export type AuditResult = {
  pages: PageAuditEntry[];
  summary: AuditSummary;
};
