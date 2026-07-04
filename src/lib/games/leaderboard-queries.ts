import "server-only";

import { supabaseAnon } from "@/lib/supabase/server";

export type GameKey = "alfazy" | "hit_and_blow";
export type DailyRow = { username: string; guesses: number; time_ms: number | null; status: string };
export type PeriodRow = { username: string; solved: number; total_guesses: number };
export type StreakRow = { username: string; current_streak: number; max_streak: number };

export async function getDailyBoard(game: GameKey, puzzle: number): Promise<DailyRow[]> {
  const { data, error } = await supabaseAnon().rpc("get_daily_board", { p_game: game, p_puzzle: puzzle });
  if (error) return [];
  return (data ?? []) as DailyRow[];
}

export async function getPeriodBoard(game: GameKey, start: string, end: string): Promise<PeriodRow[]> {
  const { data, error } = await supabaseAnon().rpc("get_period_board", { p_game: game, p_start: start, p_end: end });
  if (error) return [];
  return (data ?? []) as PeriodRow[];
}

export async function getStreakBoard(game: GameKey): Promise<StreakRow[]> {
  const { data, error } = await supabaseAnon().rpc("get_streak_board", { p_game: game });
  if (error) return [];
  return (data ?? []) as StreakRow[];
}
