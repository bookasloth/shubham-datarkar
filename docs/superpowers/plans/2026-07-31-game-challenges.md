# Game Challenges Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let members author a custom secret puzzle per game, share it by link, and let anyone play it server-scored, with a one-attempt per-challenge leaderboard, under a new per-game **Challenge** tab.

**Architecture:** Two Supabase tables (`game_challenges`, `game_challenge_attempts`). The secret may reach the Node server but never the browser: guesses are scored by a **service-role server action** (`supabaseAdmin`) that reads the secret, scores with the existing tested JS engines (`scoreGuess`), enforces the guess budget + one-attempt, and returns only feedback. Reads (browse / leaderboard / my-challenges) use RLS + **column-level grants** that exclude the `secret` column. All writes go through service-role server actions (no client write policies). New routes are thin per-game pages delegating to shared challenge components, so daily play is untouched.

**Tech Stack:** Next.js (App Router, server components + server actions), Supabase (Postgres + RLS), TypeScript, Vitest. Reuses `src/lib/games` engines, `src/components/games` shell + `board/` primitives, `src/lib/rate-limit`, `src/lib/members`.

## Global Constraints

- Migrations follow the **manual-SQL workflow**: write the migration file, hand the SQL to the user to run in the Supabase SQL editor. Never apply directly. Migration filenames: `supabase/migrations/YYYYMMDDHHMMSS_snake_name.sql` (14-digit prefix; date `20260731`, pick an unused sequence suffix).
- **Secret never reaches the client.** No RPC or select that returns `game_challenges.secret` may be granted to `anon`/`authenticated`. Secret is read only via `supabaseAdmin()` (service role, server-only `SUPABASE_SERVICE_ROLE_KEY`).
- `game_key` enum already contains `'alfazy' | 'hit_and_blow' | 'integra'` — reuse it.
- Create is gated: `can(ctx.capabilities, "create_challenge")` (new capability). Play is open to guests.
- Limits: **15 challenges created per member per rolling 30 days**; `expires_at` = **30 days** from creation.
- Attempts: **one per player** (signed-in: unique on user; guest: unique on cookie key). Server enforces guess budget.
- PostgREST resolves function overloads by the **exact set of argument keys** sent — probe every new RPC with the real key set before merging (past games lesson: DEFAULTs don't save you).
- After each task: `npx tsc --noEmit` must exit 0 and `npx vitest run <touched test>` must pass before commit.

---

## File Structure

**Data**
- Create: `supabase/migrations/20260731000001_game_challenges.sql` — tables, indexes, RLS, column grants, `create_challenge` RPC, browse/leaderboard/my-challenge read RPCs.

**Server lib** (`src/lib/games/challenges/`)
- Create: `types.ts` — shared types (`ChallengeGame`, `ChallengeMeta`, `ChallengeAttemptState`, `Feedback`, `LeaderboardEntry`).
- Create: `engine.ts` — per-game adapter: validate a secret, validate a guess, score a guess, win check, budget, share grid — thin wrappers over `alfazy`/`hit-and-blow`/`integra`.
- Create: `code.ts` — nothing (code generated in RPC). *(omitted — see Task 1)*
- Create: `queries.ts` — `server-only` reads: `getChallengeMeta`, `browseChallenges`, `getChallengeLeaderboard`, `getMyChallenges`, `getMyAttempt`.
- Create: `actions.ts` — `"use server"`: `createChallenge`, `startChallengeAttempt`, `scoreChallengeGuess`, `closeChallenge`, `deleteChallenge`, `attachGuestAttempts`.
- Create: `guest.ts` — guest cookie helpers (`getOrIssueGuestKey`, `readGuestKey`).

**UI** (`src/components/games/challenge/`)
- Create: `GameSubnav.tsx` — per-game tab strip (Play · Leaderboard · Archive · Challenge).
- Create: `ChallengeHub.tsx` — tab landing (create + my challenges + browse).
- Create: `CreateChallengeForm.tsx` — `"use client"` member-gated form.
- Create: `ChallengePlay.tsx` — server component: load meta + my attempt, render the right challenge board + leaderboard + share.
- Create: `ChallengeTileBoard.tsx` — `"use client"` board for alfazy + integra (tile grid).
- Create: `ChallengeCodeBoard.tsx` — `"use client"` board for hit-and-blow (hits/blows).
- Create: `ChallengeLeaderboard.tsx` — renders a challenge's ranked attempts (reuses `Podium`).

**Routes** (thin, per game — no refactor of existing routes)
- Create (×3 games): `src/app/games/<game>/challenge/page.tsx`, `src/app/games/<game>/challenge/[code]/page.tsx`.

**Modified**
- `src/lib/members/capabilities.ts` — add `"create_challenge"` capability.
- The three game `layout.tsx` files (or the parent games layout) — render `GameSubnav`.
- `src/lib/games/auth-actions.ts` (or wherever post-login runs) — call `attachGuestAttempts` on sign-in.

---

## Phase 1 — Data model & read RPCs

### Task 1: Migration — tables, RLS, column grants, `create_challenge`

**Files:**
- Create: `supabase/migrations/20260731000001_game_challenges.sql`

**Interfaces:**
- Produces (SQL objects consumed by later tasks):
  - table `public.game_challenges(id uuid, code text, game game_key, creator_user_id uuid, secret text, title text, is_public bool, status text, created_at timestamptz, expires_at timestamptz, play_count int, crack_count int)`
  - table `public.game_challenge_attempts(id uuid, challenge_id uuid, player_user_id uuid null, guest_key text null, guesses int, guess_data jsonb, status text, started_at timestamptz, finished_at timestamptz null, time_ms int null)`
  - rpc `create_challenge(p_game game_key, p_secret text, p_title text, p_is_public bool) returns text` (the new code; raises on 15/30d cap)

- [ ] **Step 1: Write the migration SQL**

```sql
-- Game Challenges: member-authored custom puzzles, shared by link, server-scored.
-- Manual-SQL workflow: run this in the Supabase SQL editor. Not auto-applied.

create table if not exists public.game_challenges (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  game game_key not null,
  creator_user_id uuid not null references auth.users(id) on delete cascade,
  secret text not null,
  title text,
  is_public boolean not null default false,
  status text not null default 'open' check (status in ('open','closed')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  play_count int not null default 0,
  crack_count int not null default 0
);
create index if not exists game_challenges_browse_idx
  on public.game_challenges (game, created_at desc)
  where is_public and status = 'open';
create index if not exists game_challenges_creator_idx
  on public.game_challenges (creator_user_id, created_at desc);

create table if not exists public.game_challenge_attempts (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.game_challenges(id) on delete cascade,
  player_user_id uuid references auth.users(id) on delete cascade,
  guest_key text,
  guesses int not null default 0,
  guess_data jsonb not null default '[]'::jsonb,
  status text not null default 'in_progress' check (status in ('in_progress','won','lost')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  time_ms int
);
create unique index if not exists challenge_attempt_user_uniq
  on public.game_challenge_attempts (challenge_id, player_user_id)
  where player_user_id is not null;
create unique index if not exists challenge_attempt_guest_uniq
  on public.game_challenge_attempts (challenge_id, guest_key)
  where guest_key is not null;
create index if not exists challenge_attempt_board_idx
  on public.game_challenge_attempts (challenge_id, status);

-- RLS: reads are policy-controlled; writes only via service role (no write policy).
alter table public.game_challenges enable row level security;
alter table public.game_challenge_attempts enable row level security;

-- Rows visible: public+open to everyone, or your own (any status).
create policy "challenges: public or own read" on public.game_challenges
  for select using (is_public or auth.uid() = creator_user_id);
-- Attempts on any challenge are readable (leaderboard); no PII beyond user id.
create policy "challenge attempts: read" on public.game_challenge_attempts
  for select using (true);

-- Column-level grants: the anon/authenticated roles may read every column EXCEPT
-- secret. This is what keeps the answer server-only even though rows are selectable.
revoke all on public.game_challenges from anon, authenticated;
grant select (id, code, game, creator_user_id, title, is_public, status,
              created_at, expires_at, play_count, crack_count)
  on public.game_challenges to anon, authenticated;
grant select on public.game_challenge_attempts to anon, authenticated;

-- Create RPC: enforces the 15-per-rolling-30-days cap, generates a short code,
-- sets 30-day expiry. Capability gating happens in the server action before this.
create or replace function public.create_challenge(
  p_game game_key, p_secret text, p_title text, p_is_public boolean
) returns text
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_recent int;
  v_code text;
begin
  if v_user is null then raise exception 'not authenticated'; end if;
  select count(*) into v_recent from public.game_challenges
    where creator_user_id = v_user and created_at > now() - interval '30 days';
  if v_recent >= 15 then raise exception 'challenge limit reached'; end if;
  -- 8 hex chars from a fresh uuid; retry on the astronomically unlikely clash.
  loop
    v_code := substr(replace(gen_random_uuid()::text,'-',''), 1, 8);
    exit when not exists (select 1 from public.game_challenges where code = v_code);
  end loop;
  insert into public.game_challenges (code, game, creator_user_id, secret, title, is_public, expires_at)
    values (v_code, p_game, v_user, p_secret, nullif(p_title,''), coalesce(p_is_public,false), now() + interval '30 days');
  return v_code;
end $$;

grant execute on function public.create_challenge(game_key, text, text, boolean) to authenticated;
```

- [ ] **Step 2: Hand the SQL to the user to run**

This migration is not auto-applied. Tell the user: "Run `supabase/migrations/20260731000001_game_challenges.sql` in the Supabase SQL editor." Wait for confirmation before any task that depends on the tables at runtime (Tasks 4, 6–12). Tasks that only touch TypeScript/tests can proceed.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260731000001_game_challenges.sql
git commit -m "feat(games): game_challenges tables + create_challenge RPC (migration)"
```

### Task 2: Read RPCs — browse, leaderboard, my-challenges

**Files:**
- Modify: `supabase/migrations/20260731000001_game_challenges.sql` (append)

**Interfaces:**
- Produces:
  - `browse_challenges(p_game game_key, p_limit int, p_offset int) returns table(code text, title text, crack_count int, play_count int, created_at timestamptz)`
  - `challenge_leaderboard(p_code text) returns table(username text, display_name text, status text, guesses int, time_ms int)`
  - `my_challenges(p_game game_key) returns table(code text, title text, is_public bool, status text, crack_count int, play_count int, created_at timestamptz, expires_at timestamptz)`

- [ ] **Step 1: Append the read RPCs to the migration**

```sql
-- Public browse list: public + open + unexpired, newest first.
create or replace function public.browse_challenges(p_game game_key, p_limit int, p_offset int)
returns table(code text, title text, crack_count int, play_count int, created_at timestamptz)
language sql security definer set search_path = public as $$
  select code, title, crack_count, play_count, created_at
  from public.game_challenges
  where game = p_game and is_public and status = 'open' and expires_at > now()
  order by created_at desc
  limit greatest(1, least(p_limit, 50)) offset greatest(0, p_offset);
$$;

-- One challenge's ranked attempts. Joins the games profile for display names.
create or replace function public.challenge_leaderboard(p_code text)
returns table(username text, display_name text, status text, guesses int, time_ms int)
language sql security definer set search_path = public as $$
  select p.username, p.display_name, a.status, a.guesses, a.time_ms
  from public.game_challenge_attempts a
  join public.game_challenges c on c.id = a.challenge_id
  left join public.game_profiles p on p.user_id = a.player_user_id
  where c.code = p_code and a.status <> 'in_progress'
  order by (a.status = 'won') desc, a.guesses asc, coalesce(a.time_ms, 2147483647) asc, a.finished_at asc;
$$;

-- Creator dashboard rows.
create or replace function public.my_challenges(p_game game_key)
returns table(code text, title text, is_public boolean, status text,
              crack_count int, play_count int, created_at timestamptz, expires_at timestamptz)
language sql security definer set search_path = public as $$
  select code, title, is_public, status, crack_count, play_count, created_at, expires_at
  from public.game_challenges
  where game = p_game and creator_user_id = auth.uid()
  order by created_at desc;
$$;

grant execute on function public.browse_challenges(game_key, int, int) to anon, authenticated;
grant execute on function public.challenge_leaderboard(text) to anon, authenticated;
grant execute on function public.my_challenges(game_key) to authenticated;
```

> **Note on `game_profiles`:** verify the games profile table/column names (`username`, `display_name`, `user_id`) against `src/lib/games/profile-queries.ts` / the profiles migration before running. If the real table differs, adjust the join. This mirrors how `get_daily_board` joins profiles in `20260705000001_games_init.sql`.

- [ ] **Step 2: Re-hand the updated SQL to the user** (same file; they re-run or run the appended block).

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260731000001_game_challenges.sql
git commit -m "feat(games): challenge browse/leaderboard/my-challenges read RPCs"
```

---

## Phase 2 — Server library

### Task 3: Challenge engine adapter

**Files:**
- Create: `src/lib/games/challenges/types.ts`
- Create: `src/lib/games/challenges/engine.ts`
- Test: `src/lib/games/challenges/engine.test.ts`

**Interfaces:**
- Produces:
  - `type ChallengeGame = "alfazy" | "hit_and_blow" | "integra"`
  - `type Feedback = { kind: "tiles"; tiles: ("correct"|"present"|"absent")[] } | { kind: "code"; hits: number; blows: number }`
  - `validateSecret(game: ChallengeGame, secret: string): boolean`
  - `validateGuess(game: ChallengeGame, guess: string): boolean`
  - `scoreChallenge(game: ChallengeGame, guess: string, secret: string): Feedback`
  - `isChallengeWin(game: ChallengeGame, fb: Feedback): boolean`
  - `maxGuessesFor(game: ChallengeGame): number`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { validateSecret, scoreChallenge, isChallengeWin, maxGuessesFor } from "./engine";

describe("challenge engine adapter", () => {
  it("validates a secret with the game's own rules", () => {
    expect(maxGuessesFor("alfazy")).toBe(6);
    // a valid dictionary word passes; gibberish fails
    expect(validateSecret("alfazy", "crane")).toBe(true);
    expect(validateSecret("alfazy", "zzzzz")).toBe(false);
  });
  it("scores a correct alfazy guess as all-correct and wins", () => {
    const fb = scoreChallenge("alfazy", "crane", "crane");
    expect(fb.kind).toBe("tiles");
    expect(isChallengeWin("alfazy", fb)).toBe(true);
  });
  it("scores hit-and-blow as hits/blows", () => {
    const fb = scoreChallenge("hit_and_blow", "1234", "1234");
    expect(fb).toMatchObject({ kind: "code", hits: 4 });
    expect(isChallengeWin("hit_and_blow", fb)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails** — `npx vitest run src/lib/games/challenges/engine.test.ts` → FAIL (module missing).

- [ ] **Step 3: Implement `types.ts` then `engine.ts`**

```ts
// types.ts
export type ChallengeGame = "alfazy" | "hit_and_blow" | "integra";
export type Feedback =
  | { kind: "tiles"; tiles: ("correct" | "present" | "absent")[] }
  | { kind: "code"; hits: number; blows: number };
export type ChallengeAttemptState = {
  guesses: string[];
  feedback: Feedback[];
  status: "in_progress" | "won" | "lost";
};
export type ChallengeMeta = {
  code: string; game: ChallengeGame; title: string | null;
  status: "open" | "closed"; expiresAt: string; crackCount: number; playCount: number;
};
export type LeaderboardEntry = {
  username: string | null; displayName: string | null;
  status: string; guesses: number; timeMs: number | null;
};
```

```ts
// engine.ts
import * as alfazy from "@/lib/games/alfazy";
import * as hnb from "@/lib/games/hit-and-blow";
import * as integra from "@/lib/games/integra";
import type { ChallengeGame, Feedback } from "./types";

export function maxGuessesFor(game: ChallengeGame): number {
  return game === "alfazy" ? alfazy.ALFAZY.maxGuesses
    : game === "integra" ? integra.INTEGRA.maxGuesses
    : hnb.HIT_AND_BLOW.maxGuesses;
}

export function validateGuess(game: ChallengeGame, guess: string): boolean {
  const g = guess.toUpperCase();
  return game === "alfazy" ? alfazy.isValidGuess(g)
    : game === "integra" ? integra.isValidGuess(guess)
    : hnb.isValidGuess(guess);
}

// The authored secret must itself be a legal guess for that game.
export function validateSecret(game: ChallengeGame, secret: string): boolean {
  return validateGuess(game, secret);
}

export function scoreChallenge(game: ChallengeGame, guess: string, secret: string): Feedback {
  if (game === "hit_and_blow") {
    const { hits, blows } = hnb.scoreGuess(guess, secret);
    return { kind: "code", hits, blows };
  }
  const tiles = game === "integra"
    ? integra.scoreGuess(guess, secret)
    : alfazy.scoreGuess(guess.toUpperCase(), secret.toUpperCase());
  return { kind: "tiles", tiles };
}

export function isChallengeWin(game: ChallengeGame, fb: Feedback): boolean {
  if (fb.kind === "code") return hnb.isWin(fb.hits);
  return game === "integra" ? integra.isWin(fb.tiles) : alfazy.isWin(fb.tiles);
}
```

> Verify casing: check whether `alfazy.scoreGuess`/`isValidGuess` expect upper or lower case in the current engine (the daily board's stored guesses reveal the convention). Match it; adjust the `.toUpperCase()` calls if wrong. This is the one place a wrong assumption silently mis-scores.

- [ ] **Step 4: Run test to verify it passes** — `npx vitest run src/lib/games/challenges/engine.test.ts`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/games/challenges/types.ts src/lib/games/challenges/engine.ts src/lib/games/challenges/engine.test.ts
git commit -m "feat(games): challenge engine adapter over per-game engines"
```

### Task 4: Guest cookie helper

**Files:**
- Create: `src/lib/games/challenges/guest.ts`

**Interfaces:**
- Produces:
  - `readGuestKey(): Promise<string | null>` — read cookie only.
  - `getOrIssueGuestKey(): Promise<string>` — read or set a new httpOnly cookie, return it.
  - const `GUEST_COOKIE = "gc_guest"`

- [ ] **Step 1: Implement** (uses `next/headers` `cookies()`; server-only)

```ts
import "server-only";
import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";

export const GUEST_COOKIE = "gc_guest";
const YEAR = 60 * 60 * 24 * 365;

export async function readGuestKey(): Promise<string | null> {
  return (await cookies()).get(GUEST_COOKIE)?.value ?? null;
}

export async function getOrIssueGuestKey(): Promise<string> {
  const jar = await cookies();
  const existing = jar.get(GUEST_COOKIE)?.value;
  if (existing) return existing;
  const key = randomUUID();
  jar.set(GUEST_COOKIE, key, { httpOnly: true, sameSite: "lax", secure: true, maxAge: YEAR, path: "/" });
  return key;
}
```

> `cookies().set` only works in a server action / route handler context. `getOrIssueGuestKey` is therefore called from the server actions in Task 5, never from a plain server-component render.

- [ ] **Step 2: `npx tsc --noEmit`** → 0.

- [ ] **Step 3: Commit**

```bash
git add src/lib/games/challenges/guest.ts
git commit -m "feat(games): guest cookie helper for challenge attempts"
```

### Task 5: Queries (server-only reads)

**Files:**
- Create: `src/lib/games/challenges/queries.ts`

**Interfaces:**
- Consumes: RPCs from Tasks 1–2; `ChallengeGame`, `ChallengeMeta`, `LeaderboardEntry`, `ChallengeAttemptState` from `types.ts`; `supabaseAnon` (`@/lib/supabase/server`), `supabaseAdmin` (`@/lib/supabase/admin` — confirm path from `email/dispatch/tasks.ts`).
- Produces:
  - `getChallengeMeta(code: string): Promise<ChallengeMeta | null>`
  - `browseChallenges(game: ChallengeGame, page: number): Promise<{code:string;title:string|null;crackCount:number;playCount:number}[]>`
  - `getChallengeLeaderboard(code: string): Promise<LeaderboardEntry[]>`
  - `getMyChallenges(game: ChallengeGame): Promise<...>` (row type per `my_challenges` RPC)
  - `getMyAttempt(code: string, userId: string | null, guestKey: string | null): Promise<ChallengeAttemptState | null>`

- [ ] **Step 1: Implement** each as a `try/catch → []/null` reader, mirroring `leaderboard-queries.ts`. `getChallengeMeta` selects the non-secret columns via `supabaseAnon().from("game_challenges").select("code,game,title,status,expires_at,crack_count,play_count").eq("code", code).maybeSingle()`. `getMyAttempt` uses `supabaseAdmin()` to read the attempt row for the given user/guest and maps `guess_data` → `{guesses, feedback, status}`.

```ts
import "server-only";
import { supabaseAnon } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { ChallengeGame, ChallengeMeta, ChallengeAttemptState, LeaderboardEntry } from "./types";

export async function getChallengeMeta(code: string): Promise<ChallengeMeta | null> {
  try {
    const { data, error } = await supabaseAnon()
      .from("game_challenges")
      .select("code,game,title,status,expires_at,crack_count,play_count")
      .eq("code", code).maybeSingle();
    if (error || !data) return null;
    return {
      code: data.code, game: data.game as ChallengeGame, title: data.title,
      status: data.status, expiresAt: data.expires_at,
      crackCount: data.crack_count, playCount: data.play_count,
    };
  } catch { return null; }
}

export async function getChallengeLeaderboard(code: string): Promise<LeaderboardEntry[]> {
  try {
    const { data, error } = await supabaseAnon().rpc("challenge_leaderboard", { p_code: code });
    if (error) return [];
    return (data ?? []).map((r: any) => ({
      username: r.username, displayName: r.display_name,
      status: r.status, guesses: r.guesses, timeMs: r.time_ms,
    }));
  } catch { return []; }
}

export async function browseChallenges(game: ChallengeGame, page: number) {
  try {
    const { data, error } = await supabaseAnon().rpc("browse_challenges",
      { p_game: game, p_limit: 24, p_offset: page * 24 });
    if (error) return [];
    return (data ?? []).map((r: any) => ({
      code: r.code, title: r.title, crackCount: r.crack_count, playCount: r.play_count,
    }));
  } catch { return []; }
}

export async function getMyChallenges(game: ChallengeGame) {
  try {
    const { data, error } = await (await import("@/lib/supabase/auth-server"))
      .supabaseAuthServer().then((s) => s.rpc("my_challenges", { p_game: game }));
    if (error) return [];
    return data ?? [];
  } catch { return []; }
}

export async function getMyAttempt(
  code: string, userId: string | null, guestKey: string | null,
): Promise<ChallengeAttemptState | null> {
  if (!userId && !guestKey) return null;
  try {
    const admin = supabaseAdmin();
    const { data: ch } = await admin.from("game_challenges").select("id").eq("code", code).maybeSingle();
    if (!ch) return null;
    let q = admin.from("game_challenge_attempts").select("guess_data,status").eq("challenge_id", ch.id);
    q = userId ? q.eq("player_user_id", userId) : q.eq("guest_key", guestKey!);
    const { data } = await q.maybeSingle();
    if (!data) return null;
    const gd = (data.guess_data ?? []) as { guess: string; feedback: any }[];
    return { guesses: gd.map((x) => x.guess), feedback: gd.map((x) => x.feedback), status: data.status };
  } catch { return null; }
}
```

> Confirm `supabaseAdmin` import path (grep `export function supabaseAdmin` — `email/dispatch/tasks.ts` imports it). Fix the two `import` sites if the path differs. Simplify the `getMyChallenges` await chain to match how other server-only modules obtain the auth client.

- [ ] **Step 2: `npx tsc --noEmit`** → 0.
- [ ] **Step 3: Commit** `feat(games): challenge read queries`.

### Task 6: Capability + create action

**Files:**
- Modify: `src/lib/members/capabilities.ts` (add `"create_challenge"` to the `Capability` union + `ALL_CAPABILITIES`/`GRANTABLE_CAPABILITIES` + a `capabilityLabel` case).
- Create: `src/lib/games/challenges/actions.ts` (start with `createChallenge` only)
- Test: `src/lib/games/challenges/actions.test.ts` (unit-test the pure guards you can — e.g. secret validation branch via a thin exported helper)

**Interfaces:**
- Consumes: `validateSecret` (Task 3), `getMemberContext`/`can` (members), `supabaseAuthServer`.
- Produces:
  - `type CreateInput = { game: ChallengeGame; secret: string; title?: string; isPublic?: boolean }`
  - `createChallenge(input: CreateInput): Promise<{ ok: true; code: string } | { ok: false; reason: "unauthenticated"|"forbidden"|"invalid"|"limit"|"error" }>`

- [ ] **Step 1: Add the capability** — edit `capabilities.ts`: add `| "create_challenge"` to `Capability`, include in `ALL_CAPABILITIES` and `GRANTABLE_CAPABILITIES`, add `create_challenge: "Create game challenges"` to the label map.

- [ ] **Step 2: Write `createChallenge`**

```ts
"use server";
import { getGameUser } from "@/lib/games/session";
import { getMemberContext } from "@/lib/members/session";
import { can } from "@/lib/members/capabilities";
import { supabaseAuthServer } from "@/lib/supabase/auth-server";
import { validateSecret } from "./engine";
import type { ChallengeGame } from "./types";

export type CreateInput = { game: ChallengeGame; secret: string; title?: string; isPublic?: boolean };
export type CreateOutcome =
  | { ok: true; code: string }
  | { ok: false; reason: "unauthenticated" | "forbidden" | "invalid" | "limit" | "error" };

export async function createChallenge(input: CreateInput): Promise<CreateOutcome> {
  const user = await getGameUser();
  if (!user) return { ok: false, reason: "unauthenticated" };
  const ctx = await getMemberContext();
  if (!can(ctx.capabilities, "create_challenge")) return { ok: false, reason: "forbidden" };
  const secret = input.secret.trim();
  if (!validateSecret(input.game, secret)) return { ok: false, reason: "invalid" };
  const title = (input.title ?? "").slice(0, 80);
  const supabase = await supabaseAuthServer();
  const { data, error } = await supabase.rpc("create_challenge", {
    p_game: input.game, p_secret: secret, p_title: title, p_is_public: !!input.isPublic,
  });
  if (error) return { ok: false, reason: error.message.includes("limit") ? "limit" : "error" };
  return { ok: true, code: data as string };
}
```

- [ ] **Step 3: `npx tsc --noEmit`** → 0; run any actions test.
- [ ] **Step 4: Commit** `feat(games): create_challenge capability + action`.

### Task 7: Start + score actions (the anti-cheat core)

**Files:**
- Modify: `src/lib/games/challenges/actions.ts`
- Test: `src/lib/games/challenges/score.test.ts` (unit-test the pure decision helper below)

**Interfaces:**
- Consumes: `scoreChallenge`, `isChallengeWin`, `validateGuess`, `maxGuessesFor` (Task 3); `getGameUser`; `getOrIssueGuestKey`/`readGuestKey` (Task 4); `supabaseAdmin`; `allow`, `clientIp` (`@/lib/rate-limit`); `headers()` from `next/headers`.
- Produces:
  - `startChallengeAttempt(code: string): Promise<{ ok: boolean }>`
  - `scoreChallengeGuess(code: string, guess: string): Promise<{ ok: true; feedback: Feedback; status: "in_progress"|"won"|"lost"; guesses: number } | { ok: false; reason: "closed"|"finished"|"budget"|"invalid"|"ratelimited"|"error" }>`
  - Exported pure helper: `nextAttemptState(prev, feedback, isWin, max): { status; finished: boolean }`

- [ ] **Step 1: Write the failing test for the pure helper**

```ts
import { describe, expect, it } from "vitest";
import { nextAttemptState } from "./actions";

describe("nextAttemptState", () => {
  it("wins immediately on a correct guess", () => {
    expect(nextAttemptState(0, true, 6)).toEqual({ status: "won", finished: true });
  });
  it("loses when the last guess is wrong", () => {
    expect(nextAttemptState(5, false, 6)).toEqual({ status: "lost", finished: true });
  });
  it("stays in progress with guesses left", () => {
    expect(nextAttemptState(2, false, 6)).toEqual({ status: "in_progress", finished: false });
  });
});
```

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Implement the helper + both actions**

```ts
// pure: prevGuesses = count BEFORE this guess is appended
export function nextAttemptState(prevGuesses: number, isWin: boolean, max: number):
  { status: "won" | "lost" | "in_progress"; finished: boolean } {
  if (isWin) return { status: "won", finished: true };
  if (prevGuesses + 1 >= max) return { status: "lost", finished: true };
  return { status: "in_progress", finished: false };
}
```

```ts
export async function startChallengeAttempt(code: string): Promise<{ ok: boolean }> {
  const user = await getGameUser();
  const admin = supabaseAdmin();
  const { data: ch } = await admin.from("game_challenges")
    .select("id,status,expires_at").eq("code", code).maybeSingle();
  if (!ch || ch.status !== "open" || new Date(ch.expires_at) < new Date()) return { ok: false };
  const guestKey = user ? null : await getOrIssueGuestKey();
  // upsert-once: insert if no attempt row exists for this identity
  const filter = user ? { player_user_id: user.id } : { guest_key: guestKey };
  const { data: existing } = await admin.from("game_challenge_attempts")
    .select("id").eq("challenge_id", ch.id).match(filter).maybeSingle();
  if (!existing) {
    await admin.from("game_challenge_attempts").insert({ challenge_id: ch.id, ...filter });
    await admin.rpc("noop"); // placeholder — increment play_count via update below instead
    await admin.from("game_challenges").update({ play_count: (undefined as any) }).eq("id", ch.id); // see note
  }
  return { ok: true };
}
```

> **play_count increment:** do it with an RPC `increment_play_count(p_id uuid)` (add to the migration: `update game_challenges set play_count = play_count + 1 where id = p_id`) rather than a read-modify-write. Replace the two placeholder lines above with `await admin.rpc("increment_play_count", { p_id: ch.id })`. Add the RPC + grant to the migration in this task and re-hand the SQL.

```ts
export async function scoreChallengeGuess(code: string, guess: string) {
  const user = await getGameUser();
  const guestKey = user ? null : await readGuestKey();
  if (!user && !guestKey) return { ok: false as const, reason: "error" as const };

  // IP rate limit (blunts guest cookie-clear probing)
  const ip = clientIp(await headers());
  if (!(await allow(`challenge-guess:${ip}`, 60, 60_000))) return { ok: false as const, reason: "ratelimited" as const };

  const admin = supabaseAdmin();
  const { data: ch } = await admin.from("game_challenges")
    .select("id,game,secret,status,expires_at").eq("code", code).maybeSingle();
  if (!ch || ch.status !== "open" || new Date(ch.expires_at) < new Date())
    return { ok: false as const, reason: "closed" as const };

  const filter = user ? { player_user_id: user.id } : { guest_key: guestKey! };
  const { data: att } = await admin.from("game_challenge_attempts")
    .select("id,guesses,guess_data,status,started_at").eq("challenge_id", ch.id).match(filter).maybeSingle();
  if (!att) return { ok: false as const, reason: "error" as const };
  if (att.status !== "in_progress") return { ok: false as const, reason: "finished" as const };

  const max = maxGuessesFor(ch.game);
  if (att.guesses >= max) return { ok: false as const, reason: "budget" as const };
  if (!validateGuess(ch.game, guess)) return { ok: false as const, reason: "invalid" as const };

  const feedback = scoreChallenge(ch.game, guess, ch.secret);
  const win = isChallengeWin(ch.game, feedback);
  const { status, finished } = nextAttemptState(att.guesses, win, max);
  const guess_data = [...(att.guess_data as any[]), { guess, feedback }];
  const time_ms = finished ? Date.now() - new Date(att.started_at).getTime() : null;

  await admin.from("game_challenge_attempts").update({
    guesses: att.guesses + 1, guess_data, status,
    finished_at: finished ? new Date().toISOString() : null, time_ms,
  }).eq("id", att.id);
  if (status === "won") await admin.rpc("increment_crack_count", { p_id: ch.id });

  return { ok: true as const, feedback, status, guesses: att.guesses + 1 };
}
```

> Add `increment_crack_count(p_id uuid)` to the migration alongside `increment_play_count` (same shape). Re-hand SQL. The `time_ms` is server-derived from `started_at` — the client never sends a duration (games anti-cheat rule).

- [ ] **Step 4: Run the pure-helper test → PASS.** `npx tsc --noEmit` → 0.
- [ ] **Step 5: Commit** `feat(games): start + server-scored guess actions`.

### Task 8: Close/delete + guest-attach actions

**Files:**
- Modify: `src/lib/games/challenges/actions.ts`
- Modify: the migration — add `close_challenge(p_code text)` / `delete_challenge(p_code text)` (creator-guarded via `auth.uid() = creator_user_id`), grant to `authenticated`.
- Modify: post-login hook (grep for where sign-in completes — likely `src/lib/games/auth-actions.ts`) to call `attachGuestAttempts`.

**Interfaces:**
- Produces:
  - `closeChallenge(code): Promise<{ok:boolean}>`, `deleteChallenge(code): Promise<{ok:boolean}>`
  - `attachGuestAttempts(userId: string): Promise<void>` — moves this browser's guest attempts to the user id.

- [ ] **Step 1:** Add `close_challenge`/`delete_challenge` RPCs (security definer, `where creator_user_id = auth.uid()`), grant to authenticated. Re-hand SQL.

- [ ] **Step 2:** Implement the actions. `attachGuestAttempts`: read guest cookie; if present, `supabaseAdmin().from("game_challenge_attempts").update({ player_user_id: userId, guest_key: null }).eq("guest_key", key)` — skipping rows where the user already has an attempt for that challenge (unique index would reject; do it per-row or `on conflict do nothing` semantics via a small RPC). Simplest robust form: an RPC `attach_guest_attempts(p_guest_key text, p_user uuid)` that updates only where no user attempt exists yet. Add it to the migration.

- [ ] **Step 3:** Call `attachGuestAttempts(user.id)` from the post-login path.

- [ ] **Step 4:** `npx tsc --noEmit` → 0. Commit `feat(games): close/delete + guest-attach on sign-in`.

---

## Phase 3 — UI

### Task 9: Per-game sub-nav

**Files:**
- Create: `src/components/games/challenge/GameSubnav.tsx`
- Modify: `src/app/games/alfazy/layout.tsx`, `.../hit-and-blow/layout.tsx`, `.../integra/layout.tsx` (render `<GameSubnav slug="..." />` above `{children}`).

**Interfaces:**
- Produces: `GameSubnav({ slug }: { slug: string })` — client component; tabs Play (`/games/{slug}`), Leaderboard (`/games/{slug}/leaderboard`), Archive (`/games/{slug}/archive`), Challenge (`/games/{slug}/challenge`); active tab from `usePathname()`.

- [ ] **Step 1:** Implement the strip with `Link`s and an active style (mirror the tab styling in `LeaderboardView.tsx:117`). Keep it a horizontal, scroll-safe row.
- [ ] **Step 2:** Wire into the three layouts.
- [ ] **Step 3:** `npx tsc --noEmit` → 0. Commit `feat(games): per-game sub-nav with Challenge tab`.

### Task 10: Challenge boards

**Files:**
- Create: `src/components/games/challenge/ChallengeTileBoard.tsx` (alfazy + integra)
- Create: `src/components/games/challenge/ChallengeCodeBoard.tsx` (hit-and-blow)

**Interfaces:**
- Consumes: `scoreChallengeGuess`, `startChallengeAttempt` (Task 7); `board/Tile`, `board/Keyboard`; `ChallengeAttemptState`, `Feedback`.
- Produces:
  - `ChallengeTileBoard({ code, game, length, maxGuesses, initial }: {...; initial: ChallengeAttemptState | null })`
  - `ChallengeCodeBoard({ code, maxGuesses, initial }: {...})`

- [ ] **Step 1:** Build `ChallengeTileBoard` as a client component modeled on `AlfazyBoard`, but: seed state from `initial` (server attempt); on first guess call `startChallengeAttempt(code)`; each guess calls `scoreChallengeGuess(code, guess)` and renders the returned `feedback.tiles` (no local `answer`, no `scoreGuess`); lock the board when the action returns `status !== "in_progress"`; surface `reason` errors (`budget`/`finished`/`closed`) as a toast/message. Persist nothing authoritative to localStorage (server is source of truth); optional optimistic row while the action is in flight.
- [ ] **Step 2:** Build `ChallengeCodeBoard` the same way against `feedback.kind === "code"` (hits/blows), modeled on `HitAndBlowBoard`.
- [ ] **Step 3:** `npx tsc --noEmit` → 0. Commit `feat(games): server-scored challenge boards`.

### Task 11: Play page + route wiring

**Files:**
- Create: `src/components/games/challenge/ChallengePlay.tsx`
- Create: `src/components/games/challenge/ChallengeLeaderboard.tsx`
- Create (×3): `src/app/games/<game>/challenge/[code]/page.tsx`

**Interfaces:**
- Consumes: `getChallengeMeta`, `getMyAttempt`, `getChallengeLeaderboard` (Task 5); `getGameUser`, `readGuestKey`; boards (Task 10); `Podium`, `ShareBlock`.
- Produces: `ChallengePlay({ code }: { code: string })`.

- [ ] **Step 1:** `ChallengePlay` (server): `getChallengeMeta(code)` → if null/expired/closed, render a "challenge unavailable" state (still show leaderboard if it exists). Resolve player identity (`getGameUser` / `readGuestKey`), `getMyAttempt(...)`. Pick the board by `meta.game` (tile board for alfazy/integra with the right `length`/`maxGuesses`; code board for hit_and_blow). Render `GameHeader` (title = challenge title or "Challenge"), the board, `ChallengeLeaderboard`, and a `ShareBlock` whose URL is `/games/{game}/challenge/{code}`.
- [ ] **Step 2:** `ChallengeLeaderboard`: `getChallengeLeaderboard(code)` → `Podium` (top 3) + a table (guest rows anonymous, prompt sign-in). Reuse `Podium` from `src/components/games/Podium.tsx`.
- [ ] **Step 3:** Add the three route files, each `export default async function` rendering `<ChallengePlay code={(await params).code} />` with `noIndex` metadata (mirror `[puzzle]/page.tsx`).
- [ ] **Step 4:** `npx tsc --noEmit` → 0. Commit `feat(games): challenge play page + routes`.

### Task 12: Hub — create + my challenges + browse

**Files:**
- Create: `src/components/games/challenge/ChallengeHub.tsx`
- Create: `src/components/games/challenge/CreateChallengeForm.tsx`
- Create (×3): `src/app/games/<game>/challenge/page.tsx`

**Interfaces:**
- Consumes: `getMemberContext`/`can`; `getMyChallenges`, `browseChallenges` (Task 5); `createChallenge`, `closeChallenge`, `deleteChallenge` (Tasks 6, 8).
- Produces: `ChallengeHub({ game }: { game: ChallengeGame })`.

- [ ] **Step 1:** `ChallengeHub` (server): `getMemberContext()` → if `can(caps,"create_challenge")` render `<CreateChallengeForm game=... />`, else an upgrade prompt (link to `/membership`, mirror `ArchiveUpsell`). Below: `getMyChallenges(game)` list (title, crack/play counts, public toggle, share link, close/delete buttons) and `browseChallenges(game, 0)` grid (title + crack count, link to `/games/{game}/challenge/{code}`).
- [ ] **Step 2:** `CreateChallengeForm` (client): input for the secret (with per-game placeholder + client `validateGuess` pre-check for instant feedback), optional title, "list publicly" checkbox, submit → `createChallenge` → on `{ok}` show the share link + copy button; map `reason` to inline errors (`invalid` → "not a valid word/code/equation", `limit` → "15-challenge limit reached this month", `forbidden` → upgrade prompt).
- [ ] **Step 3:** Add the three `challenge/page.tsx` route files rendering `<ChallengeHub game="..." />` with `noIndex` metadata.
- [ ] **Step 4:** `npx tsc --noEmit` → 0. Commit `feat(games): challenge hub, create form, browse`.

---

## Phase 4 — Integrity tests & probes

### Task 13: Ranking + guest-attach unit tests

**Files:**
- Create: `src/lib/games/challenges/ranking.test.ts` (if a pure ranking helper is extracted for the leaderboard client fallback) and extend `actions`/queries tests where logic is pure.

- [ ] **Step 1:** Unit-test any pure comparators/mappers introduced (leaderboard ordering mirror, guess_data → state mapping). Keep to pure functions; DB-touching paths are covered by the live probes below.
- [ ] **Step 2:** `npx vitest run src/lib/games/challenges` → all pass. Commit `test(games): challenge pure-logic tests`.

### Task 14: Live RPC integrity probes (pre-merge)

**Files:** none (a checklist run against the deployed branch DB, results noted in the PR).

- [ ] **Probe 1:** `create_challenge` with the exact key set `{p_game,p_secret,p_title,p_is_public}` returns a code (not PGRST202). 16th create in 30 days raises `challenge limit reached`.
- [ ] **Probe 2:** Anon/authenticated **cannot** read `secret`: `select secret from game_challenges` via the anon key errors on column permission; `browse_challenges`/`challenge_leaderboard` responses contain no secret.
- [ ] **Probe 3:** `scoreChallengeGuess` refuses a 7th guess (budget), refuses after `won`/`lost` (finished), refuses on a closed/expired challenge.
- [ ] **Probe 4:** Guest attempt appears on the board anonymously; after sign-in `attach_guest_attempts` moves it to the user and it ranks.
- [ ] **Probe 5:** `time_ms` is populated from `started_at` server-side (never client-supplied).

---

## Self-Review

**Spec coverage:**
- Custom authored puzzle → Tasks 3, 6 (validate + create). ✓
- Access: link always + opt-in public → `is_public`, `browse_challenges`, share URL in Task 11. ✓
- Server scoring, secret hidden → Task 7 (service-role scoring) + column grants (Task 1) + Probe 2. ✓
- Gating: create=member, play=guest-allowed → Task 6 capability; guest cookie Tasks 4/7; funnel Task 8. ✓
- One attempt + per-challenge leaderboard → unique indexes Task 1; leaderboard Tasks 2/11. ✓
- v1 scope (create+link+play+leaderboard, public browse, my-challenges, expiry/limits) → Tasks 1–12. ✓
- Guest integrity: soft cookie + IP rate-limit → Task 7. ✓
- Nested URL `/games/[game]/challenge/[code]` → Task 11. ✓
- 15/30d + 30-day expiry → Task 1 RPC. ✓

**Open verifications flagged inline (must confirm during implementation, not assumptions):**
- `supabaseAdmin` import path; `game_profiles` table/column names; engine casing convention; the post-login hook location for `attachGuestAttempts`; whether `GameSubnav` belongs in each game layout or the parent games layout.

**Placeholder scan:** the `startChallengeAttempt` play_count lines are explicitly marked to be replaced by `increment_play_count` RPC in the same task — not a leftover. No other placeholders.

**Type consistency:** `Feedback`, `ChallengeAttemptState`, `ChallengeGame` defined in Task 3 `types.ts` and consumed unchanged in Tasks 5, 7, 10, 11.

**Scope:** one cohesive feature; phased but a single plan. Reasonable for one implementation cycle with review gates between tasks.
