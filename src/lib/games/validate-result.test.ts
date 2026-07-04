import { describe, it, expect } from "vitest";
import { validateResult } from "./validate-result";
import { answerFor } from "./alfazy";
import { secretFor } from "./hit-and-blow";

describe("validateResult", () => {
  it("accepts a genuine Alfazy win (last guess equals the answer)", () => {
    // Uses the real answerFor(0) for puzzle 0 to build a valid payload.
    const r = validateResult({
      game: "alfazy",
      puzzleNumber: 0,
      status: "won",
      guesses: [answerFor(0)],
      timeMs: 1000,
    });
    expect(r.valid).toBe(true);
  });

  it("rejects a claimed win whose guesses never reach the answer", () => {
    const r = validateResult({
      game: "alfazy",
      puzzleNumber: 0,
      status: "won",
      guesses: ["zzzzz"],
      timeMs: 1000,
    });
    expect(r.valid).toBe(false);
  });

  it("rejects more guesses than the game allows", () => {
    const r = validateResult({
      game: "alfazy",
      puzzleNumber: 0,
      status: "lost",
      guesses: Array(99).fill("aaaaa"),
      timeMs: null,
    });
    expect(r.valid).toBe(false);
  });

  describe("hit_and_blow", () => {
    it("accepts a genuine win (last guess equals the secret)", () => {
      // Uses the real secretFor(0) for puzzle 0 to build a valid payload.
      const r = validateResult({
        game: "hit_and_blow",
        puzzleNumber: 0,
        status: "won",
        guesses: [secretFor(0)],
        timeMs: 1000,
      });
      expect(r.valid).toBe(true);
    });

    it("rejects a claimed win whose guess never matches the secret", () => {
      const secret = secretFor(0);
      const guess = secret === "9999" ? "8888" : "9999";
      const r = validateResult({
        game: "hit_and_blow",
        puzzleNumber: 0,
        status: "won",
        guesses: [guess],
        timeMs: 1000,
      });
      expect(r.valid).toBe(false);
    });

    it("rejects a win-then-padded-loss (premature win hidden behind a later losing guess)", () => {
      const secret = secretFor(0);
      const filler = secret === "0000" ? "1111" : "0000";
      const r = validateResult({
        game: "hit_and_blow",
        puzzleNumber: 0,
        status: "lost",
        guesses: [secret, filler],
        timeMs: 1000,
      });
      expect(r.valid).toBe(false);
    });
  });
});
