import { describe, it, expect, vi } from "vitest";

// audit.ts pulls blog posts from the DB (a server-only module). Stub it so the
// unit test runs offline; page discovery still covers all static routes.
vi.mock("@/lib/blog/queries", () => ({ getPublishedPosts: async () => [] }));

import { buildSummary, auditSinglePage } from "./audit";
import { scorePage } from "./scoring";
import type { PageEntry, PageAnalysis, PageAuditEntry } from "./types";

function makeEntry(route: string, overrides: Partial<PageEntry> = {}): PageEntry {
  return {
    route,
    filePath: `src/app${route}/page.tsx`,
    isPrivate: false,
    inSitemap: true,
    pageType: "pillar",
    ...overrides,
  };
}

function makeAnalysis(overrides: Partial<PageAnalysis> = {}): PageAnalysis {
  return {
    title: "A Fine Page Title That Is Long Enough",
    titleLength: 40,
    description:
      "A description long enough to pass the 120-160 character length check used by the SEO scoring rules for this page.",
    descriptionLength: 130,
    hasCanonical: true,
    hasOgTags: true,
    hasTwitterCard: true,
    robotsIndex: true,
    robotsFollow: true,
    schemas: ["BreadcrumbList", "Article"],
    hasBreadcrumbs: true,
    schemaParseErrors: 0,
    ogImageSource: "dedicated",
    h1Count: 1,
    h2Count: 3,
    h3Count: 2,
    wordCount: 500,
    readingTime: 3,
    internalLinks: 5,
    externalLinks: 2,
    imageCount: 3,
    missingAltCount: 0,
    listCount: 2,
    mainRegionFound: true,
    ...overrides,
  };
}

/** A page that failed to fetch/parse: analysis and scores both null. */
function makeUnreachable(route: string, overrides: Partial<PageEntry> = {}): PageAuditEntry {
  return { entry: makeEntry(route, overrides), analysis: null, scores: null };
}

/** A page that was fetched and scored, using real scorePage output. */
function makeScored(route: string, analysisOverrides: Partial<PageAnalysis> = {}, entryOverrides: Partial<PageEntry> = {}): PageAuditEntry {
  const entry = makeEntry(route, entryOverrides);
  const analysis = makeAnalysis(analysisOverrides);
  return { entry, analysis, scores: scorePage(entry, analysis) };
}

/** A page scored with an explicit page type, using real scorePage output. */
function makeScoredWithType(route: string, pageType: PageEntry["pageType"]): PageAuditEntry {
  return makeScored(route, {}, { pageType });
}

