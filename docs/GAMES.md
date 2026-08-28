# Games

Consolidated reference for the `/games` feature on shubhamdatarkar.com. Covers
architecture, routing, individual games, shared UI, persistence, leaderboards,
sharing, auth, archive, challenges, and admin.

> Source of truth is the code under `src/app/games/**`, `src/lib/games/**`,
> `src/components/games/**`, and `supabase/migrations/**`. This doc summarizes
> it; when they disagree, the code wins. Historical design specs live in
> `docs/superpowers/{specs,plans}/*games*` and are dated snapshots, not current
> state.

---

## Overview

Daily-puzzle mini-app, three games today, extensible via a registry:

| key | slug | name | mechanic | tint | short code |
|---|---|---|---|---|---|
| `alfazy` | `alfazy` | Alfazy | Guess the 5-letter word (6 tries) | emerald | `alfz` |
| `hit_and_blow` | `hit-and-blow` | Hit and Blow | Crack the 4-digit code (9 tries) | sky | `htbl` |
| `integra` | `integra` | Integra | Guess the hidden equation (6 tries) | violet | `intg` |

Play is **free and anonymous** (localStorage only). Signing in adds streak
tracking, leaderboards, server-timed solves, and — with the `view_archive`
capability — the full back catalog.

Registry: `src/lib/games/registry.ts`. `GameKey`, `GameConfig` (`key, slug,
name, tag, tint, code`), the `GAMES` array, and lookups `gameBySlug/gameByKey/
gameByCode`. The `code` powers the `/g/<code>` short link carried in every
share. `gameIcon(slug)` returns a CDN PNG.

---

## Routing / file structure (`src/app/games/**`)

**Shell**
- `layout.tsx` — Games layout. Fetches shell user + `x-pathname` + `requestNow()`
  in parallel. Wraps in `AlfazyThemeProvider` (hoisted above `AppShell` so the
  rail gets CSS vars) and `AppShell`, showing a `GameRail` only on game-slug paths.
- `page.tsx` — `GamesHub`. Server component. Aggregate stat tiles (Played / Best
  streak / Won) + one card per registered game with per-game puzzle number and
  `PuzzleCountdown`.
- `loading.tsx`, `error.tsx` — route boundaries.

**Per game** (alfazy shown; hit-and-blow and integra are structurally identical)
- `alfazy/layout.tsx` — `<div data-game="alfazy">` wrapper.
- `alfazy/page.tsx` — today's puzzle. `p = puzzleNumberFor("alfazy")`, answer via
  `wordForPuzzle(p)`, renders `AlfazyBoard` + `GameSeoFooter`. SEO from `gameSeo.alfazy`.
- `alfazy/[puzzle]/page.tsx` — archive / specific puzzle. Validates integer ≥0;
  outside the today/yesterday free window requires sign-in + `view_archive`
  capability, else renders `ArchiveUpsell`.
- `alfazy/archive/page.tsx` — archive grid (`listArchive` + `canViewArchive`).
- `alfazy/leaderboard/page.tsx` — reads `?board=`, defaults `daily`, renders
  `LeaderboardView`.
- `alfazy/challenge/page.tsx` — `ChallengeHub`.
- `alfazy/challenge/[code]/page.tsx` — `ChallengePlay`.

Integra resolves its answer via `equationForPuzzle` instead of `wordForPuzzle`.

**Profile**
- `profile/page.tsx` — `requireGameUser`, then username form + per-game stat cards
  (streak, best, played, won, win rate) + recent games.

> There is **no `/games/login` route**. `requireGameUser` redirects to the
> site-wide `/login?next=`; the end card links to `/login` and `/register`.

---

## Daily engine (`src/lib/daily.ts`)

Shared by all games. Reset timezone is **IST (UTC+5:30)**.

- Per-game puzzle epochs (`GAME_EPOCH_UTC_MS`): Alfazy #0 = 2026-05-01,
  Integra #0 = 2026-06-01, Hit and Blow #0 = 2026-07-01 IST.
- `puzzleNumberFor(game)`, `puzzleDateISO`, `todayISO`, `msUntilNextPuzzle`.
- Archive free window: `isToday` / `isYesterday` / `isTodayOrYesterday`.
- Deterministic PRNG: `seededRng` / `seededShuffle` (mulberry32 + Fisher-Yates).

