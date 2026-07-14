import "server-only";

import { supabaseAuthServer } from "@/lib/supabase/auth-server";
import { puzzleNumberFor, puzzleDateISO } from "@/lib/daily";

export type ArchiveEntry = {
  puzzleNumber: number;
  dateISO: string;
  solved: boolean;
};

/**
 * Every puzzle from today back to #0, newest first, with the signed-in user's
 * solved flag. `game` is the game_key enum value used by game_results.
 * "Solved" = won (fire icon in the UI). Lost/in-progress puzzles look unsolved.
 */
export async function listArchive(
  game: "alfazy" | "hit_and_blow" | "integra",
  now: number = Date.now(),
): Promise<ArchiveEntry[]> {
  const today = puzzleNumberFor(game, now);
  const supabase = await supabaseAuthServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const solved = new Set<number>();
  if (user) {
    const { data } = await supabase
      .from("game_results")
      .select("puzzle_number")
      .eq("user_id", user.id)
      .eq("game", game)
      .eq("status", "won");
    for (const r of data ?? []) solved.add(r.puzzle_number as number);
  }

  const entries: ArchiveEntry[] = [];
  for (let n = today; n >= 0; n--) {
    entries.push({ puzzleNumber: n, dateISO: puzzleDateISO(game, n), solved: solved.has(n) });
  }
  return entries;
}
