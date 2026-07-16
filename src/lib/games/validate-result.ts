import { isToday, puzzleNumberFor } from "@/lib/daily";
import { ALFAZY, answerFor, isValidGuess as isValidAlfazy } from "@/lib/games/alfazy";
import {
  INTEGRA,
  answerFor as integraAnswerFor,
  isValidGuess as isValidIntegra,
} from "@/lib/games/integra";
import {
  HIT_AND_BLOW,
  secretFor,
  scoreGuess as scoreHitAndBlow,
  isValidGuess as isValidHitAndBlow,
} from "@/lib/games/hit-and-blow";

export type SubmitInput = {
  game: "alfazy" | "hit_and_blow" | "integra";
  puzzleNumber: number;
  status: "won" | "lost";
  guesses: string[];
  timeMs: number | null;
};

export type ValidationResult =
  | { valid: false }
  /** Which write path may persist this: `daily` touches streaks, `archive` never does. */
  | { valid: true; source: "daily" | "archive" };

/**
 * Pure server-side re-derivation of truth. Never trust the client's claim.
 * This is the anti-cheat boundary — `submitResult` persists only what passes here.
 *
 * A past puzzle is now submittable, but only ever as `archive`, which routes to a
 * write path that cannot touch streaks. That split is what lets a membership solve
 * count as Solved without letting anyone backfill a streak.
 */
export function validateResult(input: SubmitInput, now: number = Date.now()): ValidationResult {
  const { game, puzzleNumber, status, guesses } = input;

  if (!Number.isInteger(puzzleNumber) || puzzleNumber < 0) return { valid: false };

  // A future puzzle has no legitimate answer yet — re-deriving one here would hand
  // out tomorrow's word. Per-game: each numbers from its own launch day.
  if (puzzleNumber > puzzleNumberFor(game, now)) return { valid: false };

  const source: "daily" | "archive" = isToday(game, puzzleNumber, now) ? "daily" : "archive";

  if (guesses.length === 0) return { valid: false };

  const max =
    game === "alfazy" ? ALFAZY.maxGuesses : game === "integra" ? INTEGRA.maxGuesses : HIT_AND_BLOW.maxGuesses;
  if (guesses.length > max) return { valid: false };

  // Every guess must be a legal move for the game.
  const isValidGuess =
    game === "alfazy" ? isValidAlfazy : game === "integra" ? isValidIntegra : isValidHitAndBlow;
  if (!guesses.every((g) => isValidGuess(g))) return { valid: false };

  // A loss is only legitimate after all guesses are exhausted.
  if (status === "lost" && guesses.length !== max) return { valid: false };

  // Alfazy and Integra are both exact-string-match games; the answer is the frozen
  // code value (not the DB override — same parity limitation as Alfazy).
  if (game === "alfazy" || game === "integra") {
    const answer = game === "alfazy" ? answerFor(puzzleNumber) : integraAnswerFor(puzzleNumber);
    const won = guesses[guesses.length - 1] === answer;
    // No earlier guess may already equal the answer (that would be an extra guess after a win).
    const wonEarlier = guesses.slice(0, -1).some((g) => g === answer);
    if (wonEarlier) return { valid: false };
    return (status === "won" ? won : !won) ? { valid: true, source } : { valid: false };
  }

  const secret = secretFor(puzzleNumber);
  // No earlier guess may already be a win (extra guess after winning).
  const wonEarlier = guesses
    .slice(0, -1)
    .some((g) => scoreHitAndBlow(g, secret).hits === HIT_AND_BLOW.length);
  if (wonEarlier) return { valid: false };
  const last = scoreHitAndBlow(guesses[guesses.length - 1], secret);
  const won = last.hits === HIT_AND_BLOW.length; // hit-and-blow scoreGuess returns { hits, blows }
  return (status === "won" ? won : !won) ? { valid: true, source } : { valid: false };
}
