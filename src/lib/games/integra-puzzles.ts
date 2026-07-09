import "server-only";

import { supabaseAnon } from "@/lib/supabase/server";
import { answerFor } from "@/lib/games/integra";

/** The Integra equation for a puzzle: DB override row if present, else the frozen
 *  code list. Never throws — a DB hiccup must not break gameplay. */
export async function equationForPuzzle(puzzleNumber: number): Promise<string> {
  try {
    const { data, error } = await supabaseAnon()
      .from("integra_puzzles")
      .select("equation")
      .eq("puzzle_number", puzzleNumber)
      .maybeSingle();
    if (error) throw error;
    const equation = (data as { equation: string } | null)?.equation;
    return equation ?? answerFor(puzzleNumber);
  } catch {
    return answerFor(puzzleNumber);
  }
}
