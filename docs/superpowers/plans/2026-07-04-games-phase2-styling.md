# Games Phase 2 — Styling + Nav Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `/games` visually ship-ready — a standalone mini-app shell using the site's monochrome design system, with both boards restyled (chrome monochrome, game tiles keep traditional colors, dark-mode aware), a live puzzle countdown, and a Games entry in site navigation.

**Architecture:** `/games/**` renders under its own layout with a minimal mini-app header (Games wordmark, theme toggle, Back-to-site) instead of the site header/footer. Board components swap hardcoded Tailwind palette classes (`bg-black`, `bg-neutral-400`, `border-neutral-300`) for design tokens (`bg-primary`, `bg-muted`, `border-border`), keeping only the semantic game colors (Alfazy green/yellow tiles, Hit-and-Blow 🎯/💨). A small client `PuzzleCountdown` component drives the "next puzzle" timers.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind CSS v4 (token utilities from `globals.css`), `next-themes`, lucide-react, existing `@/components/ui/*` primitives, Vitest for the one unit-testable helper.

## Global Constraints

- Path alias: `@/*` → `./src/*`.
- Design tokens only for chrome: `bg-background`, `bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`, `bg-primary`/`text-primary-foreground`, `bg-secondary`, `rounded-btn` (4px), `rounded-input` (8px), `rounded-card` (12px). Never hardcode monochrome hex.
- Brand orange (`--brand`, class `brand`) surfaces ONLY on interaction (focus/hover). Never decorative.
- Fonts: headings use `font-display` (Jakarta), body inherits `font-sans` (Poppins). Do not set font-family inline.
- Motion: use `transition-ui` class or `--ease-out-quint`; respect `prefers-reduced-motion` (handled globally in `globals.css`).
- Game-native colors are the ONLY non-monochrome UI colors permitted: Alfazy `correct`=green, `present`=yellow, `absent`=gray; Hit-and-Blow keeps 🎯/💨 glyphs.
- Dark mode via `.dark` class (`next-themes`) — every color must have a dark-mode-correct value (prefer tokens; for game tiles use explicit `dark:` variants).
- No auth work in this phase. Do not touch `submitResult`, RPCs, or session logic.
- Every commit message ends with the `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>` trailer.
- Verify visual changes via the preview tools (DOM snapshot / inspect), never `preview_screenshot`.

---

### Task 1: Games mini-app layout shell

**Files:**
- Create: `src/components/games/GamesHeader.tsx`
- Modify: `src/app/games/layout.tsx` (full rewrite)

**Interfaces:**
- Produces: `GamesHeader` (default export, no props) — client component rendering the games mini-app top bar.
- Consumes: `ThemeToggle` from `@/components/layout/theme-toggle`, `Button`/`buttonVariants` from `@/components/ui/button`, `cn` from `@/lib/utils`.

- [ ] **Step 1: Create the GamesHeader client component**

`src/components/games/GamesHeader.tsx`:

```tsx
"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";

/**
 * Standalone games mini-app header. Replaces the site header/footer inside
 * /games/** for a clean, focused game surface.
 */
export default function GamesHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-md items-center justify-between px-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/" aria-label="Back to site">
            <ArrowLeft />
            <span className="hidden sm:inline">Back to site</span>
          </Link>
        </Button>
        <Link
          href="/games"
          className="font-display text-lg font-bold tracking-tight transition-ui hover:text-muted-foreground"
        >
          Games
        </Link>
        <ThemeToggle />
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Rewrite the games layout to use it**

`src/app/games/layout.tsx` (full replacement):

```tsx
import type { Metadata } from "next";
import GamesHeader from "@/components/games/GamesHeader";

export const metadata: Metadata = {
  title: "Games · Shubham Datarkar",
  description: "Daily word and code puzzles — Alfazy and Hit and Blow. A new puzzle every day.",
};

export default function GamesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <GamesHeader />
      <main className="mx-auto max-w-md px-4 py-8">{children}</main>
    </div>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit 2>&1 | grep -E "games|GamesHeader" || echo "no games type errors"`
Expected: `no games type errors`

- [ ] **Step 4: Verify in preview**

Start the dev server (preview_start "dev"; autoPort enabled). Navigate to `/games`. Use `preview_snapshot` to confirm the header shows "Back to site", "Games", and a theme toggle button, and that the old "🎮 Games / Leaderboard / Profile" header is gone.

- [ ] **Step 5: Commit**

```bash
git add src/components/games/GamesHeader.tsx src/app/games/layout.tsx
git commit -m "feat(games): standalone mini-app layout shell

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Puzzle countdown component

