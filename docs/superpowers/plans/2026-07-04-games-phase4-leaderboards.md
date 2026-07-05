# Games Phase 4 — Leaderboards + Profile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** A public `/games/leaderboard` with per-game Daily / Weekly / Monthly / Streak boards, and an authenticated `/games/profile` showing per-game stats, a guess-distribution, recent games, and username rename.

**Architecture:** Leaderboard is a server component that reads `?game=&board=` search params and fetches exactly the selected board through the public security-definer RPCs via `supabaseAnon()`; tabs are `<Link>`s that change the params (server-rendered, no client data fetching). Profile is a server component gated by `requireGameUser()`; it reads the signed-in user's own `streaks` + `game_results` rows through `supabaseAuthServer()` (RLS scopes to the user), and username rename is a server action updating `profiles`. Period (week/month) date bounds are computed by a small pure, unit-tested IST helper.

**Tech Stack:** Next.js 16 App Router server components, `@/components/ui/{tabs,table}`, `supabaseAnon()` (public RPC reads) + `supabaseAuthServer()` (own-row reads/writes), `@/lib/daily` IST engine, Vitest.

## Global Constraints

- Path alias `@/*` → `./src/*`.
- **Leaderboards are public** — read only through the RPCs `get_daily_board`, `get_period_board`, `get_streak_board` (granted to anon) via `supabaseAnon()`. Never query base tables from anon for leaderboards (RLS/answer-leak).
- **Profile data is per-user** — read `streaks`/`game_results` through `supabaseAuthServer()` so RLS returns only the caller's rows. Never use the admin/service-role client here.
- `game_key` values are exactly `alfazy` and `hit_and_blow`. `result_status`: `won`/`lost`/`in_progress`.
- RPC shapes: `get_daily_board(p_game, p_puzzle)`→`{username, guesses, time_ms, status}`; `get_period_board(p_game, p_start, p_end)`→`{username, solved, total_guesses}`; `get_streak_board(p_game)`→`{username, current_streak, max_streak}`.
- Period bounds are **IST**: week = Monday–Sunday containing today; month = 1st–last of today's month. Dates are `YYYY-MM-DD` strings.
- Design tokens only; headings `font-display`; brand on interaction only; dark-mode via `.dark`. Empty states are first-class (no data yet is the common case).
- Every commit trailer: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- Verify via preview DOM tools, never `preview_screenshot`.

## Reference (already in repo)

- `@/lib/daily`: `puzzleNumberFor(now?)`, `puzzleDateISO(puzzleNumber)` (returns IST `YYYY-MM-DD`), `isToday`.
- Games registry of two games for tabs: `[{ slug:"alfazy", key:"alfazy", name:"Alfazy" }, { slug:"hit-and-blow", key:"hit_and_blow", name:"Hit and Blow" }]` — define inline where needed (a shared registry is Phase 5).
- `supabaseAnon()` from `@/lib/supabase/server`; `supabaseAuthServer()` from `@/lib/supabase/auth-server`; `requireGameUser`/`getGameUser` from `@/lib/games/session`.
- Tables (migration `20260705000001_games_init.sql`): `streaks(user_id, game, current_streak, max_streak, last_solved_puzzle, total_played, total_won)`; `game_results(user_id, game, puzzle_number, puzzle_date, status, guesses, time_ms, completed_at)`; `profiles(id, username)`.

---

### Task 1: IST period-bounds helper

**Files:**
- Create: `src/lib/games/periods.ts`
- Test: `src/lib/games/periods.test.ts`

**Interfaces:**
- `weekBoundsIST(now?: number): { start: string; end: string }` — Monday–Sunday `YYYY-MM-DD` for the IST week containing `now`.
- `monthBoundsIST(now?: number): { start: string; end: string }` — 1st–last `YYYY-MM-DD` of the IST month containing `now`.

- [ ] **Step 1: Write the failing tests**

`src/lib/games/periods.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { weekBoundsIST, monthBoundsIST } from "./periods";

// 2026-07-04 is a Saturday (IST). Pick a fixed UTC instant well inside that IST day.
const SAT_2026_07_04 = Date.UTC(2026, 6, 4, 6, 0, 0); // 11:30 IST

describe("weekBoundsIST", () => {
  it("returns Monday..Sunday for the IST week containing the date", () => {
    expect(weekBoundsIST(SAT_2026_07_04)).toEqual({ start: "2026-06-29", end: "2026-07-05" });
  });
});

describe("monthBoundsIST", () => {
  it("returns first..last day of the IST month", () => {
    expect(monthBoundsIST(SAT_2026_07_04)).toEqual({ start: "2026-07-01", end: "2026-07-31" });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/games/periods.test.ts`