Each game shuffles its answer pool once with a fixed hex seed, so the daily
sequence is deterministic and identical for every player.

---

## Individual games

### Alfazy — `src/lib/games/alfazy.ts`
5 letters, 6 guesses. Answer list shuffled with seed `0x5f3a91c7`. `answerFor(n)`:
themed observance-day word wins (`alfazy-theme-days.ts`), else shuffled list
mod-cycled. `scoreGuess` is two-pass duplicate-safe. `isValidGuess` checks
`valid-guesses.ts` ∪ answer list ∪ theme words. `shareGrid` → 🟩🟨⬜.
DB override path: `alfazy-puzzles.ts` `wordForPuzzle(n)` = theme day → `alfazy_puzzles`
DB row → formula fallback (never throws).

### Hit and Blow — `src/lib/games/hit-and-blow.ts`
4 digits, 9 guesses, unique digits, non-zero first. Builds all 4536 valid codes,
shuffles with seed `0x7e42d05b`. `secretFor(n)` mod 4536. `scoreGuess` → `{hits,
blows}`. `shareSummary` → 🎯💨 text lines. Purely formula-driven, no DB override.

### Integra — `src/lib/games/integra.ts`
7 chars, 6 guesses. Equation list (`integra-equations.ts`) shuffled with seed
`0x2c9be14d`. Pure arithmetic parser `evaluate()` — no `eval()`, integer-only,
order of operations, leading-zero rejection. `isValidGuess` enforces exactly one
`=`, integer RHS, LHS evaluates to RHS. `shareGrid` → 🟩🟪⬛. DB override path:
`integra-puzzles.ts` `equationForPuzzle(n)`.

### Board components
`AlfazyBoard.tsx`, `HitAndBlowBoard.tsx`, `IntegraBoard.tsx` — all `"use client"`,
structurally parallel: localStorage load/save, submit-on-finish effect,
`startPuzzle` clock on first guess, physical keyboard handler, builds `ShareInput`.

---

## Shared UI (`src/components/games/**`)

- `shell/GameStage.tsx` — centered flex-column stage wrapper.
- `shell/GameHeader.tsx` — icon + centered title + optional right-pinned `actions`.
- `board/Tile.tsx` — one cell. Props `game, state, char, size, flip, flipDelay,
  colorblind`. Colors from per-game CSS `.{game}-tile--{state}`; colorblind overlay icon.
- `board/Keyboard.tsx` — config-driven on-screen keyboard (`rows: KeyDef[][]`,
  variant `flex`|`grid`).
- `board/WinBurst.tsx` — win confetti.
- `shell/FireStreak.tsx` — streak flame next to title.
- `shell/GameWelcome.tsx` — first-visit onboarding strip; dismissal persisted at
  `games:welcome-dismissed:{game}`.
- `shell/GameEndCard.tsx` — logged-out post-game upsell dialog (auto-opens). Locked
  stat tiles, register/login CTAs, leaderboard/archive promo, embedded `ShareBlock`.
  Signed-in players never see it.
- `shell/ShareCard.tsx` — share card + `ShareBlock` (see Sharing).
- `rail/GameRail.tsx` — client component, derives active game from `usePathname`,
  renders `GuideCard` (from `help-content.tsx`) + `OtherGamesCard`. The guide lives
  here — there are no separate Help/Stats/Settings modals.
- `rail/GameSettingsCard.tsx` — settings (colorblind etc.).
- Other chrome: `PuzzleCountdown`, `ArchiveGrid`, `ArchiveHeader`, `ArchiveUpsell`,
  `LeaderboardView`, `LeaderboardSkeleton`, `Podium`, `GameSeoFooter`,
  `AlfazyThemeProvider`, `use-colorblind.ts`, `use-game-auth.ts`, `UsernameForm`.

---

## Persistence / saving

**localStorage** (client, per board):
- Board state: key `alfazy:{puzzleNumber}` (and `integra:` / `hitandblow:`
  analogues), shape `{ guesses: string[], status: "playing"|"won"|"lost" }`.
  Corrupt values are dropped, not thrown.
- Welcome dismissal: `games:welcome-dismissed:{game}` = `"1"`.
- Colorblind toggle: via `AlfazyThemeProvider` / `use-colorblind.ts`.