describe("buildSummary", () => {
  it("counts only public pages, and unreachable pages fill the gap", () => {
    const pages: PageAuditEntry[] = [
      makeScored("/about"),
      makeScored("/contact", { robotsIndex: false }),
      makeUnreachable("/broken"),
      makeScored("/secret", {}, { isPrivate: true }),
    ];

    const summary = buildSummary(pages);

    // private page excluded entirely, not counted anywhere
    expect(summary.totalPages).toBe(3);
    expect(summary.unreachablePages).toBe(1);
    expect(summary.indexedPages + summary.notIndexedPages + summary.unreachablePages).toBe(
      summary.totalPages,
    );
    const colorTotal = Object.values(summary.colorDistribution).reduce((a, b) => a + b, 0);
    expect(colorTotal + summary.unreachablePages).toBe(summary.totalPages);
  });

  it("averages scored pages only — a null-analysis page does not drag the average toward zero", () => {
    const entryA = makeEntry("/good-a");
    const entryB = makeEntry("/good-b");
    const analysisA = makeAnalysis();
    const analysisB = makeAnalysis({ hasTwitterCard: false, h2Count: 1 });
    const scoresA = scorePage(entryA, analysisA);
    const scoresB = scorePage(entryB, analysisB);

    const pages: PageAuditEntry[] = [
      { entry: entryA, analysis: analysisA, scores: scoresA },
      { entry: entryB, analysis: analysisB, scores: scoresB },
      makeUnreachable("/broken"),
    ];

    const summary = buildSummary(pages);

    const expectedAvgSeo = Math.round((scoresA.seo.score + scoresB.seo.score) / 2);
    const expectedAvgGeo = Math.round((scoresA.geo.score + scoresB.geo.score) / 2);
    const expectedAvgAeo = Math.round((scoresA.aeo.score + scoresB.aeo.score) / 2);

    expect(summary.avgSeoScore).toBe(expectedAvgSeo);
    expect(summary.avgGeoScore).toBe(expectedAvgGeo);
    expect(summary.avgAeoScore).toBe(expectedAvgAeo);

    // if the null page were scored as 0, averaging over 3 would pull every
    // average down — guard against that regression explicitly.
    const brokenAvgSeo = Math.round((scoresA.seo.score + scoresB.seo.score + 0) / 3);
    if (expectedAvgSeo !== brokenAvgSeo) {
      expect(summary.avgSeoScore).not.toBe(brokenAvgSeo);
    }
  });

  it("an all-unreachable input yields zeroed averages and no issues", () => {
    const pages: PageAuditEntry[] = [makeUnreachable("/broken-1"), makeUnreachable("/broken-2")];

    const summary = buildSummary(pages);

    expect(summary.totalPages).toBe(summary.unreachablePages);
    expect(summary.totalPages).toBe(2);
    expect(summary.avgSeoScore).toBe(0);
    expect(summary.avgGeoScore).toBe(0);
    expect(summary.avgAeoScore).toBe(0);
    expect(summary.issuesByType).toEqual([]);
  });

  it("missingOgImage counts pillars only, matching the check that scores it", () => {
    // `seo-og-image` has applies: onlyOn("pillar"). A hub without a dedicated OG
    // image is not failing anything, so the KPI must not count it — otherwise the
    // dashboard number contradicts the score beside it.
    const noOgImage = { ogImageSource: "root-fallback" as const };
    const pillar = makeScored("/about", noOgImage, { pageType: "pillar" });
    const hub = makeScored("/blog", noOgImage, { pageType: "hub" });
    const utility = makeScored("/contact", noOgImage, { pageType: "utility" });

    const summary = buildSummary([pillar, hub, utility]);

    expect(summary.totalPages).toBe(3);
    expect(summary.missingOgImage).toBe(1);
  });

  it("an empty input does not divide by zero", () => {
    const summary = buildSummary([]);

    expect(summary.totalPages).toBe(0);
    expect(summary.unreachablePages).toBe(0);
    expect(summary.avgSeoScore).toBe(0);
    expect(summary.avgGeoScore).toBe(0);
    expect(summary.avgAeoScore).toBe(0);
  });
});

describe("issuesByType", () => {
  it("keys on check id, so no issue can exceed the page count", () => {
    // The fixture must produce real failures, or the loop below iterates an empty
    // array and asserts nothing. /services/* makes the FAQ checks applicable and
    // the default analysis omits "FAQPage", so geo-faq and aeo-faq both fail on
    // both pages. Under the old label key those two collapse into one row of 4
    // across 2 pages — which is precisely the bug this test exists to catch.
    const pages = [makeScored("/services/seo"), makeScored("/services/consulting")];
    const summary = buildSummary(pages);

    expect(summary.issuesByType.length).toBeGreaterThan(0);
    for (const issue of summary.issuesByType) {
      expect(issue.count).toBeLessThanOrEqual(summary.totalPages);
    }
  });

  it("counts geo-faq and aeo-faq separately despite the shared label", () => {
    // /services/* is one of the two routes hasVisibleFaq() recognizes, so the FAQ
    // checks are applicable here. The default analysis schemas omit "FAQPage", so
    // both geo-faq and aeo-faq fail — this is the only way to make the shared-label
    // assertions below non-vacuous. With /a and /b (used elsewhere in this file),
    // hasVisibleFaq() is false, both checks are skipped, and the "distinct ids"
    // assertions over an empty array would pass trivially without testing anything.
    const pages = [makeScored("/services/seo"), makeScored("/services/consulting")];
    const summary = buildSummary(pages);
    const faqIssues = summary.issuesByType.filter((i) => i.label === "Has FAQ schema");
    expect(faqIssues.length).toBe(2);
    // Either both categories failed it, or neither did — but they must be distinct rows.
    const ids = faqIssues.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every((id) => id === "geo-faq" || id === "aeo-faq")).toBe(true);
  });

  it("never reports a check that did not apply to the page", () => {
    // A utility page skips geo-faq entirely; it must not appear as an issue.
    const utility = makeScoredWithType("/contact", "utility");
    const summary = buildSummary([utility]);
    expect(summary.issuesByType.map((i) => i.id)).not.toContain("geo-faq");
  });
});

describe("auditSinglePage", () => {
  it("returns null for an unknown route without fetching", async () => {
    await expect(auditSinglePage("/nonexistent-xyz-123")).resolves.toBeNull();
  });
});
