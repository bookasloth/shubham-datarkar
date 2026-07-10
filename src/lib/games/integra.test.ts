import { describe, it, expect } from "vitest";
import { EQUATION_LIST } from "./integra-equations";
import {
  INTEGRA,
  INTEGRA_LAUNCH,
  answerFor,
  evaluate,
  isValidGuess,
  scoreGuess,
  isWin,
} from "./integra";

describe("EQUATION_LIST", () => {
  it("every entry is exactly 7 chars and a valid equation", () => {
    for (const eq of EQUATION_LIST) {
      expect(eq.length, `${eq} length`).toBe(INTEGRA.length);
      expect(isValidGuess(eq), `${eq} validity`).toBe(true);
    }
  });

  it("has no accidental duplicates", () => {
    expect(new Set(EQUATION_LIST).size).toBe(EQUATION_LIST.length);
  });
});

describe("evaluate", () => {
  it("respects order of operations", () => {
    expect(evaluate("2+3*4")).toBe(14);
    expect(evaluate("2*3+4")).toBe(10);
    expect(evaluate("12+3")).toBe(15);
    expect(evaluate("1+2+3")).toBe(6);
  });

  it("is left-associative for same precedence", () => {
    expect(evaluate("8/2/2")).toBe(2);
    expect(evaluate("9-4-3")).toBe(2);
  });

  it("only allows exact integer division", () => {
    expect(evaluate("7/2")).toBeNull();
    expect(evaluate("6/4")).toBeNull();
    expect(evaluate("8/4")).toBe(2);
  });

  it("rejects division by zero", () => {
    expect(evaluate("5/0")).toBeNull();
  });

  it("rejects leading zeros and malformed input", () => {
    expect(evaluate("01+1")).toBeNull();
    expect(evaluate("-5+7")).toBeNull(); // leading operator (no negatives)
    expect(evaluate("5++5")).toBeNull();
    expect(evaluate("5+")).toBeNull();
    expect(evaluate("")).toBeNull();
  });
});

describe("isValidGuess", () => {
  it("accepts a well-formed equation", () => {
    expect(isValidGuess("12+3=15")).toBe(true);
    expect(isValidGuess("96/8=12")).toBe(true);
  });

  it("rejects wrong length", () => {
    expect(isValidGuess("1+2=3")).toBe(false);
    expect(isValidGuess("12+34=46")).toBe(false);
  });

  it("rejects when the two sides differ", () => {
    expect(isValidGuess("12+3=16")).toBe(false);
  });

  it("requires exactly one '=' and a bare integer on the right", () => {
    expect(isValidGuess("1+2=3=6")).toBe(false);
    expect(isValidGuess("15=1+14")).toBe(false); // operator on the right
    expect(isValidGuess("1+1+1=1")).toBe(false); // wrong result but well-formed length
  });

  it("rejects a leading zero on the right", () => {
    expect(isValidGuess("1+1=002")).toBe(false);
  });
});

describe("scoreGuess", () => {
  it("marks correct / present / absent with duplicate handling", () => {
    // answer 1,2,+,3,=,1,5 ; guess 1,3,+,2,=,1,5
    expect(scoreGuess("13+2=15", "12+3=15")).toEqual([
      "correct", "present", "correct", "present", "correct", "correct", "correct",
    ]);
  });

  it("does not over-mark a repeated char beyond the answer's count", () => {
    // answer "12+1=13" has a single '2'; guess "22+2=13" has three '2's.
    // Only the '2' in the correct position lights up; the other two are absent.
    expect(scoreGuess("22+2=13", "12+1=13")).toEqual([
      "absent", "correct", "correct", "absent", "correct", "correct", "correct",
    ]);
  });

  it("isWin only when all correct", () => {
    expect(isWin(scoreGuess("12+3=15", "12+3=15"))).toBe(true);
    expect(isWin(scoreGuess("13+2=15", "12+3=15"))).toBe(false);
  });
});

describe("answerFor", () => {
  it("serves the easiest equation on launch day and ramps", () => {
    expect(answerFor(INTEGRA_LAUNCH)).toBe(EQUATION_LIST[0]);
    expect(answerFor(INTEGRA_LAUNCH + 1)).toBe(EQUATION_LIST[1]);
  });

  it("is deterministic and wraps by modulo", () => {
    expect(answerFor(INTEGRA_LAUNCH + EQUATION_LIST.length)).toBe(EQUATION_LIST[0]);
    expect(answerFor(INTEGRA_LAUNCH - 1)).toBe(EQUATION_LIST[EQUATION_LIST.length - 1]);
  });
});
