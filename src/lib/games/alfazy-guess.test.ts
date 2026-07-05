import { describe, it, expect } from "vitest";
import { isValidGuess } from "./alfazy";
import { ANSWER_LIST } from "./word-list";

describe("isValidGuess — dictionary validation", () => {
  it("accepts a common opener from the dictionary", () => {
    expect(isValidGuess("stare")).toBe(true);
    expect(isValidGuess("point")).toBe(true);
    expect(isValidGuess("moist")).toBe(true);
  });

  it("accepts every current answer (answers must be guessable)", () => {
    for (const answer of ANSWER_LIST) {
      expect(isValidGuess(answer)).toBe(true);
    }
  });

  it("accepts an obscure but valid dictionary word", () => {
    expect(isValidGuess("adyta")).toBe(true);
    expect(isValidGuess("abaft")).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(isValidGuess("ADIEU")).toBe(true);
    expect(isValidGuess("Crane")).toBe(true);
  });

  it("rejects non-dictionary gibberish", () => {
    expect(isValidGuess("zzzzz")).toBe(false);
    expect(isValidGuess("qwxzv")).toBe(false);
  });

  it("rejects wrong length or non-letters", () => {
    expect(isValidGuess("cat")).toBe(false);
    expect(isValidGuess("cranes")).toBe(false);
    expect(isValidGuess("cr4ne")).toBe(false);
    expect(isValidGuess("")).toBe(false);
  });
});
