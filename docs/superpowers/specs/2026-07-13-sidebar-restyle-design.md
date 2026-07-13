# Sidebar restyle — floating card + orange active pill

**Date:** 2026-07-13
**Branch:** `chore/sidebar-discussion`

## Goal

Restyle the logged-in **desktop left rail** to match the owner's mock: a
floating inset card, sticky in place, with a strong orange active state and the
active section's sub-items expanded. Nav content and behavior stay the same.

## Scope

- **In (left rail):** desktop left rail — the `<aside>` in
  `src/components/app-shell/shell.tsx` (`lg:block`) and the active-item styling in
  `src/components/app-shell/sidebar.tsx`.
- **In (right sidebar):** the community right rail — the ads `<aside>` in
  `src/app/community/layout.tsx`. Container only: same top gap, a gap from the
  right edge, same sticky behavior. **Content unchanged** (the two `AdSlotView`s).
- **Out:** nav content (Community / Membership / Game / Account sections and their
  items stay exactly as in `nav-config.tsx`). Mobile drawer and mobile bottom nav
  are untouched. No new bottom "View Profile" action. Members layout has no right
  rail; the `/support` aside is a separate public page — both out of scope.

## Decisions (from brainstorming Q&A)

1. **Mock = style reference only.** Keep current sections; adopt look + behavior.
2. **Monochrome, except active = orange.** Everything stays monochrome with the
   existing lucide icons. Only the active state gets color.
3. **No bottom action.** Card ends after the nav accordion.

## Design

### 1. Floating inset card (`shell.tsx`, desktop `<aside>`)

Today the aside is a flush, full-height, right-bordered column:
`sticky top-14 hidden h-[calc(100dvh-3.5rem)] w-60 shrink-0 overflow-y-auto border-r border-border p-3 lg:block`.

Change it to a floating card:
- Inset from the top bar and left edge (gap on top/left/bottom).
- Card surface: `rounded-card border border-border bg-card shadow-sm`.
- Content-height (not full viewport) so it stays short like the mock; guard tall
  content with `max-h-[calc(100dvh-…)] overflow-y-auto`.
- Remains `sticky` (offset below the 3.5rem top bar + the new gap) so it holds
  position while page content scrolls.

The card chrome lives on the `<aside>` wrapper only — `AppSidebar` itself is
unchanged, so the mobile drawer (which renders the same `AppSidebar` inside a
`Sheet`) keeps its own flush panel styling.

### 2. Active state — orange pill (`sidebar.tsx`)

- **Active section trigger** (`AccordionTrigger`): filled orange pill —
  `bg-brand text-brand-foreground` (brand is `#ff4800`), bold. This is the
  primary active indicator, matching "Account" in the mock. `--brand` already
  exists; no new token.
- **Active sub-item link:** keep the current subtle treatment
  (`bg-accent` + `font-medium`) as a secondary indicator.
- Non-active items: unchanged monochrome hover states.

Note: under the games scope `--brand` is overridden per-game; the app-shell rail
sits outside that scope, so it uses the global orange. No special handling needed.

### 3. Auto-open active section (`sidebar.tsx`, already implemented)

The controlled single-expand accordion already opens the active section on mount
and re-opens it on route change (`useEffect` on `pathname`, `sidebar.tsx`). No
change — this already satisfies "open the sub items of the active one."

## Verification

- Logged-in desktop `≥lg`: rail renders as an inset card, sticky, holds on scroll.
- On each of `/community`, `/members`, `/games`, `/members/account`: the matching
  section trigger shows the orange pill and its sub-items are expanded.
- Mobile drawer + bottom nav visually unchanged.
- Light / dark / torch themes: orange pill legible in all three (brand holds on
  dark per `globals.css`).
- `tsc` + `eslint` clean.

## Non-goals

Nav restructure, account-centric sidebar, bottom action, mobile changes,
icon changes.
