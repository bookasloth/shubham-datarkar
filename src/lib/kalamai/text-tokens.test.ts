import { describe, it, expect } from "vitest";
import { backgroundFrequencies, ngramOf } from "./text-tokens";

describe("backgroundFrequencies", () => {
  it("aggregates gram counts across docs and sums totalTokens", () => {
    const { terms, totalTokens, docCount } = backgroundFrequencies([
      "content marketing content marketing",
      "content strategy",
    ]);
    expect(docCount).toBe(2);
    const byTerm = new Map(terms.map((t) => [t.term, t.count]));
    // "content" appears 3x total (2 in doc1 + 1 in doc2).
    expect(byTerm.get("content")).toBe(3);
    // bigram "content marketing" appears 2x in doc1.
    expect(byTerm.get("content marketing")).toBe(2);
    // totalTokens = sum of every stored gram count (matches distill's serpTotal).
    expect(totalTokens).toBe(terms.reduce((s, t) => s + t.count, 0));
    // ngram column is derived, not guessed.
    expect(terms.find((t) => t.term === "content marketing")!.ngram).toBe(2);
    expect(ngramOf("content")).toBe(1);
  });

  it("minCount prunes rows but leaves totalTokens as the true corpus size", () => {
    const docs = ["content marketing content marketing rare"];
    const all = backgroundFrequencies(docs, 1);
    const pruned = backgroundFrequencies(docs, 2);
    // "rare" (count 1) dropped from stored rows at minCount=2...
    expect(all.terms.some((t) => t.term === "rare")).toBe(true);
    expect(pruned.terms.some((t) => t.term === "rare")).toBe(false);
    // ...but the denominator is unchanged so downstream priors stay honest.
    expect(pruned.totalTokens).toBe(all.totalTokens);
  });
});
