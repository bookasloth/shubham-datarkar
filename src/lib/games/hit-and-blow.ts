import { seededShuffle } from "../daily";

// Classic rules. Knobs left as constants so you can spin variants later.
export const HIT_AND_BLOW = { length: 4, maxGuesses: 9, uniqueDigits: true } as const;

// Every 4-digit code with distinct digits and a non-zero first digit:
// 9 (first: 1-9) * 9 * 8 * 7 = 4536.
const CODE_SPACE = 4536;

const SHUFFLE_SEED = 0x7e42d05b;

/** Build all 4536 valid codes, then shuffle once with a fixed seed so the daily
 *  sequence is deterministic but not guessable from one day to the next. */
function buildCodes(): string[] {
  const codes: string[] = [];
  for (let a = 1; a <= 9; a++)
    for (let b = 0; b <= 9; b++) {
      if (b === a) continue;
      for (let c = 0; c <= 9; c++) {
        if (c === a || c === b) continue;
        for (let d = 0; d <= 9; d++) {
          if (d === a || d === b || d === c) continue;
          codes.push(`${a}${b}${c}${d}`);
        }
      }
    }
  // Deterministic Fisher-Yates — identical result on server and client.
  // Changing SHUFFLE_SEED re-scrambles every future code. Only do that alongside a
  // results wipe: it changes the secret for already-played puzzle numbers.
  return seededShuffle(codes, SHUFFLE_SEED);
}

// Built once at module load (~4536 strings, negligible).
const CODES = buildCodes();

/** Deterministic secret for a puzzle number. mod 4536 => no repeat for 4536 days. */
export function secretFor(puzzleNumber: number): string {
  return CODES[((puzzleNumber % CODE_SPACE) + CODE_SPACE) % CODE_SPACE];
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
  if (guess[0] === "0") return false; // secret never starts with 0 — keep input space identical
  if (HIT_AND_BLOW.uniqueDigits && new Set(guess).size !== guess.length) return false;
  return true;
}

/** Spoiler-free share summary. */
export function shareSummary(history: { hits: number; blows: number }[]): string {
  return history.map((h) => "🎯".repeat(h.hits) + "💨".repeat(h.blows) || "⬜").join("\n");
}
