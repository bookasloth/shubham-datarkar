import { describe, it, expect } from "vitest";
import { scoreAudit, type ScoringContext } from "./scoring";
import { parseRobotsInfo } from "./robots";
import { mkPage } from "./_fixtures";

const HOME = "https://x.com/";
const SVC = "https://x.com/services/seo";
const ART = "https://x.com/blog/guide";
const ABOUT = "https://x.com/about";
const CONTACT = "https://x.com/contact";

function strongCtx(): ScoringContext {
  const pages = [
    mkPage({ url: HOME, class: "home", schemas: ["Organization", "WebSite"], hasSameAs: true, internalLinks: [SVC, ART, ABOUT, CONTACT] }),
    mkPage({ url: SVC, class: "service", schemas: ["Service", "BreadcrumbList"], internalLinks: [ART, CONTACT] }),
    mkPage({ url: ART, class: "article", schemas: ["Article", "BreadcrumbList"], internalLinks: [SVC], mentionsTestimonials: true }),
    mkPage({ url: ABOUT, class: "about", schemas: ["BreadcrumbList"], internalLinks: [SVC] }),
    mkPage({ url: CONTACT, class: "contact", schemas: ["BreadcrumbList"], hasTelLink: true, hasMailtoLink: true, internalLinks: [SVC] }),
  ];
  return {
    pages,
    robots: parseRobotsInfo("User-agent: *\nDisallow:"),
    sitemapUrls: [HOME, SVC, ART, ABOUT, CONTACT],
    faviconPresent: true,
  };
}

function weakCtx(): ScoringContext {
  const home = mkPage({
    url: "http://y.com/",
    class: "home",
    https: false,
    robotsIndex: false,
    title: null,
    titleLength: 0,
    description: null,
    descriptionLength: 0,
    canonical: null,
    canonicalSelf: false,
    hasOgTitle: false,
    hasOgImage: false,
    hasTwitterCard: false,
    schemas: [],
    h1Count: 0,
    h2Count: 0,
    wordCount: 40,
    listCount: 0,
    imageCount: 2,
    imagesWithAlt: 0,
    internalLinks: [],
    extractOk: false,
    junkRatio: 0.8,
    questionHeadings: 0,
    hasDates: false,
  });
  return { pages: [home], robots: parseRobotsInfo("User-agent: *\nDisallow: /"), sitemapUrls: [], faviconPresent: false };
}

describe("scoreAudit", () => {
  it("scores a healthy site high on both axes", () => {
    const { scores } = scoreAudit(strongCtx());
    expect(scores.seo).toBeGreaterThanOrEqual(80);
    expect(scores.ai).toBeGreaterThanOrEqual(65);
  });

  it("scores a broken site low on both axes", () => {
    const { scores } = scoreAudit(weakCtx());
    expect(scores.seo).toBeLessThan(45);
    expect(scores.ai).toBeLessThan(45);
  });

  it("overall is exactly the 50/50 mean of the two scores", () => {
    const { scores } = scoreAudit(strongCtx());
    expect(scores.overall).toBe(Math.round(scores.seo * 0.5 + scores.ai * 0.5));
  });

  it("emits evidence-based findings for the broken site, most severe first", () => {
    const { findings } = scoreAudit(weakCtx());
    const ids = findings.map((f) => f.id);
    expect(ids).toContain("indexable"); // noindex
    expect(ids).toContain("org-schema"); // no entity markup
    findings.forEach((f) => {
      expect(f.evidence).toBeTruthy();
      expect(f.recommendation).toBeTruthy();
      expect(f.category === "seo" || f.category === "ai").toBe(true);
    });
    const order = ["critical", "high", "medium", "low"];
    const seq = findings.map((f) => order.indexOf(f.severity));
    expect(seq).toEqual([...seq].sort((a, b) => a - b));
  });

  it("does not model llms.txt as a scoring factor (spec §13/§26)", () => {
    const { scores } = scoreAudit(strongCtx());
    const keys = scores.aiCategories.map((c) => c.key);
    expect(keys).toEqual(["readability", "entities", "clarity", "trust", "breadth", "answers"]);
    expect(JSON.stringify(scores)).not.toMatch(/llms\.txt/i);
  });
});
