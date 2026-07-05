import "server-only";

import { supabaseAuthServer } from "@/lib/supabase/auth-server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { GAMES, type GameKey } from "@/lib/games/registry";
import { puzzleNumberFor } from "@/lib/daily";

export type GameStat = {
  key: GameKey;
  name: string;
  players: number;
  plays: number;
  wins: number;
  todayPuzzle: number;
};

export type BoardRow = {
  username: string;
  guesses: number;
  timeMs: number | null;
};

export type StreakRow = {
  username: string;
  currentStreak: number;
  maxStreak: number;
};

/** Per-game totals for the dashboard cards. Uses service-role client to bypass RLS,
 *  so counts are global (not scoped to the admin user). Throws on DB/auth failure so
 *  the page renders an explicit error state (never a misleading "0"). */
export async function getGameStats(): Promise<GameStat[]> {
  const supabase = supabaseAdmin();
  const today = puzzleNumberFor();

  const stats = await Promise.all(
    GAMES.map(async (g): Promise<GameStat> => {
      const plays = await supabase
        .from("game_results")
        .select("id", { count: "exact", head: true })
        .eq("game", g.key);
      if (plays.error) throw new Error(plays.error.message);

      const wins = await supabase
        .from("game_results")
        .select("id", { count: "exact", head: true })
        .eq("game", g.key)
        .eq("status", "won");
      if (wins.error) throw new Error(wins.error.message);

      const playerRows = await supabase
        .from("game_results")
        .select("user_id")
        .eq("game", g.key);
      if (playerRows.error) throw new Error(playerRows.error.message);
      // Distinct players deduped in-memory since PostgREST lacks count(distinct)
      const players = new Set(
        ((playerRows.data as { user_id: string }[]) ?? []).map((r) => r.user_id),
      ).size;

      return {
        key: g.key,
        name: g.name,
        players,
        plays: plays.count ?? 0,
        wins: wins.count ?? 0,
        todayPuzzle: today,
      };
    }),
  );

  return stats;
}

/** Winners on one puzzle, best first. Wraps the get_daily_board RPC. */
export async function getDailyBoard(game: GameKey, puzzle: number): Promise<BoardRow[]> {
  const supabase = await supabaseAuthServer();
  const { data, error } = await supabase.rpc("get_daily_board", {
    p_game: game,
    p_puzzle: puzzle,
  });
  if (error) throw new Error(error.message);
  return ((data as { username: string; guesses: number; time_ms: number | null }[]) ?? []).map((r) => ({
    username: r.username,
    guesses: r.guesses,
    timeMs: r.time_ms,
  }));
}

/** Streak leaderboard for a game. Wraps the get_streak_board RPC. */
export async function getStreakBoard(game: GameKey): Promise<StreakRow[]> {
  const supabase = await supabaseAuthServer();
  const { data, error } = await supabase.rpc("get_streak_board", { p_game: game });
  if (error) throw new Error(error.message);
  return ((data as { username: string; current_streak: number; max_streak: number }[]) ?? []).map((r) => ({
    username: r.username,
    currentStreak: r.current_streak,
    maxStreak: r.max_streak,
  }));
}
