import { describe, it, expect } from "vitest";
import { secretFor, isValidGuess, scoreGuess } from "./hit-and-blow";

const CODE_SPACE = 4536;

describe("secretFor — daily code generation", () => {
  it("produces a 4-digit, distinct-digit, non-zero-leading code for a full cycle", () => {
    for (let n = 0; n < CODE_SPACE; n++) {
      const s = secretFor(n);
      expect(s).toMatch(/^\d{4}$/);
      expect(s[0]).not.toBe("0");
      expect(new Set(s).size).toBe(4);
    }
  });

  it("never repeats within a 4536-day cycle", () => {
    const seen = new Set<string>();
    for (let n = 0; n < CODE_SPACE; n++) seen.add(secretFor(n));
    expect(seen.size).toBe(CODE_SPACE);
  });

  it("cycles after 4536 days", () => {
    expect(secretFor(7)).toBe(secretFor(7 + CODE_SPACE));
  });

  it("handles negative puzzle numbers deterministically", () => {
    expect(secretFor(-1)).toBe(secretFor(-1));
    expect(secretFor(-1)).toMatch(/^\d{4}$/);
  });
});

describe("isValidGuess", () => {
  it("accepts a distinct-digit, non-zero-leading guess", () => {
    expect(isValidGuess("1234")).toBe(true);
    expect(isValidGuess("9012")).toBe(true);
  });
  it("rejects a leading zero", () => {
    expect(isValidGuess("0123")).toBe(false);
  });
  it("rejects repeated digits", () => {
    expect(isValidGuess("1123")).toBe(false);
  });
  it("rejects wrong length or non-digits", () => {
    expect(isValidGuess("123")).toBe(false);
    expect(isValidGuess("12a4")).toBe(false);
    expect(isValidGuess("")).toBe(false);
  });
});

describe("scoreGuess", () => {
  it("counts hits (right spot) and blows (wrong spot)", () => {
    // secret 1234, guess 1243 -> hits at 0,1 = 2; 4 and 3 present wrong spot = 2 blows
    expect(scoreGuess("1243", "1234")).toEqual({ hits: 2, blows: 2 });
  });
  it("scores a full win", () => {
    expect(scoreGuess("1234", "1234")).toEqual({ hits: 4, blows: 0 });
  });
});
