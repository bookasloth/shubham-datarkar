"use server";

import { headers } from "next/headers";
import { getGameUser } from "@/lib/games/session";
import { getMemberContext } from "@/lib/members/session";
import { can } from "@/lib/members/capabilities";
import { supabaseAuthServer } from "@/lib/supabase/auth-server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { allow, clientIp } from "@/lib/rate-limit";
import { getOrIssueGuestKey, readGuestKey } from "./guest";
import {
  isChallengeWin,
  maxGuessesFor,
  nextAttemptState,
  scoreChallenge,
  validateGuess,
  validateSecret,
} from "./engine";
import type { ChallengeGame, Feedback } from "./types";

export type CreateInput = { game: ChallengeGame; secret: string; title?: string; isPublic?: boolean };
export type CreateOutcome =
  | { ok: true; code: string }
  | { ok: false; reason: "unauthenticated" | "forbidden" | "invalid" | "limit" | "error" };

export type ScoreOutcome =
  | { ok: true; feedback: Feedback; status: "in_progress" | "won" | "lost"; guesses: number }
  | { ok: false; reason: "closed" | "finished" | "budget" | "invalid" | "ratelimited" | "error" };

export async function createChallenge(input: CreateInput): Promise<CreateOutcome> {
  const user = await getGameUser();
  if (!user) return { ok: false, reason: "unauthenticated" };
  const ctx = await getMemberContext();
  if (!can(ctx.capabilities, "create_challenge")) return { ok: false, reason: "forbidden" };

  const secret = input.secret.trim();
  if (!validateSecret(input.game, secret)) return { ok: false, reason: "invalid" };
  const title = (input.title ?? "").slice(0, 80);

  const supabase = await supabaseAuthServer();
  const { data, error } = await supabase.rpc("create_challenge", {
    p_game: input.game,
    p_secret: secret,
    p_title: title,
    p_is_public: !!input.isPublic,
  });
  if (error) return { ok: false, reason: error.message.includes("limit") ? "limit" : "error" };
  return { ok: true, code: data as string };
}

export async function startChallengeAttempt(code: string): Promise<{ ok: boolean }> {
  const user = await getGameUser();
  // If a signed-in player still carries a guest cookie, fold any guest attempts
  // into their account before they start a new one. No-ops without a guest cookie.
  if (user) await attachGuestAttempts(user.id);
  const admin = supabaseAdmin();
  const { data: ch } = await admin
    .from("game_challenges")
    .select("id,status,expires_at")
    .eq("code", code)
    .maybeSingle();
  if (!ch || ch.status !== "open" || new Date(ch.expires_at) < new Date()) return { ok: false };

  const guestKey = user ? null : await getOrIssueGuestKey();
  const filter = user ? { player_user_id: user.id } : { guest_key: guestKey };
  const { data: existing } = await admin
    .from("game_challenge_attempts")
    .select("id")
    .eq("challenge_id", ch.id)
    .match(filter)
    .maybeSingle();
  if (!existing) {
    await admin.from("game_challenge_attempts").insert({ challenge_id: ch.id, ...filter });
    await admin.rpc("increment_play_count", { p_id: ch.id });
  }
  return { ok: true };
}

export async function scoreChallengeGuess(code: string, guess: string): Promise<ScoreOutcome> {
  const user = await getGameUser();
  const guestKey = user ? null : await readGuestKey();
  if (!user && !guestKey) return { ok: false, reason: "error" };

  const ip = clientIp(await headers());
  if (!(await allow(`challenge-guess:${ip}`, 60, 60_000))) return { ok: false, reason: "ratelimited" };

  const admin = supabaseAdmin();
  const { data: ch } = await admin
    .from("game_challenges")
    .select("id,game,secret,status,expires_at")
    .eq("code", code)
    .maybeSingle();
  if (!ch || ch.status !== "open" || new Date(ch.expires_at) < new Date()) return { ok: false, reason: "closed" };

  const filter = user ? { player_user_id: user.id } : { guest_key: guestKey! };
  const { data: att } = await admin
    .from("game_challenge_attempts")
    .select("id,guesses,guess_data,status,started_at")
    .eq("challenge_id", ch.id)
    .match(filter)
    .maybeSingle();
  if (!att) return { ok: false, reason: "error" };
  if (att.status !== "in_progress") return { ok: false, reason: "finished" };

  const game = ch.game as ChallengeGame;
  const max = maxGuessesFor(game);
  if (att.guesses >= max) return { ok: false, reason: "budget" };
  if (!validateGuess(game, guess)) return { ok: false, reason: "invalid" };

  const feedback = scoreChallenge(game, guess, ch.secret);
  const win = isChallengeWin(game, feedback);
  const { status, finished } = nextAttemptState(att.guesses, win, max);
  const guess_data = [...((att.guess_data as { guess: string; feedback: Feedback }[]) ?? []), { guess, feedback }];
  const time_ms = finished ? Date.now() - new Date(att.started_at).getTime() : null;

  await admin
    .from("game_challenge_attempts")
    .update({
      guesses: att.guesses + 1,
      guess_data,
      status,
      finished_at: finished ? new Date().toISOString() : null,
      time_ms,
    })
    .eq("id", att.id);
  if (status === "won") await admin.rpc("increment_crack_count", { p_id: ch.id });

  return { ok: true, feedback, status, guesses: att.guesses + 1 };
}

export async function closeChallenge(code: string): Promise<{ ok: boolean }> {
  const supabase = await supabaseAuthServer();
  const { error } = await supabase.rpc("close_challenge", { p_code: code });
  return { ok: !error };
}

export async function deleteChallenge(code: string): Promise<{ ok: boolean }> {
  const supabase = await supabaseAuthServer();
  const { error } = await supabase.rpc("delete_challenge", { p_code: code });
  return { ok: !error };
}

/** On sign-in, move this browser's guest attempts to the user. Best-effort. */
export async function attachGuestAttempts(userId: string): Promise<void> {
  const guestKey = await readGuestKey();
  if (!guestKey) return;
  await supabaseAdmin().rpc("attach_guest_attempts", { p_guest_key: guestKey, p_user: userId });
}
