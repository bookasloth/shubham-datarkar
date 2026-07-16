import { describe, it, expect } from "vitest";
import { validateResult } from "./validate-result";
import { puzzleNumberFor } from "@/lib/daily";
import { answerFor } from "./alfazy";
import { secretFor } from "./hit-and-blow";

const today = puzzleNumberFor("alfazy");
const hbToday = puzzleNumberFor("hit_and_blow");

describe("validateResult — alfazy", () => {
  it("accepts a genuine win on today's puzzle, as a streak-bearing daily result", () => {
    const r = validateResult({
      game: "alfazy",
      puzzleNumber: today,
      status: "won",
      guesses: [answerFor(today)],
      timeMs: 1000,
    });
    expect(r).toEqual({ valid: true, source: "daily" });
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

  it("accepts a past puzzle but marks it archive, so it can never reach the streak path", () => {
    const r = validateResult({
      game: "alfazy",
      puzzleNumber: 0,
      status: "won",
      guesses: [answerFor(0)],
      timeMs: 1000,
    });
    expect(r).toEqual({ valid: true, source: "archive" });
  });

  it("marks yesterday archive too — it is free to play, but must not extend a streak", () => {
    const y = today - 1;
    const r = validateResult({
      game: "alfazy",
      puzzleNumber: y,
      status: "won",
      guesses: [answerFor(y)],
      timeMs: 1000,
    });
    expect(r).toEqual({ valid: true, source: "archive" });
  });

  it("rejects a future puzzle (re-deriving it would hand out tomorrow's answer)", () => {
    const r = validateResult({
      game: "alfazy",
      puzzleNumber: today + 1,
      status: "won",
      guesses: [answerFor(today + 1)],
      timeMs: 1000,
    });
    expect(r.valid).toBe(false);
  });

  it("still re-derives the answer for archive puzzles — a forged archive win is rejected", () => {
    const answer = answerFor(0);
    const guess = answer === "zzzzz" ? "qqqqq" : "zzzzz";
    const r = validateResult({
      game: "alfazy",
      puzzleNumber: 0,
      status: "won",
      guesses: [guess],
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
