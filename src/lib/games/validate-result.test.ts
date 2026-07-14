import { describe, it, expect } from "vitest";
import { validateResult } from "./validate-result";
import { puzzleNumberFor } from "@/lib/daily";
import { answerFor } from "./alfazy";
import { secretFor } from "./hit-and-blow";

const today = puzzleNumberFor("alfazy");
const hbToday = puzzleNumberFor("hit_and_blow");

describe("validateResult — alfazy", () => {
  it("accepts a genuine win on today's puzzle (last guess equals the answer)", () => {
    const r = validateResult({
      game: "alfazy",
      puzzleNumber: today,
      status: "won",
      guesses: [answerFor(today)],
      timeMs: 1000,
    });
    expect(r.valid).toBe(true);
  });

  it("rejects a claimed win whose guess never reaches the answer", () => {
    const answer = answerFor(today);
    const guess = answer === "zzzzz" ? "qqqqq" : "zzzzz";
    const r = validateResult({
      game: "alfazy",
      puzzleNumber: today,
      status: "won",
      guesses: [guess],
      timeMs: 1000,
    });
    expect(r.valid).toBe(false);
  });

  it("rejects a genuine-looking win submitted for a NON-today (archive) puzzle", () => {
    // Puzzle 0 is in the past; even with its real answer, only today is submittable.
    const r = validateResult({
      game: "alfazy",
      puzzleNumber: 0,
      status: "won",
      guesses: [answerFor(0)],
      timeMs: 1000,
    });
    expect(r.valid).toBe(false);
  });

  it("rejects more guesses than the game allows", () => {
    const r = validateResult({
      game: "alfazy",
      puzzleNumber: today,
      status: "lost",
      guesses: Array(7).fill("aaaaa"),
      timeMs: null,
    });
    expect(r.valid).toBe(false);
  });

  it("rejects a guess that is not a legal move (non-letters)", () => {
    const r = validateResult({
      game: "alfazy",
      puzzleNumber: today,
      status: "won",
      guesses: ["12345"],
      timeMs: 1000,
    });
    expect(r.valid).toBe(false);
  });

  it("rejects a 'lost' that did not exhaust all guesses", () => {
    const answer = answerFor(today);
    const filler = answer === "aaaaa" ? "bbbbb" : "aaaaa";
    const r = validateResult({
      game: "alfazy",
      puzzleNumber: today,
      status: "lost",
      guesses: Array(3).fill(filler),
      timeMs: null,
    });
    expect(r.valid).toBe(false);
  });
});

describe("validateResult — hit_and_blow", () => {
  it("accepts a genuine win on hbToday's puzzle (last guess equals the secret)", () => {
    const r = validateResult({
      game: "hit_and_blow",
      puzzleNumber: hbToday,
      status: "won",
      guesses: [secretFor(hbToday)],
      timeMs: 1000,
    });
    expect(r.valid).toBe(true);
  });

  it("rejects a claimed win whose guess never matches the secret", () => {
    const secret = secretFor(hbToday);
    const guess = ["0123", "1234", "2345"].find((g) => g !== secret)!;
    const r = validateResult({
      game: "hit_and_blow",
      puzzleNumber: hbToday,
      status: "won",
      guesses: [guess],
      timeMs: 1000,
    });
    expect(r.valid).toBe(false);
  });

  it("rejects a win-then-padded-loss (premature win hidden behind a later losing guess)", () => {
    const secret = secretFor(hbToday);
    const filler = ["0123", "1234", "2345"].find((g) => g !== secret)!;
    const r = validateResult({
      game: "hit_and_blow",
      puzzleNumber: hbToday,
      status: "lost",
      guesses: [secret, filler],
      timeMs: 1000,
    });
    expect(r.valid).toBe(false);
  });
});