**Supabase** (`supabase/migrations/`):
- `20260705000001_games_init.sql` — enums `game_key`, `result_status`;
  `profiles(id, username unique, created_at)`; `game_results` (one row per
  user/game/puzzle: `status, guesses, guess_data jsonb, time_ms, completed_at`,
  unique(user,game,puzzle)); `streaks(user_id, game, current_streak, max_streak,
  last_solved_puzzle, total_played, total_won)`; `handle_new_user` trigger
  auto-creates a profile.
- Later columns: `source ('daily'|'archive')`, `started_at`, `display_name`.
- `alfazy_puzzles(puzzle_number PK, word, updated_at)` public-read; Integra
  analogue `integra_puzzles` (created as `nerdle_puzzles`, renamed).
- `20260715000001_games_per_game_epochs_reset.sql` — **destructive reset** of all
  results and puzzle tables when games were renumbered to per-game epochs.

**RLS.** The original `game_results` "own" (`for all`) policy let any authed user
PostgREST-insert forged wins; `20260716000001` dropped it to select-only. **Writes
now go only through security-definer RPCs** — never direct table inserts.

---

## Leaderboards

Queried via `src/lib/games/leaderboard-queries.ts` (anon client, RPCs):
`getDailyBoard` → `get_daily_board`, `getPeriodBoard` → `get_period_board`,
`getStreakBoard` → `get_streak_board`. `LeaderboardView.tsx` offers 5 boards:
**Today / This week / This month / All time / Best streak** (period bounds from
`periods.ts`).

RPCs are security-definer and expose only safe columns (never `guess_data`, which
would leak the answer):
- `get_daily_board(game, puzzle)` — winners on one puzzle, ranked `guesses asc,
  time_ms asc nulls last`. The `time_ms` tiebreak is **server-timed**, so it can't
  be forged.
- `get_period_board(game, start, end)` — aggregate solved/total_guesses over a range.
- `get_streak_board(game)` — current/max streak.
- `get_results_page` — all-players past-results feed, paginated.
- `challenge_leaderboard(code)` — finished attempts ranked `won desc, guesses asc,
  time_ms asc, finished_at asc`.

