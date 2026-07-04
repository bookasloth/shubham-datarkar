# Games Phase 3 — Auth + Persistence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Logged-in games users persist results and streaks and unlock the past-puzzle archive, via a dedicated `/games/login` (isolated from admin `/login`), a server-side anti-cheat `submitResult` action, and a games session guard.

**Architecture:** Games reuse the site's Supabase Auth instance but with their own server actions (redirect to `/games`, not `/admin`), their own session helper (no `ADMIN_EMAIL` gate), and their own login UI. Result writes go through a `submitResult` server action that **re-derives the answer server-side** and validates the submitted guesses before calling the security-definer `submit_result` RPC. Client components read session via a `useGameAuth` hook; server components/actions use the existing cookie-aware `supabaseAuthServer()`.

**Tech Stack:** Next.js 16 (App Router, `src/proxy.ts` middleware), React 19 `useActionState`, `@supabase/ssr` (`createServerClient` server, `createBrowserClient` browser via `src/lib/supabase/client.ts`), Supabase Auth (email+password, **email confirmation OFF**), existing `@/components/ui/*`, Vitest.

## Global Constraints

- Path alias `@/*` → `./src/*`.
- **Games auth is isolated from admin.** New files under `src/lib/games/` and `src/app/games/`; never modify `src/lib/auth/*` or `/login`. No `ADMIN_EMAIL` check in games.
- **Anti-cheat trust boundary:** `submitResult` MUST re-derive the answer/secret from `puzzleNumber` server-side (never trust a client-sent answer) and validate that `guess_data` is consistent before persisting.
- Persistence goes through the RPC `submit_result` (security-definer) using the **authenticated** client (`supabaseAuthServer()`), so `auth.uid()` resolves inside the RPC. Never use the service-role/admin client for user result writes.
- Enum values are `alfazy` and `hit_and_blow` (game_key). Result statuses: `in_progress` | `won` | `lost`.
- Design tokens only for chrome (monochrome + brand-on-interaction); headings `font-display`. Dark-mode via `.dark`.
- Not logged in must never error the boards — persistence is best-effort; localStorage always works.
- Every commit message ends with `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- Verify via preview DOM tools, never `preview_screenshot`.

## RPC reference (from migration `0001_games_schema.sql`, applied in Task 1)

```
submit_result(p_game game_key, p_puzzle int, p_date date, p_status result_status,
              p_guesses int, p_guess_data jsonb, p_time_ms int) returns void  -- security definer, uses auth.uid()
```
Auto-profile trigger `on_auth_user_created` creates a `public.profiles` row (username = email-prefix + 4-char hash) on signup. Tables: `profiles`, `game_results`, `streaks`. RLS: users touch only their own rows.

## Game-logic reference (already in repo, Phase 1)

- `@/lib/daily`: `puzzleNumberFor(): number`, `puzzleDateISO(n?): string`, `isToday(n): boolean`.
- `@/lib/games/alfazy`: `answerFor(puzzleNumber): string`, `scoreGuess(guess, answer)`, `ALFAZY = { length, maxGuesses }`.
- `@/lib/games/hit-and-blow`: `secretFor(puzzleNumber): string`, `scoreGuess(guess, secret): {bulls,cows}` (a.k.a. hits/blows), `HIT_AND_BLOW = { length, maxGuesses }`.
  (Verify exact export names by reading these files before use — do not assume.)

---

### Task 1: Migration rename + manual-apply handoff

**Files:**
- Rename: `supabase/migrations/0001_games_schema.sql` → `supabase/migrations/20260705000001_games_init.sql`

- [ ] **Step 1: Rename the migration to the timestamp convention**

```bash
git mv supabase/migrations/0001_games_schema.sql supabase/migrations/20260705000001_games_init.sql
```

- [ ] **Step 2: Verify the file content is unchanged and enums are `alfazy`/`hit_and_blow`**

Run: `grep -E "create type game_key|'alfazy'|'hit_and_blow'" supabase/migrations/20260705000001_games_init.sql`
Expected: the `game_key` enum line plus both values present.

- [ ] **Step 3: Commit**

```bash
git add -A supabase/migrations
git commit -m "chore(games): rename games migration to timestamp convention

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

