import { describe, it, expect } from "vitest";
import { scorePage } from "./scoring";
import type { PageEntry, PageAnalysis } from "./types";

const goodEntry: PageEntry = {
  route: "/about",
  filePath: "src/app/about/page.tsx",
  isDynamic: false,
  isPrivate: false,
  inSitemap: true,
};

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
    expect(scores.seo.passed.length + scores.seo.failed.length).toBe(12);
    expect(scores.geo.passed.length + scores.geo.failed.length).toBe(10);
    expect(scores.aeo.passed.length + scores.aeo.failed.length).toBe(8);
  });

  it("includes all checks with category and priority", () => {
    const scores = scorePage(goodEntry, goodAnalysis);
    expect(scores.checks.length).toBe(30); // 12 + 10 + 8
    scores.checks.forEach((c) => {
      expect(["seo", "geo", "aeo"]).toContain(c.category);
      expect(["high", "medium", "low"]).toContain(c.priority);
    });
  });
});
