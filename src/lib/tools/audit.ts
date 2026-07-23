import "server-only";
import type { PageEntry } from "@/lib/seo/types";
import { parseHtml } from "@/lib/seo/parse-html";
import { scorePage } from "@/lib/seo/scoring";
import { safeFetchHtml } from "./safe-fetch";

export type AuditCheck = {
  id: string;
  label: string;
  passed: boolean;
  category: "seo" | "geo" | "aeo";
  priority: "high" | "medium" | "low";
};

export type AuditReport = {
  url: string;
  overall: number;
  color: "red" | "orange" | "yellow" | "green";
  scores: { seo: number; geo: number; aeo: number };
  title: string | null;
  titleLength: number;
  description: string | null;
  descriptionLength: number;
  h1Count: number;
  wordCount: number;
  schemas: string[];
  passed: AuditCheck[];
  failed: AuditCheck[];
};

/**
 * Run a real technical SEO audit on an external URL by reusing the same engine
 * that powers the internal /admin/seo audit: SSRF-safe fetch → parseHtml →
 * scorePage. External pages are scored as a "pillar" page so the full set of
 * checks applies.
 */
export async function auditExternalUrl(rawUrl: string): Promise<AuditReport> {
  const { finalUrl, html } = await safeFetchHtml(rawUrl);
  const analysis = parseHtml(html);
  const entry: PageEntry = {
    route: new URL(finalUrl).pathname || "/",
    filePath: "",
    isPrivate: false,
    inSitemap: true,
    pageType: "pillar",
  };
  const scores = scorePage(entry, analysis);

  const applicable = scores.checks.filter((c) => c.applicable);
  const toCheck = (c: (typeof applicable)[number]): AuditCheck => ({
    id: c.id,
    label: c.label,
    passed: c.passed,
    category: c.category,
    priority: c.priority,
  });

  return {
    url: finalUrl,
    overall: scores.overall,
    color: scores.color,
    scores: { seo: scores.seo.score, geo: scores.geo.score, aeo: scores.aeo.score },
    title: analysis.title,
    titleLength: analysis.titleLength,
    description: analysis.description,
    descriptionLength: analysis.descriptionLength,
    h1Count: analysis.h1Count,
    wordCount: analysis.wordCount,
    schemas: analysis.schemas,
    passed: applicable.filter((c) => c.passed).map(toCheck),
    failed: applicable.filter((c) => !c.passed).map(toCheck),
  };
}
