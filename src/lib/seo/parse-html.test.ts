import { describe, it, expect } from "vitest";
import { parseHtml } from "./parse-html";

const page = (head: string, body = "<main id=\"main\"></main>") =>
  `<!DOCTYPE html><html><head>${head}</head><body>${body}</body></html>`;

describe("parseHtml — head", () => {
  it("extracts the title and its length", () => {
    const r = parseHtml(page("<title>SEO Consultant India</title>"));
    expect(r.title).toBe("SEO Consultant India");
    expect(r.titleLength).toBe(20);
  });

  it("returns a null title when absent", () => {
    const r = parseHtml(page(""));
    expect(r.title).toBeNull();
    expect(r.titleLength).toBe(0);
  });

  it("decodes HTML entities in the title", () => {
    const r = parseHtml(page("<title>Ads &amp; Copy</title>"));
    expect(r.title).toBe("Ads & Copy");
    expect(r.titleLength).toBe(10);
  });

  it("extracts the meta description", () => {
    const r = parseHtml(page('<meta name="description" content="Hello world">'));
    expect(r.description).toBe("Hello world");
    expect(r.descriptionLength).toBe(11);
  });

  it("detects canonical, og, and twitter tags", () => {
    const r = parseHtml(
      page(
        '<link rel="canonical" href="https://x.com/a">' +
          '<meta property="og:title" content="A">' +
          '<meta name="twitter:card" content="summary_large_image">',
      ),
    );
    expect(r.hasCanonical).toBe(true);
    expect(r.hasOgTags).toBe(true);
    expect(r.hasTwitterCard).toBe(true);
  });

  it("defaults robots to index,follow when the meta tag is absent", () => {
    const r = parseHtml(page(""));
    expect(r.robotsIndex).toBe(true);
    expect(r.robotsFollow).toBe(true);
  });

  it("reads noindex and nofollow from the robots meta tag", () => {
    const r = parseHtml(page('<meta name="robots" content="noindex, nofollow">'));
    expect(r.robotsIndex).toBe(false);
    expect(r.robotsFollow).toBe(false);
  });

  it("classifies the root opengraph-image as a root fallback", () => {
    const r = parseHtml(
      page('<meta property="og:image" content="https://shubhamdatarkar.com/opengraph-image?abc">'),
    );
    expect(r.ogImageSource).toBe("root-fallback");
  });

  it("classifies a segment opengraph-image as dedicated", () => {
    const r = parseHtml(
      page('<meta property="og:image" content="https://shubhamdatarkar.com/services/opengraph-image?abc">'),
    );
    expect(r.ogImageSource).toBe("dedicated");
  });

  it("reports no og image when the tag is absent", () => {
    expect(parseHtml(page("")).ogImageSource).toBe("none");
  });

  it("keeps an apostrophe inside a double-quoted content attribute", () => {
    const r = parseHtml(page(`<meta name="description" content="Let's talk about SEO">`));
    expect(r.description).toBe("Let's talk about SEO");
    expect(r.descriptionLength).toBe(20);
  });

  it("keeps a double quote inside a single-quoted content attribute", () => {
    const r = parseHtml(page(`<meta name="description" content='She said "hi" loudly'>`));
    expect(r.description).toBe('She said "hi" loudly');
  });

  it("reads a robots directive containing an apostrophe-free list", () => {
    const r = parseHtml(page(`<meta name="robots" content="noindex, nofollow">`));
    expect(r.robotsIndex).toBe(false);
    expect(r.robotsFollow).toBe(false);
  });
});
