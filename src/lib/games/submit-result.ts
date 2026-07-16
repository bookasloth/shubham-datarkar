"use server";

import { getGameUser } from "@/lib/games/session";
import { supabaseAuthServer } from "@/lib/supabase/auth-server";
import { puzzleDateISO, isTodayOrYesterday } from "@/lib/daily";
import { getMemberContext } from "@/lib/members/session";
import { can } from "@/lib/members/capabilities";
import { validateResult, type SubmitInput } from "@/lib/games/validate-result";

export type SubmitOutcome =
  | { ok: true }
  | { ok: false; reason: "unauthenticated" | "invalid" | "forbidden" | "error" };

export async function submitResult(input: SubmitInput): Promise<SubmitOutcome> {
  const user = await getGameUser();
  if (!user) return { ok: false, reason: "unauthenticated" };

  const check = validateResult(input);
  if (!check.valid) return { ok: false, reason: "invalid" };

  // Archive results are gated on the same capability that gates *playing* them.
  // The page already checks this, but that's UX — a server action is a public
  // endpoint, so a non-member could otherwise POST solves for the whole back
  // catalogue. Today and yesterday stay free, matching the archive page.
  if (check.source === "archive" && !isTodayOrYesterday(input.game, input.puzzleNumber)) {
    const ctx = await getMemberContext();
    if (!can(ctx.capabilities, "view_archive")) return { ok: false, reason: "forbidden" };
  }

  const supabase = await supabaseAuthServer();
  // Two RPCs, not one flagged RPC: only `submit_result` touches streaks, so the
  // archive path cannot farm one even if this call site is wrong.
  const { error } = await supabase.rpc(
    check.source === "archive" ? "submit_archive_result" : "submit_result",
    {
      p_game: input.game,
      p_puzzle: input.puzzleNumber,
      p_date: puzzleDateISO(input.game, input.puzzleNumber),
      p_status: input.status,
      p_guesses: input.guesses.length,
      p_guess_data: input.guesses,
      p_time_ms: input.timeMs,
    },
  );

  if (error) return { ok: false, reason: "error" };
  return { ok: true };
}
