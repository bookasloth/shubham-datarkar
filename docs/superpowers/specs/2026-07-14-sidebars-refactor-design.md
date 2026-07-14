# Sidebars refactor — community, games, membership

**Date:** 2026-07-14
**Scope:** left rail + right rails for `/community`, `/games/*`, `/members/*`
**PRs:** 3, in order below. Each ships independently.

## Problem

- Left rail sits at the viewport edge; middle column centers itself separately → wide dead gap between them.
- Middle-column width differs per section (community ~600px, members up to `max-w-6xl`, games `max-w-md`).
- Right rail exists only on `/community` (two ads). `/games` and `/members` render a bare middle column with an empty right void on desktop.

## Approach

One `AppShell` owns all three columns. New optional `rail` prop = the right-rail node. Each section builds its rail server-side and hands it in. Rails are content, not geometry.

Rejected: per-section grids (drift returns), Next parallel routes (extra files for no gain).

## Section 1 — Shell geometry (PR 1)

Single centered container wraps left + middle + right:

```
mx-auto flex max-w-[1240px] justify-center gap-6 px-4
  ├─ aside w-64  (floating rounded-card, sticky top-14, p-4)   lg:block
  ├─ main  w-full max-w-[600px]                                 always
  └─ aside w-80  (sticky top-[4.5rem])                          xl:block  ← only if rail prop set
```

- Left rail at `lg` breakpoint (≥1024px). Right rail at `xl` (≥1280px). Middle column always visible.
- `justify-center` keeps the group centered whether right rail renders or not.
- Middle `max-w-[600px]` applied inside `AppShell` — every section inherits the same width.

**Consequence — members grids reflow.** `/members` pages currently `sm:grid-cols-2 xl:grid-cols-3` inside `max-w-5xl/6xl`. In a 600px column:

| File | Change |
|---|---|
| `src/app/members/page.tsx` | drop outer `max-w-5xl`; grids → `sm:grid-cols-2` (no xl:3) |
| `src/app/members/explore/page.tsx` | drop `max-w-6xl` |
| `src/app/members/tools/page.tsx` | drop `max-w-5xl`; grid → `sm:grid-cols-2` |
| `src/app/members/account/page.tsx` | audit; keep `md:grid-cols-2` (already fits) |

Membership marketing page (`/membership`) — out of scope for this refactor. Not inside `AppShell`.

**Shell signature:**
```ts
<AppShell user={user} rail={<CommunityRail ads={ads} />}>
  {children}
</AppShell>
```

`rail` optional. When absent → middle column stays centered, no empty right aside rendered.

**Community rail (PR 1 too)** — content unchanged. Move existing 2-ad aside out of `community/layout.tsx` into a new `<CommunityRail>` component, pass via `rail` prop. Delete the layout's own grid.

**Members + games (PR 1)** — remove their layouts' own containers; pass `null` rail for now (bare middle at correct width). PRs 2 + 3 fill rails.

## Section 2 — Games rail + fire streak (PR 2)

**Rail** — per-game, driven by slug. New file `src/components/games/rail/GameRail.tsx`. Cards:

1. **How to Play** — reads shared per-game rules module (see below). Includes "Read Full Guide" link → `/help/games/[slug]` if it exists, else Help modal trigger.
2. **Tile Guide** — per-game swatches. Same shared module.
3. **Today's Stats** — win %, avg solve time, games played, current streak. Data:
   - `getMyGameStats(game)` from `src/lib/games/profile-queries.ts` → played, won, currentStreak
   - avg solve time: new query `getMyAvgSolveTime(game)` averaging `results.time_ms WHERE user_id = auth.uid() AND game = ? AND status = 'won'`. One `avg()` RPC; add to `profile-queries.ts`.
   - Logged-out → signup teaser card (link to `/games/login?next=...`).
4. **Other games** — the 3 games from `registry.ts` minus current one, each linking `/games/{slug}`, plus a static "More coming soon" teaser row.

No Invite & Earn. No ad card in games.

**Shared per-game content module** — new `src/lib/games/help-content.tsx`. Hoists the `HELP` record + `Swatch` component out of `src/components/games/shell/GameHelpModal.tsx`. Modal + rail both read from here. One source of truth.

**Fire streak in title** — `GameHeader` gets optional `streak` prop. Renders `Alfazy #559  🔥 4` inline. Flame icons: `n` filled flames from lucide `Flame`, brand-orange.

- When today's game just won → flame does burst+glow animation on mount. Reuse `WinBurst` pattern from `src/components/games/board/WinBurst.tsx` (same keyframe, scoped to the flame).
- Streak value passed from page — page already fetches profile for stats, add `current_streak` to that fetch.
- Zero animation when streak unchanged (no gratuitous replay on nav).

Files touched:
- `src/lib/games/help-content.tsx` — new
- `src/components/games/shell/GameHelpModal.tsx` — import from shared module
- `src/components/games/rail/GameRail.tsx` — new
- `src/components/games/shell/GameHeader.tsx` — add `streak` prop
- `src/app/games/[slug]/*/layout.tsx` — pass rail
- `src/lib/games/profile-queries.ts` — add `getMyAvgSolveTime`

## Section 3 — Membership rail (PR 3)

New `src/components/members/MembersRail.tsx`. Three cards, top → bottom:

1. **From the blog** — 2 posts picked at random from `getLatestPostsForNav(10)`, **plus** a Hostinger entry styled as a sponsored headline row inline in the same list (small "Ad" chip, brand-purple, links to affiliate). One list, mixed rows.
2. **Games** — "Today's puzzles" list — the 3 games from `registry.ts` with icon + name + tagline, each linking `/games/{slug}`.
3. **Book A Sloth** — reuse `<AdSlotView ad={{slot: 2, ...}}/>` from community. Zero new markup.

Blog picker — new helper `pickRandom<T>(arr, n)` in `src/lib/random.ts` (5 lines, `Math.random`). Called from `MembersRail` server component so ISR still caches per-request-boundary; freshness comes from re-render, not per-user variance.

Files:
- `src/components/members/MembersRail.tsx` — new
- `src/lib/random.ts` — new (5 lines)
- `src/app/members/layout.tsx` — pass rail

## Non-goals

- No referral / invite / rewards system. Slot dropped.
- No per-user right-rail personalization beyond what's already fetched (avg time, streak).
- No new DB tables. No migrations.
- No new deps.
- `/membership` marketing page unchanged (not inside AppShell).
- Community rail content unchanged (2 existing ads).

## Testing

- `tsc --noEmit` clean per PR.
- `vitest` — existing suites green.
- New unit test per PR where logic added:
  - PR 2: `getMyAvgSolveTime` returns null when no wins; averages when wins exist.
  - PR 3: `pickRandom` returns n distinct elements when arr.length ≥ n; returns all when arr.length < n.
- Manual: verify each surface at 1024/1280/1440px viewport; centered group; middle column consistent 600px across community/games/members.

## Rollout

- PR 1 merge → deploy. Verify no regression in existing community rail.
- PR 2 merge → deploy.
- PR 3 merge → deploy.

No feature flags. Each PR ships behind existing route auth. All read-only additions (no writes).
