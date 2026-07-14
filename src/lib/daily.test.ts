import { describe, expect, it } from "vitest";
import {
  puzzleNumberFor,
  puzzleDateISO,
  todayISO,
  isYesterday,
  isTodayOrYesterday,
  seededShuffle,
} from "./daily";

const NOW = Date.UTC(2026, 6, 8, 6, 0, 0); // fixed instant: 2026-07-08 11:30 IST
const today = puzzleNumberFor("alfazy", NOW);

describe("per-game epochs", () => {
  // Each game's puzzle #0 is its own launch day, at IST midnight. These pin the
  // launch dates — if someone shifts an epoch, this fails loudly rather than
  // silently renumbering every puzzle.
  it("puzzle #0 lands on each game's launch day", () => {
    expect(puzzleDateISO("alfazy", 0)).toBe("2026-05-01");
    expect(puzzleDateISO("integra", 0)).toBe("2026-06-01");
    expect(puzzleDateISO("hit_and_blow", 0)).toBe("2026-07-01");
  });

  it("the launch instant itself is puzzle #0, and the day before is #-1", () => {
    const alfazyLaunch = Date.UTC(2026, 3, 30, 18, 30, 0); // 2026-05-01 00:00 IST
    expect(puzzleNumberFor("alfazy", alfazyLaunch)).toBe(0);
    expect(puzzleNumberFor("alfazy", alfazyLaunch + 86_400_000)).toBe(1);
    expect(puzzleNumberFor("alfazy", alfazyLaunch - 1)).toBe(-1);
  });

  it("the same instant is a different puzzle number in each game", () => {
    // 2026-07-08 IST: 68 days after Alfazy's launch, 37 after Integra's, 7 after H&B's.
    expect(puzzleNumberFor("alfazy", NOW)).toBe(68);
    expect(puzzleNumberFor("integra", NOW)).toBe(37);
    expect(puzzleNumberFor("hit_and_blow", NOW)).toBe(7);
  });

  it("a puzzle number round-trips back to its own IST date", () => {
    expect(puzzleDateISO("alfazy", puzzleNumberFor("alfazy", NOW))).toBe("2026-07-08");
    expect(puzzleDateISO("hit_and_blow", puzzleNumberFor("hit_and_blow", NOW))).toBe("2026-07-08");
  });

  it("todayISO is game-agnostic and agrees with every game's date", () => {
    expect(todayISO(NOW)).toBe("2026-07-08");
  });
});

describe("isYesterday / isTodayOrYesterday", () => {
  it("today is not yesterday but is today-or-yesterday", () => {
    expect(isYesterday("alfazy", today, NOW)).toBe(false);
    expect(isTodayOrYesterday("alfazy", today, NOW)).toBe(true);
  });
  it("yesterday qualifies", () => {
    expect(isYesterday("alfazy", today - 1, NOW)).toBe(true);
    expect(isTodayOrYesterday("alfazy", today - 1, NOW)).toBe(true);
  });
  it("two days ago is archive", () => {
    expect(isTodayOrYesterday("alfazy", today - 2, NOW)).toBe(false);
  });
  it("one game's today is not another game's today", () => {
    // The bug this guards: using a global puzzle number would make H&B's #68
    // look live because Alfazy's #68 is.
    expect(isTodayOrYesterday("hit_and_blow", today, NOW)).toBe(false);
  });
});

describe("seededShuffle", () => {
  it("is deterministic for a given seed", () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    expect(seededShuffle(input, 123)).toEqual(seededShuffle(input, 123));
  });
  it("reorders, and a different seed gives a different order", () => {
    const input = Array.from({ length: 50 }, (_, i) => i);
    expect(seededShuffle(input, 1)).not.toEqual(input);
    expect(seededShuffle(input, 1)).not.toEqual(seededShuffle(input, 2));
  });
  it("is a permutation — same members, none lost or duplicated", () => {
    const input = Array.from({ length: 50 }, (_, i) => i);
    expect([...seededShuffle(input, 7)].sort((a, b) => a - b)).toEqual(input);
  });
  it("does not mutate its input", () => {
    const input = [1, 2, 3, 4, 5];
    seededShuffle(input, 9);
    expect(input).toEqual([1, 2, 3, 4, 5]);
  });
});
