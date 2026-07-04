import { describe, it, expect } from "vitest";
import { validateResult } from "./validate-result";
import { answerFor } from "./alfazy";

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
});
