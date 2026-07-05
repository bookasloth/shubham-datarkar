export type PageEntry = {
  route: string;
  filePath: string;
  isDynamic: boolean;
  isPrivate: boolean;
  inSitemap: boolean;
};

export type MetadataSource = "buildMetadata" | "static-export" | "generateMetadata" | "none";

export type PageAnalysis = {
  hasMetadata: boolean;
  metadataSource: MetadataSource;
  title: string | null;
  titleLength: number;
  description: string | null;
  descriptionLength: number;
  hasCanonical: boolean;
  hasOgTags: boolean;
  hasTwitterCard: boolean;
  robotsIndex: boolean;
  robotsFollow: boolean;

  schemas: string[];
  hasBreadcrumbs: boolean;

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
  analysis: PageAnalysis;
  scores: PageScores;
};

export type AuditSummary = {
  totalPages: number;
  indexedPages: number;
  notIndexedPages: number;
  missingMetadata: number;
  missingSchema: number;
  missingOgImage: number;
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
