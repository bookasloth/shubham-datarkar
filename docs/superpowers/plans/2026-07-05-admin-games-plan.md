# Admin Games Section Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an `/admin/games` section giving the site owner a stats dashboard + leaderboards, a player browser with moderation actions, and (optionally) DB-driven management of Alfazy puzzle words — without breaking existing puzzle history or streaks.

**Architecture:** Three independent, shippable PRs. PR 1 is read-only over existing RPCs (zero DB change). PR 2 adds player browsing + admin-only moderation RPCs (one migration). PR 3 migrates the hardcoded Alfazy word list into a `alfazy_puzzles` table pre-seeded so every past puzzle resolves to the exact same word, with a code fallback, then adds word CRUD. Each PR follows the existing admin CRUD pattern (`supabaseAuthServer()` reads, `"use server"` actions guarded by `requireAdmin()`, `revalidatePath`).

**Tech Stack:** Next.js (App Router, RSC + Server Actions), Supabase (Postgres + RLS + security-definer RPCs), TypeScript, Vitest, Tailwind.

## Global Constraints

- **Branch off `origin/main`**, one PR per phase, merge via PR — never commit direct to main. Verify `origin/main..HEAD` before committing; flag any foreign commits (concurrent sessions share this tree).
- **Never apply migrations directly.** Write the migration file under `supabase/migrations/`, then hand the user the raw SQL to run manually. Do not call `apply_migration` / `execute_sql`.
- **Never touch the connected BAS Supabase project.** This site has its own Supabase.
- **Do not auto-deploy.** Deploy is a separate, explicit, per-deploy instruction.
- **Design:** monochrome, no emojis, fonts Jakarta (`font-display`) + Poppins. Reuse existing UI primitives (`@/components/ui/button`, `rounded-card`, `border-border`, `text-muted-foreground`).
- **Admin auth:** every admin page calls `requireAdmin()` from `@/lib/auth/session`; every server action calls `await requireAdmin()` before any write.
- **Reads use** `supabaseAuthServer()` (session client, RLS-subject). **Moderation writes that must bypass RLS use** `supabaseAdmin()` from `@/lib/supabase/server` (service-role) — server-only, never returned raw to the client.
- **TDD scope:** this codebase unit-tests pure logic in `src/lib/**` with Vitest (e.g. `src/lib/photos/form.test.ts`, `src/lib/games/validate-result.test.ts`). RSC pages and server actions are NOT unit-tested here — they are verified by `npm run build` + the preview workflow. Follow that split: write Vitest tests for pure helpers; verify pages/actions via build + preview.
- **Test command:** `npm run test` (alias `vitest run`). Single file: `npx vitest run <path>`.
- **Games enum:** `game_key = 'alfazy' | 'hit_and_blow'`. TypeScript mirror: `GameKey` from `@/lib/games/registry`. Game list source of truth: `GAMES` in `src/lib/games/registry.ts`.

---

## File Structure

**PR 1 — Dashboard + leaderboards**
- Create `src/lib/games/admin-queries.ts` — server-only read helpers over existing RPCs + count queries.
- Create `src/app/admin/games/page.tsx` — dashboard: per-game stat cards + leaderboard tables.
- Modify `src/app/admin/layout.tsx:11` — add `{ href: "/admin/games", label: "Games" }` to `NAV`.

**PR 2 — Players + moderation**
- Create `supabase/migrations/20260705000002_games_admin.sql` — admin-only security-definer RPCs (list players, delete result, reset streak, rename username).
- Extend `src/lib/games/admin-queries.ts` — `getPlayersAdmin`, `getPlayerDetailAdmin`.
- Create `src/lib/games/admin-actions.ts` — `"use server"` moderation actions.
- Create `src/app/admin/games/players/page.tsx` — player list.
- Create `src/app/admin/games/players/[id]/page.tsx` — one player: results + streaks + moderation buttons.

**PR 3 — Alfazy word management (DB-driven)**
- Create `supabase/migrations/20260705000003_alfazy_puzzles.sql` — `alfazy_puzzles` table + admin RPCs.
- Create `scripts/seed-alfazy-puzzles.ts` — generates the seed `INSERT` SQL from the current code list (run locally; output handed to user).
- Create `src/lib/games/alfazy-word-form.ts` — pure form parsing/validation for a word row.
- Create `src/lib/games/alfazy-puzzles.ts` — server-only read: `wordForPuzzle(n)` (DB with code fallback).
- Modify `src/app/games/[slug]/page.tsx` (Alfazy branch) — read word server-side, pass `answer` prop.
- Modify `src/components/games/AlfazyBoard.tsx:13-14` — accept `answer` as a prop instead of `answerFor(puzzleNumber)`.
- Extend `src/lib/games/admin-actions.ts` — `upsertAlfazyWord`, `resetAlfazyWord`.
- Create `src/app/admin/games/words/page.tsx` — upcoming-word list + edit.

---

# PR 1 — Dashboard + Leaderboards (read-only, no DB change)

### Task 1: Admin read helpers over existing RPCs

**Files:**
- Create: `src/lib/games/admin-queries.ts`
- Test: (none — thin DB wrappers, verified by build + preview; matches how `src/lib/photos/queries.ts` admin reads are left untested)

**Interfaces:**
- Consumes: `supabaseAuthServer` from `@/lib/supabase/auth-server`; `GAMES`, `GameKey` from `@/lib/games/registry`; `puzzleNumberFor` from `@/lib/daily`.
- Produces:
  - `type GameStat = { key: GameKey; name: string; players: number; plays: number; wins: number; todayPuzzle: number }`
  - `type BoardRow = { username: string; guesses: number; timeMs: number | null; status: string }`
  - `type StreakRow = { username: string; currentStreak: number; maxStreak: number }`
  - `getGameStats(): Promise<GameStat[]>`
  - `getDailyBoard(game: GameKey, puzzle: number): Promise<BoardRow[]>`
  - `getStreakBoard(game: GameKey): Promise<StreakRow[]>`

