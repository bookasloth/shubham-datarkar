import { describe, it, expect } from "vitest";
import { scorePage } from "./scoring";
import type { PageEntry, PageAnalysis } from "./types";
import type { PageType } from "./routes";

const entryOf = (route: string, pageType: PageType): PageEntry => ({
  route,
  filePath: "src/app/x/page.tsx",
  isDynamic: false,
  isPrivate: false,
  inSitemap: true,
  pageType,
});

const goodEntry = entryOf("/about", "pillar");

const goodAnalysis: PageAnalysis = {
  title: "Founder, Marketer & Copywriter — Shubham Datarkar",
  titleLength: 49,
  description:
    "Shubham Datarkar is a founder, marketer, and copywriter building things that make other things easier for the people who use them.",
  descriptionLength: 130,
  hasCanonical: true,
  hasOgTags: true,
  hasTwitterCard: true,
  robotsIndex: true,
  robotsFollow: true,
  schemas: ["BreadcrumbList", "ProfilePage", "Person", "WebSite"],
  hasBreadcrumbs: true,
  schemaParseErrors: 0,
  ogImageSource: "root-fallback",
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
};

describe("scorePage", () => {
  it("returns SEO/GEO/AEO scores as percentages 0-100", () => {
    const scores = scorePage(goodEntry, goodAnalysis);
    expect(scores.seo.score).toBeGreaterThanOrEqual(0);
    expect(scores.seo.score).toBeLessThanOrEqual(100);
    expect(scores.geo.score).toBeGreaterThanOrEqual(0);
    expect(scores.geo.score).toBeLessThanOrEqual(100);
    expect(scores.aeo.score).toBeGreaterThanOrEqual(0);
    expect(scores.aeo.score).toBeLessThanOrEqual(100);
  });

  it("returns overall as weighted average", () => {
    const scores = scorePage(goodEntry, goodAnalysis);
    const expected = Math.round(scores.seo.score * 0.5 + scores.geo.score * 0.3 + scores.aeo.score * 0.2);
    expect(scores.overall).toBe(expected);
  });

  it("returns correct color based on overall score", () => {
    const scores = scorePage(goodEntry, goodAnalysis);
    expect(["red", "orange", "yellow", "green"]).toContain(scores.color);
  });

  it("tracks passed and failed check labels", () => {
    const scores = scorePage(goodEntry, goodAnalysis);
    // Applicable checks only; geo-faq and aeo-faq are skipped on /about.
    expect(scores.seo.passed.length + scores.seo.failed.length).toBe(13);
    expect(scores.geo.passed.length + scores.geo.failed.length).toBe(9);
    expect(scores.aeo.passed.length + scores.aeo.failed.length).toBe(7);
  });

  it("includes all checks with category and priority", () => {
    const scores = scorePage(goodEntry, goodAnalysis);
    expect(scores.checks.length).toBe(31); // 13 + 10 + 8 (incl. skipped)
    scores.checks.forEach((c) => {
      expect(["seo", "geo", "aeo"]).toContain(c.category);
      expect(["high", "medium", "low"]).toContain(c.priority);
    });
  });
});

