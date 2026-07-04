# Games Phase 5 — Polish + Extensibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Make `/games` feel finished and make adding a future game cheap: a single game registry both the hub and leaderboard iterate over; Alfazy tile-flip + invalid-guess shake animations (reduced-motion safe); OG/SEO metadata for the games pages; and per-route error + loading boundaries.

**Architecture:** A `registry.ts` becomes the single source of the two games (key, slug, name, tagline); the hub and leaderboard stop hard-coding their own arrays and map over it, so a third game is one array entry plus its logic/board/route. Animations are CSS keyframes in `globals.css` toggled by class hooks in the Alfazy board. Metadata uses App Router `metadata`/`generateMetadata`. Boundaries use `error.tsx`/`loading.tsx` conventions.

**Tech Stack:** Next.js 16 App Router (`metadata`, `error.tsx`, `loading.tsx`), Tailwind v4 tokens, CSS keyframes, Vitest.

## Global Constraints

- Path alias `@/*` → `./src/*`.
- `game_key` values exactly `alfazy` / `hit_and_blow`. Slugs: `alfazy` / `hit-and-blow`.
- Animations MUST be reduced-motion safe — `globals.css` already neutralizes all animations under `@media (prefers-reduced-motion: reduce)`; do not add motion that bypasses it.
- Metadata must not leak answers (no answer/secret in titles/descriptions).
- Design tokens only; brand on interaction; dark-mode via `.dark`.
- Refactors must not change behavior: after the registry refactor, the hub and leaderboard render the same games in the same order.
- Every commit trailer: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- Verify via preview DOM tools, never `preview_screenshot`.

## Reference (current state)

- Hub `src/app/games/page.tsx` has an inline `GAMES = [{slug,name,tag}...]`.
- Leaderboard `src/app/games/leaderboard/page.tsx` has an inline `GAMES = [{key,name}...]` + `GameKey` from `@/lib/games/leaderboard-queries`.
- Alfazy board `src/components/games/AlfazyBoard.tsx`: `flash(msg)` runs on an invalid guess (two call sites in `submit()`); the grid renders rows `r` in `0..maxGuesses`, where `r < guesses.length` are revealed (colored via `tileColor`) and `r === guesses.length` is the current input row.

---

### Task 1: Game registry + types

**Files:**
- Create: `src/lib/games/registry.ts`
- Modify: `src/app/games/page.tsx` (use registry)
- Modify: `src/app/games/leaderboard/page.tsx` (use registry)

**Interfaces:**
- `type GameKey = "alfazy" | "hit_and_blow";`
- `type GameConfig = { key: GameKey; slug: string; name: string; tag: string };`
- `const GAMES: GameConfig[]` (Alfazy first, Hit and Blow second — preserve order).
- `gameBySlug(slug: string): GameConfig | undefined`.

- [ ] **Step 1: Create the registry**

`src/lib/games/registry.ts`:

```ts
export type GameKey = "alfazy" | "hit_and_blow";

export type GameConfig = {
  key: GameKey;
  slug: string;
  name: string;
  tag: string;
};

/** Single source of truth for the games on /games. Add a game = one entry here. */
export const GAMES: GameConfig[] = [
  { key: "alfazy", slug: "alfazy", name: "Alfazy", tag: "Guess the 5-letter word" },
  { key: "hit_and_blow", slug: "hit-and-blow", name: "Hit and Blow", tag: "Crack the 4-digit code" },
];

export function gameBySlug(slug: string): GameConfig | undefined {
  return GAMES.find((g) => g.slug === slug);
}
```

- [ ] **Step 2: Point the hub at the registry**

In `src/app/games/page.tsx`, remove the inline `const GAMES = [...]` and import from the registry:

```tsx
import { GAMES } from "@/lib/games/registry";
```

The existing `.map((g) => ...)` uses `g.slug`, `g.name`, `g.tag` — all present on `GameConfig`, so the JSX is unchanged.

- [ ] **Step 3: Point the leaderboard at the registry**

In `src/app/games/leaderboard/page.tsx`, remove its inline `const GAMES = [...]` and its local `GameKey` usage source; import:

```tsx
import { GAMES, type GameKey } from "@/lib/games/registry";
```

Remove the now-duplicate `GameKey` import from `@/lib/games/leaderboard-queries` **only if** it is no longer otherwise used in the file; the leaderboard-queries functions still take `GameKey` — since `registry`'s `GameKey` and `leaderboard-queries`' `GameKey` are structurally identical string-literal unions, passing one where the other is expected typechecks. If TypeScript complains, keep importing `GameKey` from `@/lib/games/leaderboard-queries` and import only `GAMES` from the registry. The `GAMES.map((g) => ...)` uses `g.key` and `g.name` — both present.

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit 2>&1 | grep -E "registry|games/page|leaderboard/page" || echo clean`
Expected: `clean`

- [ ] **Step 5: Verify no behavior change**

Run: `grep -c "hit_and_blow\|alfazy" src/lib/games/registry.ts` (expect both) and confirm hub/leaderboard still list Alfazy then Hit and Blow.

- [ ] **Step 6: Commit**

```bash
git add src/lib/games/registry.ts src/app/games/page.tsx src/app/games/leaderboard/page.tsx
git commit -m "feat(games): game registry as single source; hub + leaderboard consume it

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Alfazy animations (flip + shake)

