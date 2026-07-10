import { describe, it, expect } from "vitest";
import { extractPage } from "./extract";

const HTML = `<!doctype html><html><head>
<title>Digital Marketing &amp; SEO in Nagpur</title>
<meta name="description" content="Grow your business with SEO.">
<script type="application/ld+json">{"@type":"LocalBusiness","name":"Acme"}</script>
</head><body>
<nav><a href="/">Home</a> NAVJUNK NAVJUNK</nav>
<main>
  <article>
    <header><h1>Digital Marketing Company in Nagpur</h1></header>
    <p>We offer SEO and content marketing for local businesses.</p>
    <h2>Our SEO Services</h2>
    <p>Keyword research and on-page optimisation.</p>
    <h3>Local SEO</h3>
    <ul><li>Google Business Profile</li></ul>
  </article>
</main>
<footer>FOOTERJUNK FOOTERJUNK contact us</footer>
</body></html>`;

describe("extractPage", () => {
  const page = extractPage(HTML);

  it("pulls head fields via parseHtml", () => {
    expect(page.title).toBe("Digital Marketing & SEO in Nagpur");
    expect(page.metaDescription).toBe("Grow your business with SEO.");
    expect(page.jsonldTypes).toContain("LocalBusiness");
  });

  it("extracts the ordered heading tree with decoded text", () => {
    expect(page.headings).toEqual([
      { level: 1, text: "Digital Marketing Company in Nagpur" },
      { level: 2, text: "Our SEO Services" },
      { level: 3, text: "Local SEO" },
    ]);
  });

  it("keeps the article header H1 but drops nav and footer chrome", () => {
    expect(page.bodyText).toContain("Digital Marketing Company in Nagpur");
    expect(page.bodyText).toContain("Keyword research");
    expect(page.bodyText).not.toContain("NAVJUNK");
    expect(page.bodyText).not.toContain("FOOTERJUNK");
  });

  it("counts words from the cleaned body", () => {
    expect(page.wordCount).toBeGreaterThan(10);
  });
});
