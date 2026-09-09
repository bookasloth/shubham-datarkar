import { describe, it, expect } from "vitest";
import { extractSignals } from "./signals";
import { scoreAudit, type ScoringContext } from "./scoring";
import { parseRobotsInfo } from "./robots";
import type { PageClass } from "./types";

// End-to-end over the deterministic engine (no LLM): realistic mini-sites of a
// few page types, asserting the two scores differentiate sensibly and that the
// right findings fire (spec §31).

type PageDef = { url: string; class: PageClass; html: string; status?: number; ok?: boolean };

function ctxOf(pages: PageDef[], opts: { robots?: string; sitemap?: string[]; favicon?: boolean } = {}): ScoringContext {
  const signals = pages.map((pg) =>
    extractSignals({ url: pg.url, class: pg.class, html: pg.html, status: pg.status ?? 200, ok: pg.ok ?? true, redirectHops: 0 }),
  );
  return {
    pages: signals,
    robots: parseRobotsInfo(opts.robots ?? "User-agent: *\nDisallow:"),
    sitemapUrls: opts.sitemap ?? pages.map((p) => p.url),
    faviconPresent: opts.favicon ?? true,
  };
}

const filler = (n: number) => "word ".repeat(n);

function page(o: { title: string; desc: string; url: string; h1: string; h2s?: string[]; schema?: string; words?: number; extras?: string }): string {
  const ld = o.schema ? `<script type="application/ld+json">${o.schema}</script>` : "";
  const h2 = (o.h2s ?? ["Overview", "Details"]).map((h) => `<h2>${h}</h2>`).join("");
  return `<!doctype html><html><head><title>${o.title}</title>
<meta name="description" content="${o.desc}">
<link rel="canonical" href="${o.url}">
<meta property="og:title" content="${o.title}"><meta property="og:image" content="${o.url}/og.png">${ld}</head>
<body><main><article><h1>${o.h1}</h1>${h2}<p>${filler(o.words ?? 400)}</p>
<ul><li>a</li><li>b</li></ul><img src="a.jpg" alt="x">${o.extras ?? ""}</article></main></body></html>`;
}

describe("site type: strong local business", () => {
  const B = "https://smilecare.example";
  const ctx = ctxOf([
    { url: `${B}/`, class: "home", html: page({ title: "SmileCare Dental Clinic in Pune — Implants & Braces", desc: "SmileCare is a dental clinic in Pune offering implants, braces and whitening with experienced dentists and transparent pricing for every patient.", url: `${B}/`, h1: "SmileCare Dental Clinic", schema: '{"@type":"LocalBusiness","name":"SmileCare","sameAs":["https://facebook.com/smilecare"]}', extras: `<a href="${B}/services/implants">Implants</a><a href="${B}/about">About</a><a href="${B}/contact">Contact</a>` }) },
    { url: `${B}/services/implants`, class: "service", html: page({ title: "Dental Implants in Pune — Cost, Procedure & Recovery", desc: "Everything about dental implants at SmileCare Pune: how much they cost, the step-by-step procedure, recovery time and who implants are suitable for.", url: `${B}/services/implants`, h1: "Dental Implants in Pune", h2s: ["How much do implants cost?", "What is the procedure?", "Who is it for?"], schema: '{"@type":"Service","name":"Dental Implants"}', extras: `<a href="${B}/contact">Book</a>` }) },
    { url: `${B}/about`, class: "about", html: page({ title: "About SmileCare — Our Dentists and Clinic in Pune", desc: "Meet the SmileCare team: our experienced dentists, our Pune clinic, our approach to patient care and the credentials behind every treatment we provide.", url: `${B}/about`, h1: "About SmileCare", schema: '{"@type":"Organization","name":"SmileCare"}', extras: `<time datetime="2026-01-01">Updated 2026</time>` }) },
    { url: `${B}/contact`, class: "contact", html: page({ title: "Contact SmileCare Dental Clinic in Pune Today", desc: "Get in touch with SmileCare Dental Clinic in Pune — call us, email us or visit the clinic. Book your consultation for implants, braces or whitening.", url: `${B}/contact`, h1: "Contact Us", extras: `<a href="tel:+912012345678">Call</a><a href="mailto:hi@smilecare.example">Email</a>` }) },
    { url: `${B}/blog/implant-guide`, class: "article", html: page({ title: "The Complete Guide to Dental Implants (2026)", desc: "A complete, up-to-date guide to dental implants: types, costs, risks, alternatives and what to expect at each stage, written by SmileCare's dentists.", url: `${B}/blog/implant-guide`, h1: "Complete Guide to Dental Implants", h2s: ["What are implants?", "How much do they cost?", "What are the risks?"], schema: '{"@type":"Article","datePublished":"2026-01-01"}', extras: `<a href="${B}/services/implants">Our implants</a>` }) },
  ]);
  const { scores, findings } = scoreAudit(ctx);

  it("scores well on both axes", () => {
    expect(scores.seo).toBeGreaterThanOrEqual(75);
    expect(scores.ai).toBeGreaterThanOrEqual(60);
  });
  it("recognises trust + entity signals (few critical findings)", () => {
    expect(findings.filter((f) => f.severity === "critical")).toHaveLength(0);
  });
});