Expected: FAIL — cannot find module `./periods`.

- [ ] **Step 3: Implement**

`src/lib/games/periods.ts`:

```ts
import { puzzleDateISO, puzzleNumberFor } from "@/lib/daily";

/** Parse a YYYY-MM-DD as a UTC-midnight Date (calendar math only, no TZ drift). */
function fromISO(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`);
}
function toISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Today's IST calendar date as YYYY-MM-DD. */
function todayIST(now: number): string {
  return puzzleDateISO(puzzleNumberFor(now));
}

/** Monday–Sunday (YYYY-MM-DD) of the IST week containing `now`. */
export function weekBoundsIST(now: number = Date.now()): { start: string; end: string } {
  const d = fromISO(todayIST(now));
  const dow = d.getUTCDay(); // 0=Sun..6=Sat
  const sinceMonday = (dow + 6) % 7;
  const start = new Date(d);
  start.setUTCDate(d.getUTCDate() - sinceMonday);
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);
  return { start: toISO(start), end: toISO(end) };
}

/** First–last day (YYYY-MM-DD) of the IST month containing `now`. */
export function monthBoundsIST(now: number = Date.now()): { start: string; end: string } {
  const d = fromISO(todayIST(now));
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  const start = new Date(Date.UTC(y, m, 1));
  const end = new Date(Date.UTC(y, m + 1, 0)); // day 0 of next month = last day of this month
  return { start: toISO(start), end: toISO(end) };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/games/periods.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/games/periods.ts src/lib/games/periods.test.ts
git commit -m "feat(games): IST week/month period-bounds helper

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Leaderboard queries

**Files:**
- Create: `src/lib/games/leaderboard-queries.ts`

**Interfaces:**
- Types:
  ```ts
  type GameKey = "alfazy" | "hit_and_blow";
  type DailyRow = { username: string; guesses: number; time_ms: number | null; status: string };
  type PeriodRow = { username: string; solved: number; total_guesses: number };
  type StreakRow = { username: string; current_streak: number; max_streak: number };
  ```
- `getDailyBoard(game: GameKey, puzzle: number): Promise<DailyRow[]>`
- `getPeriodBoard(game: GameKey, start: string, end: string): Promise<PeriodRow[]>`
- `getStreakBoard(game: GameKey): Promise<StreakRow[]>`

- [ ] **Step 1: Implement the query wrappers**

`src/lib/games/leaderboard-queries.ts`:

```ts
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
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit 2>&1 | grep "leaderboard-queries" || echo clean`
Expected: `clean`

- [ ] **Step 3: Commit**

```bash
git add src/lib/games/leaderboard-queries.ts
git commit -m "feat(games): leaderboard RPC query wrappers

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Leaderboard page (tabs + tables)

**Files:**
- Modify: `src/app/games/leaderboard/page.tsx` (full rewrite)

**Interfaces:** consumes Task 1 (`weekBoundsIST`/`monthBoundsIST`), Task 2 (queries), `puzzleNumberFor` from `@/lib/daily`.

Behavior: read `searchParams` `{ game?: "alfazy"|"hit_and_blow"; board?: "daily"|"weekly"|"monthly"|"streak" }`, default `game="alfazy"`, `board="daily"`. Render two tab rows built from `<Link>`s (preserving the other param) — game tabs (Alfazy | Hit and Blow) and board tabs (Daily | Weekly | Monthly | Streak) — with the active one styled `bg-background text-foreground shadow-xs`. Fetch and render only the selected board as a token table with rank numbers. Empty → a muted "No results yet — be the first to play." card.

- [ ] **Step 1: Rewrite the leaderboard page**

`src/app/games/leaderboard/page.tsx`:

```tsx
import Link from "next/link";
import { puzzleNumberFor } from "@/lib/daily";
import { weekBoundsIST, monthBoundsIST } from "@/lib/games/periods";
import {
  getDailyBoard,
  getPeriodBoard,
  getStreakBoard,
  type GameKey,
} from "@/lib/games/leaderboard-queries";
import { cn } from "@/lib/utils";

const GAMES: { key: GameKey; name: string }[] = [
  { key: "alfazy", name: "Alfazy" },
  { key: "hit_and_blow", name: "Hit and Blow" },
];
const BOARDS = ["daily", "weekly", "monthly", "streak"] as const;
type Board = (typeof BOARDS)[number];

function tab(active: boolean) {
  return cn(
    "rounded-btn px-3 py-1.5 text-sm font-medium transition-ui",
    active
      ? "bg-background text-foreground shadow-xs"
      : "text-muted-foreground hover:text-foreground",
  );
}

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ game?: string; board?: string }>;
}) {
  const sp = await searchParams;
  const game: GameKey = sp.game === "hit_and_blow" ? "hit_and_blow" : "alfazy";
  const board: Board = (BOARDS as readonly string[]).includes(sp.board ?? "")
    ? (sp.board as Board)
    : "daily";

  let head: string[] = [];
  let rows: (string | number)[][] = [];

  if (board === "daily") {
    const data = await getDailyBoard(game, puzzleNumberFor());
    head = ["#", "Player", "Guesses", "Time"];
    rows = data.map((r, i) => [i + 1, r.username, r.guesses, r.time_ms != null ? `${Math.round(r.time_ms / 1000)}s` : "—"]);
  } else if (board === "streak") {
    const data = await getStreakBoard(game);
    head = ["#", "Player", "Current", "Best"];
    rows = data.map((r, i) => [i + 1, r.username, r.current_streak, r.max_streak]);
  } else {
    const { start, end } = board === "weekly" ? weekBoundsIST() : monthBoundsIST();
    const data = await getPeriodBoard(game, start, end);
    head = ["#", "Player", "Solved", "Total guesses"];
    rows = data.map((r, i) => [i + 1, r.username, r.solved, r.total_guesses]);
  }

  return (
    <div className="space-y-5">
      <h1 className="font-display text-2xl font-bold">Leaderboard</h1>

      <div className="inline-flex gap-1 rounded-input border border-border bg-muted/50 p-1">
        {GAMES.map((g) => (
          <Link key={g.key} href={`/games/leaderboard?game=${g.key}&board=${board}`} className={tab(game === g.key)}>
            {g.name}
          </Link>
        ))}
      </div>

      <div className="inline-flex flex-wrap gap-1 rounded-input border border-border bg-muted/50 p-1">
        {BOARDS.map((b) => (
          <Link key={b} href={`/games/leaderboard?game=${game}&board=${b}`} className={tab(board === b)}>
            {b[0].toUpperCase() + b.slice(1)}
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="rounded-card border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          No results yet — be the first to play.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-card border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                {head.map((h) => (
                  <th key={h} className="px-4 py-2 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-b border-border last:border-0">
                  {r.map((c, j) => (
                    <td key={j} className="px-4 py-2">{c}</td>
                  ))}
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

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit 2>&1 | grep "leaderboard/page" || echo clean`
Expected: `clean`

- [ ] **Step 3: Verify in preview (if the dev server runs against this worktree)**

Navigate `/games/leaderboard`. `preview_snapshot`: game tabs (Alfazy | Hit and Blow) + board tabs (Daily/Weekly/Monthly/Streak). With an empty DB, expect the "No results yet" card. Click a board tab → URL gains `?board=...` and the active tab restyles. If the dev server can't run against the worktree, note it and rely on typecheck.

- [ ] **Step 4: Commit**

```bash
git add src/app/games/leaderboard/page.tsx
git commit -m "feat(games): leaderboard page with game/board tabs

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: Profile queries + rename action

**Files:**
- Create: `src/lib/games/profile-queries.ts`
- Create: `src/lib/games/profile-actions.ts`

**Interfaces:**
- `getMyStats(): Promise<{ game: GameKey; current_streak: number; max_streak: number; total_played: number; total_won: number }[]>` — the caller's `streaks` rows (RLS-scoped).
- `getMyRecent(limit?: number): Promise<{ game: string; puzzle_number: number; status: string; guesses: number }[]>` — recent `game_results`, newest first.
- `getMyUsername(): Promise<string | null>`.
- `renameUsername(prev, formData): Promise<{ error: string } | undefined>` — updates `profiles.username` for the caller; handles unique-violation gracefully.

- [ ] **Step 1: Implement profile queries**

`src/lib/games/profile-queries.ts`:

```ts
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
  const supabase = await supabaseAuthServer();
  const { data } = await supabase
    .from("streaks")
    .select("game, current_streak, max_streak, total_played, total_won");
  return (data ?? []) as StatRow[];
}

export async function getMyRecent(limit = 10) {
  const supabase = await supabaseAuthServer();
  const { data } = await supabase
    .from("game_results")
    .select("game, puzzle_number, status, guesses")
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
```

- [ ] **Step 2: Implement the rename action**

`src/lib/games/profile-actions.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { supabaseAuthServer } from "@/lib/supabase/auth-server";
import { getGameUser } from "@/lib/games/session";

export type RenameState = { error: string } | { ok: true } | undefined;

export async function renameUsername(_prev: RenameState, formData: FormData): Promise<RenameState> {
  const user = await getGameUser();
  if (!user) return { error: "Not signed in." };

  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  if (!/^[a-z0-9_]{3,20}$/.test(username)) {
    return { error: "3–20 chars: letters, numbers, underscore." };
  }

  const supabase = await supabaseAuthServer();
  const { error } = await supabase.from("profiles").update({ username }).eq("id", user.id);
  if (error) {
    // 23505 = unique_violation
    if (error.code === "23505") return { error: "That username is taken." };
    return { error: "Could not update username." };
  }
  revalidatePath("/games/profile");
  return { ok: true };
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit 2>&1 | grep -E "profile-queries|profile-actions" || echo clean`
Expected: `clean`

- [ ] **Step 4: Commit**

```bash
git add src/lib/games/profile-queries.ts src/lib/games/profile-actions.ts
git commit -m "feat(games): profile queries (RLS-scoped) + username rename action

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: Profile page + rename form

**Files:**
- Create: `src/components/games/UsernameForm.tsx`
- Modify: `src/app/games/profile/page.tsx` (full rewrite)

**Interfaces:** consumes Task 4 queries/action; `requireGameUser` from `@/lib/games/session`.

- [ ] **Step 1: Rename form (client)**

`src/components/games/UsernameForm.tsx`:

```tsx
"use client";

import { useActionState } from "react";
import { renameUsername, type RenameState } from "@/lib/games/profile-actions";
import { Button } from "@/components/ui/button";

export default function UsernameForm({ current }: { current: string }) {
  const [state, action, pending] = useActionState<RenameState, FormData>(renameUsername, undefined);
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input
        name="username"
        defaultValue={current}
        className="rounded-input border border-input bg-background px-3 py-1.5 text-sm outline-none transition-ui focus:border-brand"
      />
      <Button type="submit" size="sm" loading={pending}>Save</Button>
      {state && "error" in state && state.error && (
        <span className="text-sm text-danger">{state.error}</span>
      )}
      {state && "ok" in state && <span className="text-sm text-success">Saved.</span>}
    </form>
  );
}
```

- [ ] **Step 2: Rewrite the profile page (server)**

`src/app/games/profile/page.tsx`:

```tsx
import { requireGameUser } from "@/lib/games/session";
import { getMyStats, getMyRecent, getMyUsername } from "@/lib/games/profile-queries";
import UsernameForm from "@/components/games/UsernameForm";

const NAMES: Record<string, string> = { alfazy: "Alfazy", hit_and_blow: "Hit and Blow" };

export default async function ProfilePage() {
  await requireGameUser("/games/profile");
  const [stats, recent, username] = await Promise.all([getMyStats(), getMyRecent(), getMyUsername()]);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="font-display text-2xl font-bold">Profile</h1>
        <UsernameForm current={username ?? ""} />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {stats.length === 0 ? (
          <div className="rounded-card border border-border bg-card p-6 text-sm text-muted-foreground sm:col-span-2">
            No games played yet.
          </div>
        ) : (
          stats.map((s) => (
            <div key={s.game} className="rounded-card border border-border bg-card p-5">
              <div className="font-display font-semibold">{NAMES[s.game] ?? s.game}</div>
              <dl className="mt-3 grid grid-cols-2 gap-y-2 text-sm">
                <dt className="text-muted-foreground">Current streak</dt><dd className="text-right font-semibold">{s.current_streak}</dd>
                <dt className="text-muted-foreground">Best streak</dt><dd className="text-right font-semibold">{s.max_streak}</dd>
                <dt className="text-muted-foreground">Played</dt><dd className="text-right font-semibold">{s.total_played}</dd>
                <dt className="text-muted-foreground">Won</dt><dd className="text-right font-semibold">{s.total_won}</dd>
                <dt className="text-muted-foreground">Win rate</dt>
                <dd className="text-right font-semibold">{s.total_played ? Math.round((s.total_won / s.total_played) * 100) : 0}%</dd>
              </dl>
            </div>
          ))
        )}
      </div>

      {recent.length > 0 && (
        <div>
          <h2 className="font-display text-lg font-semibold">Recent games</h2>
          <ul className="mt-2 divide-y divide-border rounded-card border border-border">
            {recent.map((r, i) => (
              <li key={i} className="flex items-center justify-between px-4 py-2 text-sm">
                <span>{NAMES[r.game] ?? r.game} #{r.puzzle_number}</span>
                <span className={r.status === "won" ? "text-success" : "text-muted-foreground"}>
                  {r.status === "won" ? `Won · ${r.guesses}` : "Lost"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit 2>&1 | grep -E "UsernameForm|profile/page" || echo clean`
Expected: `clean`

- [ ] **Step 4: Verify in preview (logged-out gate)**

Navigate `/games/profile` while logged out → redirects to `/games/login?next=/games/profile`. (Logged-in stats need a signed-in user + data; verify after DB seeded.) If dev server can't run against the worktree, rely on typecheck + the Task 6 gate.

- [ ] **Step 4b: Commit**

```bash
git add src/components/games/UsernameForm.tsx src/app/games/profile/page.tsx
git commit -m "feat(games): profile page with stats, recent games, rename

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 6: Verification + PR

**Files:** none.

- [ ] **Step 1: Full gate**

Run: `npx vitest run src/lib/games/ && npx tsc --noEmit 2>&1 | grep -E "src/(app/games|components/games|lib/games)" || echo "games typecheck clean"`
Expected: vitest PASS (period + prior tests); `games typecheck clean`.

- [ ] **Step 2: Preview (best-effort)**

If a dev server runs against the worktree: `/games/leaderboard` (tabs + empty state, tab nav changes params), `/games/profile` (logged-out → login redirect). Light + dark. Otherwise note preview limited to static verification and record why.

- [ ] **Step 3: Push + open PR**

```bash
git push -u origin feat/games-phase4-leaderboards
gh pr create --base main --title "feat(games): Phase 4 — leaderboards + profile" --body "$(cat <<'BODY'
## Summary
Phase 4 (spec: docs/superpowers/specs/2026-07-04-games-development-design.md).

- Public `/games/leaderboard`: per-game (Alfazy | Hit and Blow) Daily / Weekly / Monthly / Streak boards via the security-definer RPCs (`supabaseAnon`), server-rendered with `?game=&board=` tab links and a first-class empty state.
- IST week (Mon–Sun) / month (1st–last) bounds computed by a unit-tested pure helper.
- Authenticated `/games/profile`: per-game stats (streaks, played/won, win rate), recent games, and username rename — reads the caller's own rows via `supabaseAuthServer()` (RLS), rename handles the unique-name collision.

## Requires
- Games migration applied + at least one played game to populate boards (empty state shown until then).

## Test plan
- [ ] `npx vitest run src/lib/games/` passes (period bounds)
- [ ] `/games/leaderboard` renders tabs + empty state; tab links switch game/board
- [ ] `/games/profile` redirects to login when logged out; shows stats when authed

🤖 Generated with [Claude Code](https://claude.com/claude-code)
BODY
)"
```

- [ ] **Step 4: Report PR URL to user.**

---

## Self-Review

**Spec coverage (Phase 4):** game tabs + Daily/Weekly/Monthly/Streak ✓ (T3); RPCs wired via anon ✓ (T2); IST week/month bounds ✓ (T1); profile auth-gated with stats + recent + rename ✓ (T4/T5); highlight-current-user is a nice-to-have deferred (noted). **Placeholder scan:** all code present. **Type consistency:** `GameKey` defined in T2, reused T3; `StatRow`/`RenameState` in T4 consumed T5; query return shapes match table render. **Risks:** boards/profile need real data to show non-empty — verification splits static (now) from data-backed (after the user seeds a game). Guess-distribution histogram from the spec is simplified to summary stats + recent list (YAGNI for v1; a histogram needs per-guess-count aggregation not exposed by a current RPC — deferred, noted).
