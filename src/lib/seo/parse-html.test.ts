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

const ld = (json: string) =>
  page("", `<main id="main"></main><script type="application/ld+json">${json}</script>`);

describe("parseHtml — JSON-LD", () => {
  it("collects @type from a single top-level object", () => {
    const r = parseHtml(ld('{"@context":"https://schema.org","@type":"Person","name":"S"}'));
    expect(r.schemas).toEqual(["Person"]);
  });

  it("collects @type from a top-level array", () => {
    const r = parseHtml(ld('[{"@type":"Review"},{"@type":"Review"},{"@type":"Product"}]'));
    expect(r.schemas.sort()).toEqual(["Product", "Review"]);
  });

  it("unwraps @graph containers", () => {
    const r = parseHtml(ld('{"@context":"https://schema.org","@graph":[{"@type":"Person"},{"@type":"WebSite"}]}'));
    expect(r.schemas.sort()).toEqual(["Person", "WebSite"]);
  });

  it("handles an @type that is itself an array", () => {
    const r = parseHtml(ld('{"@type":["Person","Author"]}'));
    expect(r.schemas.sort()).toEqual(["Author", "Person"]);
  });

  it("does not descend into nested entities", () => {
    const r = parseHtml(ld('{"@type":"Article","author":{"@type":"Person","name":"S"}}'));
    expect(r.schemas).toEqual(["Article"]);
  });

  it("sets hasBreadcrumbs from BreadcrumbList", () => {
    expect(parseHtml(ld('{"@type":"BreadcrumbList"}')).hasBreadcrumbs).toBe(true);
    expect(parseHtml(ld('{"@type":"Article"}')).hasBreadcrumbs).toBe(false);
  });

  it("counts malformed blocks without throwing", () => {
    const r = parseHtml(ld("{not json}"));
    expect(r.schemaParseErrors).toBe(1);
    expect(r.schemas).toEqual([]);
  });

  it("keeps parsing valid blocks after a malformed one", () => {
    const html = page(
      "",
      '<main id="main"></main>' +
        '<script type="application/ld+json">{oops}</script>' +
        '<script type="application/ld+json">{"@type":"FAQPage"}</script>',
    );
    const r = parseHtml(html);
    expect(r.schemaParseErrors).toBe(1);
    expect(r.schemas).toEqual(["FAQPage"]);
  });

  it("deduplicates repeated types", () => {
    const r = parseHtml(ld('[{"@type":"Review"},{"@type":"Review"}]'));
    expect(r.schemas).toEqual(["Review"]);
  });
});

const doc = (body: string) =>
  `<!DOCTYPE html><html><head><title>T</title></head><body>` +
  `<nav><a href="/about">About</a><a href="/blog">Blog</a><a href="/work">Work</a></nav>` +
  body +
  `<footer><a href="/faq">FAQ</a><p>Footer words here</p></footer>` +
  `</body></html>`;

describe("parseHtml — main region", () => {
  it("ignores links outside the main region", () => {
    const r = parseHtml(doc('<main id="main"><a href="/contact">Contact</a></main>'));
    expect(r.internalLinks).toBe(1);
    expect(r.mainRegionFound).toBe(true);
  });

  it("runs to the LAST closing main tag when layouts nest their own", () => {
    const r = parseHtml(
      doc('<main id="main"><main class="inner"><h2>Inner</h2></main><h2>Outer</h2></main>'),
    );
    expect(r.h2Count).toBe(2);
  });

  it("falls back to the body and flags mainRegionFound=false", () => {
    const r = parseHtml(doc("<div><h1>No main</h1></div>"));
    expect(r.mainRegionFound).toBe(false);
    expect(r.h1Count).toBe(1);
    expect(r.internalLinks).toBe(4); // nav 3 + footer 1
  });

  it("counts headings", () => {
    const r = parseHtml(doc('<main id="main"><h1>A</h1><h2>B</h2><h2>C</h2><h3>D</h3></main>'));
    expect(r.h1Count).toBe(1);
    expect(r.h2Count).toBe(2);
    expect(r.h3Count).toBe(1);
  });

  it("counts lists and tables", () => {
    const r = parseHtml(doc('<main id="main"><ul><li>a</li></ul><ol><li>b</li></ol><table></table></main>'));
    expect(r.listCount).toBe(3);
  });

  it("separates internal from external links", () => {
    const r = parseHtml(
      doc('<main id="main"><a href="/a">a</a><a href="https://x.com">x</a></main>'),
    );
    expect(r.internalLinks).toBe(1);
    expect(r.externalLinks).toBe(1);
  });

  it("counts images and those missing alt text", () => {
    const r = parseHtml(doc('<main id="main"><img src="a.png" alt="A"><img src="b.png"></main>'));
    expect(r.imageCount).toBe(2);
    expect(r.missingAltCount).toBe(1);
  });

  it("counts words from text only, excluding markup and scripts", () => {
    const r = parseHtml(
      doc('<main id="main"><p>one two three</p><script>var ignored = "four five";</script></main>'),
    );
    expect(r.wordCount).toBe(3);
  });

  it("derives readingTime from wordCount with a floor of 1", () => {
    const r = parseHtml(doc('<main id="main"><p>one</p></main>'));
    expect(r.readingTime).toBe(1);
  });

  it("decodes entities before counting words", () => {
    const r = parseHtml(doc('<main id="main"><p>ads &amp; copy</p></main>'));
    expect(r.wordCount).toBe(3);
  });
});
