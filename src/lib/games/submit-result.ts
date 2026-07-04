"use server";

import { getGameUser } from "@/lib/games/session";
import { supabaseAuthServer } from "@/lib/supabase/auth-server";
import { puzzleDateISO } from "@/lib/daily";
import { validateResult, type SubmitInput } from "@/lib/games/validate-result";

export type SubmitOutcome =
  | { ok: true }
  | { ok: false; reason: "unauthenticated" | "invalid" | "error" };

export async function submitResult(input: SubmitInput): Promise<SubmitOutcome> {
  const user = await getGameUser();
  if (!user) return { ok: false, reason: "unauthenticated" };

  if (!validateResult(input).valid) return { ok: false, reason: "invalid" };

  const supabase = await supabaseAuthServer();
  const { error } = await supabase.rpc("submit_result", {
    p_game: input.game,
    p_puzzle: input.puzzleNumber,
    p_date: puzzleDateISO(input.puzzleNumber),
    p_status: input.status,
    p_guesses: input.guesses.length,
    p_guess_data: input.guesses,
    p_time_ms: input.timeMs,
  });

  if (error) return { ok: false, reason: "error" };
  return { ok: true };
}
