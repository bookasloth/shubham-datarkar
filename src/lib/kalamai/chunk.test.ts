import { describe, it, expect } from "vitest";
import { chunkText, estTokens } from "./chunk";

const words = (n: number) => Array.from({ length: n }, (_, i) => `word${i}`).join(" ") + ".";

describe("chunkText", () => {
  it("returns [] for empty/whitespace", () => {
    expect(chunkText("")).toEqual([]);
    expect(chunkText("   \n  ")).toEqual([]);
  });

  it("keeps very short text as a single chunk", () => {
    const c = chunkText("digital marketing seo content.");
    expect(c).toHaveLength(1);
    expect(c[0].index).toBe(0);
  });

  it("splits a ~2000-word page into multiple bounded chunks with contiguous indices", () => {
    const chunks = chunkText(words(2000));
    expect(chunks.length).toBeGreaterThanOrEqual(8);
    expect(chunks.length).toBeLessThanOrEqual(24);
    chunks.forEach((c, i) => {
      expect(c.index).toBe(i);
      expect(c.tokenCount).toBeLessThanOrEqual(256); // hard cap
      if (i < chunks.length - 1) expect(c.tokenCount).toBeGreaterThanOrEqual(30); // MIN (last may be small)
    });
  });

  it("word-splits a single oversized sentence so no chunk exceeds the cap", () => {
    const giant = Array.from({ length: 4000 }, (_, i) => `w${i}`).join(" "); // no sentence breaks
    const chunks = chunkText(giant);
    expect(chunks.every((c) => c.tokenCount <= 256)).toBe(true);
  });

  it("estTokens ~ chars/4", () => {
    expect(estTokens("abcd")).toBe(1);
    expect(estTokens("a".repeat(400))).toBe(100);
  });
});
