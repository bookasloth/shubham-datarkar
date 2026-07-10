import type { PageEntry, PageAnalysis, PageScores, CheckResult, ScoreBreakdown } from "./types";
import type { PageType } from "./routes";
import { scoreColor } from "./constants";

type Check = {
  id: string;
  label: string;
  test: (entry: PageEntry, analysis: PageAnalysis) => boolean;
  priority: "high" | "medium" | "low";
  /**
   * When present and false, the check leaves BOTH the numerator and the
   * denominator. It is neither a pass nor a failure — the page simply is not the
   * kind of page the check is asking about.
   */
  applies?: (entry: PageEntry) => boolean;
};

const WEIGHT = { high: 3, medium: 2, low: 1 } as const;

const onlyOn = (...types: PageType[]) => (e: PageEntry) => types.includes(e.pageType);
const notHome = (e: PageEntry) => e.route !== "/";

/**
 * FAQPage markup requires the questions and answers be visible on the page.
 * Emitting it elsewhere to satisfy a checker violates Google's structured-data
 * policy, so the check simply does not apply to pages without an FAQ.
 */
const hasVisibleFaq = (e: PageEntry) => e.route === "/faq" || e.route.startsWith("/services/");

const SEO_CHECKS: Check[] = [
  { id: "seo-has-title", label: "Has title", test: (_, a) => !!a.title, priority: "high" },
  { id: "seo-title-length", label: "Title length 30-60 chars", test: (_, a) => a.titleLength >= 30 && a.titleLength <= 60, priority: "medium" },
  { id: "seo-has-desc", label: "Has description", test: (_, a) => !!a.description, priority: "high" },
  { id: "seo-desc-length", label: "Description length 120-160 chars", test: (_, a) => a.descriptionLength >= 120 && a.descriptionLength <= 160, priority: "medium" },
  { id: "seo-canonical", label: "Has canonical URL", test: (_, a) => a.hasCanonical, priority: "high" },
  { id: "seo-og", label: "Has Open Graph tags", test: (_, a) => a.hasOgTags, priority: "medium" },
  { id: "seo-twitter", label: "Has Twitter card", test: (_, a) => a.hasTwitterCard, priority: "low" },
  { id: "seo-og-image", label: "Has dedicated OG image", test: (_, a) => a.ogImageSource === "dedicated", priority: "low", applies: onlyOn("pillar") },
  { id: "seo-breadcrumb", label: "Has breadcrumb schema", test: (_, a) => a.hasBreadcrumbs, priority: "medium", applies: notHome },
  { id: "seo-h1-present", label: "Has at least one H1", test: (_, a) => a.h1Count >= 1, priority: "high" },
  { id: "seo-h1-single", label: "No more than one H1", test: (_, a) => a.h1Count <= 1, priority: "medium" },
  { id: "seo-h2-present", label: "Has at least one H2", test: (_, a) => a.h2Count >= 1, priority: "medium" },
  { id: "seo-sitemap", label: "In sitemap", test: (e) => e.inSitemap, priority: "high" },
];

const ENTITY_TYPES = ["Article", "Service", "Product", "ProfilePage", "Organization"];
const SITE_WIDE_TYPES = ["Person", "WebSite", "BreadcrumbList"];

const GEO_CHECKS: Check[] = [
  { id: "geo-schema", label: "Has structured data", test: (_, a) => a.schemas.length > 0, priority: "high" },
  { id: "geo-author", label: "Has author/person schema", test: (_, a) => a.schemas.some((s) => ["ProfilePage", "Person"].includes(s)), priority: "medium" },
  { id: "geo-faq", label: "Has FAQ schema", test: (_, a) => a.schemas.includes("FAQPage"), priority: "medium", applies: hasVisibleFaq },
  { id: "geo-breadcrumbs", label: "Has breadcrumbs", test: (_, a) => a.hasBreadcrumbs, priority: "medium", applies: notHome },
  { id: "geo-description", label: "Has description", test: (_, a) => a.descriptionLength > 0, priority: "high" },
  { id: "geo-entity-schema", label: "Has entity-relevant schema", test: (_, a) => a.schemas.some((s) => ENTITY_TYPES.includes(s)), priority: "medium", applies: onlyOn("pillar", "hub") },
  { id: "geo-word-count", label: "Word count > 300", test: (_, a) => a.wordCount > 300, priority: "medium", applies: onlyOn("pillar") },
  { id: "geo-internal-links", label: "Has internal links > 2", test: (_, a) => a.internalLinks > 2, priority: "low", applies: onlyOn("pillar", "hub") },
  { id: "geo-content-schema", label: "Content type schema matches page", test: (_, a) => a.schemas.some((s) => !SITE_WIDE_TYPES.includes(s)), priority: "low", applies: onlyOn("pillar", "hub") },
  { id: "geo-sitemap", label: "In sitemap", test: (e) => e.inSitemap, priority: "high" },
];

const AEO_CHECKS: Check[] = [
  { id: "aeo-faq", label: "Has FAQ schema", test: (_, a) => a.schemas.includes("FAQPage"), priority: "high", applies: hasVisibleFaq },
  { id: "aeo-breadcrumbs", label: "Has breadcrumbs", test: (_, a) => a.hasBreadcrumbs, priority: "medium", applies: notHome },
  { id: "aeo-headings", label: "Has structured headings (H1 + H2s)", test: (_, a) => a.h1Count >= 1 && a.h2Count >= 1, priority: "high" },
  { id: "aeo-word-count", label: "Word count > 200", test: (_, a) => a.wordCount > 200, priority: "medium", applies: onlyOn("pillar", "hub") },
  { id: "aeo-description", label: "Has description", test: (_, a) => a.descriptionLength > 0, priority: "medium" },
  { id: "aeo-lists", label: "Has list or table patterns", test: (_, a) => a.listCount > 0, priority: "low", applies: onlyOn("pillar", "hub") },
  { id: "aeo-h2-count", label: "H2 count >= 2", test: (_, a) => a.h2Count >= 2, priority: "medium", applies: onlyOn("pillar", "hub") },
  { id: "aeo-schema", label: "Has schema.org markup", test: (_, a) => a.schemas.length > 0, priority: "high" },
];

function runChecks(
  checks: Check[],
  category: "seo" | "geo" | "aeo",
  entry: PageEntry,
  analysis: PageAnalysis,
): { breakdown: ScoreBreakdown; results: CheckResult[] } {
  const results: CheckResult[] = checks.map((check) => {
    const applicable = check.applies ? check.applies(entry) : true;
    return {
      id: check.id,
      label: check.label,
      applicable,
      passed: applicable && check.test(entry, analysis),
      category,
      priority: check.priority,
    };
  });

  const applicable = results.filter((r) => r.applicable);
  const weight = (r: CheckResult) => WEIGHT[r.priority];
  const earned = applicable.filter((r) => r.passed).reduce((sum, r) => sum + weight(r), 0);
  const total = applicable.reduce((sum, r) => sum + weight(r), 0);

  // A category with nothing applicable is vacuously complete, not a zero.
  // Unreachable today — every category has unconditional checks — but a zero
  // here would read as "this page failed" when it means "nothing was asked".
  const score = total === 0 ? 100 : Math.round((earned / total) * 100);

  return {
    breakdown: {
      score,
      passed: applicable.filter((r) => r.passed).map((r) => r.label),
      failed: applicable.filter((r) => !r.passed).map((r) => r.label),
      skipped: results.filter((r) => !r.applicable).map((r) => r.label),
    },
    results,
  };
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
