import "server-only";

import { supabaseAnon } from "@/lib/supabase/server";
import { answerFor, themeWordFor } from "@/lib/games/alfazy";

/** The Alfazy answer for a puzzle: themed observance day if the date has one, else
 *  the DB row if present, else the frozen code formula. Never throws — a DB hiccup
 *  must not break gameplay. */
export async function wordForPuzzle(puzzleNumber: number): Promise<string> {
  const theme = themeWordFor(puzzleNumber);
  if (theme) return theme;
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