**Files:**
- Modify: `src/app/globals.css` (add keyframes + utilities)
- Modify: `src/components/games/AlfazyBoard.tsx` (class hooks)

**Interfaces:** none (visual only). No prop/logic changes beyond a `shakeCount` UI state.

- [ ] **Step 1: Add keyframes + utilities to globals.css**

In `src/app/globals.css`, inside the existing `@layer utilities { ... }` block (near `.transition-ui`), add:

```css
  /* Games — Alfazy tile reveal + invalid-guess shake (reduced-motion safe via the global rule). */
  @keyframes alfazy-flip {
    0% { transform: rotateX(0); }
    50% { transform: rotateX(90deg); }
    100% { transform: rotateX(0); }
  }
  .animate-tile-flip { animation: alfazy-flip 0.5s var(--ease-out-quint) both; }

  @keyframes alfazy-shake {
    10%, 90% { transform: translateX(-1px); }
    20%, 80% { transform: translateX(2px); }
    30%, 50%, 70% { transform: translateX(-4px); }
    40%, 60% { transform: translateX(4px); }
  }
  .animate-shake { animation: alfazy-shake 0.4s both; }
```

(The existing `@media (prefers-reduced-motion: reduce)` block already forces `animation-duration: 0.001ms` on everything, so these are automatically disabled for reduced-motion users — do not add a separate guard.)

- [ ] **Step 2: Wire shake on invalid guess**

In `src/components/games/AlfazyBoard.tsx`:
- Add state: `const [shakeCount, setShakeCount] = useState(0);`
- In `submit()`, the two invalid-guess paths currently `return flash(...)`. Change them to also bump the shake counter, e.g.:
  ```tsx
    if (current.length !== ALFAZY.length) { setShakeCount((n) => n + 1); return flash("Not enough letters"); }
    if (!isValidGuess(current)) { setShakeCount((n) => n + 1); return flash("Letters only"); }
  ```
- On the current input row (the `<div key={r} className="grid grid-cols-5 gap-1.5">` where `r === guesses.length`), apply the shake class and a changing `key` so the animation replays each time:
  ```tsx
    const isInput = r === guesses.length;
    return (
      <div
        key={isInput ? `input-${shakeCount}` : `row-${r}`}
        className={`grid grid-cols-5 gap-1.5${isInput && shakeCount ? " animate-shake" : ""}`}
      >
  ```
  (Changing the `key` on the input row remounts it so the shake animation re-fires on every invalid attempt. Revealed rows keep a stable `key={\`row-${r}\`}`.)

- [ ] **Step 3: Wire tile flip on the newest revealed row**

In the tile `<div>` (the cell), add the flip class + a staggered delay for the most recently revealed row only (`r === guesses.length - 1`), so it flips once when it appears and older rows stay static:

```tsx
  const isNewest = r === guesses.length - 1;
  // ...on the cell div:
  className={`flex h-12 w-12 items-center justify-center rounded-btn border-2 text-xl font-bold uppercase ${r < guesses.length ? tileColor(rows[r][c]) : "border-border"}${r < guesses.length && isNewest ? " animate-tile-flip" : ""}`}
  style={r < guesses.length && isNewest ? { animationDelay: `${c * 0.08}s` } : undefined}
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit 2>&1 | grep AlfazyBoard || echo clean`
Expected: `clean`

- [ ] **Step 5: Verify in preview (best-effort)**

If a dev server runs against the worktree: on `/games/alfazy`, submit a too-short guess → the input row shakes; submit a full valid guess → the revealed row's tiles flip in sequence. Toggle reduced-motion (`preview_resize`/emulation) → no motion. If the dev server can't run against the worktree, note it and rely on typecheck + code review of the class hooks.

- [ ] **Step 6: Commit**

```bash
git add src/app/globals.css src/components/games/AlfazyBoard.tsx
git commit -m "feat(games): Alfazy tile-flip reveal + invalid-guess shake

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: SEO / OG metadata

**Files:**
- Modify: `src/app/games/alfazy/page.tsx` (add `metadata`)
- Modify: `src/app/games/hit-and-blow/page.tsx` (add `metadata`)

**Note:** the `/games` layout already sets a games title/description (Phase 2). This task adds per-game metadata to the two live game pages. Read each page first to confirm it is a server component with no existing `metadata` export; if one exists, merge rather than duplicate.

- [ ] **Step 1: Alfazy metadata**

In `src/app/games/alfazy/page.tsx`, add (do not leak the answer):

```tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Alfazy — Daily Word Game",
  description: "Guess the 5-letter word in six tries. A new Alfazy puzzle every day.",
};
```

- [ ] **Step 2: Hit and Blow metadata**

In `src/app/games/hit-and-blow/page.tsx`, add:

```tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hit and Blow — Daily Code Game",
  description: "Crack the 4-digit code in nine tries. A new Hit and Blow puzzle every day.",
};
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit 2>&1 | grep -E "alfazy/page|hit-and-blow/page" || echo clean`
Expected: `clean`

- [ ] **Step 4: Verify no answer leak**

Run: `grep -iE "answer|secret" src/app/games/alfazy/page.tsx src/app/games/hit-and-blow/page.tsx || echo "no answer leak"`
Expected: `no answer leak`.

- [ ] **Step 5: Commit**

```bash
git add src/app/games/alfazy/page.tsx src/app/games/hit-and-blow/page.tsx
git commit -m "feat(games): per-game SEO metadata for Alfazy + Hit and Blow

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: Error + loading boundaries