- [ ] **Step 4: Flag the manual apply (controller surfaces to user).** This migration is NOT applied automatically. The user must: (a) run `20260705000001_games_init.sql` in the Supabase SQL editor, and (b) turn OFF "Confirm email" in Supabase Auth settings (instant play). Persistence, archive, and login only work after both. Record this as a DONE_WITH_CONCERNS note for the controller to relay.

---

### Task 2: Games session helper

**Files:**
- Create: `src/lib/games/session.ts`

**Interfaces:**
- Produces: `getGameUser(): Promise<User | null>` — memoized current user (no ADMIN_EMAIL gate).
- Produces: `requireGameUser(next?: string): Promise<User>` — redirects to `/games/login?next=<next>` when unauthenticated.

- [ ] **Step 1: Implement the helper**

`src/lib/games/session.ts`:

```ts
import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { supabaseAuthServer } from "@/lib/supabase/auth-server";

/** Memoized per render: the current games user, or null. Any authed user passes. */
export const getGameUser = cache(async (): Promise<User | null> => {
  const supabase = await supabaseAuthServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ?? null;
});

/** Route guard: redirect to the games login (preserving return path) when not signed in. */
export async function requireGameUser(next?: string): Promise<User> {
  const user = await getGameUser();
  if (!user) {
    redirect(`/games/login${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  }
  return user;
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit 2>&1 | grep "games/session" || echo clean`
Expected: `clean`

- [ ] **Step 3: Commit**

```bash
git add src/lib/games/session.ts
git commit -m "feat(games): session helper (getGameUser/requireGameUser)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Games auth server actions

**Files:**
- Create: `src/lib/games/auth-actions.ts`

**Interfaces:**
- Produces: `type GamesAuthState = { error: string } | undefined`.
- Produces: `signUp(prev, formData): Promise<GamesAuthState>` — `supabase.auth.signUp`; on success redirect to `next` (validated to start with `/games`) else `/games`.
- Produces: `signIn(prev, formData): Promise<GamesAuthState>` — `signInWithPassword`; same redirect.
- Produces: `signOut(): Promise<void>` — signs out, redirect `/games`.

- [ ] **Step 1: Implement the actions**

`src/lib/games/auth-actions.ts`:

```ts
"use server";

import { redirect } from "next/navigation";
import { supabaseAuthServer } from "@/lib/supabase/auth-server";

export type GamesAuthState = { error: string } | undefined;

/** Only allow same-app return paths; never an open redirect. */
function safeNext(raw: FormDataEntryValue | null): string {
  const v = String(raw ?? "");
  return v.startsWith("/games") ? v : "/games";
}

export async function signUp(
  _prev: GamesAuthState,
  formData: FormData,
): Promise<GamesAuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(formData.get("next"));

  if (!email || !password) return { error: "Email and password are required." };
  if (password.length < 6) return { error: "Password must be at least 6 characters." };

  const supabase = await supabaseAuthServer();
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) return { error: error.message };

  redirect(next);
}

export async function signIn(
  _prev: GamesAuthState,
  formData: FormData,
): Promise<GamesAuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(formData.get("next"));

  if (!email || !password) return { error: "Email and password are required." };

  const supabase = await supabaseAuthServer();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "Invalid email or password." };

  redirect(next);
}

export async function signOut(): Promise<void> {
  const supabase = await supabaseAuthServer();
  await supabase.auth.signOut();
  redirect("/games");
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit 2>&1 | grep "games/auth-actions" || echo clean`
Expected: `clean`

- [ ] **Step 3: Commit**

```bash
git add src/lib/games/auth-actions.ts
git commit -m "feat(games): sign up/in/out server actions with safe redirect

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: Games login page + form

**Files:**
- Create: `src/components/games/GamesAuthForm.tsx`
- Modify: `src/app/games/login/page.tsx` (full rewrite)

**Interfaces:**
- `GamesAuthForm` (client, default export, props `{ next: string }`) — toggles Sign in / Sign up, drives `signIn`/`signUp` via `useActionState`.
- Login page (server) reads `searchParams.next`, redirects to `/games` if already signed in (via `getGameUser`), else renders `<GamesAuthForm next=... />`.

- [ ] **Step 1: Implement the form**

`src/components/games/GamesAuthForm.tsx`:

```tsx
"use client";

