import { isToday } from "@/lib/daily";
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

/**
 * Pure server-side re-derivation of truth. Never trust the client's claim.
 * This is the anti-cheat boundary — `submitResult` persists only what passes here.
 */
export function validateResult(input: SubmitInput): { valid: boolean } {
  const { game, puzzleNumber, status, guesses } = input;

  if (!Number.isInteger(puzzleNumber) || puzzleNumber < 0) return { valid: false };

  // Only the live (today's) puzzle is submittable. Blocks a player from POSTing
  // past puzzle numbers with re-derived answers to farm/backfill streaks —
  // the client `isArchive` guard is UX only; this is the real boundary.
  if (!isToday(puzzleNumber)) return { valid: false };

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
    return { valid: status === "won" ? won : !won };
  }

  const secret = secretFor(puzzleNumber);
  // No earlier guess may already be a win (extra guess after winning).
  const wonEarlier = guesses
    .slice(0, -1)
    .some((g) => scoreHitAndBlow(g, secret).hits === HIT_AND_BLOW.length);
  if (wonEarlier) return { valid: false };
  const last = scoreHitAndBlow(guesses[guesses.length - 1], secret);
  const won = last.hits === HIT_AND_BLOW.length; // hit-and-blow scoreGuess returns { hits, blows }
  return { valid: status === "won" ? won : !won };
}
