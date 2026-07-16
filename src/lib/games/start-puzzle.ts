"use server";

import { getGameUser } from "@/lib/games/session";
import { supabaseAuthServer } from "@/lib/supabase/auth-server";
import { puzzleDateISO, puzzleNumberFor } from "@/lib/daily";
import type { SubmitInput } from "@/lib/games/validate-result";

/**
 * Stamps the server clock on the player's first guess. `time_ms` is derived from
 * this on submit — the client never sends a duration, because time_ms is the
 * daily board's tiebreak and would otherwise be trivially forgeable.
 *
 * Fire-and-forget from the boards. The underlying RPC is `on conflict do
 * nothing`, so calling it late (or twice) can't rewind the clock, and losing the
 * race on a one-guess win just leaves the time null.
 */
export async function startPuzzle(
  game: SubmitInput["game"],
  puzzleNumber: number,
): Promise<void> {
  const user = await getGameUser();
  if (!user) return;

  // Anonymous timing has nowhere to live, and a future puzzle has no clock to
  // start — no answer exists for it yet.
  if (!Number.isInteger(puzzleNumber) || puzzleNumber < 0) return;
  if (puzzleNumber > puzzleNumberFor(game)) return;

  const supabase = await supabaseAuthServer();
  await supabase.rpc("start_puzzle", {
    p_game: game,
    p_puzzle: puzzleNumber,
    p_date: puzzleDateISO(game, puzzleNumber),
  });
}
