import { ANSWER_LIST } from "./word-list";
import { VALID_GUESSES } from "./valid-guesses";

export const ALFAZY = { length: 5, maxGuesses: 6 } as const;

export type Tile = "correct" | "present" | "absent";

/** Deterministic answer for a puzzle number. List is pre-frozen; modulo cycles. */
export function answerFor(puzzleNumber: number): string {
  const n = ANSWER_LIST.length;
  return ANSWER_LIST[((puzzleNumber % n) + n) % n];
}

/**
 * Score a guess. Two-pass so duplicate letters resolve correctly
 * (verified: speed/erase -> present.absent.present.present.absent).
 */
export function scoreGuess(guess: string, answer: string): Tile[] {
  const g = guess.toLowerCase();
  const a = answer.toLowerCase();
  const res: Tile[] = new Array(g.length).fill("absent");
  const counts: Record<string, number> = {};
  for (const ch of a) counts[ch] = (counts[ch] ?? 0) + 1;
  for (let i = 0; i < g.length; i++) {
    if (g[i] === a[i]) { res[i] = "correct"; counts[g[i]]--; }
  }
  for (let i = 0; i < g.length; i++) {
    if (res[i] === "correct") continue;
    if ((counts[g[i]] ?? 0) > 0) { res[i] = "present"; counts[g[i]]--; }
  }
  return res;
}

export const isWin = (tiles: Tile[]) => tiles.every((t) => t === "correct");

/**
 * A guess is valid when it is a 5-letter word in the standard allowed-guess
 * dictionary. Answers are unioned in as a safety net so any future answer stays
 * guessable even if it is not in the dictionary (all current answers already are).
 */
export const isValidGuess = (guess: string) => {
  const g = guess.toLowerCase();
  if (!/^[a-z]{5}$/.test(g)) return false;
  return VALID_GUESSES.has(g) || ANSWER_LIST.includes(g);
};

/** Spoiler-free emoji grid for sharing. */
export function shareGrid(rows: Tile[][]): string {
  const map = { correct: "🟩", present: "🟨", absent: "⬜" } as const;
  return rows.map((r) => r.map((t) => map[t]).join("")).join("\n");
}
