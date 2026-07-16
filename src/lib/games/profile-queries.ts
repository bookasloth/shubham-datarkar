import "server-only";

import { supabaseAuthServer } from "@/lib/supabase/auth-server";
import { getGameUser } from "@/lib/games/session";

export type StatRow = {
  game: "alfazy" | "hit_and_blow" | "integra";
  current_streak: number;
  max_streak: number;
  total_played: number;
  total_won: number;
};

/** Board-side stats shape, exposed for the game boards' prop typing. */
export type GameStats = {
  played: number;
  won: number;
  currentStreak: number;
  maxStreak: number;
};

export async function getMyStats(): Promise<StatRow[]> {
  const user = await getGameUser();
  if (!user) return [];
  const supabase = await supabaseAuthServer();
  // RLS already scopes to the caller; the explicit filter is defense-in-depth
  // so a future RLS-policy drift can't silently leak other users' rows.
  const { data } = await supabase
    .from("streaks")
    .select("game, current_streak, max_streak, total_played, total_won")
    .eq("user_id", user.id);
  return (data ?? []) as StatRow[];
}

/** One game's stats for the current user in the board/modal shape, or null if none/anon. */
export async function getMyGameStats(
  game: StatRow["game"],
): Promise<GameStats | null> {
  const rows = await getMyStats();
  const r = rows.find((s) => s.game === game);
  if (!r) return null;
  return { played: r.total_played, won: r.total_won, currentStreak: r.current_streak, maxStreak: r.max_streak };
}

/**
 * Every puzzle the user has won in this game — daily AND archive.
 *
 * Deliberately not `streaks.total_won`: that counter is only bumped by the
 * daily write path, so it undercounts anyone who solves from the archive with a
 * membership. Streak and Win Rate keep reading `streaks` — those are meant to be
 * daily-only, and recounting them here would make Win Rate inflatable by
 * replaying easy archive puzzles.
 */
export async function getMySolvedCount(game: StatRow["game"]): Promise<number> {
  const user = await getGameUser();
  if (!user) return 0;
  const supabase = await supabaseAuthServer();
  const { count } = await supabase
    .from("game_results")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("game", game)
    .eq("status", "won");
  return count ?? 0;
}

/**
 * Average solve time (ms) for the current user's wins in this game.
 * Returns null when there are no wins (or the caller is anon).
 */
export async function getMyAvgSolveTime(
  game: StatRow["game"],
): Promise<number | null> {
  const user = await getGameUser();
  if (!user) return null;
  const supabase = await supabaseAuthServer();
  const { data } = await supabase
    .from("game_results")
    .select("time_ms")
    .eq("user_id", user.id)
    .eq("game", game)
    .eq("status", "won")
    .not("time_ms", "is", null);
  const rows = (data ?? []) as { time_ms: number | null }[];
  const valid = rows.map((r) => r.time_ms).filter((v): v is number => v != null);
  if (!valid.length) return null;
  return Math.round(valid.reduce((a, b) => a + b, 0) / valid.length);
}

export async function getMyRecent(limit = 10) {
  const user = await getGameUser();
  if (!user) return [];
  const supabase = await supabaseAuthServer();
  const { data } = await supabase
    .from("game_results")
    .select("game, puzzle_number, status, guesses")
    .eq("user_id", user.id)
    .order("puzzle_number", { ascending: false })
    .limit(limit);
  return (data ?? []) as { game: string; puzzle_number: number; status: string; guesses: number }[];
}

export async function getMyUsername(): Promise<string | null> {
  const user = await getGameUser();
  if (!user) return null;
  const supabase = await supabaseAuthServer();
  const { data } = await supabase.from("profiles").select("username").eq("id", user.id).maybeSingle();
  return (data?.username as string | undefined) ?? null;
}