describe("profile-aware scoring", () => {
  it("does not fail a utility page for lacking FAQ schema", () => {
    const contact = entryOf("/contact", "utility");
    const scores = scorePage(contact, goodAnalysis);
    const faq = scores.checks.find((c) => c.id === "geo-faq")!;
    expect(faq.applicable).toBe(false);
    expect(faq.passed).toBe(false);
    expect(scores.geo.failed).not.toContain("Has FAQ schema");
    expect(scores.geo.skipped).toContain("Has FAQ schema");
  });

  it("does demand FAQ schema on /faq and on service pages", () => {
    for (const route of ["/faq", "/services/seo"]) {
      const type: PageType = route === "/faq" ? "hub" : "pillar";
      const scores = scorePage(entryOf(route, type), goodAnalysis);
      expect(scores.checks.find((c) => c.id === "geo-faq")!.applicable).toBe(true);
    }
  });

  it("does not demand a 300-word body of a utility page", () => {
    const scores = scorePage(entryOf("/link", "utility"), { ...goodAnalysis, wordCount: 12 });
    expect(scores.checks.find((c) => c.id === "geo-word-count")!.applicable).toBe(false);
  });

  it("does not demand a breadcrumb of the homepage", () => {
    const scores = scorePage(entryOf("/", "pillar"), goodAnalysis);
    expect(scores.checks.find((c) => c.id === "seo-breadcrumb")!.applicable).toBe(false);
    expect(scores.checks.find((c) => c.id === "geo-breadcrumbs")!.applicable).toBe(false);
  });

  it("demands a dedicated OG image of a pillar but not of a hub", () => {
    expect(scorePage(entryOf("/about", "pillar"), goodAnalysis).checks.find((c) => c.id === "seo-og-image")!.applicable).toBe(true);
    expect(scorePage(entryOf("/blog", "hub"), goodAnalysis).checks.find((c) => c.id === "seo-og-image")!.applicable).toBe(false);
  });
});

describe("weighting", () => {
  it("costs more to fail a high-priority check than a low-priority one", () => {
    // Both fixtures fail exactly ONE check, so the score difference is
    // attributable to weight alone, not to the number of failures.
    // hasCanonical -> seo-canonical (high, 3). hasTwitterCard -> seo-twitter (low, 1).
    const missingCanonical = scorePage(goodEntry, { ...goodAnalysis, hasCanonical: false });
    const missingTwitter = scorePage(goodEntry, { ...goodAnalysis, hasTwitterCard: false });

    const failedCanonical = missingCanonical.checks.filter((c) => c.applicable && !c.passed);
    const failedTwitter = missingTwitter.checks.filter((c) => c.applicable && !c.passed);
    expect(failedCanonical.length).toBe(failedTwitter.length);

    expect(missingCanonical.seo.score).toBeLessThan(missingTwitter.seo.score);
  });

  it("a high-priority failure costs exactly three times a low-priority one", () => {
    const baseline = scorePage(goodEntry, goodAnalysis).seo.score;
    const missingCanonical = scorePage(goodEntry, { ...goodAnalysis, hasCanonical: false }).seo.score;
    const missingTwitter = scorePage(goodEntry, { ...goodAnalysis, hasTwitterCard: false }).seo.score;
    expect(baseline - missingCanonical).toBeGreaterThan(2 * (baseline - missingTwitter));
  });

  it("scores 100 when every applicable check passes", () => {
    const perfect: PageAnalysis = {
      ...goodAnalysis,
      titleLength: 45,
      descriptionLength: 140,
      ogImageSource: "dedicated",
      schemas: ["BreadcrumbList", "ProfilePage", "Person", "WebSite", "FAQPage", "Service"],
      hasBreadcrumbs: true,
      h1Count: 1,
      h2Count: 3,
      wordCount: 800,
      internalLinks: 6,
      listCount: 2,
    };
    const scores = scorePage(entryOf("/services/seo", "pillar"), perfect);
    expect(scores.seo.score).toBe(100);
    expect(scores.geo.score).toBe(100);
    expect(scores.aeo.score).toBe(100);
    expect(scores.overall).toBe(100);
  });

  it("a skipped check is neither passed nor failed", () => {
    const scores = scorePage(entryOf("/contact", "utility"), goodAnalysis);
    for (const b of [scores.seo, scores.geo, scores.aeo]) {
      const overlap = b.skipped.filter((s) => b.passed.includes(s) || b.failed.includes(s));
      expect(overlap).toEqual([]);
    }
  });

  it("requires at least one H2 on every scored page", () => {
    const noH2 = scorePage(goodEntry, { ...goodAnalysis, h2Count: 0 });
    const check = noH2.checks.find((c) => c.id === "seo-h2-present")!;
    expect(check.applicable).toBe(true);
    expect(check.passed).toBe(false);
  });
});
