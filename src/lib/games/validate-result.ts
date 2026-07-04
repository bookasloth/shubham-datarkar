import { ALFAZY, answerFor } from "@/lib/games/alfazy";
import { HIT_AND_BLOW, secretFor, scoreGuess as scoreHitAndBlow } from "@/lib/games/hit-and-blow";

export type SubmitInput = {
  game: "alfazy" | "hit_and_blow";
  puzzleNumber: number;
  status: "won" | "lost";
  guesses: string[];
  timeMs: number | null;
};

/** Pure server-side re-derivation of truth. Never trust the client's claim. */
export function validateResult(input: SubmitInput): { valid: boolean } {
  const { game, puzzleNumber, status, guesses } = input;
  if (!Number.isInteger(puzzleNumber) || puzzleNumber < 0) return { valid: false };
  if (guesses.length === 0) return { valid: false };

  const max = game === "alfazy" ? ALFAZY.maxGuesses : HIT_AND_BLOW.maxGuesses;
  if (guesses.length > max) return { valid: false };

  if (game === "alfazy") {
    const answer = answerFor(puzzleNumber);
    const won = guesses[guesses.length - 1] === answer;
    // No earlier guess may already equal the answer (that would be an extra guess after a win).
    const wonEarlier = guesses.slice(0, -1).some((g) => g === answer);
    if (wonEarlier) return { valid: false };
    return { valid: status === "won" ? won : !won };
  }

  const secret = secretFor(puzzleNumber);
  // No earlier guess may already be a win (would be an extra guess after winning).
  const wonEarlier = guesses
    .slice(0, -1)
    .some((g) => scoreHitAndBlow(g, secret).hits === HIT_AND_BLOW.length);
  if (wonEarlier) return { valid: false };
  const last = scoreHitAndBlow(guesses[guesses.length - 1], secret);
  const won = last.hits === HIT_AND_BLOW.length; // hit-and-blow scoreGuess returns { hits, blows }
  return { valid: status === "won" ? won : !won };
}