import { useActionState, useState } from "react";
import { signIn, signUp, type GamesAuthState } from "@/lib/games/auth-actions";
import { Button } from "@/components/ui/button";

export default function GamesAuthForm({ next }: { next: string }) {
  const [mode, setMode] = useState<"in" | "up">("in");
  const action = mode === "in" ? signIn : signUp;
  const [state, formAction, pending] = useActionState<GamesAuthState, FormData>(
    action,
    undefined,
  );

  return (
    <div className="mx-auto max-w-sm rounded-card border border-border bg-card p-6">
      <h1 className="font-display text-xl font-bold">
        {mode === "in" ? "Sign in" : "Create account"}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {mode === "in"
          ? "Log in to save your streak and unlock the archive."
          : "Sign up to keep your daily streak across devices."}
      </p>

      <form action={formAction} className="mt-5 space-y-3">
        <input type="hidden" name="next" value={next} />
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
          className="w-full rounded-input border border-input bg-background px-3 py-2 text-sm outline-none transition-ui focus:border-brand"
        />
        <input
          name="password"
          type="password"
          autoComplete={mode === "in" ? "current-password" : "new-password"}
          required
          placeholder="Password"
          className="w-full rounded-input border border-input bg-background px-3 py-2 text-sm outline-none transition-ui focus:border-brand"
        />
        {state?.error && <p className="text-sm text-danger">{state.error}</p>}
        <Button type="submit" loading={pending} className="w-full">
          {mode === "in" ? "Sign in" : "Create account"}
        </Button>
      </form>

      <button
        type="button"
        onClick={() => setMode((m) => (m === "in" ? "up" : "in"))}
        className="mt-4 text-sm text-muted-foreground underline-offset-4 transition-ui hover:text-foreground hover:underline"
      >
        {mode === "in" ? "Need an account? Sign up" : "Have an account? Sign in"}
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Rewrite the login page**

`src/app/games/login/page.tsx`:

```tsx
import { redirect } from "next/navigation";
import { getGameUser } from "@/lib/games/session";
import GamesAuthForm from "@/components/games/GamesAuthForm";

export default async function GamesLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const safeNext = next && next.startsWith("/games") ? next : "/games";

  if (await getGameUser()) redirect(safeNext);

  return <GamesAuthForm next={safeNext} />;
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit 2>&1 | grep -E "GamesAuthForm|login/page" || echo clean`
Expected: `clean`

- [ ] **Step 4: Verify in preview**

Navigate to `/games/login`. `preview_snapshot`: confirm the form (email, password, submit) and the Sign-in/Sign-up toggle render. `preview_click` the toggle; confirm heading switches to "Create account". (Full auth round-trip needs the migration applied + Confirm-email OFF — note if unavailable.)

- [ ] **Step 5: Commit**

```bash
git add src/components/games/GamesAuthForm.tsx src/app/games/login/page.tsx
git commit -m "feat(games): login page with sign in/up form

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: Proxy — refresh + gate games session routes

**Files:**
- Modify: `src/proxy.ts`

**Interfaces:** extends the existing `proxy` matcher; must not change `/admin`/`/login` behavior.

- [ ] **Step 1: Add games route handling to the proxy**

In `src/proxy.ts`, after the existing `/login` redirect block and before `return response;`, add:

```ts
  // Games: bounce logged-in users away from the games login page.
  if (path === "/games/login" && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/games";
    url.search = "";
    return NextResponse.redirect(url);
  }
```

Extend the matcher so the session cookie is refreshed on games auth surfaces and the redirect above fires:

```ts
export const config = {
  matcher: ["/admin/:path*", "/login", "/games/login", "/games/profile/:path*"],
};
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit 2>&1 | grep "proxy" || echo clean`
Expected: `clean`

- [ ] **Step 3: Verify existing admin gate still matches**

Run: `grep -n "matcher" src/proxy.ts`
Expected: matcher array includes `/admin/:path*`, `/login`, `/games/login`, `/games/profile/:path*`.

- [ ] **Step 4: Commit**

```bash
git add src/proxy.ts
git commit -m "feat(games): proxy refreshes session + redirects logged-in from games login

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 6: submitResult action (server-side anti-cheat)

**Files:**
- Create: `src/lib/games/validate-result.ts` (pure validator + types — NO "use server")
- Create: `src/lib/games/submit-result.ts` (the `"use server"` action)
- Test: `src/lib/games/validate-result.test.ts`

**Interfaces:**
- `validate-result.ts` produces:
  ```ts
  type SubmitInput = {
    game: "alfazy" | "hit_and_blow";
    puzzleNumber: number;
    status: "won" | "lost";
    guesses: string[];   // the raw guesses the player made, in order
    timeMs: number | null;
  };
  validateResult(input: SubmitInput): { valid: boolean };  // pure, sync
  ```
- `submit-result.ts` produces:
  ```ts
  type SubmitOutcome = { ok: true } | { ok: false; reason: "unauthenticated" | "invalid" | "error" };
  submitResult(input: SubmitInput): Promise<SubmitOutcome>;  // async server action
  ```
- Consumes: `getGameUser` (session), `supabaseAuthServer`, `answerFor`/`secretFor` + `scoreGuess` from the game modules, `puzzleDateISO` from `@/lib/daily`.

**Note (Next 16):** a `"use server"` module may export ONLY async functions. The sync `validateResult` therefore lives in its own non-"use server" module and is imported by both the action and the test.

**Confirmed export names** (verified against the repo): alfazy — `ALFAZY`, `answerFor`, `scoreGuess` (returns `Tile[]`); hit-and-blow — `HIT_AND_BLOW` (`.length`=4, `.maxGuesses`=9), `secretFor`, `scoreGuess` (returns `{ hits, blows }`).

- [ ] **Step 1: Write the failing test for validation logic**

`src/lib/games/validate-result.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { validateResult } from "./validate-result";
import { answerFor } from "./alfazy";

describe("validateResult", () => {
  it("accepts a genuine Alfazy win (last guess equals the answer)", () => {
    // Uses the real answerFor(0) for puzzle 0 to build a valid payload.
    const r = validateResult({
      game: "alfazy",
      puzzleNumber: 0,
      status: "won",
      guesses: [answerFor(0)],
      timeMs: 1000,
    });
    expect(r.valid).toBe(true);
  });

  it("rejects a claimed win whose guesses never reach the answer", () => {
    const r = validateResult({
      game: "alfazy",
      puzzleNumber: 0,
      status: "won",
      guesses: ["zzzzz"],
      timeMs: 1000,
    });
    expect(r.valid).toBe(false);
  });

  it("rejects more guesses than the game allows", () => {
    const r = validateResult({
      game: "alfazy",
      puzzleNumber: 0,
      status: "lost",
      guesses: Array(99).fill("aaaaa"),
      timeMs: null,
    });
    expect(r.valid).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/games/validate-result.test.ts`
Expected: FAIL — cannot find module `./validate-result`.

- [ ] **Step 3a: Implement the pure validator**

`src/lib/games/validate-result.ts` (NO "use server" — pure module):

```ts
import { ALFAZY, answerFor } from "@/lib/games/alfazy";
import { HIT_AND_BLOW, secretFor, scoreGuess as scoreHitAndBlow } from "@/lib/games/hit-and-blow";

export type SubmitInput = {
  game: "alfazy" | "hit_and_blow";
  puzzleNumber: number;
  status: "won" | "lost";
  guesses: string[];
  timeMs: number | null;
};

/** Pure server-side re-derivation of truth. Never trust the client's claim. */
export function validateResult(input: SubmitInput): { valid: boolean } {
  const { game, puzzleNumber, status, guesses } = input;
  if (!Number.isInteger(puzzleNumber) || puzzleNumber < 0) return { valid: false };
  if (guesses.length === 0) return { valid: false };

  const max = game === "alfazy" ? ALFAZY.maxGuesses : HIT_AND_BLOW.maxGuesses;
  if (guesses.length > max) return { valid: false };

  if (game === "alfazy") {
    const answer = answerFor(puzzleNumber);
    const won = guesses[guesses.length - 1] === answer;
    // No earlier guess may already equal the answer (that would be an extra guess after a win).
    const wonEarlier = guesses.slice(0, -1).some((g) => g === answer);
    if (wonEarlier) return { valid: false };
    return { valid: status === "won" ? won : !won };
  }

  const secret = secretFor(puzzleNumber);
  const last = scoreHitAndBlow(guesses[guesses.length - 1], secret);
  const won = last.hits === HIT_AND_BLOW.length; // hit-and-blow scoreGuess returns { hits, blows }
  return { valid: status === "won" ? won : !won };
}
```

- [ ] **Step 3b: Implement the action**

`src/lib/games/submit-result.ts` (`"use server"` — only async exports):

```ts
"use server";

import { getGameUser } from "@/lib/games/session";
import { supabaseAuthServer } from "@/lib/supabase/auth-server";
import { puzzleDateISO } from "@/lib/daily";
import { validateResult, type SubmitInput } from "@/lib/games/validate-result";

export type SubmitOutcome =
  | { ok: true }
  | { ok: false; reason: "unauthenticated" | "invalid" | "error" };

export async function submitResult(input: SubmitInput): Promise<SubmitOutcome> {
  const user = await getGameUser();
  if (!user) return { ok: false, reason: "unauthenticated" };

  if (!validateResult(input).valid) return { ok: false, reason: "invalid" };

  const supabase = await supabaseAuthServer();
  const { error } = await supabase.rpc("submit_result", {
    p_game: input.game,
    p_puzzle: input.puzzleNumber,
    p_date: puzzleDateISO(input.puzzleNumber),
    p_status: input.status,
    p_guesses: input.guesses.length,
    p_guess_data: input.guesses,
    p_time_ms: input.timeMs,
  });

  if (error) return { ok: false, reason: "error" };
  return { ok: true };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/games/validate-result.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit 2>&1 | grep -E "validate-result|submit-result" || echo clean`
Expected: `clean`

- [ ] **Step 6: Commit**

```bash
git add src/lib/games/validate-result.ts src/lib/games/validate-result.test.ts src/lib/games/submit-result.ts
git commit -m "feat(games): submitResult action with server-side anti-cheat validation

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 7: useGameAuth hook

**Files:**
- Create: `src/components/games/use-game-auth.ts`

**Interfaces:**
- Produces: `useGameAuth(): { user: { id: string; email?: string } | null; loading: boolean }` — client-side session via `createClient()` from `@/lib/supabase/client`, subscribes to `onAuthStateChange`.

- [ ] **Step 1: Implement the hook**

`src/components/games/use-game-auth.ts`:

```ts
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type GameUser = { id: string; email?: string } | null;

/** Client-side games session. null while logged out; updates on auth changes. */
export function useGameAuth(): { user: GameUser; loading: boolean } {
  const [user, setUser] = useState<GameUser>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      setUser(data.user ? { id: data.user.id, email: data.user.email } : null);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ? { id: session.user.id, email: session.user.email } : null);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { user, loading };
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit 2>&1 | grep "use-game-auth" || echo clean`
Expected: `clean`

- [ ] **Step 3: Commit**

```bash
git add src/components/games/use-game-auth.ts
git commit -m "feat(games): useGameAuth client session hook

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 8: Wire boards to submit results + auth prompt

**Files:**
- Modify: `src/components/games/AlfazyBoard.tsx`
- Modify: `src/components/games/HitAndBlowBoard.tsx`

**Before writing:** read both board files to find where the game reaches a terminal state (`won`/`lost`) and what state holds the guesses and elapsed time. Wire the submit at that exact point.

**Interfaces:** consumes `submitResult` (Task 6) and `useGameAuth` (Task 7). No prop changes.

- [ ] **Step 1: AlfazyBoard — submit on terminal state + show auth prompt**

In `src/components/games/AlfazyBoard.tsx`:
- Import: `import { submitResult } from "@/lib/games/submit-result";` and `import { useGameAuth } from "@/components/games/use-game-auth";` and `import Link from "next/link";`.
- Call `const { user } = useGameAuth();` in the component.
- In the existing effect/handler that transitions the game to `won`/`lost` (the same place it writes localStorage), after that write, fire-and-forget when authed and not an archive replay:
  ```tsx
  if (user && status !== "in_progress") {
    void submitResult({
      game: "alfazy",
      puzzleNumber,
      status,
      guesses,               // the array of submitted guess strings
      timeMs: elapsedMs ?? null,
    });
  }
  ```
  Use the component's actual variable names for `status`, `guesses`, and elapsed time (found by reading the file). Guard with a ref/flag so it submits once per finished game, not on every render.
- When the game is finished and `!user`, render a prompt beneath the board:
  ```tsx
  {status !== "in_progress" && !user && (
    <p className="text-sm text-muted-foreground">
      <Link href="/games/login?next=/games/alfazy" className="underline underline-offset-4 hover:text-foreground">
        Log in
      </Link>{" "}
      to save your streak.
    </p>
  )}
  ```

- [ ] **Step 2: HitAndBlowBoard — same wiring**

Mirror Step 1 in `src/components/games/HitAndBlowBoard.tsx`, with `game: "hit_and_blow"` and the login link `next=/games/hit-and-blow`. Use that component's own state variable names.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit 2>&1 | grep -E "AlfazyBoard|HitAndBlowBoard" || echo clean`
Expected: `clean`

- [ ] **Step 4: Verify in preview (logged-out path)**

Play a game to completion while logged out on `/games/alfazy`. Confirm the "Log in to save your streak" prompt appears and no console error fires (submit is skipped for logged-out users). `preview_console_logs` level error → none.

- [ ] **Step 5: Commit**

```bash
git add src/components/games/AlfazyBoard.tsx src/components/games/HitAndBlowBoard.tsx
git commit -m "feat(games): submit results when authed + login prompt when not

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 9: Archive unlock (auth-gate past puzzles)

**Files:**
- Modify: `src/app/games/alfazy/[puzzle]/page.tsx`
- Modify: `src/app/games/hit-and-blow/[puzzle]/page.tsx`

**Before writing:** read both archive pages to see how they parse the `[puzzle]` param and render the board today.

**Interfaces:** consumes `requireGameUser` (Task 2), `isToday` from `@/lib/daily`.

- [ ] **Step 1: Gate Alfazy archive**

In `src/app/games/alfazy/[puzzle]/page.tsx`, after parsing the puzzle number `n`, require auth for past puzzles:

```tsx
import { isToday } from "@/lib/daily";
import { requireGameUser } from "@/lib/games/session";
// ...
  const n = Number(puzzle);
  if (!Number.isInteger(n) || n < 0) notFound();
  if (!isToday(n)) {
    await requireGameUser(`/games/alfazy/${n}`);
  }
```

Keep the existing board render (pass `puzzleNumber={n}` and mark `isArchive` per the file's existing prop). Import `notFound` from `next/navigation` if not already present.

- [ ] **Step 2: Gate Hit and Blow archive**

Mirror Step 1 in `src/app/games/hit-and-blow/[puzzle]/page.tsx` with the login return path `/games/hit-and-blow/${n}`.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit 2>&1 | grep -E "alfazy/\[puzzle\]|hit-and-blow/\[puzzle\]" || echo clean`
Expected: `clean`

- [ ] **Step 4: Verify in preview (logged-out redirect)**

Navigate to a past puzzle, e.g. `/games/alfazy/0` (assuming today's number > 0) while logged out. Confirm it redirects to `/games/login?next=/games/alfazy/0` (`preview_snapshot` shows the login form). Today's puzzle `/games/alfazy` stays open without login.

- [ ] **Step 5: Commit**

```bash
git add src/app/games/alfazy/[puzzle]/page.tsx src/app/games/hit-and-blow/[puzzle]/page.tsx
git commit -m "feat(games): gate past-puzzle archive behind games login

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 10: Games header — username + sign out

**Files:**
- Modify: `src/components/games/GamesHeader.tsx`

**Interfaces:** consumes `useGameAuth` (Task 7); `signOut` (Task 3).

- [ ] **Step 1: Show auth state in the header**

In `src/components/games/GamesHeader.tsx` (already a client component):
- Import `useGameAuth` and `signOut`.
- Read `const { user } = useGameAuth();`.
- Replace the right-side cluster (currently just `<ThemeToggle />`) so that when `user` is present it also shows a Profile link and a sign-out button, and when absent shows a "Sign in" link:

```tsx
<div className="flex items-center gap-1">
  {user ? (
    <>
      <Button variant="ghost" size="sm" asChild>
        <Link href="/games/profile">Profile</Link>
      </Button>
      <form action={signOut}>
        <Button variant="ghost" size="sm" type="submit">Sign out</Button>
      </form>
    </>
  ) : (
    <Button variant="ghost" size="sm" asChild>
      <Link href="/games/login">Sign in</Link>
    </Button>
  )}
  <ThemeToggle />
</div>
```

Keep the existing "Back to site" link and "Games" wordmark unchanged.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit 2>&1 | grep "GamesHeader" || echo clean`
Expected: `clean`

- [ ] **Step 3: Verify in preview**

Reload `/games`. Logged out: header shows "Sign in". `preview_snapshot` confirms. (Logged-in state verified in Task 11 after the DB is applied, if available.)

- [ ] **Step 4: Commit**

```bash
git add src/components/games/GamesHeader.tsx
git commit -m "feat(games): header shows profile + sign out when authed

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 11: Verification + PR

**Files:** none.

- [ ] **Step 1: Full gate**

Run: `npx vitest run src/lib/games/ && npx tsc --noEmit 2>&1 | grep -E "src/(app/games|components/games|lib/games)|proxy" || echo "games typecheck clean"`
Expected: vitest PASS; `games typecheck clean`.

- [ ] **Step 2: Logged-out preview walk**

`/games` (Sign in in header) → `/games/login` (form + toggle) → play `/games/alfazy` to completion (login prompt, no console error) → `/games/alfazy/0` (redirects to login). Light + dark.

- [ ] **Step 3: Push + open PR**

```bash
git push -u origin feat/games-phase3-auth
gh pr create --base main --title "feat(games): Phase 3 — auth + persistence" --body "$(cat <<'BODY'
## Summary
Phase 3 (spec: docs/superpowers/specs/2026-07-04-games-development-design.md).

- Dedicated `/games/login` (sign in / sign up), isolated from admin `/login`; games session helper (no ADMIN_EMAIL gate); proxy refreshes session + bounces logged-in users off the login page.
- `submitResult` server action **re-derives the answer server-side** and validates guesses before calling the `submit_result` RPC (anti-cheat). Best-effort: logged-out players still play via localStorage.
- Boards submit results when authed and show a login prompt when not; past-puzzle archive gated behind games login; header shows Profile + Sign out.
- Games migration renamed to `20260705000001_games_init.sql`.

## Requires (manual, before persistence works)
- [ ] Run `supabase/migrations/20260705000001_games_init.sql` in the Supabase SQL editor.
- [ ] Turn OFF "Confirm email" in Supabase Auth (instant play).

## Test plan
- [ ] `npx vitest run src/lib/games/` passes (incl. anti-cheat validator)
- [ ] Logged-out: play to completion → login prompt, no error; archive redirects to login
- [ ] After DB apply: sign up → streak persists; archive unlocks

🤖 Generated with [Claude Code](https://claude.com/claude-code)
BODY
)"
```

- [ ] **Step 4: Report the PR URL + the two manual steps to the user.**

---

## Self-Review

**Spec coverage (Phase 3 of the design):** dedicated login isolated from admin ✓ (T3/T4), `supabaseAuthServer` session ✓ (T2), signUp/signIn/signOut ✓ (T3), `?next=` support ✓ (T3/T4), submitResult re-derives + validates ✓ (T6), boards submit when authed + graceful when not ✓ (T8), useGameAuth ✓ (T7), header username/signout ✓ (T10), archive unlock ✓ (T9), migration rename + manual apply ✓ (T1). Proxy session refresh ✓ (T5).

**Placeholder scan:** no TBD/TODO; every code step has full content. Names to verify against real files are called out explicitly in Tasks 6, 8, 9 (game-module exports, board state vars, archive param parsing) rather than assumed silently.

**Type consistency:** `GamesAuthState` (T3) consumed by form (T4). `SubmitInput`/`SubmitOutcome`/`validateResult`/`submitResult` (T6) consumed by boards (T8). `getGameUser`/`requireGameUser` (T2) consumed by login page (T4), archive (T9). `useGameAuth` (T7) consumed by boards (T8) + header (T10). All aligned.

**Risk:** Tasks 4/8/10 use `useGameAuth`/session before the DB exists — pages render (logged-out) but full auth round-trip needs the migration applied + Confirm-email OFF. Verification steps split logged-out (doable now) from logged-in (post-apply), and the PR lists the two manual steps.
