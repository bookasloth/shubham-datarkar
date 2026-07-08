import "server-only";

import { supabaseAuthServer } from "@/lib/supabase/auth-server";
import { puzzleNumberFor, puzzleDateISO } from "@/lib/daily";

export type ArchiveEntry = {
  puzzleNumber: number;
  dateISO: string;
  played: boolean;
};

/**
 * Every puzzle from today back to #0, newest first, with the signed-in user's
 * played flag. `game` is the game_key enum value used by game_results.
 */
export async function listArchive(
  game: "alfazy" | "hit_and_blow",
  now: number = Date.now(),
): Promise<ArchiveEntry[]> {
  const today = puzzleNumberFor(now);
  const supabase = await supabaseAuthServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const played = new Set<number>();
  if (user) {
    const { data } = await supabase
      .from("game_results")
      .select("puzzle_number")
      .eq("user_id", user.id)
      .eq("game", game);
    for (const r of data ?? []) played.add(r.puzzle_number as number);
  }

  const entries: ArchiveEntry[] = [];
  for (let n = today; n >= 0; n--) {
    entries.push({ puzzleNumber: n, dateISO: puzzleDateISO(n), played: played.has(n) });
  }
  return entries;
}