describe("site type: bare SaaS shell (JS-only, no schema)", () => {
  const S = "https://app.example";
  // A near-empty shell: no schema, tiny body, no about/contact, no og image.
  const shell = `<!doctype html><html><head><title>App</title></head><body><div id="root"></div></body></html>`;
  const ctx = ctxOf([{ url: `${S}/`, class: "home", html: shell }], { favicon: false, sitemap: [] });
  const { scores, findings } = scoreAudit(ctx);

  it("scores low on AI visibility", () => {
    expect(scores.ai).toBeLessThan(45);
  });
  it("flags extractability and entity gaps", () => {
    const ids = findings.map((f) => f.id);
    expect(ids).toContain("org-schema");
    expect(ids.some((i) => i === "extractable" || i === "content-in-html")).toBe(true);
  });
});

describe("site type: noindex site", () => {
  const N = "https://staging.example";
  const html = `<!doctype html><html><head><title>Home page of the staging site here</title><meta name="robots" content="noindex"><meta name="description" content="${"desc ".repeat(30)}"></head><body><main><h1>Staging</h1><h2>Bit</h2><p>${filler(300)}</p></main></body></html>`;
  const { scores, findings } = scoreAudit(ctxOf([{ url: `${N}/`, class: "home", html }]));

  it("tanks indexability", () => {
    const idx = scores.seoCategories.find((c) => c.key === "indexability")!;
    expect(idx.score).toBeLessThan(70);
    expect(findings.map((f) => f.id)).toContain("indexable");
  });
});

describe("site type: ecommerce product page", () => {
  const E = "https://shop.example";
  const ctx = ctxOf([
    { url: `${E}/`, class: "home", html: page({ title: "Example Shop — Quality Goods Delivered Fast", desc: "Example Shop sells quality goods with fast delivery, easy returns and secure checkout across the country. Browse our catalogue and order today online.", url: `${E}/`, h1: "Example Shop", schema: '{"@type":"Organization","name":"Example Shop"}', extras: `<a href="${E}/products/widget">Widget</a>` }) },
    { url: `${E}/products/widget`, class: "product", html: page({ title: "Premium Widget — Buy Online at Example Shop", desc: "The premium widget from Example Shop: full specs, pricing, delivery options and warranty. In stock now with fast shipping and a 30-day return policy.", url: `${E}/products/widget`, h1: "Premium Widget", schema: '{"@type":"Product","name":"Premium Widget","offers":{"@type":"Offer","price":"499"}}', extras: `<a href="${E}/">Home</a>` }) },
  ]);
  const { scores } = scoreAudit(ctx);
  it("credits product entity schema", () => {
    const entities = scores.aiCategories.find((c) => c.key === "entities")!;
    const commercial = entities.checks.find((c) => c.id === "commercial-entity");
    expect(commercial?.ratio).toBe(1);
  });
});
