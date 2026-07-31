import "server-only";
import { supabaseAnon, supabaseAdmin } from "@/lib/supabase/server";
import { supabaseAuthServer } from "@/lib/supabase/auth-server";
import type { ChallengeGame, ChallengeMeta, ChallengeAttemptState, Feedback, LeaderboardEntry } from "./types";

export type BrowseRow = { code: string; title: string | null; crackCount: number; playCount: number };
export type MyChallengeRow = {
  code: string;
  title: string | null;
  is_public: boolean;
  status: string;
  crack_count: number;
  play_count: number;
  created_at: string;
  expires_at: string;
};

/** Public meta by code — never selects `secret`. */
export async function getChallengeMeta(code: string): Promise<ChallengeMeta | null> {
  try {
    const { data, error } = await supabaseAnon()
      .from("game_challenges")
      .select("code,game,title,status,expires_at,crack_count,play_count")
      .eq("code", code)
      .maybeSingle();
    if (error || !data) return null;
    return {
      code: data.code,
      game: data.game as ChallengeGame,
      title: data.title,
      status: data.status as ChallengeMeta["status"],
      expiresAt: data.expires_at,
      crackCount: data.crack_count,
      playCount: data.play_count,
    };
  } catch {
    return null;
  }
}

export async function browseChallenges(game: ChallengeGame, page: number): Promise<BrowseRow[]> {
  try {
    const { data, error } = await supabaseAnon().rpc("browse_challenges", {
      p_game: game,
      p_limit: 24,
      p_offset: page * 24,
    });
    if (error) return [];
    return (data ?? []).map((r: { code: string; title: string | null; crack_count: number; play_count: number }) => ({
      code: r.code,
      title: r.title,
      crackCount: r.crack_count,
      playCount: r.play_count,
    }));
  } catch {
    return [];
  }
}

export async function getChallengeLeaderboard(code: string): Promise<LeaderboardEntry[]> {
  try {
    const { data, error } = await supabaseAnon().rpc("challenge_leaderboard", { p_code: code });
    if (error) return [];
    return (data ?? []).map((r: { username: string | null; status: string; guesses: number; time_ms: number | null }) => ({
      username: r.username,
      status: r.status,
      guesses: r.guesses,
      timeMs: r.time_ms,
    }));
  } catch {
    return [];
  }
}

export async function getMyChallenges(game: ChallengeGame): Promise<MyChallengeRow[]> {
  try {
    const supabase = await supabaseAuthServer();
    const { data, error } = await supabase.rpc("my_challenges", { p_game: game });
    if (error) return [];
    return (data ?? []) as MyChallengeRow[];
  } catch {
    return [];
  }
}

/** The caller's attempt state, read with the service role (needs guest rows too). */
export async function getMyAttempt(
  code: string,
  userId: string | null,
  guestKey: string | null,
): Promise<ChallengeAttemptState | null> {
  if (!userId && !guestKey) return null;
  try {
    const admin = supabaseAdmin();
    const { data: ch } = await admin.from("game_challenges").select("id").eq("code", code).maybeSingle();
    if (!ch) return null;
    let q = admin.from("game_challenge_attempts").select("guess_data,status").eq("challenge_id", ch.id);
    q = userId ? q.eq("player_user_id", userId) : q.eq("guest_key", guestKey!);
    const { data } = await q.maybeSingle();
    if (!data) return null;
    const gd = (data.guess_data ?? []) as { guess: string; feedback: Feedback }[];
    return {
      guesses: gd.map((x) => x.guess),
      feedback: gd.map((x) => x.feedback),
      status: data.status as ChallengeAttemptState["status"],
    };
  } catch {
    return null;
  }
}
