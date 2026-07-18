import { describe, expect, it } from "vitest";
import type { ContentBlock } from "@/lib/data/types";
import type { Brief } from "./brief";
import { scoreArticle } from "./score";

const brief: Pick<Brief, "termClusters" | "outline" | "questions"> = {
  termClusters: [{ name: "core", terms: ["seo services", "ppc", "content marketing", "local seo"] }],
  outline: [
    { h2: "SEO Services", h3: [] },
    { h2: "PPC Advertising", h3: [] },
    { h2: "Local SEO for Nagpur", h3: [] },
  ],
  questions: ["How much does it cost?"],
};

const strongArticle: ContentBlock[] = [
  { type: "h2", text: "SEO Services" },
  { type: "p", text: "Our seo services and content marketing drive growth." },
  { type: "h2", text: "PPC Advertising" },
  { type: "p", text: "We run ppc campaigns for local businesses. ".repeat(200) }, // ~1200 words → within the 1000-2200 band
  { type: "h2", text: "Local SEO for Nagpur" },
  { type: "p", text: "Local seo helps you rank in Nagpur." },
  { type: "faq", items: [{ q: "How much does it cost?", a: "It depends on scope." }] },
];

const strongMeta = {
  title: "Digital Marketing Company in Nagpur",
  description: "A results-driven digital marketing company in Nagpur offering SEO, PPC, and content marketing services for local businesses that want to grow.",
  jsonld: '{"@type":"LocalBusiness"}',
};

describe("scoreArticle", () => {
  it("scores a brief-aligned article high and reports full coverage", () => {
    const s = scoreArticle({ blocks: strongArticle, meta: strongMeta, brief, targetWords: 1600 });
    expect(s.details.termCoverage).toBe(1); // all 4 terms present
    expect(s.details.outlineCoverage).toBe(1); // all 3 H2s present
    expect(s.overall).toBeGreaterThanOrEqual(85);
    expect(s.failed).toHaveLength(0);
  });

  it("scores a thin, off-brief article low and lists what failed", () => {
    const weak: ContentBlock[] = [{ type: "h2", text: "Random" }, { type: "p", text: "Short." }];
    const s = scoreArticle({ blocks: weak, meta: {}, brief, targetWords: 2000 });
    expect(s.details.termCoverage).toBe(0);
    expect(s.details.outlineCoverage).toBe(0);
    expect(s.overall).toBeLessThan(40);
    expect(s.failed).toContain("Covers recommended terms");
    expect(s.failed).toContain("Has FAQ section");
  });
});
