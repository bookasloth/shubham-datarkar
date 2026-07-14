import "server-only";

import { supabaseAnon } from "@/lib/supabase/server";
import { secretFor } from "@/lib/games/hit-and-blow";
import {
  answerFor as alfazyAnswerFor,
  themeWordFor as alfazyThemeWordFor,
} from "@/lib/games/alfazy";
import { answerFor as integraAnswerFor } from "@/lib/games/integra";
import type { GameKey } from "@/lib/games/registry";

/**
 * Reveal the answer for a set of past puzzles.
 *  - hit_and_blow: pure formula (secretFor), no DB.
 *  - alfazy / integra: the DB override row wins; the frozen formula is the
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

  if (game === "integra") {
    // seed with the formula, then let integra_puzzles overrides win.
    for (const n of puzzleNumbers) out.set(n, integraAnswerFor(n));
    const { data } = await supabaseAnon()
      .from("integra_puzzles")
      .select("puzzle_number, equation")
      .in("puzzle_number", puzzleNumbers);
    for (const row of (data ?? []) as { puzzle_number: number; equation: string }[]) {
      out.set(row.puzzle_number, row.equation);
    }
    return out;
  }

  // alfazy: seed with the formula (which already applies themed observance days),
  // then let DB overrides win — except on a themed day, where the theme word wins.
  for (const n of puzzleNumbers) out.set(n, alfazyAnswerFor(n));
  const { data } = await supabaseAnon()
    .from("alfazy_puzzles")
    .select("puzzle_number, word")
    .in("puzzle_number", puzzleNumbers);
  for (const row of (data ?? []) as { puzzle_number: number; word: string }[]) {
    if (alfazyThemeWordFor(row.puzzle_number)) continue;
    out.set(row.puzzle_number, row.word);
  }
  return out;
}
