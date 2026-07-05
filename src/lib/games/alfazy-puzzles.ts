import "server-only";

import { supabaseAnon } from "@/lib/supabase/server";
import { answerFor } from "@/lib/games/alfazy";

/** The Alfazy answer for a puzzle: DB row if present, else the frozen code
 *  formula. Never throws — a DB hiccup must not break gameplay. */
export async function wordForPuzzle(puzzleNumber: number): Promise<string> {
  try {
    const { data, error } = await supabaseAnon()
      .from("alfazy_puzzles")
      .select("word")
      .eq("puzzle_number", puzzleNumber)
      .maybeSingle();
    if (error) throw error;
    const word = (data as { word: string } | null)?.word;
    return word ?? answerFor(puzzleNumber);
  } catch {
    return answerFor(puzzleNumber);
  }
}
