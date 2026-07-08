import { describe, expect, it } from "vitest";
import { puzzleNumberFor, isYesterday, isTodayOrYesterday } from "./daily";

const NOW = Date.UTC(2026, 6, 8, 6, 0, 0); // fixed instant
const today = puzzleNumberFor(NOW);

describe("isYesterday / isTodayOrYesterday", () => {
  it("today is not yesterday but is today-or-yesterday", () => {
    expect(isYesterday(today, NOW)).toBe(false);
    expect(isTodayOrYesterday(today, NOW)).toBe(true);
  });
  it("yesterday qualifies", () => {
    expect(isYesterday(today - 1, NOW)).toBe(true);
    expect(isTodayOrYesterday(today - 1, NOW)).toBe(true);
  });
  it("two days ago is archive", () => {
    expect(isTodayOrYesterday(today - 2, NOW)).toBe(false);
  });
});
