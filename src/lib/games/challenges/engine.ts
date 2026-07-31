import * as alfazy from "@/lib/games/alfazy";
import * as hnb from "@/lib/games/hit-and-blow";
import * as integra from "@/lib/games/integra";
import type { ChallengeGame, Feedback } from "./types";

// Engines normalize case internally (alfazy lowercases; hnb/integra are digits/
// symbols), so guesses and secrets pass through untouched.

export function maxGuessesFor(game: ChallengeGame): number {
  return game === "alfazy"
    ? alfazy.ALFAZY.maxGuesses
    : game === "integra"
      ? integra.INTEGRA.maxGuesses
      : hnb.HIT_AND_BLOW.maxGuesses;
}

export function validateGuess(game: ChallengeGame, guess: string): boolean {
  return game === "alfazy"
    ? alfazy.isValidGuess(guess)
    : game === "integra"
      ? integra.isValidGuess(guess)
      : hnb.isValidGuess(guess);
}

/** The authored secret must itself be a legal guess for that game. */
export function validateSecret(game: ChallengeGame, secret: string): boolean {
  return validateGuess(game, secret);
}

export function scoreChallenge(game: ChallengeGame, guess: string, secret: string): Feedback {
  if (game === "hit_and_blow") {
    const { hits, blows } = hnb.scoreGuess(guess, secret);
    return { kind: "code", hits, blows };
  }
  const tiles = game === "integra" ? integra.scoreGuess(guess, secret) : alfazy.scoreGuess(guess, secret);
  return { kind: "tiles", tiles };
}

export function isChallengeWin(game: ChallengeGame, fb: Feedback): boolean {
  if (fb.kind === "code") return hnb.isWin(fb.hits);
  return game === "integra" ? integra.isWin(fb.tiles) : alfazy.isWin(fb.tiles);
}
