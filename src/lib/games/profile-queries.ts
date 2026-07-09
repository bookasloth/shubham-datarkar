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

/** The current user's Integra stats in the board/modal shape, or null if none/anon. */
export async function getMyIntegraStats(): Promise<
  { played: number; won: number; currentStreak: number; maxStreak: number } | null
> {
  const rows = await getMyStats();
  const r = rows.find((s) => s.game === "integra");
  if (!r) return null;
  return { played: r.total_played, won: r.total_won, currentStreak: r.current_streak, maxStreak: r.max_streak };
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