**Server-timed solves** (`20260716000002_games_solve_time.sql`): `start_puzzle`
stamps `started_at` once (fired on the player's first guess via `start-puzzle.ts`);
`elapsed_ms()` derives duration server-side, nulling negatives and runs >6h
(abandoned tabs). Submit RPCs **ignore any client `time_ms`**.

**Archive solves count toward "Solved" but not streaks** — `get_period_board`
counts `status='won'` regardless of `source`, while `streaks.total_won` is bumped
only on the daily path. So archive replays raise Solved without inflating win
rate / streak.

---

## Sharing (share-as-image)

- `src/lib/games/share.ts` — text/link builders. `gameShareUrl` → `/g/<code>`,
  `gameLeaderboardUrl`, `shareTitle`, `buildShareText`, `gameHashtag`,
  `buildShareBody`. `ShareInput` = `{game, puzzleNumber, status, tries,
  maxGuesses, grid}`.
- `src/lib/games/resultImage.ts` — `renderResultImage(input)`. Canvas
  **1080×1350** (Instagram portrait), white bg + orange accent bar, waits on
  `document.fonts.ready` for Poppins. Auto-detects emoji-square grids → rounded
  colored cells vs. Hit-and-Blow text summary → mono lines. Pure canvas, no
  dependency. Returns a PNG `Blob`.
- `src/components/games/shell/ShareCard.tsx` — the share card. Targets: **Copy**
  (clipboard text), **Share to Community** (`/community?compose=…`), **WhatsApp**,
  **Facebook**, **LinkedIn** and **Instagram** (both share the PNG), **Download
  image**. `shareImage()` hands the PNG to `navigator.share`/`canShare({files})`
  on mobile, falls back to download on desktop. PNG rendered on demand and cached.
  `ShareBlock` = the Share button that expands the card; used by every board and
  `GameEndCard`.

---

## Auth

- `src/lib/games/session.ts` — `getGameUser()` (React-cached; any authed Supabase
  user passes), `requireGameUser(next?)` redirects to `/login?next=` when
  signed-out.
- `src/components/games/use-game-auth.ts` — client hook `{user, loading}`,
  subscribes to `onAuthStateChange`.

**Logged-out vs logged-in.** Play is free either way (localStorage). Signed-out
finishing a game gets the `GameEndCard` upsell and results are **not** submitted
(`submitResult` returns `unauthenticated`; the board effect skips when `!user`).
Signed-in players get streak tracking, leaderboard presence, server timing, and —
with `view_archive` capability — the full archive.

---

## Archive & challenges

**Archive.** Free window = today + yesterday. Older puzzles require sign-in +
`view_archive` capability (checked in the route and re-enforced in
`submit-result.ts`). `listArchive` returns every puzzle today→#0 with the user's
`solved` flag. Archive replays route to `submit_archive_result` and never touch
streaks.

**Challenges** (`src/lib/games/challenges/**` + `game_challenges.sql`):
- Tables `game_challenges` (code, game, creator, `secret` [column-grant-hidden
  from clients], is_public, status, `expires_at` 30-day, play/crack counts) and
  `game_challenge_attempts` (per user or `guest_key`, guess_data, status, time_ms).
  RLS: public/own read; **writes only via service role**.
- `engine.ts` dispatches to the three game engines for `maxGuessesFor /
  validateGuess / validateSecret / scoreChallenge / isChallengeWin` + pure
  `nextAttemptState`.
- `actions.ts` (`"use server"`): `createChallenge` (needs `create_challenge`
  capability; RPC enforces per-window limit), `startChallengeAttempt` (guest
  cookie, folds guest→member on sign-in), `scoreChallengeGuess` (rate-limited
  60/60s, service-role scoring, secret never leaves server), `closeChallenge /
  deleteChallenge / attachGuestAttempts`.
- `queries.ts`: `getChallengeMeta` (never selects secret), `browseChallenges`,
  `getChallengeLeaderboard`, `getMyChallenges`, `getMyAttempt`.
- Components: `ChallengeHub`, `ChallengePlay`, `ChallengeCodeBoard`,
  `ChallengeTileBoard`, `ChallengeLeaderboard`, `ChallengeShare`,
  `CreateChallengeForm`, `MyChallengeActions`.

---

## Admin (`/admin/games`)

- `page.tsx` — dashboard. Per game: players/plays/wins/today-puzzle tiles, today's
  winners, top streaks. Sub-nav to Players / Words / Equations.
- `players/` — roster + per-player results/streaks with delete-result,
  reset-streak, rename.
- `words/` — Alfazy word overrides (future puzzles only). `integra-equations/` —
  Integra equation overrides.
- `src/lib/games/admin-queries.ts` — service-role reads (`getGameStats`,
  `getDailyBoard`, `getStreakBoard`, `getPlayersAdmin`, `getPlayerDetailAdmin`,
  upcoming words/equations synthesized from the formula when no override exists).
- `src/lib/games/admin-actions.ts` (`"use server"`) — all call `requireAdmin()`:
  `deleteResult`, `resetStreak`, `renameUser`, `upsertAlfazyWord`,
  `upsertIntegraEquation`. Both upserts refuse past/current puzzles.
- SQL layer (`games_admin.sql`): `is_games_admin()` gates every RPC by a
  **hardcoded admin email literal baked at migration time** — ships as
  `'REPLACE_WITH_ADMIN_EMAIL'` and must be edited before the migration runs, or
  all admin RPCs return empty.

---

## Known gaps / caveats

1. **DB override vs. anti-cheat validator.** Boards resolve the answer through
   `wordForPuzzle` / `equationForPuzzle` (which prefer a DB override row), but
   `validate-result.ts` re-derives truth from the **frozen formula** `answerFor`,
   not the DB override. If an admin sets a future custom word/equation that differs
   from `answerFor(n)`, a legitimate win is checked against the formula answer,
   fails validation, and is silently never saved. Latent today because seeds were
   chosen so `seed == answerFor`.
2. **No `/games/login` route** — auth uses the site-wide `/login` and `/register`.
3. **Stale comment** in `GameHeader.tsx` mentions a "Help/Stats/Settings" actions
   slot; the guide/settings actually live in `GameRail` / `GameSettingsCard`.
4. **`games_init.sql` is not the current source of truth for the enum** — Integra
   was added later (as `nerdle`, then renamed).
5. **`src/lib/games/answer.ts`** also queries `integra_puzzles` but the live board
   path uses `integra-puzzles.ts` — confirm whether `answer.ts` is still referenced
   or dead code.
