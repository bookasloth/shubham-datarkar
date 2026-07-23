import { describe, it, expect } from "vitest";
import { analyzeReadability, syllablesInWord } from "./readability";

describe("syllablesInWord", () => {
  it("counts common words", () => {
    expect(syllablesInWord("cat")).toBe(1);
    expect(syllablesInWord("apple")).toBe(2);
    expect(syllablesInWord("readability")).toBeGreaterThanOrEqual(4);
    expect(syllablesInWord("the")).toBe(1);
  });
  it("returns 0 for non-words", () => {
    expect(syllablesInWord("123")).toBe(0);
  });
});

describe("analyzeReadability", () => {
  it("returns null for empty input", () => {
    expect(analyzeReadability("")).toBeNull();
    expect(analyzeReadability("   ")).toBeNull();
  });
  it("rates a simple sentence as easy", () => {
    const r = analyzeReadability("The cat sat on the mat. The dog ran.")!;
    expect(r.words).toBe(9);
    expect(r.sentences).toBe(2);
    expect(r.fleschReadingEase).toBeGreaterThan(80); // short words + short sentences = easy
  });
  it("rates a dense sentence as harder", () => {
    const easy = analyzeReadability("I go to the shop. I buy milk. I walk home.")!;
    const hard = analyzeReadability(
      "The utilization of unnecessarily sophisticated terminology consequently diminishes comprehensibility.",
    )!;
    expect(hard.fleschReadingEase).toBeLessThan(easy.fleschReadingEase);
  });
  it("flags sentences over 25 words", () => {
    const long = Array(30).fill("word").join(" ") + ".";
    expect(analyzeReadability(long)!.hardSentences).toHaveLength(1);
  });
});
