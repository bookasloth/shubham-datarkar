# /games Development Design — Alfazy + Hit and Blow

**Date:** 2026-07-04
**Status:** Approved
**Scope:** Phased development of the `/games` feature on shubhamdatarkar.com, building on the merged Phase 1 scaffold (PR #46).

---

## Context

Phase 1 (merged, PR #46) shipped a playable scaffold:

- **Alfazy** — 5-letter word guessing (renamed from Wordle)
- **Hit and Blow** — 4-digit code cracking (renamed from Bulls & Cows)
- Deterministic daily puzzles, IST reset, seeded RNG (`src/lib/daily.ts`)
- Playable boards with localStorage persistence, no auth
- Supabase schema written (`supabase/migrations/0001_games_schema.sql`) but **not yet applied**
- Enum values already renamed: `alfazy`, `hit_and_blow`

The site is a Next.js 16 (App Router, Turbopack) project with an established monochrome + orange design system, Supabase (email+password auth + many content tables), and a standalone admin area.

## Product Decisions

| Decision | Choice |
|---|---|
| Audience trajectory | Casual first → community hub later (build phases chronologically) |
| Auth model | **Separate games login** (`/games/login`), Supabase Auth under the hood, isolated from admin `/login` |
| Styling | **Monochrome chrome + traditional game colors** — site design system for layout/nav; game boards keep green/yellow (Alfazy) and 🎯/💨 (Hit and Blow) |
| Navigation | **Standalone games layout** — mini-app header, no site header/footer inside `/games/**` |
| Game scope | **More games planned** — architecture stays extensible (game registry, shared types) |

## Design System Reference (from site)

- **Palette:** monochrome (white/near-black), single brand orange `#ff4800` used ONLY on interaction (focus/hover/selection). Desaturated status tones for success/warning/danger.
- **Dark mode:** class strategy via `next-themes` (`.dark`).
- **Fonts:** Plus Jakarta Sans (display/headings, var `--font-jakarta`), Poppins (body/UI, var `--font-poppins`).
- **Radii:** `--radius-btn: 4px`, `--radius-input: 8px`, `--radius-card: 12px`, `--radius-img: 12px`.
- **Motion:** `--ease-out-quint: cubic-bezier(0.22, 1, 0.36, 1)`; durations `--dur-fast/base/slow` 150/200/300ms; respect `prefers-reduced-motion`.
- **Reuse:** `supabaseAuthServer()` (cookie-aware SSR client, `src/lib/supabase/auth-server.ts`); `supabaseAnon()` / `supabaseAdmin()` (`src/lib/supabase/server.ts`); existing auth-action + session patterns under `src/lib/auth/`.

---

## Phase 2 — Styling + Nav Integration

**Goal:** Make `/games` visually ship-ready and integrated with site identity. No auth work.

### Games layout (`src/app/games/layout.tsx`)
- Standalone mini-app header: "Games" wordmark → `/games`, dark-mode toggle, "Back to site" link → `/`.
- No site header/footer inside `/games/**` — clean separation.
- Site design tokens throughout: monochrome palette, Jakarta headings, Poppins body, `--radius-card`, `--ease-out-quint`.
- Dark mode via existing `next-themes`.
- Responsive, max-width container, mobile-first.

### Games hub (`src/app/games/page.tsx`)
- Game cards: monochrome borders, hover → orange accent border.
- Each card: game name, tagline, today's puzzle number, play button.
- Countdown to next puzzle (`msUntilNextPuzzle()`).

### Alfazy board styling
- Grid tiles: monochrome borders (dark-mode aware). On reveal, keep traditional green/yellow/gray via CSS variables so they adapt to dark mode.
- On-screen keyboard: monochrome keys, colored after guess.
- Toasts match site toast style.

### Hit and Blow board styling
- Input: site input style (`--radius-input`, orange focus ring).
- History rows: monochrome cards; keep 🎯/💨 indicators.
- Go button: site button style (`--radius-btn`, monochrome).

### Site nav
- Add "Games" to `footerNav` in `src/lib/site.ts`.
- Add "Games" to burger-menu nav groups.

**Deliverable:** One PR. Visually complete, still localStorage-only.

---

## Phase 3 — Auth + Persistence

**Goal:** Logged-in users persist results, streaks, and unlock the archive.

### Auth architecture
- Dedicated `/games/login` page — email + password sign-up / sign-in, isolated from admin `/login`.
- Uses `supabaseAuthServer()` for session management.
- Server actions in `src/lib/games/auth-actions.ts`: `signUp()`, `signIn()`, `signOut()`.
- Archive pages use `supabaseAuthServer()` for session check (replaces the scaffold's broken `createClient` import).
- No ADMIN_EMAIL guard — any authenticated user can play.

### Login page UX
- Toggle Sign In / Sign Up. Email + password, monochrome styling. Error + loading states.
- `?next=` redirect support; after login redirect back or to `/games`.

### Result persistence (`src/lib/games/actions.ts`)
- `submitResult()` server action, called on win/loss from board components.
- **Re-derives the answer server-side** and validates `guess_data` (anti-cheat), then calls `supabase.rpc('submit_result', ...)`.
- Boards: after localStorage save, also fire the server action when authenticated. Not logged in → localStorage-only, no error.

### Auth state in components
- New `useGameAuth()` hook — client-side Supabase session check.
- Boards conditionally show "Log in to save progress".
- Games header shows username when logged in.

### Archive unlock
- `/games/alfazy/[puzzle]` and `/games/hit-and-blow/[puzzle]` require auth when `!isToday(n)`; otherwise redirect to `/games/login?next=...`.

### Database migration
- Rename `0001_games_schema.sql` → timestamped `20260705000001_games_init.sql` (match existing convention).
- Enum values already `alfazy` / `hit_and_blow`.
- SQL handed to user for manual apply (per manual-SQL workflow). Never applied directly.

**Deliverable:** One PR + migration SQL for manual apply.

---

## Phase 4 — Leaderboards + Profile

**Goal:** Competitive layer + personal stats.

### Leaderboard (`src/app/games/leaderboard/page.tsx`)
- Game tabs: Alfazy | Hit and Blow (extensible via registry).
- Per-game board-type tabs: Daily | Weekly | Monthly | Streak.
- Server component; fetches via `supabaseAnon()` calling RPCs directly (public data).

Boards:
- **Daily** (`get_daily_board`): today by default + date picker; rank/username/guesses/time; highlight current user.
- **Weekly / Monthly** (`get_period_board`): IST Mon–Sun / 1st–last bounds auto-computed; rank/username/solved/total-guesses; prev/next navigation.
- **Streak** (`get_streak_board`): rank/username/current/max streak.

### Profile (`src/app/games/profile/page.tsx`)
- Auth required (redirect to `/games/login`).
- Username display + edit (update `profiles`).
- Per-game stats card: total played, total won, win %, current/max streak, guess-distribution histogram (from `streaks` + aggregated `game_results`).
- Recent games list (last 10 per game).

### Share
- Share text includes site URL: `shubhamdatarkar.com/games · Alfazy #N 4/6` (done in scaffold).

**Deliverable:** One PR.

---

## Phase 5 — Polish + Extensibility

**Goal:** Feel finished; make adding future games cheap.

### Countdown timer
- Hub + end-of-game countdown to next puzzle; ticks each second, client-only.

### Animations
- Tile flip on reveal (Alfazy) via CSS transform + `--ease-out-quint`.
- Row shake on invalid guess.
- Subtle scale-pulse win celebration (no confetti — monochrome tone).
- Respect `prefers-reduced-motion`.

### Game framework
- Shared types `src/lib/games/types.ts`: `GameConfig`, `GameResult`, `GameStatus`.
- Each game exports a config object + `scoreGuess()` + `answerFor()`/`secretFor()`.
- Registry `src/lib/games/registry.ts` — array of configs; hub + leaderboard iterate over it.
- Adding a game: logic file + board component + route folder + registry entry. No shared-code edits.

### Additional polish
- Loading skeletons (leaderboard tables, profile stats).
- Per-route error boundaries.
- Meta/OG for `/games`, `/games/alfazy`, `/games/hit-and-blow` (no answer leaks).
- Subtle desktop keyboard-shortcut hints.

**Out of scope (future if traction):** OAuth/social login, multiplayer/challenges, custom word lists, PWA.

**Deliverable:** One PR.

---

## Cross-Cutting Constraints

- **Workflow:** every phase is a branch + PR + merge (no direct commits to main). Base branches on `origin/main`.
- **Supabase:** own project; NEVER touch the connected BAS Supabase. Migrations written as files; SQL handed to user for manual apply.
- **No emojis in UI chrome** beyond the game-native indicators (🟩/🟨 semantics rendered as tiles; 🎯/💨 for Hit and Blow) and existing scaffold share text.
- **Deploy:** never auto-deploy; explicit per-deploy gate.
- **Path alias:** `@/*` → `./src/*`.

## Risks / Open Items

- **Anti-cheat trust boundary:** today's answer is client-visible (like real Wordle). `submitResult()` re-derives server-side before persisting — acceptable for casual v1; revisit before leaderboards get competitive.
- **Username uniqueness:** trigger auto-generates provisional handle; profile rename must handle unique-constraint collisions gracefully.
- **Migration timing:** Phase 3 code depends on the migration being applied to the games Supabase project before persistence works. Coordinate manual apply with the Phase 3 merge.
