import { describe, it, expect } from "vitest";
import { discoverStep, crawlStep, scoreStep, type AuditRow, type AuditDeps } from "./job-server";
import type { DetailedFetch } from "@/lib/tools/safe-fetch";
import type { PageSignals } from "./signals";

const ok = (url: string, body: string): DetailedFetch => ({ finalUrl: url, status: 200, redirectHops: 0, contentType: "text/html", xRobotsTag: null, body });

const HOME_HTML = `<html><head><title>Acme Dental — Implants in Pune</title>
<meta name="description" content="Acme Dental provides implants, whitening and checkups in Pune with transparent pricing and experienced dentists on staff.">
<link rel="icon" href="/favicon.ico"><link rel="canonical" href="https://acme.com/">
<script type="application/ld+json">{"@type":"Organization","name":"Acme"}</script></head>
<body><main><h1>Acme Dental</h1><h2>Our services</h2>
<a href="/services/implants">Implants</a><a href="/about">About</a><a href="/blog/guide">Guide</a>
<p>${"clinic ".repeat(80)}</p></main></body></html>`;

const ROBOTS = "User-agent: *\nDisallow:\nSitemap: https://acme.com/sitemap.xml";
const SITEMAP = `<urlset><url><loc>https://acme.com/</loc></url><url><loc>https://acme.com/services/implants</loc></url><url><loc>https://acme.com/about</loc></url></urlset>`;

function deps(pages: Record<string, string>): AuditDeps {
  return {
    fetchPage: async (url) => (pages[url] ? ok(url, pages[url]) : { finalUrl: url, status: 200, redirectHops: 0, contentType: "text/html", xRobotsTag: null, body: `<html><head><title>${url}</title></head><body><main><h1>${url}</h1><p>${"x ".repeat(120)}</p></main></body></html>` }),
    fetchText: async (url) => (url.endsWith("/robots.txt") ? ROBOTS : url.endsWith("sitemap.xml") ? SITEMAP : null),
  };
}

const baseRow = (over: Partial<AuditRow>): AuditRow => ({
  id: "a1", url: "https://acme.com/", domain: "acme.com", status: "queued", progress: 0, page_budget: 12,
  crawl_cursor: 0, urls: [], crawl_meta: null, pages: [], scores: null, findings: null, created_at: new Date().toISOString(), ...over,
});

describe("discoverStep", () => {
  it("builds the crawl list, seeds the homepage, and captures crawl meta", async () => {
    const t = await discoverStep(baseRow({}), deps({ "https://acme.com/": HOME_HTML }));
    expect(t.result.status).toBe("crawling");
    const urls = t.patch.urls as { url: string; class: string }[];
    expect(urls[0]).toMatchObject({ url: "https://acme.com/", class: "home" });
    expect(urls.some((u) => u.url === "https://acme.com/services/implants")).toBe(true);
    const meta = t.patch.crawl_meta as { sitemapUrls: string[]; faviconPresent: boolean };
    expect(meta.sitemapUrls).toContain("https://acme.com/services/implants");
    expect(meta.faviconPresent).toBe(true);
    expect((t.patch.pages as PageSignals[])[0].class).toBe("home");
    expect(t.patch.crawl_cursor).toBe(1);
  });

  it("fails when the homepage is unreachable", async () => {
    await expect(
      discoverStep(baseRow({}), { fetchPage: async (u) => ({ finalUrl: u, status: 500, redirectHops: 0, contentType: "", xRobotsTag: null, body: null }), fetchText: async () => null }),
    ).rejects.toThrow(/unreachable/);
  });
});

describe("crawlStep", () => {
  it("crawls the remaining batch and finishes at scoring", async () => {
    const urls = [
      { url: "https://acme.com/", class: "home" as const, priority: 0 },
      { url: "https://acme.com/services/implants", class: "service" as const, priority: 1 },
      { url: "https://acme.com/about", class: "about" as const, priority: 3 },
    ];
    const seeded = baseRow({ status: "crawling", urls, crawl_cursor: 1, pages: [{ url: "https://acme.com/", class: "home" } as PageSignals] });
    const t = await crawlStep(seeded, deps({}));
    expect(t.result.status).toBe("scoring");
    expect((t.patch.pages as PageSignals[]).length).toBe(3);
    expect(t.patch.crawl_cursor).toBe(3);
  });
});

describe("scoreStep", () => {
  it("produces scores and findings, status ready", () => {
    const pages: PageSignals[] = [
      { url: "https://acme.com/", class: "home", ok: true, status: 200, redirectHops: 0, https: true, title: "Acme Dental Implants Pune", titleLength: 40, description: "d".repeat(140), descriptionLength: 140, canonical: "https://acme.com/", canonicalSelf: true, robotsIndex: true, hasOgTitle: true, hasOgImage: true, hasTwitterCard: true, schemas: ["Organization"], schemaParseErrors: 0, h1Count: 1, h2Count: 3, h3Count: 0, skippedHeadingLevel: false, wordCount: 400, listCount: 1, imageCount: 1, imagesWithAlt: 1, internalLinks: ["https://acme.com/about"], externalLinkCount: 0, extractOk: true, junkRatio: 0.1, questionHeadings: 1, hasDates: true, hasTelLink: true, hasMailtoLink: false, mentionsTestimonials: false, hasSameAs: false, bodyFingerprint: "home" },
    ];
    const row = baseRow({ status: "scoring", pages, crawl_meta: { robotsTxt: ROBOTS, sitemapUrls: ["https://acme.com/"], faviconPresent: true } });
    const t = scoreStep(row);
    expect(t.result.status).toBe("ready");
    const scores = t.patch.scores as { seo: number; ai: number; overall: number };
    expect(scores.overall).toBe(Math.round(scores.seo * 0.5 + scores.ai * 0.5));
    expect(t.patch.page_count).toBe(1);
    expect(Array.isArray(t.patch.findings)).toBe(true);
  });
});
