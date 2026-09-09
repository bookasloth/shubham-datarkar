import { describe, it, expect } from "vitest";
import { parseSitemap, isSitemapLoc, extractLinks, normalizeUrl, classifyUrl, discoverUrls } from "./discover";

const BASE = new URL("https://example.com/");

describe("parseSitemap", () => {
  it("extracts loc values and decodes entities + CDATA", () => {
    const xml = `<urlset><url><loc>https://example.com/a?x=1&amp;y=2</loc></url><url><loc><![CDATA[https://example.com/b]]></loc></url></urlset>`;
    expect(parseSitemap(xml)).toEqual(["https://example.com/a?x=1&y=2", "https://example.com/b"]);
  });
  it("returns empty for no locs", () => {
    expect(parseSitemap("<urlset></urlset>")).toEqual([]);
  });
});

describe("isSitemapLoc", () => {
  it("flags nested sitemap index entries", () => {
    expect(isSitemapLoc("https://example.com/sitemap-1.xml")).toBe(true);
    expect(isSitemapLoc("https://example.com/page-sitemap")).toBe(true);
    expect(isSitemapLoc("https://example.com/services/seo")).toBe(false);
  });
});

describe("normalizeUrl", () => {
  it("resolves relative links to absolute same-origin", () => {
    expect(normalizeUrl("/services/seo", BASE)).toBe("https://example.com/services/seo");
  });
  it("strips hash, query and trailing slash (except root)", () => {
    expect(normalizeUrl("/about/?utm=x#top", BASE)).toBe("https://example.com/about");
    expect(normalizeUrl("/", BASE)).toBe("https://example.com/");
  });
  it("rejects off-origin, assets, and non-http schemes", () => {
    expect(normalizeUrl("https://other.com/x", BASE)).toBeNull();
    expect(normalizeUrl("/logo.png", BASE)).toBeNull();
    expect(normalizeUrl("mailto:a@b.com", BASE)).toBeNull();
    expect(normalizeUrl("#section", BASE)).toBeNull();
  });
});

describe("extractLinks", () => {
  it("returns unique same-origin normalized hrefs", () => {
    const html = `<a href="/a">A</a><a href='/a/'>dup</a><a href="https://other.com/z">off</a><a href="/b#x">B</a>`;
    expect(extractLinks(html, "https://example.com/").sort()).toEqual([
      "https://example.com/a",
      "https://example.com/b",
    ]);
  });
});

describe("classifyUrl", () => {
  it("classifies by path", () => {
    expect(classifyUrl("https://example.com/")).toBe("home");
    expect(classifyUrl("https://example.com/services/seo")).toBe("service");
    expect(classifyUrl("https://example.com/pricing")).toBe("product");
    expect(classifyUrl("https://example.com/about")).toBe("about");
    expect(classifyUrl("https://example.com/contact")).toBe("contact");
    expect(classifyUrl("https://example.com/blog/post-1")).toBe("article");
    expect(classifyUrl("https://example.com/random-page")).toBe("other");
  });
});

describe("discoverUrls", () => {
  const homeHtml = `
    <a href="/services/seo">SEO</a>
    <a href="/services/ppc">PPC</a>
    <a href="/about">About</a>
    <a href="/blog/deep-guide/part/two">Guide</a>
    <a href="/random">Random</a>`;

  it("always puts the homepage first with class home", () => {
    const out = discoverUrls({ homeUrl: "https://example.com/", homeHtml, budget: 10 });
    expect(out[0]).toEqual({ url: "https://example.com/", class: "home", priority: 0 });
  });

  it("prioritizes services over about over article over other, ties by depth", () => {
    const out = discoverUrls({ homeUrl: "https://example.com/", homeHtml, budget: 10 });
    const classes = out.map((u) => u.class);
    expect(classes.indexOf("service")).toBeLessThan(classes.indexOf("about"));
    expect(classes.indexOf("about")).toBeLessThan(classes.indexOf("article"));
    expect(classes.indexOf("article")).toBeLessThan(classes.indexOf("other"));
  });

  it("unions sitemap locs, skips nested sitemaps, dedupes the homepage", () => {
    const out = discoverUrls({
      homeUrl: "https://example.com/",
      homeHtml: "",
      sitemapLocs: [
        "https://example.com/",
        "https://example.com/products/widget",
        "https://example.com/nested-sitemap.xml",
        "https://other.com/x",
      ],
    });
    const urls = out.map((u) => u.url);
    expect(urls.filter((u) => u === "https://example.com/")).toHaveLength(1);
    expect(urls).toContain("https://example.com/products/widget");
    expect(urls).not.toContain("https://example.com/nested-sitemap.xml");
    expect(urls).not.toContain("https://other.com/x");
  });

  it("caps to the budget", () => {
    const many = Array.from({ length: 50 }, (_, i) => `<a href="/p/${i}">${i}</a>`).join("");
    const out = discoverUrls({ homeUrl: "https://example.com/", homeHtml: many, budget: 5 });
    expect(out).toHaveLength(5);
    expect(out[0].class).toBe("home");
  });
});
