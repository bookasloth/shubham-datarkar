import { seededShuffle } from "../daily";
import { EQUATION_LIST } from "./integra-equations";

export const INTEGRA = { length: 7, maxGuesses: 6 } as const;

export type Tile = "correct" | "present" | "absent";

const ALLOWED_RE = /^[0-9+\-*/=]+$/;
const LHS_RE = /^[0-9+\-*/]+$/;

/**
 * EQUATION_LIST is authored easy→hard, and used to be served in that order off a
 * launch offset. It is now shuffled, so difficulty no longer ramps with the day —
 * a division / order-of-operations equation can land on day 1. That was the
 * explicit call; if the onboarding ramp is ever wanted back, drop the shuffle and
 * index EQUATION_LIST directly (puzzle #0 is launch day now, so no offset needed).
 *
 * Changing SHUFFLE_SEED re-scrambles every future puzzle. Only do that alongside a
 * results wipe — it changes the answer for already-played puzzle numbers.
 */
const SHUFFLE_SEED = 0x2c9be14d;
const ANSWERS = seededShuffle(EQUATION_LIST, SHUFFLE_SEED);

/**
 * Deterministic answer for a puzzle number. Puzzle #0 is Integra's launch day
 * (2026-06-01 IST), so no launch offset — modulo cycles once the list is exhausted.
 * Same equation for everyone on a given day.
 */
export function answerFor(puzzleNumber: number): string {
  const L = ANSWERS.length;
  return ANSWERS[((puzzleNumber % L) + L) % L];
}

/**
 * Score a guess character-by-character. Two-pass so duplicate characters resolve
 * correctly, exactly like Wordle/Integra (a repeated digit/operator only lights up
 * as present for as many copies as the answer actually contains).
 */
export function scoreGuess(guess: string, answer: string): Tile[] {
  const res: Tile[] = new Array(guess.length).fill("absent");
  const counts: Record<string, number> = {};
  for (const ch of answer) counts[ch] = (counts[ch] ?? 0) + 1;
  for (let i = 0; i < guess.length; i++) {
    if (guess[i] === answer[i]) { res[i] = "correct"; counts[guess[i]]--; }
  }
  for (let i = 0; i < guess.length; i++) {
    if (res[i] === "correct") continue;
    if ((counts[guess[i]] ?? 0) > 0) { res[i] = "present"; counts[guess[i]]--; }
  }
  return res;
}

export const isWin = (tiles: Tile[]) => tiles.every((t) => t === "correct");

/**
 * Evaluate an arithmetic expression (the left side of "=") with standard order of
 * operations (* and / before + and -). Integer-only: division must be exact and
 * non-zero-divisor; number tokens may not have leading zeros. Returns null on any
 * malformed input (empty, leading/trailing/double operator, bad token). Pure — no eval().
 */
export function evaluate(expr: string): number | null {
  if (!LHS_RE.test(expr)) return null;

  // Tokenize into alternating [number, operator, number, ...].
  const tokens: (number | string)[] = [];
  let num = "";
  const flush = (): boolean => {
    if (num === "") return false;                 // operator with no preceding number
    if (num.length > 1 && num[0] === "0") return false; // leading zero
    tokens.push(Number(num));
    num = "";
    return true;
  };
  for (const ch of expr) {
    if (ch >= "0" && ch <= "9") { num += ch; continue; }
    if (!flush()) return null;
    tokens.push(ch);
  }
  if (!flush()) return null;                       // trailing operator

  // First pass: * and /
  const pass1: (number | string)[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t === "*" || t === "/") {
      const prev = pass1.pop() as number;
      const next = tokens[++i] as number;
      if (t === "*") { pass1.push(prev * next); }
      else {
        if (next === 0 || prev % next !== 0) return null;
        pass1.push(prev / next);
      }
    } else pass1.push(t);
  }

  // Second pass: + and -
  let acc = pass1[0] as number;
  for (let i = 1; i < pass1.length; i += 2) {
    const val = pass1[i + 1] as number;
    acc = pass1[i] === "+" ? acc + val : acc - val;
  }
  return acc;
}

/**
 * A guess is a legal Integra move: exact length, allowed characters only, exactly
 * one "=", right side is a bare non-negative integer, and the left side evaluates
 * to it under normal order of operations.
 */
export function isValidGuess(guess: string): boolean {
  if (guess.length !== INTEGRA.length) return false;
  if (!ALLOWED_RE.test(guess)) return false;
  const parts = guess.split("=");
  if (parts.length !== 2) return false;                  // exactly one "="
  const [lhs, rhs] = parts;
  if (!/^[0-9]+$/.test(rhs)) return false;               // RHS is a bare integer
  if (rhs.length > 1 && rhs[0] === "0") return false;    // no leading zero on RHS
  const val = evaluate(lhs);
  return val !== null && val === Number(rhs);
}

/** Spoiler-free emoji grid for sharing (green / purple / black). */
export function shareGrid(rows: Tile[][]): string {
  const map = { correct: "🟩", present: "🟪", absent: "⬛" } as const;
  return rows.map((r) => r.map((t) => map[t]).join("")).join("\n");
}
