import "server-only";

import { supabaseAnon } from "@/lib/supabase/server";
import type { GameKey } from "@/lib/games/registry";

export type ResultRow = {
  username: string;
  puzzle_number: number;
  puzzle_date: string;
  guesses: number;
  time_ms: number | null;
  status: "won" | "lost";
};

export async function getResultsPage(args: {
  game: GameKey;
  before: number;
  outcome: string;
  player?: string;
  limit: number;
  offset?: number;
}): Promise<ResultRow[]> {
  const { data, error } = await supabaseAnon().rpc("get_results_page", {
    p_game: args.game,
    p_before: args.before,
    p_outcome: args.outcome,
    p_player: args.player ?? null,
    p_limit: args.limit,
    p_offset: args.offset ?? 0,
  });
  if (error) return [];
  return (data ?? []) as ResultRow[];
}
