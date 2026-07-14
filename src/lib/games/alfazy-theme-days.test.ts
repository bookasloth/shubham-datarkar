import { describe, expect, it } from "vitest";
import { puzzleDateISO } from "@/lib/daily";
import { answerFor, isValidGuess, themeWordFor } from "@/lib/games/alfazy";
import { THEME_DAYS } from "@/lib/games/alfazy-theme-days";

/** The Alfazy puzzle number whose IST date is `iso`. */
function puzzleOn(iso: string): number {
  for (let n = 0; n < 4000; n++) if (puzzleDateISO("alfazy", n) === iso) return n;
  throw new Error(`no alfazy puzzle on ${iso}`);
}

describe("alfazy theme days", () => {
  it("serves the themed word on its date", () => {
    expect(answerFor(puzzleOn("2027-04-22"))).toBe("earth"); // Earth Day
    expect(answerFor(puzzleOn("2026-08-15"))).toBe("india");
  });

  it("recurs every year", () => {
    expect(answerFor(puzzleOn("2028-04-22"))).toBe("earth");
  });

  it("leaves non-theme days on the shuffled formula", () => {
    const n = puzzleOn("2026-08-16");
    expect(themeWordFor(n)).toBeUndefined();
    expect(answerFor(n)).toHaveLength(5);
  });

  it("every theme word is 5 letters and guessable", () => {
    for (const [day, word] of Object.entries(THEME_DAYS)) {
      expect(word, day).toMatch(/^[a-z]{5}$/);
      expect(isValidGuess(word), day).toBe(true);
    }
  });
});