- [ ] **Step 1: Write the module**

```typescript
// src/lib/games/admin-queries.ts
import "server-only";

import { supabaseAuthServer } from "@/lib/supabase/auth-server";
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
  status: string;
};

export type StreakRow = {
  username: string;
  currentStreak: number;
  maxStreak: number;
};

/** Per-game totals for the dashboard cards. Throws on DB/auth failure so the
 *  page renders an explicit error state (never a misleading "0"). */
export async function getGameStats(): Promise<GameStat[]> {
  const supabase = await supabaseAuthServer();
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

      const players = await supabase
        .from("streaks")
        .select("user_id", { count: "exact", head: true })
        .eq("game", g.key);
      if (players.error) throw new Error(players.error.message);

      return {
        key: g.key,
        name: g.name,
        players: players.count ?? 0,
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
  return ((data as { username: string; guesses: number; time_ms: number | null; status: string }[]) ?? []).map((r) => ({
    username: r.username,
    guesses: r.guesses,
    timeMs: r.time_ms,
    status: r.status,
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
```

> Note: `get_daily_board` / `get_streak_board` are granted to `authenticated` (see `20260705000001_games_init.sql:182-185`), so the session admin client can call them. The `count` queries read `game_results` / `streaks` directly; RLS on those tables restricts a normal user to their own rows, but the admin session is the site owner. If counts come back as their own rows only (RLS blocks aggregate over all users), fall back to the admin RPC approach from PR 2 Task 1 — verify in Step 2 below.

- [ ] **Step 2: Verify counts see all rows (RLS check)**

Run the dev server (preview workflow) after Task 2's page exists, or run an ad-hoc check: temporarily log `getGameStats()` output. If `plays`/`players` reflect only the admin's own results (because RLS `results: own` / `streaks: own read` blocks cross-user aggregation), the direct counts are wrong. In that case, move the three counts into an admin RPC (as done for the player list in PR 2) and call it here instead. Document the outcome in the PR description.

- [ ] **Step 3: Commit**

```bash
git add src/lib/games/admin-queries.ts
git commit -m "feat(admin-games): read helpers for game stats + leaderboards"
```

---

### Task 2: Dashboard page + nav link

**Files:**
- Create: `src/app/admin/games/page.tsx`
- Modify: `src/app/admin/layout.tsx:11`

**Interfaces:**
- Consumes: `getGameStats`, `getDailyBoard`, `getStreakBoard`, `GameStat`, `BoardRow`, `StreakRow` from Task 1; `GAMES` from `@/lib/games/registry`.
- Produces: route `/admin/games` (nothing consumed downstream in PR 1).

- [ ] **Step 1: Add the nav link**

In `src/app/admin/layout.tsx`, insert after the Links entry (line 11):

```typescript
  { href: "/admin/links", label: "Links" },
  { href: "/admin/games", label: "Games" },
  ...ENTITY_LIST.map((e) => ({ href: `/admin/content/${e.key}`, label: e.label })),
```

- [ ] **Step 2: Write the dashboard page**

```tsx
// src/app/admin/games/page.tsx
import { GAMES } from "@/lib/games/registry";
import {
  getGameStats,
  getDailyBoard,
  getStreakBoard,
  type GameStat,
  type BoardRow,
  type StreakRow,
} from "@/lib/games/admin-queries";

export const dynamic = "force-dynamic";

type GamePanel = { stat: GameStat; daily: BoardRow[]; streaks: StreakRow[] };

export default async function AdminGamesPage() {
  let panels: GamePanel[] | null = null;
  let loadError = false;
  try {
    const stats = await getGameStats();
    panels = await Promise.all(
      stats.map(async (stat): Promise<GamePanel> => {
        const [daily, streaks] = await Promise.all([
          getDailyBoard(stat.key, stat.todayPuzzle),
          getStreakBoard(stat.key),
        ]);
        return { stat, daily, streaks };
      }),
    );
  } catch {
    loadError = true;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Games</h1>
        <a
          href="/admin/games/players"
          className="rounded-btn border border-border px-3 py-1.5 text-sm hover:bg-accent"
        >
          Players
        </a>
      </div>

      {loadError ? (
        <div className="rounded-card border border-danger/40 bg-danger/5 p-4 text-sm text-danger">
          Could not load game data. This is a fetch error, not empty stats.
        </div>
      ) : (
        panels?.map(({ stat, daily, streaks }) => (
          <section key={stat.key} className="space-y-4">
            <h2 className="font-display text-lg font-semibold">{stat.name}</h2>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Players" value={stat.players} />
              <Stat label="Plays" value={stat.plays} />
              <Stat label="Wins" value={stat.wins} />
              <Stat label="Today" value={`#${stat.todayPuzzle}`} />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <BoardCard title={`Today's board (#${stat.todayPuzzle})`}>
                {daily.length === 0 ? (
                  <Empty>No winners yet today.</Empty>
                ) : (
                  <ol className="divide-y divide-border text-sm">
                    {daily.map((r, i) => (
                      <li key={`${r.username}-${i}`} className="flex justify-between py-1.5">
                        <span className="truncate">{i + 1}. {r.username}</span>
                        <span className="text-muted-foreground">
                          {r.guesses} guess{r.guesses === 1 ? "" : "es"}
                        </span>
                      </li>
                    ))}
                  </ol>
                )}
              </BoardCard>

              <BoardCard title="Top streaks">
                {streaks.length === 0 ? (
                  <Empty>No streaks yet.</Empty>
                ) : (
                  <ol className="divide-y divide-border text-sm">
                    {streaks.map((r, i) => (
                      <li key={`${r.username}-${i}`} className="flex justify-between py-1.5">
                        <span className="truncate">{i + 1}. {r.username}</span>
                        <span className="text-muted-foreground">
                          {r.currentStreak} (max {r.maxStreak})
                        </span>
                      </li>
                    ))}
                  </ol>
                )}
              </BoardCard>
            </div>
          </section>
        ))
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-card border border-border p-3">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-xl font-semibold">{value}</div>
    </div>
  );
}

function BoardCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-card border border-border p-4">
      <div className="mb-2 text-sm font-medium">{title}</div>
      {children}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: PASS — `/admin/games` compiles. Fix any type errors before continuing.

- [ ] **Step 4: Verify in preview**

Start the dev server via the preview workflow, sign in as admin, navigate to `/admin/games`. Confirm: nav shows "Games"; per-game cards render numbers; boards show rows or the empty state; no console/server errors. Take a screenshot for the PR. (Per user pref, verify via DOM snapshot/inspect, not `preview_screenshot`.)

- [ ] **Step 5: Commit + open PR**

```bash
git add src/app/admin/games/page.tsx src/app/admin/layout.tsx
git commit -m "feat(admin-games): dashboard with per-game stats + leaderboards"
git push -u origin HEAD
gh pr create --fill
```

---

# PR 2 — Players + Moderation (one migration)

### Task 3: Admin moderation migration

**Files:**
- Create: `supabase/migrations/20260705000002_games_admin.sql`

**Interfaces:**
- Produces (Postgres RPCs, all `security definer`, granted to `authenticated` only):
  - `admin_list_players()` → `table(id uuid, username text, created_at timestamptz, total_played int, total_won int)`
  - `admin_player_results(p_user uuid)` → `table(id uuid, game game_key, puzzle_number int, puzzle_date date, status result_status, guesses int)`
  - `admin_player_streaks(p_user uuid)` → `table(game game_key, current_streak int, max_streak int, total_played int, total_won int)`
  - `admin_delete_result(p_result uuid)` → `void`
  - `admin_reset_streak(p_user uuid, p_game game_key)` → `void`
  - `admin_rename_user(p_user uuid, p_username text)` → `void`
- Each RPC enforces admin identity internally via an `admin_email` check against `auth.jwt()`.

> **Why RPCs, not direct table writes:** RLS on `game_results` / `streaks` scopes rows to `auth.uid()`. An admin needs cross-user read + delete. Security-definer RPCs with an explicit admin guard are the same trust model already used by `submit_result` and the leaderboard RPCs.

- [ ] **Step 1: Write the migration file**

```sql
-- supabase/migrations/20260705000002_games_admin.sql
-- =============================================================
--  /admin/games — admin-only moderation RPCs.
--  security definer + explicit admin guard (email from JWT).
--  Set the admin email once:  select set_config('app.admin_email', '<email>', false);
--  is NOT persistent — instead we hardcode via a helper that reads the same
--  ADMIN_EMAIL the app uses. Simplest portable check: compare to a fixed value.
-- =============================================================

-- Helper: is the caller the site admin?
-- Replace the literal below with the site's admin email (matches ADMIN_EMAIL env).
create or replace function public.is_games_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(auth.jwt() ->> 'email', '') = 'REPLACE_WITH_ADMIN_EMAIL';
$$;

create or replace function public.admin_list_players()
returns table (id uuid, username text, created_at timestamptz, total_played int, total_won int)
language sql security definer set search_path = public as $$
  select p.id, p.username, p.created_at,
         coalesce(sum(s.total_played), 0)::int,
         coalesce(sum(s.total_won), 0)::int
  from public.profiles p
  left join public.streaks s on s.user_id = p.id
  where public.is_games_admin()
  group by p.id, p.username, p.created_at
  order by p.created_at desc
  limit 500;
$$;

create or replace function public.admin_player_results(p_user uuid)
returns table (id uuid, game game_key, puzzle_number int, puzzle_date date, status result_status, guesses int)
language sql security definer set search_path = public as $$
  select r.id, r.game, r.puzzle_number, r.puzzle_date, r.status, r.guesses
  from public.game_results r
  where public.is_games_admin() and r.user_id = p_user
  order by r.puzzle_date desc, r.game
  limit 500;
$$;

create or replace function public.admin_player_streaks(p_user uuid)
returns table (game game_key, current_streak int, max_streak int, total_played int, total_won int)
language sql security definer set search_path = public as $$
  select s.game, s.current_streak, s.max_streak, s.total_played, s.total_won
  from public.streaks s
  where public.is_games_admin() and s.user_id = p_user
  order by s.game;
$$;

create or replace function public.admin_delete_result(p_result uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_games_admin() then raise exception 'not authorized'; end if;
  delete from public.game_results where id = p_result;
end; $$;

create or replace function public.admin_reset_streak(p_user uuid, p_game game_key)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_games_admin() then raise exception 'not authorized'; end if;
  update public.streaks
    set current_streak = 0, max_streak = 0, last_solved_puzzle = null,
        total_played = 0, total_won = 0
    where user_id = p_user and game = p_game;
end; $$;

create or replace function public.admin_rename_user(p_user uuid, p_username text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_games_admin() then raise exception 'not authorized'; end if;
  if p_username is null or length(trim(p_username)) < 3 then
    raise exception 'username too short';
  end if;
  update public.profiles set username = trim(p_username) where id = p_user;
end; $$;

grant execute on function public.admin_list_players    to authenticated;
grant execute on function public.admin_player_results  to authenticated;
grant execute on function public.admin_player_streaks  to authenticated;
grant execute on function public.admin_delete_result   to authenticated;
grant execute on function public.admin_reset_streak    to authenticated;
grant execute on function public.admin_rename_user     to authenticated;
```