**Files:**
- Create: `src/app/games/error.tsx`
- Create: `src/app/games/leaderboard/loading.tsx`
- Create: `src/app/games/profile/loading.tsx`

- [ ] **Step 1: Games error boundary**

`src/app/games/error.tsx` (must be a client component per App Router):

```tsx
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function GamesError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="rounded-card border border-border bg-card p-8 text-center">
      <h1 className="font-display text-xl font-bold">Something went wrong</h1>
      <p className="mt-2 text-sm text-muted-foreground">That game hit a snag. Try again.</p>
      <div className="mt-4 flex justify-center gap-2">
        <Button size="sm" onClick={reset}>Try again</Button>
        <Button size="sm" variant="outline" asChild>
          <Link href="/games">Back to games</Link>
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Leaderboard loading skeleton**

`src/app/games/leaderboard/loading.tsx`:

```tsx
export default function LeaderboardLoading() {
  return (
    <div className="space-y-5">
      <div className="h-8 w-40 animate-pulse rounded-btn bg-muted" />
      <div className="h-9 w-64 animate-pulse rounded-input bg-muted" />
      <div className="space-y-2 rounded-card border border-border p-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-6 w-full animate-pulse rounded-btn bg-muted" />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Profile loading skeleton**

`src/app/games/profile/loading.tsx`:

```tsx
export default function ProfileLoading() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-40 animate-pulse rounded-btn bg-muted" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="h-40 animate-pulse rounded-card bg-muted" />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit 2>&1 | grep -E "games/error|leaderboard/loading|profile/loading" || echo clean`
Expected: `clean`

- [ ] **Step 5: Commit**

```bash
git add src/app/games/error.tsx src/app/games/leaderboard/loading.tsx src/app/games/profile/loading.tsx
git commit -m "feat(games): error boundary + loading skeletons

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: Verification + PR

**Files:** none.

- [ ] **Step 1: Full gate**

Run: `npx vitest run src/lib/games/ && npx tsc --noEmit 2>&1 | grep -E "src/(app/games|components/games|lib/games)" || echo "games typecheck clean"`
Expected: vitest PASS; `games typecheck clean`.

- [ ] **Step 2: Preview (best-effort)**

If a dev server runs against the worktree: `/games` (registry-driven cards), `/games/alfazy` (shake + flip), `/games/leaderboard` (loading skeleton flashes, tabs). Light + dark. Otherwise note static-only verification and why.

- [ ] **Step 3: Push + open PR**

```bash
git push -u origin feat/games-phase5-polish
gh pr create --base main --title "feat(games): Phase 5 — polish + extensibility" --body "$(cat <<'BODY'
## Summary
Phase 5 (spec: docs/superpowers/specs/2026-07-04-games-development-design.md) — final games phase.

- **Game registry** (`src/lib/games/registry.ts`) is now the single source of the games; the hub and leaderboard iterate over it, so adding a game is one entry + its logic/board/route.
- **Alfazy animations**: tile-flip on reveal (staggered) + invalid-guess shake, both reduced-motion safe via the existing global rule.
- **SEO metadata** for `/games/alfazy` and `/games/hit-and-blow` (no answer leak).
- **Error boundary** for `/games/**` + **loading skeletons** for leaderboard and profile.

## Verification
- `npx vitest run src/lib/games/` passing; `npx tsc --noEmit` games scope clean.
- Refactor is behavior-preserving (same games, same order).
- Live browser preview not run against the worktree (Turbopack rejects the shared-node_modules junction); verified statically.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
BODY
)"
```

- [ ] **Step 4: Report PR URL to user.**

---

## Self-Review

**Spec coverage (Phase 5):** game framework/registry ✓ (T1); animations flip+shake reduced-motion safe ✓ (T2); OG/meta ✓ (T3); error boundaries + loading skeletons ✓ (T4). Countdown timer already shipped Phase 2 (hub). Keyboard-hint + win-pulse descoped (YAGNI; noted). **Placeholder scan:** all code present. **Type consistency:** `GameKey`/`GameConfig`/`GAMES`/`gameBySlug` defined T1 and consumed by hub + leaderboard; the leaderboard `GameKey` source ambiguity is called out with a fallback. **Risk:** the registry `GameKey` and `leaderboard-queries` `GameKey` are two identical literal unions — Task 1 Step 3 documents the fallback if structural typing ever complains. Animations are visual-only, verified by code review + typecheck when live preview is unavailable.
