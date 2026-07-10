import { describe, it, expect } from "vitest";
import { rankTerms, type TermPage } from "./terms";

function page(over: Partial<TermPage>): TermPage {
  return {
    rank: 1,
    aiCited: false,
    headings: [],
    metaTitle: null,
    metaDescription: null,
    bodyText: "",
    ...over,
  };
}

const CORPUS: TermPage[] = [
  page({
    rank: 1,
    headings: [{ level: 1, text: "digital marketing nagpur" }],
    metaTitle: "Digital Marketing",
    bodyText: "digital marketing digital marketing seo",
  }),
  page({
    rank: 2,
    headings: [{ level: 1, text: "digital marketing agency" }],
    bodyText: "digital marketing seo content",
  }),
  page({
    rank: 5,
    headings: [{ level: 2, text: "seo services" }],
    bodyText: "seo seo content unicorn",
  }),
];

describe("rankTerms", () => {
  const ranked = rankTerms(CORPUS);
  const byTerm = new Map(ranked.map((t) => [t.term, t]));

  it("ranks the consensus head term above a single-page body term", () => {
    const head = byTerm.get("digital marketing");
    const rare = byTerm.get("unicorn");
    expect(head).toBeDefined();
    expect(rare).toBeDefined();
    expect(head!.score).toBeGreaterThan(rare!.score);
    // A unigram always has >= the count of any phrase containing it, so the top
    // term is a "digital"-family head term, not necessarily the bigram.
    expect(ranked[0].term).toContain("digital");
  });

  it("recommends placement by where the term is most prominent", () => {
    expect(byTerm.get("nagpur")?.placement).toBe("h1"); // only in page 1's H1
    expect(byTerm.get("unicorn")?.placement).toBe("body"); // only in body
  });

  it("applies the 1.3x AI-Overview-cited bonus", () => {
    const base = rankTerms([page({ rank: 1, headings: [{ level: 1, text: "seo audit" }], bodyText: "seo audit" })]);
    const cited = rankTerms([page({ rank: 1, aiCited: true, headings: [{ level: 1, text: "seo audit" }], bodyText: "seo audit" })]);
    const b = base.find((t) => t.term === "seo audit")!.score;
    const c = cited.find((t) => t.term === "seo audit")!.score;
    expect(c).toBeCloseTo(b * 1.3, 5);
  });

  it("reports a body frequency range", () => {
    const head = byTerm.get("digital marketing")!;
    expect(head.freq.max).toBeGreaterThanOrEqual(head.freq.min);
    expect(head.freq.max).toBeGreaterThanOrEqual(1);
  });
});
