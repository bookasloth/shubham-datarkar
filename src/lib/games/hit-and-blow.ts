import { seededRng } from "../daily";

// Classic rules. Knobs left as constants so you can spin variants later.
export const HIT_AND_BLOW = { length: 4, maxGuesses: 9, uniqueDigits: true } as const;

/** Deterministic secret for a puzzle number (seed mixed so it differs per game). */
export function secretFor(puzzleNumber: number): string {
  const rng = seededRng((puzzleNumber ^ 0x9e3779b9) >>> 0);
  const digits = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  for (let i = digits.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [digits[i], digits[j]] = [digits[j], digits[i]];
  }
  return digits.slice(0, HIT_AND_BLOW.length).join(""); // leading zeros allowed
}

/** 🎯 hit = right digit right spot · 💨 blow = right digit wrong spot. */
export function scoreGuess(guess: string, secret: string): { hits: number; blows: number } {
  let hits = 0, blows = 0;
  for (let i = 0; i < guess.length; i++) {
    if (guess[i] === secret[i]) hits++;
    else if (secret.includes(guess[i])) blows++;
  }
  return { hits, blows };
}

export const isWin = (hits: number) => hits === HIT_AND_BLOW.length;

export function isValidGuess(guess: string): boolean {
  if (!new RegExp(`^\\d{${HIT_AND_BLOW.length}}$`).test(guess)) return false;
  if (HIT_AND_BLOW.uniqueDigits && new Set(guess).size !== guess.length) return false;
  return true;
}

/** Spoiler-free share summary. */
export function shareSummary(history: { hits: number; blows: number }[]): string {
  return history.map((h) => "🎯".repeat(h.hits) + "💨".repeat(h.blows) || "⬜").join("\n");
}
