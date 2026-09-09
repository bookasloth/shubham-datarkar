// src/lib/books/types.test.ts
import { describe, it, expect } from "vitest";
import { slugify, computePercentage } from "./types";

describe("slugify", () => {
  it("lowercases, strips punctuation, hyphenates", () => {
    expect(slugify("The Psychology of Money!")).toBe("the-psychology-of-money");
  });
  it("collapses whitespace and trims hyphens", () => {
    expect(slugify("  Deep   Work  ")).toBe("deep-work");
  });
});

describe("computePercentage", () => {
  it("computes and rounds", () => {
    expect(computePercentage(180, 300, "currently_reading")).toBe(60);
  });
  it("forces 100 when finished regardless of pages", () => {
    expect(computePercentage(10, 300, "finished")).toBe(100);
    expect(computePercentage(null, null, "finished")).toBe(100);
  });
  it("clamps above 100", () => {
    expect(computePercentage(400, 300, "currently_reading")).toBe(100);
  });
  it("returns null when pages missing or zero", () => {
    expect(computePercentage(50, null, "currently_reading")).toBeNull();
    expect(computePercentage(50, 0, "currently_reading")).toBeNull();
    expect(computePercentage(null, 300, "want_to_read")).toBeNull();
  });
});
