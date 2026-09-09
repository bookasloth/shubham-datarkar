import { describe, it, expect } from "vitest";
import { extractSignals } from "./signals";

const RICH = `<!doctype html><html><head>
<title>Dental Implants in Pune | Example Dental</title>
<meta name="description" content="Example Dental offers dental implants in Pune. Learn about cost, procedure, recovery and who implants are suitable for.">
<link rel="canonical" href="https://example.com/services/implants">
<meta property="og:title" content="Dental Implants"><meta property="og:image" content="https://example.com/og.png">
<meta name="twitter:card" content="summary">
<script type="application/ld+json">{"@context":"https://schema.org","@type":"Service","name":"Dental Implants","sameAs":["https://facebook.com/x"],"provider":{"@type":"Dentist"}}</script>
</head><body><main><article>
<h1>Dental Implants in Pune</h1>
<h2>How much do dental implants cost?</h2><p>${"word ".repeat(120)}</p>
<h2>What is the procedure?</h2>
<ul><li>Step one</li><li>Step two</li></ul>
<img src="a.png" alt="implant"><img src="b.png">
<a href="/contact">Contact</a><a href="https://twitter.com/x">External</a>
<a href="tel:+911234567890">Call</a><a href="mailto:hi@example.com">Email</a>
<time datetime="2026-01-01">Updated 2026</time>
</article></main></body></html>`;

describe("extractSignals", () => {
  const s = extractSignals({ url: "https://example.com/services/implants", class: "service", html: RICH, status: 200, ok: true, redirectHops: 0 });

  it("reads head metadata", () => {
    expect(s.title).toContain("Dental Implants");
    expect(s.descriptionLength).toBeGreaterThan(100);
    expect(s.canonical).toBe("https://example.com/services/implants");
    expect(s.canonicalSelf).toBe(true);
    expect(s.hasOgTitle && s.hasOgImage && s.hasTwitterCard).toBe(true);
    expect(s.https).toBe(true);
  });

  it("reads schema, headings, lists and question headings", () => {
    expect(s.schemas).toContain("Service");
    expect(s.hasSameAs).toBe(true);
    expect(s.h1Count).toBe(1);
    expect(s.h2Count).toBe(2);
    expect(s.listCount).toBe(1);
    expect(s.questionHeadings).toBeGreaterThanOrEqual(2);
  });

  it("reads media, links and trust signals", () => {
    expect(s.imageCount).toBe(2);
    expect(s.imagesWithAlt).toBe(1);
    expect(s.internalLinks).toContain("https://example.com/contact");
    expect(s.externalLinkCount).toBeGreaterThanOrEqual(1);
    expect(s.hasTelLink && s.hasMailtoLink).toBe(true);
    expect(s.hasDates).toBe(true);
  });

  it("combines meta robots and X-Robots-Tag for indexability", () => {
    const noindex = extractSignals({ url: "https://example.com/x", class: "other", html: "<html><head></head><body>hi</body></html>", status: 200, ok: true, redirectHops: 0, xRobotsTag: "noindex" });
    expect(noindex.robotsIndex).toBe(false);
  });
});
