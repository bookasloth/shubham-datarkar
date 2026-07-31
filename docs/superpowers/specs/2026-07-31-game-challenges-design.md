# Game Challenges — Design

**Date:** 2026-07-31
**Status:** Approved (design), pending implementation plan

## Summary

Members can author a **custom secret puzzle** for any game (Alfazy, Hit and Blow,
Integra), share it by link, and let anyone play it. Each challenge is
server-scored (the secret never reaches the browser), records a one-attempt
per-player leaderboard, and lives behind a new **Challenge** tab that sits
alongside Play · Leaderboard · Archive under each game.

## Decisions (from brainstorming)

- **Challenge type:** custom puzzle the member authors (their own word / 4-digit code / equation).
- **Access:** always a private share link; creator may opt the challenge into a public browse list.
- **Scoring:** server-scored guesses. The secret stays server-side; the client only receives feedback.
- **Gating:** create = member only. Play = anyone signed in, guests allowed (prompted to sign in to save to the leaderboard).
- **Attempts:** one attempt per player; per-challenge leaderboard.
- **v1 scope:** create + share link + play + leaderboard, public browse list, "my challenges" management, expiry/limits.
- **Guest integrity:** soft cookie budget + IP rate-limit on the scorer (not sign-in-required). Friendly-pride stakes; keep the guest funnel.

## UX & routes

Per-game nav becomes a quintet: **Play · Leaderboard · Archive · Challenge**,
added to the per-game rail (`src/components/games/rail/GameRail.tsx`). No
`registry.ts` change required.

Two new routes per game, mirroring the existing quartet shape (`[game]` below is
shorthand — games currently use literal per-game folders, not a dynamic segment;
whether to triplicate or introduce a shared `[game]` segment is a plan decision):

- `/games/[game]/challenge` — tab landing:
  - **Create** panel — members only; non-members see an upgrade prompt.
  - **My challenges** — creator's list with crack-count + crackers; close/delete.
  - **Browse** — opt-in public challenges, newest first, paginated.
- `/games/[game]/c/[code]` — play one challenge: server-scored board + that
  challenge's leaderboard + share button.

Reuses the existing shell: `GameStage`, `GameHeader`, the per-game boards
(`AlfazyBoard` / `HitAndBlowBoard` / `IntegraBoard`), `LeaderboardView`,
`Podium`, `ShareCard`. Challenges render through the same components, fed a
custom secret via server scoring instead of the daily formula.

## Data model

Supabase, RLS on. Migrations follow the manual-SQL workflow (write file, hand SQL
to run — never applied directly).

### `game_challenges`
- `id` (uuid pk), `code` (text, unique — powers `/c/<code>` + share)
- `game` (text, GameKey), `creator_user_id` (uuid → auth.users)
- `secret` (text) — the authored answer. **RLS denies select to anon/auth.**
  Read only inside security-definer RPCs.
- `title` (text, optional, sanitized + length-capped)
- `is_public` (bool, default false), `status` (text: `open` | `closed`)
- `created_at` (timestamptz), `expires_at` (timestamptz)
- `play_count` (int), `crack_count` (int) — maintained by RPCs for the browse list.

RLS:
- select: rows are visible (minus `secret`) to anyone if `is_public` or if
  requester is creator or holds the code (code-based reads go through an RPC).
  `secret` column is never in any client-visible select — enforce with a view or
  column-level policy / dedicated RPCs that omit it.
- insert/update/delete: creator only, via security-definer RPCs.

### `game_challenge_attempts`
- `id` (uuid pk), `challenge_id` (→ game_challenges)
- `player_user_id` (uuid, nullable for guests)
- `guest_key` (text, nullable — server-issued cookie id)
- `guesses` (int), `guess_data` (jsonb — scored rows)
- `status` (text: `in_progress` | `won` | `lost`)
- `started_at`, `finished_at` (timestamptz), `time_ms` (int, server-derived)
- unique `(challenge_id, player_user_id)` where `player_user_id` not null
- unique `(challenge_id, guest_key)` where `guest_key` not null

Leaderboard = attempts where `status != in_progress`, ranked: won-first → fewer
guesses → faster `time_ms`. Signed-in players named; guests anonymous.