- [ ] **Step 2: Hand the SQL to the user**

Do NOT apply. Tell the user: "Run `supabase/migrations/20260705000002_games_admin.sql` in the Supabase SQL editor. Before running, replace `REPLACE_WITH_ADMIN_EMAIL` with your admin email (same value as the `ADMIN_EMAIL` env var)." Wait for confirmation it ran before verifying Task 4/5 against the live DB.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260705000002_games_admin.sql
git commit -m "feat(admin-games): moderation RPCs (list/delete/reset/rename)"
```

---

### Task 4: Player read helpers + moderation actions

**Files:**
- Modify: `src/lib/games/admin-queries.ts` (append)
- Create: `src/lib/games/admin-actions.ts`

**Interfaces:**
- Consumes: RPCs from Task 3; `supabaseAuthServer`; `requireAdmin` from `@/lib/auth/session`; `revalidatePath` from `next/cache`; `GameKey`.
- Produces:
  - `type PlayerRow = { id: string; username: string; createdAt: string; totalPlayed: number; totalWon: number }`
  - `type PlayerResult = { id: string; game: GameKey; puzzleNumber: number; puzzleDate: string; status: string; guesses: number }`
  - `type PlayerStreak = { game: GameKey; currentStreak: number; maxStreak: number; totalPlayed: number; totalWon: number }`
  - `getPlayersAdmin(): Promise<PlayerRow[]>`
  - `getPlayerDetailAdmin(id): Promise<{ results: PlayerResult[]; streaks: PlayerStreak[] }>`
  - actions: `deleteResult(resultId: string): Promise<void>`, `resetStreak(userId: string, game: GameKey): Promise<void>`, `renameUser(userId: string, formData: FormData): Promise<void>`

- [ ] **Step 1: Append read helpers to `admin-queries.ts`**

```typescript
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

export async function getPlayersAdmin(): Promise<PlayerRow[]> {
  const supabase = await supabaseAuthServer();
  const { data, error } = await supabase.rpc("admin_list_players");
  if (error) throw new Error(error.message);
  return ((data as { id: string; username: string; created_at: string; total_played: number; total_won: number }[]) ?? []).map((r) => ({
    id: r.id,
    username: r.username,
    createdAt: r.created_at,
    totalPlayed: r.total_played,
    totalWon: r.total_won,
  }));
}

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
    results: ((results.data as { id: string; game: GameKey; puzzle_number: number; puzzle_date: string; status: string; guesses: number }[]) ?? []).map((r) => ({
      id: r.id,
      game: r.game,
      puzzleNumber: r.puzzle_number,
      puzzleDate: r.puzzle_date,
      status: r.status,
      guesses: r.guesses,
    })),
    streaks: ((streaks.data as { game: GameKey; current_streak: number; max_streak: number; total_played: number; total_won: number }[]) ?? []).map((s) => ({
      game: s.game,
      currentStreak: s.current_streak,
      maxStreak: s.max_streak,
      totalPlayed: s.total_played,
      totalWon: s.total_won,
    })),
  };
}
```

- [ ] **Step 2: Write the moderation actions**

```typescript
// src/lib/games/admin-actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { supabaseAuthServer } from "@/lib/supabase/auth-server";
import { requireAdmin } from "@/lib/auth/session";
import type { GameKey } from "@/lib/games/registry";

export async function deleteResult(resultId: string): Promise<void> {
  await requireAdmin();
  const supabase = await supabaseAuthServer();
  const { error } = await supabase.rpc("admin_delete_result", { p_result: resultId });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/games");
}

export async function resetStreak(userId: string, game: GameKey): Promise<void> {
  await requireAdmin();
  const supabase = await supabaseAuthServer();
  const { error } = await supabase.rpc("admin_reset_streak", { p_user: userId, p_game: game });
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/games/players/${userId}`);
}

export async function renameUser(userId: string, formData: FormData): Promise<void> {
  await requireAdmin();
  const username = String(formData.get("username") ?? "").trim();
  const supabase = await supabaseAuthServer();
  const { error } = await supabase.rpc("admin_rename_user", { p_user: userId, p_username: username });
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/games/players/${userId}`);
}
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/lib/games/admin-queries.ts src/lib/games/admin-actions.ts
git commit -m "feat(admin-games): player read helpers + moderation actions"
```

---

### Task 5: Player list + detail pages

**Files:**
- Create: `src/app/admin/games/players/page.tsx`
- Create: `src/app/admin/games/players/[id]/page.tsx`

**Interfaces:**
- Consumes: `getPlayersAdmin`, `getPlayerDetailAdmin` (Task 4); `deleteResult`, `resetStreak`, `renameUser` (Task 4); `GAMES` for the streak-reset buttons.

- [ ] **Step 1: Player list page**

```tsx
// src/app/admin/games/players/page.tsx
import Link from "next/link";
import { getPlayersAdmin, type PlayerRow } from "@/lib/games/admin-queries";

export const dynamic = "force-dynamic";

