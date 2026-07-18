import { describe, it, expect } from "vitest";
import { extractSourceFacts, buildDraftPrompt, buildCritiquePrompt } from "./writing";
import { FAKE_BRIEF } from "./brief";

const PARAMS = { targetWords: 1500, tone: "professional", audience: "marketers" };

describe("extractSourceFacts", () => {
  it("keeps numeric fact-sentences, drops boilerplate and non-numeric prose", () => {
    const pages = [
      { rank: 2, bodyText: "AI Overviews now appear on 47% of informational searches. Subscribe to our newsletter for more." },
      { rank: 1, bodyText: "This is a generic sentence with no numbers at all. Perplexity handled 250 million queries in 2024." },
    ];
    const facts = extractSourceFacts(pages);
    expect(facts.some((f) => f.includes("47%"))).toBe(true);
    expect(facts.some((f) => f.includes("250 million"))).toBe(true);
    // rank-ordered: rank 1's fact comes before rank 2's
    expect(facts[0]).toContain("Perplexity");
    // boilerplate + non-numeric dropped
    expect(facts.some((f) => /subscribe/i.test(f))).toBe(false);
    expect(facts.some((f) => f.includes("generic sentence"))).toBe(false);
  });

  it("dedupes and caps", () => {
    const dup = "A study found 30% of buyers start on ChatGPT now instead of Google search.";
    const pages = [{ rank: 1, bodyText: [dup, dup, dup].join(" ") }];
    expect(extractSourceFacts(pages)).toHaveLength(1);
    const many = Array.from({ length: 40 }, (_, i) => `Fact number ${i} covers ${i * 3} percent of cases here.`).join(" ");
    expect(extractSourceFacts([{ rank: 1, bodyText: many }], 18)).toHaveLength(18);
  });

  it("empty pages → no facts section in the prompts", () => {
    const draft = buildDraftPrompt(FAKE_BRIEF, PARAMS, { title: "t", description: "d", sections: [] }, []);
    expect(draft.user).not.toContain("Source facts");
    const withFacts = buildDraftPrompt(FAKE_BRIEF, PARAMS, { title: "t", description: "d", sections: [] }, ["AEO lifts citations by 20% in tests."]);
    expect(withFacts.user).toContain("Source facts");
    expect(withFacts.user).toContain("20%");
  });

  it("critique prompt carries the grounding instruction + facts", () => {
    const c = buildCritiquePrompt(FAKE_BRIEF, PARAMS, [{ type: "p", text: "draft" }], ["Perplexity handled 250 million queries in 2024."]);
    expect(c.system).toMatch(/not supported by the source facts/i);
    expect(c.user).toContain("250 million");
  });
});