**Files:**
- Create: `src/components/games/PuzzleCountdown.tsx`
- Create: `src/lib/games/format-countdown.ts`
- Test: `src/lib/games/format-countdown.test.ts`

**Interfaces:**
- Produces: `formatCountdown(ms: number): string` — formats milliseconds as `HH:MM:SS` (zero-padded, clamps negatives to `00:00:00`).
- Produces: `PuzzleCountdown` (default export, no props) — client component showing "Next puzzle in HH:MM:SS", updating every second, using `msUntilNextPuzzle` from `@/lib/daily`.
- Consumes: `msUntilNextPuzzle` from `@/lib/daily`.

- [ ] **Step 1: Write the failing test**

`src/lib/games/format-countdown.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { formatCountdown } from "./format-countdown";

describe("formatCountdown", () => {
  it("formats hours, minutes, seconds zero-padded", () => {
    expect(formatCountdown(3661_000)).toBe("01:01:01");
  });
  it("formats a full day boundary under 24h", () => {
    expect(formatCountdown((23 * 3600 + 59 * 60 + 59) * 1000)).toBe("23:59:59");
  });
  it("clamps negative values to zero", () => {
    expect(formatCountdown(-5000)).toBe("00:00:00");
  });
  it("floors partial seconds", () => {
    expect(formatCountdown(1999)).toBe("00:00:01");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/games/format-countdown.test.ts`
Expected: FAIL — cannot find module `./format-countdown`.

- [ ] **Step 3: Implement the formatter**

`src/lib/games/format-countdown.ts`:

```ts
/** Format a millisecond duration as zero-padded HH:MM:SS. Negatives clamp to 00:00:00. */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/games/format-countdown.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Implement the countdown component**

`src/components/games/PuzzleCountdown.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { msUntilNextPuzzle } from "@/lib/daily";
import { formatCountdown } from "@/lib/games/format-countdown";

/** Live "next puzzle in HH:MM:SS" timer. Client-only; ticks each second. */
export default function PuzzleCountdown({ className }: { className?: string }) {
  const [ms, setMs] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setMs(msUntilNextPuzzle());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // Render a stable placeholder until mounted to avoid hydration mismatch.
  return (
    <span className={className}>
      Next puzzle in {ms === null ? "--:--:--" : formatCountdown(ms)}
    </span>
  );
}
```

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit 2>&1 | grep -E "PuzzleCountdown|format-countdown" || echo "clean"`
Expected: `clean`

- [ ] **Step 7: Commit**

```bash
git add src/lib/games/format-countdown.ts src/lib/games/format-countdown.test.ts src/components/games/PuzzleCountdown.tsx
git commit -m "feat(games): puzzle countdown component + formatter

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Games hub restyle + countdown

**Files:**
- Modify: `src/app/games/page.tsx` (full rewrite)

**Interfaces:**
- Consumes: `puzzleNumberFor` from `@/lib/daily`, `PuzzleCountdown` from `@/components/games/PuzzleCountdown`.

- [ ] **Step 1: Rewrite the hub with token styling + countdown**

`src/app/games/page.tsx`:

```tsx
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { puzzleNumberFor } from "@/lib/daily";
import PuzzleCountdown from "@/components/games/PuzzleCountdown";

const GAMES = [
  { slug: "alfazy", name: "Alfazy", tag: "Guess the 5-letter word" },
  { slug: "hit-and-blow", name: "Hit and Blow", tag: "Crack the 4-digit code" },
];