export default async function AdminGamesPlayersPage() {
  let players: PlayerRow[] | null = null;
  let loadError = false;
  try {
    players = await getPlayersAdmin();
  } catch {
    loadError = true;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Players</h1>
        <Link href="/admin/games" className="text-sm text-muted-foreground hover:text-foreground">
          &larr; Games
        </Link>
      </div>

      {loadError ? (
        <div className="rounded-card border border-danger/40 bg-danger/5 p-4 text-sm text-danger">
          Could not load players. This is a fetch error, not an empty list.
        </div>
      ) : players && players.length === 0 ? (
        <p className="text-sm text-muted-foreground">No players yet.</p>
      ) : (
        <div className="overflow-hidden rounded-card border border-border">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Username</th>
                <th className="px-3 py-2">Played</th>
                <th className="px-3 py-2">Won</th>
                <th className="px-3 py-2">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {players?.map((p) => (
                <tr key={p.id} className="hover:bg-accent">
                  <td className="px-3 py-2">
                    <Link href={`/admin/games/players/${p.id}`} className="font-medium hover:underline">
                      {p.username}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{p.totalPlayed}</td>
                  <td className="px-3 py-2 text-muted-foreground">{p.totalWon}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {new Date(p.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Player detail page (results + streaks + moderation)**

```tsx
// src/app/admin/games/players/[id]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPlayerDetailAdmin, getPlayersAdmin } from "@/lib/games/admin-queries";
import { deleteResult, resetStreak, renameUser } from "@/lib/games/admin-actions";
import { GAMES } from "@/lib/games/registry";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function AdminGamesPlayerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const players = await getPlayersAdmin();
  const player = players.find((p) => p.id === id);
  if (!player) notFound();

  const { results, streaks } = await getPlayerDetailAdmin(id);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">{player.username}</h1>
        <Link href="/admin/games/players" className="text-sm text-muted-foreground hover:text-foreground">
          &larr; Players
        </Link>
      </div>

      {/* Rename */}
      <form action={renameUser.bind(null, id)} className="flex items-end gap-2">
        <label className="text-sm">
          <span className="mb-1 block text-muted-foreground">Rename</span>
          <input
            name="username"
            defaultValue={player.username}
            className="rounded-btn border border-border bg-background px-2 py-1.5 text-sm"
          />
        </label>
        <Button size="sm" type="submit">Save</Button>
      </form>

      {/* Streaks + reset */}
      <section className="space-y-2">
        <h2 className="font-display text-lg font-semibold">Streaks</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {GAMES.map((g) => {
            const s = streaks.find((x) => x.game === g.key);
            return (
              <div key={g.key} className="rounded-card border border-border p-3">
                <div className="mb-1 text-sm font-medium">{g.name}</div>
                <div className="text-sm text-muted-foreground">
                  Current {s?.currentStreak ?? 0} · Max {s?.maxStreak ?? 0} · Won {s?.totalWon ?? 0}/{s?.totalPlayed ?? 0}
                </div>
                <form action={resetStreak.bind(null, id, g.key)} className="mt-2">
                  <Button size="sm" variant="outline" type="submit">Reset streak</Button>
                </form>
              </div>
            );
          })}
        </div>
      </section>

      {/* Results + delete */}
      <section className="space-y-2">
        <h2 className="font-display text-lg font-semibold">Results</h2>
        {results.length === 0 ? (
          <p className="text-sm text-muted-foreground">No results.</p>
        ) : (
          <div className="overflow-hidden rounded-card border border-border">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Game</th>
                  <th className="px-3 py-2">Puzzle</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Guesses</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {results.map((r) => (
                  <tr key={r.id}>
                    <td className="px-3 py-2">{r.game}</td>
                    <td className="px-3 py-2 text-muted-foreground">#{r.puzzleNumber}</td>
                    <td className="px-3 py-2 text-muted-foreground">{r.status}</td>
                    <td className="px-3 py-2 text-muted-foreground">{r.guesses}</td>
                    <td className="px-3 py-2 text-right">
                      <form action={deleteResult.bind(null, r.id)}>
                        <Button size="sm" variant="outline" type="submit">Delete</Button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
```

> Note: after `deleteResult`, the shown streak totals may be stale until the next win recomputes them — deletion does not retro-adjust `streaks`. Call out this limitation in the PR; a "recount" action is out of scope.

- [ ] **Step 3: Verify build + preview**

Run: `npm run build` → PASS. Then in preview (admin session): open `/admin/games/players`, click a player, exercise rename / reset / delete, confirm the row/values update after the action's `revalidatePath`. Confirm a non-admin session (or logged-out) is redirected to `/login`.

- [ ] **Step 4: Commit + open PR**

```bash
git add src/app/admin/games/players
git commit -m "feat(admin-games): player list + detail with moderation"
git push -u origin HEAD
gh pr create --fill
```

---

# PR 3 — Alfazy Word Management (DB-driven, history-preserving)

> **Core design constraint:** today the answer for puzzle N is `ANSWER_LIST[N % ANSWER_LIST.length]` (`src/lib/games/alfazy.ts` → `answerFor`). Any change to the list length or order silently rewrites the answers of *past* puzzles, corrupting every stored `game_results` row and share grid. To make words editable safely we introduce a `alfazy_puzzles(puzzle_number, word)` table **pre-seeded with the exact current mapping for every puzzle number up to a cutover**, and a read path that falls back to the code formula when no row exists. Admin edits only **future** puzzles (number > today). Hit-and-Blow codes are algorithmically generated (`secretFor`) with nothing stored — out of scope; the words UI is Alfazy-only.

### Task 6: `alfazy_puzzles` table + admin RPCs + seed generator

**Files:**
- Create: `supabase/migrations/20260705000003_alfazy_puzzles.sql`
- Create: `scripts/seed-alfazy-puzzles.ts`

**Interfaces:**
- Produces (SQL): table `public.alfazy_puzzles(puzzle_number int primary key, word text not null check (word ~ '^[a-z]{5}$'), updated_at timestamptz default now())`; RPCs `admin_list_alfazy_puzzles(p_from int)`, `admin_upsert_alfazy_puzzle(p_puzzle int, p_word text)`, `admin_delete_alfazy_puzzle(p_puzzle int)`; a public read grant so the app can select a single row.
- Produces (script): prints `INSERT` statements for puzzle numbers `0..(today + 60)` using the current code answers, so history is frozen and ~2 months of future puzzles are materialized for editing.

- [ ] **Step 1: Write the migration file**

```sql
-- supabase/migrations/20260705000003_alfazy_puzzles.sql
-- Alfazy words become DB-driven. Rows are pre-seeded (separate INSERT script)
-- so every already-played puzzle resolves to the exact same word; the app
-- falls back to the code formula for any puzzle_number with no row.
create table public.alfazy_puzzles (
  puzzle_number int primary key,
  word          text not null check (word ~ '^[a-z]{5}$'),
  updated_at    timestamptz default now()
);

alter table public.alfazy_puzzles enable row level security;
-- Public read: the answer is already client-visible in today's build; parity.
create policy "alfazy_puzzles: public read" on public.alfazy_puzzles
  for select using (true);

create or replace function public.admin_list_alfazy_puzzles(p_from int)
returns table (puzzle_number int, word text, updated_at timestamptz)
language sql security definer set search_path = public as $$
  select puzzle_number, word, updated_at
  from public.alfazy_puzzles
  where public.is_games_admin() and puzzle_number >= p_from
  order by puzzle_number
  limit 200;
$$;

create or replace function public.admin_upsert_alfazy_puzzle(p_puzzle int, p_word text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_games_admin() then raise exception 'not authorized'; end if;
  if p_word !~ '^[a-z]{5}$' then raise exception 'word must be 5 lowercase letters'; end if;
  insert into public.alfazy_puzzles (puzzle_number, word, updated_at)
  values (p_puzzle, p_word, now())
  on conflict (puzzle_number) do update set word = excluded.word, updated_at = now();
end; $$;

create or replace function public.admin_delete_alfazy_puzzle(p_puzzle int)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_games_admin() then raise exception 'not authorized'; end if;
  delete from public.alfazy_puzzles where puzzle_number = p_puzzle;
end; $$;

grant execute on function public.admin_list_alfazy_puzzles  to authenticated;
grant execute on function public.admin_upsert_alfazy_puzzle to authenticated;
grant execute on function public.admin_delete_alfazy_puzzle to authenticated;
```

> Depends on `is_games_admin()` from PR 2's migration. PR 3 must land after PR 2.

- [ ] **Step 2: Write the seed generator script**

```typescript
// scripts/seed-alfazy-puzzles.ts
// Run: npx tsx scripts/seed-alfazy-puzzles.ts > alfazy-seed.sql
// Emits INSERTs freezing the code answers for puzzles 0..(today+60).
import { answerFor } from "@/lib/games/alfazy";
import { puzzleNumberFor } from "@/lib/daily";

const today = puzzleNumberFor();
const end = today + 60;

const values: string[] = [];
for (let n = 0; n <= end; n++) {
  values.push(`(${n}, '${answerFor(n)}')`);
}

process.stdout.write(
  "insert into public.alfazy_puzzles (puzzle_number, word) values\n" +
    values.join(",\n") +
    "\non conflict (puzzle_number) do nothing;\n",
);
```

> If `@/` path aliases don't resolve under `tsx`, run with `npx tsx --tsconfig tsconfig.json scripts/seed-alfazy-puzzles.ts`, or inline-import via relative paths `../src/lib/games/alfazy`. Verify the first few emitted rows match `answerFor(0)`, `answerFor(1)` by eye.

- [ ] **Step 3: Generate the seed + hand both SQL files to the user**

Run: `npx tsx scripts/seed-alfazy-puzzles.ts > alfazy-seed.sql`
Then instruct the user to run, in order: (1) `20260705000003_alfazy_puzzles.sql`, then (2) the generated `alfazy-seed.sql`. Do NOT apply either. Confirm the row count ≈ `today + 61` before proceeding.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260705000003_alfazy_puzzles.sql scripts/seed-alfazy-puzzles.ts
git commit -m "feat(admin-games): alfazy_puzzles table + admin RPCs + seed script"
```

---

### Task 7: Word-form validation helper (TDD)

**Files:**
- Create: `src/lib/games/alfazy-word-form.ts`
- Test: `src/lib/games/alfazy-word-form.test.ts`

**Interfaces:**
- Produces: `type AlfazyWordInput = { puzzleNumber: number; word: string }`; `parseAlfazyWordForm(formData: FormData): AlfazyWordInput`; `validateAlfazyWord(word: string): { ok: true; word: string } | { ok: false; error: string }`.

- [ ] **Step 1: Write the failing test**

```typescript
// src/lib/games/alfazy-word-form.test.ts
import { describe, it, expect } from "vitest";
import { parseAlfazyWordForm, validateAlfazyWord } from "./alfazy-word-form";

describe("validateAlfazyWord", () => {
  it("accepts a clean 5-letter lowercase word", () => {
    expect(validateAlfazyWord("crane")).toEqual({ ok: true, word: "crane" });
  });
  it("lowercases and trims before validating", () => {
    expect(validateAlfazyWord("  CRANE ")).toEqual({ ok: true, word: "crane" });
  });
  it("rejects wrong length", () => {
    expect(validateAlfazyWord("cat").ok).toBe(false);
    expect(validateAlfazyWord("cranes").ok).toBe(false);
  });
  it("rejects non-letters", () => {
    expect(validateAlfazyWord("cr4ne").ok).toBe(false);
    expect(validateAlfazyWord("cr ne").ok).toBe(false);
  });
});

describe("parseAlfazyWordForm", () => {
  function fd(entries: Record<string, string>): FormData {
    const f = new FormData();
    for (const [k, v] of Object.entries(entries)) f.set(k, v);
    return f;
  }
  it("parses puzzle number and normalized word", () => {
    expect(parseAlfazyWordForm(fd({ puzzle_number: "42", word: " CRANE " }))).toEqual({
      puzzleNumber: 42,
      word: "crane",
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/games/alfazy-word-form.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```typescript
// src/lib/games/alfazy-word-form.ts
export type AlfazyWordInput = { puzzleNumber: number; word: string };

export function validateAlfazyWord(
  raw: string,
): { ok: true; word: string } | { ok: false; error: string } {
  const word = String(raw ?? "").trim().toLowerCase();
  if (!/^[a-z]{5}$/.test(word)) {
    return { ok: false, error: "Word must be exactly 5 letters (a–z)." };
  }
  return { ok: true, word };
}

export function parseAlfazyWordForm(formData: FormData): AlfazyWordInput {
  const puzzleNumber = Math.trunc(Number(String(formData.get("puzzle_number") ?? "").trim()));
  const word = String(formData.get("word") ?? "").trim().toLowerCase();
  return { puzzleNumber, word };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/games/alfazy-word-form.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/games/alfazy-word-form.ts src/lib/games/alfazy-word-form.test.ts
git commit -m "feat(admin-games): alfazy word form parse + validation"
```

---

### Task 8: DB-backed word read + wire public board

**Files:**
- Create: `src/lib/games/alfazy-puzzles.ts`
- Modify: `src/components/games/AlfazyBoard.tsx:13-14`
- Modify: the Alfazy branch of `src/app/games/[slug]/page.tsx` (locate where `AlfazyBoard` is rendered)

**Interfaces:**
- Consumes: `supabaseAnon` from `@/lib/supabase/server`; `answerFor` from `@/lib/games/alfazy`.
- Produces: `wordForPuzzle(puzzleNumber: number): Promise<string>` — returns the DB word, or `answerFor(puzzleNumber)` when no row / on error.
- Changes `AlfazyBoard` prop shape: **adds** `answer: string`; **removes** internal `answerFor(puzzleNumber)` call. `puzzleNumber` + `isArchive` props unchanged.

- [ ] **Step 1: Write the read helper**

```typescript
// src/lib/games/alfazy-puzzles.ts
import "server-only";

import { supabaseAnon } from "@/lib/supabase/server";
import { answerFor } from "@/lib/games/alfazy";

/** The Alfazy answer for a puzzle: DB row if present, else the frozen code
 *  formula. Never throws — a DB hiccup must not break gameplay. */
export async function wordForPuzzle(puzzleNumber: number): Promise<string> {
  try {
    const { data, error } = await supabaseAnon()
      .from("alfazy_puzzles")
      .select("word")
      .eq("puzzle_number", puzzleNumber)
      .maybeSingle();
    if (error) throw error;
    const word = (data as { word: string } | null)?.word;
    return word ?? answerFor(puzzleNumber);
  } catch {
    return answerFor(puzzleNumber);
  }
}
```

- [ ] **Step 2: Change `AlfazyBoard` to take `answer` as a prop**

In `src/components/games/AlfazyBoard.tsx`, replace the signature + `useMemo` (lines 13-14):

```tsx
export default function AlfazyBoard({
  puzzleNumber,
  isArchive,
  answer,
}: {
  puzzleNumber: number;
  isArchive: boolean;
  answer: string;
}) {
  const storageKey = `alfazy:${puzzleNumber}`;
```

Remove the now-unused `answerFor` import if nothing else in the file uses it (keep `ALFAZY, scoreGuess, isWin, isValidGuess, shareGrid, type Tile`).

- [ ] **Step 3: Pass `answer` from the server page**

In `src/app/games/[slug]/page.tsx`, find where `<AlfazyBoard puzzleNumber={...} isArchive={...} />` is rendered. Make that path `async` (it is a Server Component), fetch the word, and pass it:

```tsx
import { wordForPuzzle } from "@/lib/games/alfazy-puzzles";
// ...
const answer = await wordForPuzzle(puzzleNumber);
return <AlfazyBoard puzzleNumber={puzzleNumber} isArchive={isArchive} answer={answer} />;
```

> Read the actual file first — the exact variable names (`puzzleNumber`, `isArchive`) and whether Alfazy is one branch of a slug switch will dictate the precise edit. Do not guess the surrounding structure.

- [ ] **Step 4: Verify build + gameplay parity**

Run: `npm run build` → PASS. In preview, play today's Alfazy: the answer must equal `answerFor(today)` (unchanged, since the seed froze it). Confirm a win still submits and the share grid renders. This proves the DB path + fallback are transparent to players.

- [ ] **Step 5: Commit**

```bash
git add src/lib/games/alfazy-puzzles.ts src/components/games/AlfazyBoard.tsx "src/app/games/[slug]/page.tsx"
git commit -m "feat(games): Alfazy answer is DB-driven with code fallback"
```

---

### Task 9: Word management admin page + actions

**Files:**
- Modify: `src/lib/games/admin-actions.ts` (append)
- Modify: `src/lib/games/admin-queries.ts` (append)
- Create: `src/app/admin/games/words/page.tsx`

**Interfaces:**
- Consumes: `parseAlfazyWordForm`, `validateAlfazyWord` (Task 7); RPCs from Task 6; `puzzleNumberFor` from `@/lib/daily`.
- Produces:
  - query `getUpcomingAlfazyWords(): Promise<{ puzzleNumber: number; word: string; editable: boolean }[]>` (editable = `puzzleNumber > today`)
  - actions `upsertAlfazyWord(formData: FormData): Promise<void>`

- [ ] **Step 1: Append the read helper to `admin-queries.ts`**

```typescript
import { puzzleNumberFor } from "@/lib/daily"; // already imported at top — do not duplicate

export type AlfazyWordRow = { puzzleNumber: number; word: string; editable: boolean };

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
```

- [ ] **Step 2: Append the action to `admin-actions.ts`**

```typescript
import { parseAlfazyWordForm, validateAlfazyWord } from "@/lib/games/alfazy-word-form";
import { puzzleNumberFor } from "@/lib/daily";

export async function upsertAlfazyWord(formData: FormData): Promise<void> {
  await requireAdmin();
  const { puzzleNumber, word } = parseAlfazyWordForm(formData);
  // Guard: never rewrite a past/current puzzle — that would change a played answer.
  if (!Number.isFinite(puzzleNumber) || puzzleNumber <= puzzleNumberFor()) {
    throw new Error("Can only edit future puzzles.");
  }
  const check = validateAlfazyWord(word);
  if (!check.ok) throw new Error(check.error);

  const supabase = await supabaseAuthServer();
  const { error } = await supabase.rpc("admin_upsert_alfazy_puzzle", {
    p_puzzle: puzzleNumber,
    p_word: check.word,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/games/words");
}
```

- [ ] **Step 3: Word management page**

```tsx
// src/app/admin/games/words/page.tsx
import Link from "next/link";
import { getUpcomingAlfazyWords, type AlfazyWordRow } from "@/lib/games/admin-queries";
import { upsertAlfazyWord } from "@/lib/games/admin-actions";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function AdminAlfazyWordsPage() {
  let rows: AlfazyWordRow[] | null = null;
  let loadError = false;
  try {
    rows = await getUpcomingAlfazyWords();
  } catch {
    loadError = true;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Alfazy words</h1>
        <Link href="/admin/games" className="text-sm text-muted-foreground hover:text-foreground">
          &larr; Games
        </Link>
      </div>
      <p className="text-sm text-muted-foreground">
        Only future puzzles are editable. Past and today&apos;s words are frozen to preserve results.
      </p>

      {loadError ? (
        <div className="rounded-card border border-danger/40 bg-danger/5 p-4 text-sm text-danger">
          Could not load words. Fetch error, not an empty list.
        </div>
      ) : (
        <div className="overflow-hidden rounded-card border border-border">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Puzzle</th>
                <th className="px-3 py-2">Word</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows?.map((r) => (
                <tr key={r.puzzleNumber}>
                  <td className="px-3 py-2 text-muted-foreground">#{r.puzzleNumber}</td>
                  <td className="px-3 py-2">
                    {r.editable ? (
                      <form action={upsertAlfazyWord} className="flex items-center gap-2">
                        <input type="hidden" name="puzzle_number" value={r.puzzleNumber} />
                        <input
                          name="word"
                          defaultValue={r.word}
                          maxLength={5}
                          className="w-24 rounded-btn border border-border bg-background px-2 py-1 font-mono text-sm"
                        />
                        <Button size="sm" type="submit">Save</Button>
                      </form>
                    ) : (
                      <span className="font-mono">{r.word}</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right text-xs text-muted-foreground">
                    {r.editable ? "editable" : "frozen"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Link the page from the dashboard**

In `src/app/admin/games/page.tsx`, add a second header link next to "Players":

```tsx
<a href="/admin/games/words" className="rounded-btn border border-border px-3 py-1.5 text-sm hover:bg-accent">
  Words
</a>
```

- [ ] **Step 5: Verify build + preview**

Run: `npm run build` → PASS. In preview: open `/admin/games/words`, edit a future puzzle's word, save, confirm it persists (reload) and that today's row shows "frozen" with no input. Then reload today's Alfazy game and confirm the answer is unchanged. Attempt (via the guard) is covered — editing today should be impossible because no input renders and the action throws if forced.

- [ ] **Step 6: Commit + open PR**

```bash
git add src/lib/games/admin-actions.ts src/lib/games/admin-queries.ts src/app/admin/games/words/page.tsx src/app/admin/games/page.tsx
git commit -m "feat(admin-games): Alfazy word management (future puzzles only)"
git push -u origin HEAD
gh pr create --fill
```

---

## Post-merge manual steps (hand to user, do not perform)

- Run migration `20260705000002_games_admin.sql` (replace admin email literal first).
- Run migration `20260705000003_alfazy_puzzles.sql`, then the generated `alfazy-seed.sql`.
- Games feature itself still has a pending manual step from prior work: run `20260705000001` + turn Supabase "Confirm email" OFF (see memory). The admin section is read/moderate-only and does not depend on that, but leaderboards stay empty until real players exist.
- Deploy only on explicit instruction.

## Self-Review

- **Scope coverage:** stats + leaderboards (PR 1) ✓; browse players (PR 2 Task 5) ✓; moderation — delete result, reset streak, rename user (PR 2 Tasks 3–5) ✓; manage game content — Alfazy words (PR 3) ✓. Hit-and-Blow content is explicitly out of scope (algorithmic, nothing to store) and called out.
- **History safety:** the one real risk — rewriting past answers — is guarded three ways: seed freezes 0..today, the upsert action rejects `puzzleNumber <= today`, and the page renders no input for frozen rows.
- **Type consistency:** `GameStat/BoardRow/StreakRow` (Task 1) reused in Task 2; `PlayerRow/PlayerResult/PlayerStreak` (Task 4) reused in Task 5; `AlfazyWordRow` (Task 9) matches `admin_list_alfazy_puzzles` columns. RPC arg names (`p_game`, `p_puzzle`, `p_user`, `p_result`, `p_username`, `p_from`, `p_word`) match between SQL and the `.rpc()` calls.
- **RLS assumption flagged:** PR 1 Task 1 Step 2 explicitly verifies whether direct `count` reads see all users' rows under RLS, with a documented fallback to an admin RPC if not. This is the one thing to confirm live.
- **Dependency order:** PR 3 depends on `is_games_admin()` from PR 2 — noted. Ship PR 1 → PR 2 → PR 3.
