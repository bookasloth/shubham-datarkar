import { describe, it, expect } from "vitest";
import { extractSourceFacts, buildDraftPrompt, buildCritiquePrompt, enforceWordCap } from "./writing";
import { FAKE_BRIEF } from "./brief";
import type { ContentBlock } from "@/lib/data/types";

const PARAMS = { targetWords: 1600, tone: "professional", audience: "marketers" };
const U = "https://src.example/a";

describe("extractSourceFacts", () => {
  it("keeps numeric fact-sentences with their source url, drops boilerplate and non-numeric prose", () => {
    const pages = [
      { rank: 2, url: "https://b.example", bodyText: "AI Overviews now appear on 47% of informational searches. Subscribe to our newsletter for more." },
      { rank: 1, url: "https://a.example", bodyText: "This is a generic sentence with no numbers at all. Perplexity handled 250 million queries in 2024." },
    ];
    const facts = extractSourceFacts(pages);
    expect(facts.some((f) => f.text.includes("47%") && f.url === "https://b.example")).toBe(true);
    // rank-ordered: rank 1's fact comes first, carrying rank 1's url
    expect(facts[0].text).toContain("Perplexity");
    expect(facts[0].url).toBe("https://a.example");
    expect(facts.some((f) => /subscribe/i.test(f.text))).toBe(false);
    expect(facts.some((f) => f.text.includes("generic sentence"))).toBe(false);
  });

  it("dedupes and caps", () => {
    const dup = "A study found 30% of buyers start on ChatGPT now instead of Google search.";
    expect(extractSourceFacts([{ rank: 1, url: U, bodyText: [dup, dup, dup].join(" ") }])).toHaveLength(1);
    const many = Array.from({ length: 40 }, (_, i) => `Fact number ${i} covers ${i * 3} percent of cases here.`).join(" ");
    expect(extractSourceFacts([{ rank: 1, url: U, bodyText: many }], 18)).toHaveLength(18);
  });

  it("empty pages → no facts section; facts → source url appears for backlinking", () => {
    const draft = buildDraftPrompt(FAKE_BRIEF, PARAMS, { title: "t", description: "d", sections: [] }, []);
    expect(draft.user).not.toContain("Source facts");
    const withFacts = buildDraftPrompt(FAKE_BRIEF, PARAMS, { title: "t", description: "d", sections: [] }, [{ text: "AEO lifts citations by 20% in tests.", url: U }]);
    expect(withFacts.user).toContain("Source facts");
    expect(withFacts.user).toContain("20%");
    expect(withFacts.user).toContain(U);
    expect(draft.system).toMatch(/BACKLINK/);
    expect(draft.system).toMatch(/1000 and 2200 words/);
  });

  it("critique flags unsourced stats + word band", () => {
    const c = buildCritiquePrompt(FAKE_BRIEF, PARAMS, [{ type: "p", text: "draft" }], [{ text: "Perplexity handled 250 million queries in 2024.", url: U }]);
    expect(c.system).toMatch(/not supported by the source facts/i);
    expect(c.system).toMatch(/1000-2200 words/);
    expect(c.user).toContain("250 million");
  });
});

describe("enforceWordCap", () => {
  it("trims over-length body but preserves a trailing faq, and leaves short articles untouched", () => {
    const long = (n: number): ContentBlock => ({ type: "p", text: Array.from({ length: n }, () => "word").join(" ") });
    const faq: ContentBlock = { type: "faq", items: [{ q: "q?", a: "a" }] };
    const blocks: ContentBlock[] = [long(1500), long(1500), faq];
    const capped = enforceWordCap(blocks, 2200);
    // second 1500-word body block dropped, faq kept
    expect(capped.some((b) => b.type === "faq")).toBe(true);
    expect(capped.filter((b) => b.type === "p").length).toBe(1);
    // already-short article is returned unchanged
    const short: ContentBlock[] = [long(50), faq];
    expect(enforceWordCap(short, 2200)).toEqual(short);
  });
});
