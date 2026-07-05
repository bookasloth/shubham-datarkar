import type { AuditResult, AuditSummary, PageAuditEntry, ScoreColor } from "./types";
import { discoverPages } from "./discovery";
import { analyzePage } from "./analyzer";
import { scorePage } from "./scoring";

function buildSummary(pages: PageAuditEntry[]): AuditSummary {
  const publicPages = pages.filter((p) => !p.entry.isPrivate);

  const indexed = publicPages.filter((p) => p.analysis.robotsIndex && p.entry.inSitemap);
  const notIndexed = publicPages.filter((p) => !p.analysis.robotsIndex || !p.entry.inSitemap);
  const missingMetadata = publicPages.filter((p) => !p.analysis.hasMetadata);
  const missingSchema = publicPages.filter((p) => p.analysis.schemas.length === 0);
  const missingOgImage = publicPages.filter((p) => p.analysis.ogImageSource !== "dedicated");

  const avgSeo = publicPages.length > 0
    ? Math.round(publicPages.reduce((sum, p) => sum + p.scores.seo.score, 0) / publicPages.length)
    : 0;
  const avgGeo = publicPages.length > 0
    ? Math.round(publicPages.reduce((sum, p) => sum + p.scores.geo.score, 0) / publicPages.length)
    : 0;
  const avgAeo = publicPages.length > 0
    ? Math.round(publicPages.reduce((sum, p) => sum + p.scores.aeo.score, 0) / publicPages.length)
    : 0;

  // Aggregate issues from all failed checks
  const issueCounts = new Map<string, number>();
  for (const page of publicPages) {
    for (const check of page.scores.checks) {
      if (!check.passed) {
        issueCounts.set(check.label, (issueCounts.get(check.label) ?? 0) + 1);
      }
    }
  }
  const issuesByType = [...issueCounts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);

  const colorDistribution: Record<ScoreColor, number> = { red: 0, orange: 0, yellow: 0, green: 0 };
  for (const page of publicPages) {
    colorDistribution[page.scores.color]++;
  }

  return {
    totalPages: publicPages.length,
    indexedPages: indexed.length,
    notIndexedPages: notIndexed.length,
    missingMetadata: missingMetadata.length,
    missingSchema: missingSchema.length,
    missingOgImage: missingOgImage.length,
    avgSeoScore: avgSeo,
    avgGeoScore: avgGeo,
    avgAeoScore: avgAeo,
    issuesByType,
    colorDistribution,
  };
}

export async function runFullAudit(): Promise<AuditResult> {
  const entries = await discoverPages();
  const pages: PageAuditEntry[] = [];

  for (const entry of entries) {
    const analysis = await analyzePage(entry);
    const scores = scorePage(entry, analysis);
    pages.push({ entry, analysis, scores });
  }

  return { pages, summary: buildSummary(pages) };
}

export async function auditSinglePage(route: string): Promise<PageAuditEntry | null> {
  const entries = await discoverPages();
  const entry = entries.find((e) => e.route === route);
  if (!entry) return null;
  const analysis = await analyzePage(entry);
  const scores = scorePage(entry, analysis);
  return { entry, analysis, scores };
}