## Server scoring & anti-cheat

The secret is only ever read inside security-definer RPCs.

1. **`start_challenge_attempt(p_code)`** — creates/returns the attempt row, stamps
   `started_at`, issues a `guest_key` cookie when not signed in. Rejects if the
   attempt is already finished (one shot). Rejects if the challenge is
   `closed`/expired.
2. **`score_challenge_guess(p_code, p_guess)`** — validates the guess against the
   game's engine rules, appends to `guess_data`, increments `guesses`, returns
   only the feedback (Alfazy tiles / Hit-and-Blow hits+blows / Integra feedback).
   **Enforces the guess budget server-side** (Alfazy 6, etc.); refuses once
   `won` / `lost` / budget reached. On solve or last guess, finalizes `status`
   and derives `time_ms` from `started_at`.

Because the scorer refuses calls past the budget, the secret can't be
brute-forced out of it for signed-in players (one hard-capped row per user).

**Guest integrity:** a guest's budget is keyed to the `guest_key` cookie, which
can be cleared for a fresh budget. v1 mitigation: IP-based rate limit on
`score_challenge_guess` to blunt probing. Not fort-knox by design — stakes are
friendly pride and the guest funnel matters more.

**Guest → member funnel:** a guest result sits under `guest_key`; on sign-in the
attempt is attached to the user id so it joins the ranked board.

## Authoring, validation & limits

Create is member-gated via `can(ctx.capabilities, ...)` (same pattern as the
archive gate in `submit-result.ts`). The authored secret must pass the game's own
rules, reusing engine validators:
- Alfazy → real 5-letter word (`isValidGuess` / word list).
- Hit and Blow → valid 4-digit secret (existing secret rules).
- Integra → valid equation (integra validator).

Secret is written via a security-definer create RPC — never a plain insert that
could expose it in a returning payload.

Limits (abuse control), enforced in the create RPC:
- Max open challenges per member (default 20).
- Auto `expires_at` (default 30 days). Expired/closed challenges are unplayable
  but their leaderboard remains viewable.

## Play flow

`/games/[game]/c/[code]`:
- Renders the existing board wired to `score_challenge_guess` instead of the
  local `scoreGuess`. Same tile/keyboard UI; only the scoring source changes.
- First guess → `start_challenge_attempt`. Finish → server finalizes; end card
  shows the result + share.
- Returning finished player → result + leaderboard, board locked.

## Browse & manage

- **Browse** (tab landing): `is_public` + `open` + unexpired, newest first,
  showing title / game / crack-count. Paginated like the feed.
- **My challenges:** creator's list with crack-count + crackers; close/delete via
  creator-only RPC (RLS enforced).
- **Moderation:** titles sanitized + length-capped. Report/hide deferred (not v1).

## Testing

- New unit tests:
  - challenge secret validators (must be valid per game).
  - leaderboard ranking (won-first → fewer guesses → faster time).
  - guest-attach-on-signin logic.
- RPC integrity checks (documented, probed against the live RPC before merge, per
  the games PostgREST/overload lessons):
  - guess budget enforced server-side.
  - `secret` never present in any client-visible select payload.
  - member gate on create.
  - one attempt for signed-in players.

## Out of scope (v1)

- Report/hide moderation UI.
- Head-to-head "duel" invites to specific people.
- Guest airtight anti-probe (accepted soft limit instead).

## Files touched (anticipated)

- Data: new migration for the two tables + RPCs (`start_challenge_attempt`,
  `score_challenge_guess`, create/close/delete, browse/leaderboard queries).
- `src/lib/games/challenges/` — new module: types, queries, server actions,
  per-game secret validation + feedback (thin wrappers over existing engines).
- Routes: `src/app/games/[game]/challenge/`, `src/app/games/[game]/c/[code]/`.
  (Games currently use per-game folders; either add the quintet to each of the
  three, or introduce a shared `[game]` segment — decide in the plan.)
- `src/components/games/rail/GameRail.tsx` — add the Challenge nav item.
- Reuse boards, shell, `LeaderboardView`, `ShareCard`.
