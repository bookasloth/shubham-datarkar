import type { PageEntry, PageAnalysis, PageScores, CheckResult, ScoreBreakdown } from "./types";
import { scoreColor } from "./constants";

type Check = {
  id: string;
  label: string;
  test: (entry: PageEntry, analysis: PageAnalysis) => boolean;
  priority: "high" | "medium" | "low";
};

const SEO_CHECKS: Check[] = [
  { id: "seo-has-title", label: "Has title", test: (_, a) => !!a.title || a.metadataSource === "generateMetadata", priority: "high" },
  { id: "seo-title-length", label: "Title length 30-60 chars", test: (_, a) => a.titleLength >= 30 && a.titleLength <= 60, priority: "medium" },
  { id: "seo-has-desc", label: "Has description", test: (_, a) => !!a.description || a.metadataSource === "generateMetadata", priority: "high" },
  { id: "seo-desc-length", label: "Description length 120-160 chars", test: (_, a) => a.descriptionLength >= 120 && a.descriptionLength <= 160, priority: "medium" },
  { id: "seo-canonical", label: "Has canonical URL", test: (_, a) => a.hasCanonical, priority: "high" },
  { id: "seo-og", label: "Has Open Graph tags", test: (_, a) => a.hasOgTags, priority: "medium" },
  { id: "seo-twitter", label: "Has Twitter card", test: (_, a) => a.hasTwitterCard, priority: "low" },
  { id: "seo-og-image", label: "Has dedicated OG image", test: (_, a) => a.ogImageSource === "dedicated", priority: "low" },
  { id: "seo-breadcrumb", label: "Has breadcrumb schema", test: (_, a) => a.hasBreadcrumbs, priority: "medium" },
  { id: "seo-h1-present", label: "Has at least one H1", test: (_, a) => a.h1Count >= 1, priority: "high" },
  { id: "seo-h1-single", label: "No more than one H1", test: (_, a) => a.h1Count <= 1, priority: "medium" },
  { id: "seo-sitemap", label: "In sitemap", test: (e) => e.inSitemap, priority: "high" },
];

const GEO_CHECKS: Check[] = [
  { id: "geo-schema", label: "Has structured data", test: (_, a) => a.schemas.length > 0, priority: "high" },
  { id: "geo-author", label: "Has author/person schema", test: (_, a) => a.schemas.some((s) => ["profilePage", "person"].includes(s.toLowerCase())), priority: "medium" },
  { id: "geo-faq", label: "Has FAQ schema", test: (_, a) => a.schemas.includes("faq"), priority: "medium" },
  { id: "geo-breadcrumbs", label: "Has breadcrumbs", test: (_, a) => a.hasBreadcrumbs, priority: "medium" },
  { id: "geo-description", label: "Has description", test: (_, a) => a.descriptionLength > 0 || a.metadataSource === "generateMetadata", priority: "high" },
  { id: "geo-entity-schema", label: "Has entity-relevant schema", test: (_, a) => a.schemas.some((s) => ["article", "service", "product", "profilePage", "organization"].includes(s)), priority: "medium" },
  { id: "geo-word-count", label: "Word count > 300", test: (_, a) => a.wordCount > 300, priority: "medium" },
  { id: "geo-internal-links", label: "Has internal links > 2", test: (_, a) => a.internalLinks > 2, priority: "low" },
  { id: "geo-content-schema", label: "Content type schema matches page", test: (_, a) => a.schemas.length > 1, priority: "low" },
  { id: "geo-sitemap", label: "In sitemap", test: (e) => e.inSitemap, priority: "high" },
];

const AEO_CHECKS: Check[] = [
  { id: "aeo-faq", label: "Has FAQ schema", test: (_, a) => a.schemas.includes("faq"), priority: "high" },
  { id: "aeo-breadcrumbs", label: "Has breadcrumbs", test: (_, a) => a.hasBreadcrumbs, priority: "medium" },
  { id: "aeo-headings", label: "Has structured headings (H1 + H2s)", test: (_, a) => a.h1Count >= 1 && a.h2Count >= 1, priority: "high" },
  { id: "aeo-word-count", label: "Word count > 200", test: (_, a) => a.wordCount > 200, priority: "medium" },
  { id: "aeo-description", label: "Has description", test: (_, a) => a.descriptionLength > 0 || a.metadataSource === "generateMetadata", priority: "medium" },
  { id: "aeo-lists", label: "Has list or table patterns", test: (_, a) => a.h2Count >= 2 || a.internalLinks > 3, priority: "low" },
  { id: "aeo-h2-count", label: "H2 count >= 2", test: (_, a) => a.h2Count >= 2, priority: "medium" },
  { id: "aeo-schema", label: "Has schema.org markup", test: (_, a) => a.schemas.length > 0, priority: "high" },
];

function runChecks(
  checks: Check[],
  category: "seo" | "geo" | "aeo",
  entry: PageEntry,
  analysis: PageAnalysis,
): { breakdown: ScoreBreakdown; results: CheckResult[] } {
  const results: CheckResult[] = checks.map((check) => ({
    id: check.id,
    label: check.label,
    passed: check.test(entry, analysis),
    category,
    priority: check.priority,
  }));
  const passed = results.filter((r) => r.passed).map((r) => r.label);
  const failed = results.filter((r) => !r.passed).map((r) => r.label);
  const score = results.length > 0 ? Math.round((passed.length / results.length) * 100) : 0;
  return { breakdown: { score, passed, failed }, results };
}

export function scorePage(entry: PageEntry, analysis: PageAnalysis): PageScores {
  const seo = runChecks(SEO_CHECKS, "seo", entry, analysis);
  const geo = runChecks(GEO_CHECKS, "geo", entry, analysis);
  const aeo = runChecks(AEO_CHECKS, "aeo", entry, analysis);

  const overall = Math.round(seo.breakdown.score * 0.5 + geo.breakdown.score * 0.3 + aeo.breakdown.score * 0.2);

  return {
    seo: seo.breakdown,
    geo: geo.breakdown,
    aeo: aeo.breakdown,
    overall,
    color: scoreColor(overall),
    checks: [...seo.results, ...geo.results, ...aeo.results],
  };
}
