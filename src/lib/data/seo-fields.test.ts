import { describe, it, expect } from "vitest";
import { services } from "./services";
import { products } from "./products";
import { caseStudies } from "./case-studies";
import { tools } from "./tools";

/**
 * The `seo` block is optional and empty today — PR 4 fills it. What this pins is
 * the copy rule: any title that IS set must fit the 15-40 char window, because
 * the root template appends 20 more, and must not double-brand.
 */
const all = [
  ...services.map((s) => ({ kind: "service", slug: s.slug, seo: s.seo })),
  ...products.map((p) => ({ kind: "product", slug: p.slug, seo: p.seo })),
  ...caseStudies.map((c) => ({ kind: "case-study", slug: c.slug, seo: c.seo })),
  ...tools.map((t) => ({ kind: "tool", slug: t.slug, seo: t.seo })),
];

describe("SeoFields copy rules", () => {
  it("a set title is 15-40 chars", () => {
    for (const e of all) {
      if (e.seo?.title) {
        expect(e.seo.title.length, `${e.kind}/${e.slug}`).toBeGreaterThanOrEqual(15);
        expect(e.seo.title.length, `${e.kind}/${e.slug}`).toBeLessThanOrEqual(40);
      }
    }
  });

  it("a set title never contains the brand name", () => {
    for (const e of all) {
      if (e.seo?.title) {
        expect(e.seo.title.toLowerCase(), `${e.kind}/${e.slug}`).not.toContain("shubham");
      }
    }
  });

  it("a set description is 120-160 chars", () => {
    for (const e of all) {
      if (e.seo?.description) {
        expect(e.seo.description.length, `${e.kind}/${e.slug}`).toBeGreaterThanOrEqual(120);
        expect(e.seo.description.length, `${e.kind}/${e.slug}`).toBeLessThanOrEqual(160);
      }
    }
  });
});
