import "server-only";

import { supabaseAnon } from "@/lib/supabase/server";
import { secretFor } from "@/lib/games/hit-and-blow";
import { answerFor } from "@/lib/games/alfazy";
import type { GameKey } from "@/lib/games/registry";

/**
 * Reveal the answer for a set of past puzzles.
 *  - hit_and_blow: pure formula (secretFor), no DB.
 *  - alfazy: the alfazy_puzzles override wins; the frozen formula is the
 *    fallback. Batched into one query so a 50-row page is one round-trip.
 * Add a new game = one branch here.
 */
export async function resolveAnswers(
  game: GameKey,
  puzzleNumbers: number[],
): Promise<Map<number, string>> {
  const out = new Map<number, string>();
  if (puzzleNumbers.length === 0) return out;

  if (game === "hit_and_blow") {
    for (const n of puzzleNumbers) out.set(n, secretFor(n));
    return out;
  }

  // alfazy: seed with the formula, then let DB overrides win.
  for (const n of puzzleNumbers) out.set(n, answerFor(n));
  const { data } = await supabaseAnon()
    .from("alfazy_puzzles")
    .select("puzzle_number, word")
    .in("puzzle_number", puzzleNumbers);
  for (const row of (data ?? []) as { puzzle_number: number; word: string }[]) {
    out.set(row.puzzle_number, row.word);
  }
  return out;
}
