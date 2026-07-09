import "server-only";

import { supabaseAuthServer } from "@/lib/supabase/auth-server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { GAMES, type GameKey } from "@/lib/games/registry";
import { puzzleNumberFor } from "@/lib/daily";
import { answerFor as integraAnswerFor } from "@/lib/games/integra";

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

export type PlayerRow = {
  id: string;
  username: string;
  createdAt: string;
  totalPlayed: number;
  totalWon: number;
};

export type PlayerResult = {
  id: string;
  game: GameKey;
  puzzleNumber: number;
  puzzleDate: string;
  status: string;
  guesses: number;
};

export type PlayerStreak = {
  game: GameKey;
  currentStreak: number;
  maxStreak: number;
  totalPlayed: number;
  totalWon: number;
};

/** All players for the admin roster. Wraps the admin_list_players RPC. */
export async function getPlayersAdmin(): Promise<PlayerRow[]> {
  const supabase = await supabaseAuthServer();
  const { data, error } = await supabase.rpc("admin_list_players");
  if (error) throw new Error(error.message);
  return (
    (data as { id: string; username: string; created_at: string; total_played: number; total_won: number }[]) ?? []
  ).map((r) => ({
    id: r.id,
    username: r.username,
    createdAt: r.created_at,
    totalPlayed: r.total_played,
    totalWon: r.total_won,
  }));
}

/** One player's full result history + per-game streaks for the admin detail page. */
export async function getPlayerDetailAdmin(
  id: string,
): Promise<{ results: PlayerResult[]; streaks: PlayerStreak[] }> {
  const supabase = await supabaseAuthServer();
  const [results, streaks] = await Promise.all([
    supabase.rpc("admin_player_results", { p_user: id }),
    supabase.rpc("admin_player_streaks", { p_user: id }),
  ]);
  if (results.error) throw new Error(results.error.message);
  if (streaks.error) throw new Error(streaks.error.message);
  return {
    results: (
      (results.data as {
        id: string;
        game: GameKey;
        puzzle_number: number;
        puzzle_date: string;
        status: string;
        guesses: number;
      }[]) ?? []
    ).map((r) => ({
      id: r.id,
      game: r.game,
      puzzleNumber: r.puzzle_number,
      puzzleDate: r.puzzle_date,
      status: r.status,
      guesses: r.guesses,
    })),
    streaks: (
      (streaks.data as {
        game: GameKey;
        current_streak: number;
        max_streak: number;
        total_played: number;
        total_won: number;
      }[]) ?? []
    ).map((s) => ({
      game: s.game,
      currentStreak: s.current_streak,
      maxStreak: s.max_streak,
      totalPlayed: s.total_played,
      totalWon: s.total_won,
    })),
  };
}

export type IntegraEquationRow = {
  puzzleNumber: number;
  equation: string;
  editable: boolean;
  overridden: boolean;
};

/** Upcoming Integra puzzles for the admin editor. Unlike Alfazy, integra_puzzles is
 *  not seeded — the effective equation is the DB override if present, else the
 *  frozen code list (answerFor). Synthesizes the next `days` puzzles so the admin
 *  has rows to edit even with an empty override table. */
export async function getUpcomingIntegraEquations(days = 30): Promise<IntegraEquationRow[]> {
  const supabase = await supabaseAuthServer();
  const today = puzzleNumberFor();
  const { data, error } = await supabase.rpc("admin_list_integra_puzzles", { p_from: today });
  if (error) throw new Error(error.message);
  const overrides = new Map<number, string>();
  for (const r of (data as { puzzle_number: number; equation: string }[]) ?? []) {
    overrides.set(r.puzzle_number, r.equation);
  }
  const rows: IntegraEquationRow[] = [];
  for (let n = today; n <= today + days; n++) {
    const ov = overrides.get(n);
    rows.push({
      puzzleNumber: n,
      equation: ov ?? integraAnswerFor(n),
      editable: n > today,
      overridden: ov !== undefined,
    });
  }
  return rows;
}

export type AlfazyWordRow = { puzzleNumber: number; word: string; editable: boolean };

/** Upcoming Alfazy puzzle words for the admin editor. Wraps the admin_list_alfazy_puzzles RPC. */
export async function getUpcomingAlfazyWords(): Promise<AlfazyWordRow[]> {
  const supabase = await supabaseAuthServer();
  const today = puzzleNumberFor();
  const { data, error } = await supabase.rpc("admin_list_alfazy_puzzles", { p_from: today });
  if (error) throw new Error(error.message);
  return ((data as { puzzle_number: number; word: string }[]) ?? []).map((r) => ({
    puzzleNumber: r.puzzle_number,
    word: r.word,
    editable: r.puzzle_number > today,
  }));
}
