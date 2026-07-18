import { describe, it, expect } from "vitest";
import { dlDistance, buildNormalizer, VARIANT_MAP } from "./hinglish";

describe("dlDistance", () => {
  it("counts edits incl. transposition", () => {
    expect(dlDistance("nahi", "nahi")).toBe(0);
    expect(dlDistance("nahi", "nahin")).toBe(1); // insertion
    expect(dlDistance("kya", "kaya")).toBe(1); // insertion
    expect(dlDistance("ab", "ba")).toBe(1); // transposition
    expect(dlDistance("from", "form")).toBe(1); // transposition (English — must NOT merge)
  });
});

describe("buildNormalizer", () => {
  it("hand map collapses the nahi family", () => {
    const norm = buildNormalizer(new Map([["nahi", 5], ["nahin", 3], ["nhi", 2]]));
    expect([norm("nahi"), norm("nahin"), norm("nhi")]).toEqual(["nahi", "nahi", "nahi"]);
  });

  it("edit-distance merges an unmapped lexicon variant into the higher-frequency form", () => {
    // "karna"/"karne" are lexicon tokens not in the map; share prefix + DL<=1.
    const norm = buildNormalizer(new Map([["karna", 10], ["karne", 2]]));
    expect(norm("karne")).toBe("karna"); // merged into the higher-count anchor
  });

  it("never merges English words (from/form) — not in the lexicon", () => {
    const norm = buildNormalizer(new Map([["from", 10], ["form", 9]]));
    expect(norm("form")).toBe("form");
    expect(norm("from")).toBe("from");
  });

  it("map has no identity entries", () => {
    for (const [k, v] of Object.entries(VARIANT_MAP)) expect(k).not.toBe(v);
  });
});
