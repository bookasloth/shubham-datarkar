# Games fix — secret logic, results pages, per-game leaderboards

**Date:** 2026-07-10
**Branch:** `fix/games`
**Status:** Approved design → implementation plan next

## Problem

Three things are wrong or missing in `/games`:

1. **Hit-and-Blow secret generation** allows leading zeros and can repeat the same
   code within a 4536-day window (the secret is a per-puzzle hash, so collisions
   are likely well before the code space is exhausted).
2. There is **no results page** — no way to see past puzzles' answers and how
   every player did.
3. The leaderboard is a single query-param page (`/games/leaderboard?game=X`).
   There is **no per-game route** and **no podium** for the top 3.

Everything must generalize to future games, not just the two that exist today.

## Constraints

- Monochrome is a locked design decision — podium ranks by size/elevation, never
  gold/silver/bronze color.
- Games are not deployed to production; no stored secrets and no real player
  history, so changing the Hit-and-Blow secret retroactively is safe.
- Supabase changes ship as a migration file; the SQL is run manually by the user
  (never auto-applied). No auto-deploy.
- Reset timezone and daily engine already exist in `src/lib/daily.ts` (IST,
  `puzzleNumberFor`, `puzzleDateISO`, `isToday`, `seededRng`). Reuse them.

---

## 1. Hit-and-Blow secret fix

File: `src/lib/games/hit-and-blow.ts`

Current `secretFor(puzzleNumber)` shuffles `[0..9]` and takes the first 4. Digits
are already distinct, but leading zeros are allowed and different puzzle numbers
can hash to the same secret.

**New approach:**

- Enumerate every valid code once: 4 distinct digits, first digit ≠ 0. Count is
  exactly `9 × 9 × 8 × 7 = 4536`.
- Deterministically shuffle that list a single time using the existing
  `seededRng(FIXED_SEED)` (Fisher-Yates). Module-level, computed once.
- `secretFor(puzzleNumber) = LIST[((puzzleNumber % 4536) + 4536) % 4536]`.

Properties:

- `mod 4536` cycles through all 4536 codes exactly once per cycle → **no repeat
  within any window of 4536 consecutive days**, guaranteed (not probabilistic).
- The one-time shuffle means tomorrow's code cannot be derived from today's.
- Pure and deterministic — identical output on server and client (matches the
  existing determinism contract used by `alfazy.answerFor`).
- No database involvement.

`isValidGuess`: additionally reject a guess whose first character is `0`, so the
player's input space matches the secret space (the same 4536 codes). Keep the
existing distinct-digit and 4-digit checks.

**Test:** `src/lib/games/hit-and-blow.test.ts` asserts, over a full 4536-cycle:

- every secret has 4 distinct digits,
- no secret starts with `0`,
- all 4536 secrets are distinct (no repeat in a cycle),
- `scoreGuess` still returns correct hits/blows on a known example.

---

## 2. Results page — `/games/<game>/results`

Routing follows the existing convention: routes are **per-slug folders**
(`games/alfazy/...`, `games/hit-and-blow/...`), not a `[game]` dynamic segment.
So each game gets a thin `results/page.tsx` wrapper that passes its `GameKey` to
one shared `ResultsView` component holding all the logic. Shows **all recorded
results by all players**, for **past puzzles only**.

**Reveal rule:** a puzzle's answer and results appear only once it is no longer
the live puzzle — i.e. `puzzle_number < puzzleNumberFor(now)`. Today's puzzle
(answer and any finished results) stays hidden until the next puzzle goes live.

**Columns:** Date · Answer · Player · Score · Outcome

- Answer = that day's number (Hit-and-Blow) or word (Alfazy), resolved by a
  generic `answerForGame(game, puzzle)` (see §4).
- Score = guesses with solve time as a subtitle/tiebreak, e.g. `3 · 12s`.
- Outcome = Won / Lost.

**Filters (top of page):**

- Player — text search.
- Outcome — All / Won / Lost.
- Order newest puzzle first; paginated with a "Load more" button, 50 rows/page.
- (No date/puzzle picker in v1 — add later if needed.)

