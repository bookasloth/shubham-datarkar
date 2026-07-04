import "server-only";

import { supabaseAuthServer } from "@/lib/supabase/auth-server";
import { getGameUser } from "@/lib/games/session";

export type StatRow = {
  game: "alfazy" | "hit_and_blow";
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
