"use server";

import { getGameUser } from "@/lib/games/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { puzzleDateISO, isTodayOrYesterday } from "@/lib/daily";
import { getMemberContext } from "@/lib/members/session";
import { can } from "@/lib/members/capabilities";
import { validateResult, type SubmitInput } from "@/lib/games/validate-result";
import { notifyAchievements } from "@/lib/games/achievement-notify";

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

  // Service-role client, not the user's JWT: the write RPCs are no longer
  // PostgREST-reachable (revoked from authenticated), which is what closes the
  // forge-a-win hole — the validateResult check above can no longer be bypassed
  // by calling the RPC directly. The player is passed explicitly as p_user, taken
  // from the JWT-validated getGameUser() above, never from the client body.
  const supabase = supabaseAdmin();
  // Two RPCs, not one flagged RPC: only `submit_result` touches streaks, so the
  // archive path cannot farm one even if this call site is wrong.
  // No time is passed: the server derives it from started_at, because time_ms is
  // the daily board's tiebreak and a client-supplied duration would be forgeable.
  const { error } = await supabase.rpc(
    check.source === "archive" ? "submit_archive_result" : "submit_result",
    {
      p_user: user.id,
      p_game: input.game,
      p_puzzle: input.puzzleNumber,
      p_date: puzzleDateISO(input.game, input.puzzleNumber),
      p_status: input.status,
      p_guesses: input.guesses.length,
      p_guess_data: input.guesses,
    },
  );

  if (error) return { ok: false, reason: "error" };

  // Achievement emails: only daily wins touch streaks, so only they can unlock
  // a first-win / streak milestone. Best-effort — never fails the submit.
  if (check.source === "daily" && input.status === "won" && user.email) {
    const name =
      (user.user_metadata?.full_name as string) || (user.user_metadata?.name as string) || null;
    await notifyAchievements(user.id, user.email, name, input.game);
  }

  return { ok: true };
}