**Data:** new security-definer RPC — `game_results` has RLS "own rows only", so an
all-player read must go through a definer function, exactly like the existing
leaderboard RPCs.

```sql
get_results_page(
  p_game    game_key,
  p_before  int,            -- puzzleNumberFor(now); rows with puzzle_number < p_before only
  p_outcome text default 'all',  -- 'all' | 'won' | 'lost'
  p_player  text default null,   -- ILIKE filter on username, null = no filter
  p_limit   int  default 50,
  p_offset  int  default 0
) returns table (username text, puzzle_number int, puzzle_date date,
                 guesses int, time_ms int, status result_status)
```

Ordered by `puzzle_number desc, guesses asc, time_ms asc nulls last`. Granted to
`authenticated, anon`. Ships in a new migration file; SQL handed to the user to
run manually.

**Entry point:** add a "Results" link to `GamesHeader` for the active game
(alongside the existing "Archive" link).

---

## 3. Per-game leaderboard — `/games/<game>/leaderboard`

New per-game route. Keeps the existing four board tabs
(daily / weekly / monthly / streak) and reuses the existing RPCs
(`get_daily_board`, `get_period_board`, `get_streak_board`) unchanged.

- **Top 3 → podium.** Monochrome: rank by tile size and elevation, #1 tallest and
  centered, #2 left, #3 right. No medal colors.
- **Ranks 4–100 → table** using the existing table markup.
- The old `/games/leaderboard?game=X&board=Y` page redirects to
  `/games/<slug>/leaderboard?board=Y` so no existing link breaks.

The board-selection logic currently in `/games/leaderboard/page.tsx` is extracted
into a shared `LeaderboardView` (takes a `GameKey` + active board); the per-slug
routes and the podium both build on it. `Podium` is its own component taking the
top 3 rows + the column meaning for the active board, so it renders for any game
and any board.

---

## 4. Extensibility

Adding a future game requires only:

1. One entry in `src/lib/games/registry.ts` (already the single source of truth).
2. One case in `answerForGame(game, puzzle)` — a small resolver mapping a
   `GameKey` to its answer function (`secretFor` / `wordForPuzzle`, async where a
   game has a DB-backed puzzle table like Alfazy).

The results, leaderboard, and podium routes are game-generic and need no change.

---

## Files

**New** (per-slug page wrappers are one thin file each; all logic lives in the
shared view/component)

- `src/app/games/alfazy/results/page.tsx`, `src/app/games/hit-and-blow/results/page.tsx`
  — thin wrappers passing the `GameKey` to `ResultsView`.
- `src/app/games/alfazy/leaderboard/page.tsx`, `src/app/games/hit-and-blow/leaderboard/page.tsx`
  — thin wrappers passing the `GameKey` to `LeaderboardView`.
- `src/components/games/ResultsView.tsx` — filterable, paginated results table
  (client component for filter/pagination interactions).
- `src/components/games/LeaderboardView.tsx` — board tabs + podium + table,
  extracted from the current `/games/leaderboard` page so both routes share it.
- `src/components/games/Podium.tsx` — monochrome top-3 podium.
- `src/lib/games/results-queries.ts` — `getResultsPage(...)` wrapping the RPC.
- `src/lib/games/answer.ts` — `answerForGame(game, puzzle)` resolver.
- `supabase/migrations/20260710000001_games_results_rpc.sql` — `get_results_page`.
- `src/lib/games/hit-and-blow.test.ts` — secret-generation test.

**Edit**

- `src/lib/games/hit-and-blow.ts` — new `secretFor`, tightened `isValidGuess`.
- `src/components/games/GamesHeader.tsx` — add "Results" link.
- `src/app/games/leaderboard/page.tsx` — redirect to per-game route.

## Out of scope

- Any change to Alfazy answer generation or the `alfazy_puzzles` table.
- New leaderboard board types (keep the existing four).
- Date/puzzle-picker filter on the results page (v1 uses player + outcome only).
- Deployment — user runs the migration SQL and triggers the deploy manually.