export default function GamesHub() {
  const today = puzzleNumberFor();
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="font-display text-2xl font-bold">Daily Games</h1>
        <p className="text-sm text-muted-foreground">
          Puzzle <span className="font-semibold text-foreground">#{today}</span> ·{" "}
          <PuzzleCountdown />
        </p>
      </div>

      <div className="space-y-3">
        {GAMES.map((g) => (
          <Link
            key={g.slug}
            href={`/games/${g.slug}`}
            className="group flex items-center justify-between rounded-card border border-border bg-card p-5 transition-ui hover:border-brand hover:shadow-sm"
          >
            <div>
              <div className="font-display text-lg font-semibold">{g.name}</div>
              <div className="text-sm text-muted-foreground">{g.tag}</div>
            </div>
            <ArrowRight className="size-4 text-muted-foreground transition-ui group-hover:translate-x-0.5 group-hover:text-foreground" />
          </Link>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        Play free. Log in later to keep your streak and unlock the archive.
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit 2>&1 | grep "games/page" || echo "clean"`
Expected: `clean`

- [ ] **Step 3: Verify in preview**

Reload `/games`. `preview_snapshot`: confirm both game cards ("Alfazy", "Hit and Blow"), the "Puzzle #N" line, and a live "Next puzzle in HH:MM:SS". `preview_inspect` a card and confirm `border-radius` is 12px. Toggle dark mode (`preview_resize` colorScheme dark) and re-snapshot to confirm legible contrast.

- [ ] **Step 4: Commit**

```bash
git add src/app/games/page.tsx
git commit -m "feat(games): restyle hub with tokens + live countdown

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: Alfazy board restyle

**Files:**
- Modify: `src/components/games/AlfazyBoard.tsx`

**Interfaces:**
- No signature changes. Props stay `{ puzzleNumber: number; isArchive: boolean }`. Logic, localStorage, and share behavior are unchanged — only class names change.

- [ ] **Step 1: Restyle tile colors to be dark-mode aware and chrome to tokens**

In `src/components/games/AlfazyBoard.tsx`, replace the `tileColor` helper and the `KeyBtn` `bg` mapping so game tiles keep green/yellow/gray but gain `dark:` variants, and all non-tile chrome (toast, share button, empty tile borders) uses tokens.

Replace the `tileColor` function with:

```tsx
  const tileColor = (t?: Tile) =>
    t === "correct" ? "bg-green-600 text-white border-green-600 dark:bg-green-500 dark:border-green-500"
      : t === "present" ? "bg-yellow-500 text-white border-yellow-500 dark:bg-yellow-400 dark:border-yellow-400 dark:text-black"
      : t === "absent" ? "bg-muted-foreground/60 text-white border-muted-foreground/60"
      : "border-border";
```

Replace the toast markup:

```tsx
      {toast && <div className="rounded-btn bg-primary px-3 py-1 text-sm text-primary-foreground">{toast}</div>}
```

Replace the share button (both occurrences use the same class) with:

```tsx
          <button onClick={share} className="rounded-btn bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-ui hover:opacity-90">
            Share
          </button>
```

Replace the empty-tile fallback class `"border-neutral-300"` (inside the grid map) with `"border-border"`.

Update the `<h1>` to use the display font: change `className="text-xl font-bold"` to `className="font-display text-xl font-bold"`.

- [ ] **Step 2: Restyle the on-screen keyboard keys**

Replace the `KeyBtn` component's `bg` mapping with:

```tsx
  const bg =
    state === "correct" ? "bg-green-600 text-white dark:bg-green-500"
      : state === "present" ? "bg-yellow-500 text-white dark:bg-yellow-400 dark:text-black"
      : state === "absent" ? "bg-muted-foreground/60 text-white"
      : "bg-secondary text-secondary-foreground";
```

And change the button className `rounded` → `rounded-btn` and add `transition-ui`:

```tsx
    <button onClick={onClick} className={`h-12 rounded-btn font-semibold uppercase transition-ui ${bg} ${wide ? "px-3" : "w-8"}`}>
```

- [ ] **Step 3: Restyle empty/filled grid tile base**

In the grid cell className, change `rounded border-2` → `rounded-btn border-2` and confirm the non-revealed branch uses `border-border` (from Step 1). The full cell className becomes:

```tsx
                  className={`flex h-12 w-12 items-center justify-center rounded-btn border-2 text-xl font-bold uppercase ${r < guesses.length ? tileColor(rows[r][c]) : "border-border"}`}
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit 2>&1 | grep "AlfazyBoard" || echo "clean"`
Expected: `clean`

- [ ] **Step 5: Verify in preview**

Navigate to `/games/alfazy`. Type a guess (`preview_fill` isn't applicable — use `preview_eval` to dispatch keyboard events, or click on-screen keys via `preview_click` on the key buttons, then Enter key). Confirm: revealed tiles show green/yellow/gray; empty tiles use the border token; the Share button and toast use monochrome. Toggle dark mode and confirm tiles + chrome stay legible.

- [ ] **Step 6: Commit**

```bash
git add src/components/games/AlfazyBoard.tsx
git commit -m "feat(games): restyle Alfazy board — token chrome, dark-aware tiles

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: Hit and Blow board restyle

**Files:**
- Modify: `src/components/games/HitAndBlowBoard.tsx`

**Interfaces:**
- No signature changes. Props stay `{ puzzleNumber: number; isArchive: boolean }`. Only class names change; 🎯/💨 glyphs stay.

- [ ] **Step 1: Restyle header, history rows, and hint text to tokens**

In `src/components/games/HitAndBlowBoard.tsx`:

Change the `<h1>` from `className="text-xl font-bold"` to `className="font-display text-xl font-bold"`.

The hint `<p>` already uses `text-neutral-500`; change to `text-muted-foreground`.

Change each history row wrapper from `rounded-lg border border-neutral-200` to `rounded-input border border-border bg-card`, and the guess digit `<span>`'s trailing counter `text-neutral-400` to `text-muted-foreground`.

- [ ] **Step 2: Restyle the toast + result + Code reveal**

Replace the toast markup with:

```tsx
      {toast && <div className="rounded-btn bg-primary px-3 py-1 text-sm text-primary-foreground">{toast}</div>}
```

The result `<p className="font-semibold">` stays, but wrap the "Code was" reveal number in a monospace token span — change the lost branch to:

```tsx
            {status === "won" ? `Cracked in ${history.length}!` : `Code was ${secret}`}
```

(unchanged text; ensure the enclosing `<p>` reads `className="font-semibold"`.)

- [ ] **Step 3: Restyle the input + Go button to site tokens**

Replace the input className with:

```tsx
            className="w-40 rounded-input border-2 border-input bg-background px-4 py-2 text-center font-mono text-2xl tracking-widest outline-none transition-ui focus:border-brand"
```

Replace the Go button and the Share button classNames:

```tsx
          <button onClick={submit} className="rounded-btn bg-primary px-5 font-semibold text-primary-foreground transition-ui hover:opacity-90">
            Go
          </button>
```

```tsx
          <button onClick={share} className="rounded-btn bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-ui hover:opacity-90">
            Share
          </button>
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit 2>&1 | grep "HitAndBlowBoard" || echo "clean"`
Expected: `clean`

- [ ] **Step 5: Verify in preview**

Navigate to `/games/hit-and-blow`. `preview_fill` the input with `1234`, `preview_click` Go. Confirm a history row renders with 🎯/💨 + `H`/`B` counts, monochrome card styling, and the input focus ring is brand-orange (`preview_inspect` the input for `border-color` after focusing via `preview_eval`). Toggle dark mode; confirm legibility.

- [ ] **Step 6: Commit**

```bash
git add src/components/games/HitAndBlowBoard.tsx
git commit -m "feat(games): restyle Hit and Blow board to site tokens

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 6: Restyle placeholder pages

**Files:**
- Modify: `src/app/games/login/page.tsx`
- Modify: `src/app/games/profile/page.tsx`
- Modify: `src/app/games/leaderboard/page.tsx`

**Interfaces:** none (leaf pages).

- [ ] **Step 1: Give each placeholder a consistent token-styled "coming soon" card**

`src/app/games/login/page.tsx`:

```tsx
export default function LoginPage() {
  return (
    <div className="rounded-card border border-border bg-card p-8 text-center">
      <h1 className="font-display text-xl font-bold">Sign in</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Accounts arrive in Phase 3 — log in to save streaks and unlock the archive.
      </p>
    </div>
  );
}
```

`src/app/games/profile/page.tsx`:

```tsx
export default function ProfilePage() {
  return (
    <div className="rounded-card border border-border bg-card p-8 text-center">
      <h1 className="font-display text-xl font-bold">Profile</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Streaks, stats, and history arrive in Phase 3.
      </p>
    </div>
  );
}
```

`src/app/games/leaderboard/page.tsx`:

```tsx
export default function LeaderboardPage() {
  return (
    <div className="rounded-card border border-border bg-card p-8 text-center">
      <h1 className="font-display text-xl font-bold">Leaderboard</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Daily, weekly, monthly, and streak boards arrive in Phase 4.
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit 2>&1 | grep -E "login/page|profile/page|leaderboard/page" || echo "clean"`
Expected: `clean`

- [ ] **Step 3: Verify in preview**

Navigate to `/games/login`, `/games/profile`, `/games/leaderboard`. `preview_snapshot` each; confirm the token-styled card renders with the right heading + copy.

- [ ] **Step 4: Commit**

```bash
git add src/app/games/login/page.tsx src/app/games/profile/page.tsx src/app/games/leaderboard/page.tsx
git commit -m "feat(games): token-styled placeholder pages

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 7: Site navigation integration

**Files:**
- Modify: `src/lib/site.ts` (add Games to `primaryNav` and `footerNav`)

**Interfaces:**
- `primaryNav` is rendered by `src/components/header/burger-menu.tsx`; adding an item surfaces Games in the burger menu. `footerNav` is rendered by the footer.

- [ ] **Step 1: Add Games to primaryNav (burger menu)**

In `src/lib/site.ts`, append to `primaryNav`:

```ts
export const primaryNav: NavItem[] = [
  { label: "About", href: "/about" },
  { label: "Work", href: "/work" },
  { label: "Services", href: "/services" },
  { label: "Blog", href: "/blog" },
  { label: "Games", href: "/games" },
];
```

- [ ] **Step 2: Add Games to the footer "Content" group**

In the `footerNav` "Content" group's `items`, append:

```ts
      { label: "Games", href: "/games" },
```

(So the Content group becomes Blog, Newsletter, Resources, Tools, Products, Games.)

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit 2>&1 | grep "site.ts" || echo "clean"`
Expected: `clean`

- [ ] **Step 4: Verify in preview**

Navigate to `/` (site home). Open the burger menu (`preview_click` the menu button), `preview_snapshot`, confirm a "Games" link → `/games`. Scroll to footer, confirm "Games" appears under Content.

- [ ] **Step 5: Commit**

```bash
git add src/lib/site.ts
git commit -m "feat(games): add Games to burger + footer navigation

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 8: Full verification pass + open PR

**Files:** none (verification + PR).

- [ ] **Step 1: Run the full test + typecheck + lint gate**

Run: `npx vitest run src/lib/games/ && npx tsc --noEmit 2>&1 | grep -E "src/(app/games|components/games|lib/games|lib/daily|lib/site)" || echo "games typecheck clean"`
Expected: vitest PASS; `games typecheck clean`.

- [ ] **Step 2: End-to-end preview walk**

With the dev server running, walk: `/games` (cards + countdown) → `/games/alfazy` (play a full guess) → `/games/hit-and-blow` (play a guess) → `/games/leaderboard` / `/games/profile` / `/games/login` (placeholders) → site `/` burger + footer show Games. Test both light and dark via `preview_resize` colorScheme. Capture one `preview_screenshot` of the styled hub in dark mode for the PR (allowed here as deliverable proof, not for color verification).

- [ ] **Step 3: Push and open the PR**

```bash
git push -u origin feat/games-phase2-styling
gh pr create --title "feat(games): Phase 2 — styling + nav integration" --body "$(cat <<'BODY'
## Summary
Phase 2 of the games plan (spec: docs/superpowers/specs/2026-07-04-games-development-design.md).

- Standalone `/games` mini-app layout (Games wordmark, theme toggle, Back-to-site) replacing the site header/footer inside `/games/**`.
- Hub restyled to the monochrome design system with a live "next puzzle" countdown.
- Alfazy + Hit and Blow boards restyled: monochrome chrome via design tokens, traditional game colors kept and made dark-mode-aware.
- Token-styled placeholder pages for login/profile/leaderboard.
- Games added to burger + footer navigation.

No auth or persistence work in this phase.

## Test plan
- [ ] `/games` hub shows both cards + live countdown, light and dark
- [ ] Alfazy playable; tiles green/yellow/gray, chrome monochrome, dark-mode legible
- [ ] Hit and Blow playable; 🎯/💨 rows, brand focus ring on input
- [ ] Placeholders render token cards
- [ ] Games appears in burger menu + footer
- [ ] `npx vitest run src/lib/games/` passes

🤖 Generated with [Claude Code](https://claude.com/claude-code)
BODY
)"
```

- [ ] **Step 4: Report the PR URL to the user.**

---

## Self-Review

**Spec coverage (Phase 2 section of the design doc):**
- Standalone mini-app header (wordmark, dark-mode toggle, Back-to-site) → Task 1 ✓
- Hub cards monochrome + hover orange border + countdown → Task 3 ✓
- Alfazy tiles keep green/yellow, dark-mode aware; keyboard/toast monochrome → Task 4 ✓
- Hit and Blow input/rows/button tokens, keep 🎯/💨 → Task 5 ✓
- Games in footer + burger nav → Task 7 ✓
- Dark mode throughout → verified per-task + Task 8 ✓
- Placeholder pages (implied by "visually ship-ready") → Task 6 ✓

**Placeholder scan:** No TBD/TODO/"handle edge cases"; every code step shows full content. ✓

**Type consistency:** `formatCountdown(ms: number): string` defined in Task 2, consumed by `PuzzleCountdown` (Task 2) — matches. `PuzzleCountdown` default export consumed by Task 3 — matches. `GamesHeader` default export consumed by Task 1 layout — matches. Board prop signatures unchanged (Tasks 4–5). ✓

**Note for implementer:** `msUntilNextPuzzle` and `puzzleNumberFor` already exist in `src/lib/daily.ts` (Phase 1). Do not redefine them.
