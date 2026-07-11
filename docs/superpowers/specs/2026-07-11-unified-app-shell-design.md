# Unified App Shell — design

**Date:** 2026-07-11
**Status:** Approved, ready for planning

## Problem

Signing in drops you into one of three areas — Members, Community, Games — and
each wears a different skin:

| Area | Shell today | Chrome |
|---|---|---|
| Members (`src/components/members/shell.tsx`) | Top bar + left sidebar + mobile drawer + bottom nav | wordmark + "Members" badge, resource search, Become-a-Member, bare **email + logout** button |
| Community (`src/app/community/layout.tsx`) | 3-column: narrow left-nav / feed / ad rail | **no top bar**; nav = Home / Bookmarks / Profile + Post |
| Games (`src/components/games/GamesHeader.tsx`) | Top bar only, centered `max-w-md`, no sidebar | "Back to site", Games title, per-game Archive/Results/Leaderboard, own client auth (`useGameAuth`), own signOut, standalone theme toggle |

Same user, same Supabase session, three unrelated layouts. Moving between areas
feels like moving between three different products.

This reverses the `feat/account-hub` spec's non-goal ("Merging the shells —
`/members`, `/community`, `/games` keep their own layouts and navs"). That
decision is superseded: the shells now unify. The `account-hub` `/account` hub
still stands and nests **inside** this shell.

## Goal

One app shell — top bar + accordion sidebar — reused verbatim across Members,
Community, Games, and Account, signed in or out. Every app surface looks and
behaves like one product.

## Non-goals

- **Marketing pages** (`/`, `/me`, `/services`, `/blog`, `/seo-expert-india`, …)
  keep their own header/footer. The shell is for the signed-in app areas only.
- **Auth changes.** All three areas already share one Supabase session; nothing
  about sign-in/out logic changes. Only the chrome that reads it is unified.
- **Avatar upload.** Initials tile, consistent with the `account-hub` decision.
- **New games / new community features** beyond the two stub pages below.
- **Right-rail ads on Membership or Games.** Community only for now; the shell
  leaves an optional right slot for a later decision.

## Architecture

### One shared component

New `src/components/app-shell/`:

```
app-shell/
  shell.tsx        AppShell — top bar + sidebar + drawer + bottom nav wrapper
  sidebar.tsx      accordion nav (desktop + inside the mobile drawer)
  profile-menu.tsx avatar dropdown (top-right)
  nav-config.ts    the single source of nav truth (all sections + items)
```

Each of the four area layouts renders the shell and passes the active area:

```tsx
// src/app/members/layout.tsx (community, games, account analogous)
const ctx = await getMemberContext();
return <AppShell ctx={ctx} active="membership">{children}</AppShell>;
```

No URL changes. Each area keeps its route prefix; only its `layout.tsx` swaps
its bespoke chrome for `<AppShell>`.

### Data

The layout (server component) calls `getMemberContext()` once — already memoized
per render, already returns `{ user, role, membership, capabilities }`. That
single object drives:

- **Sidebar gating** — which items route to `/login` when signed out.
- **Profile menu** — identity header, conditional Become-a-Member / Admin.

No new queries, no client auth hook for the chrome. `getMemberContext()` is
`server-only`; the shell is a client component, so the layout passes a plain
serializable slice (`{ email, displayName, role, isAdmin, isPremium }`), not the
raw `User`.

### Retired

- `src/components/games/GamesHeader.tsx`
- `src/components/games/use-game-auth.ts` (chrome no longer needs client auth;
  delete only if no game logic still imports it — verify at implementation)
- `src/components/community/left-nav.tsx`
- `src/components/members/shell.tsx` + `nav-config.ts` (folded into app-shell)
- Games' and Members' separate `signOut` collapse to one shared action.

## Top bar

```
[≡]   [Logo]            [ search → Cmd-K ]            [ avatar ▾ ]
```

- **Left:** mobile hamburger (opens the drawer) + the existing `<Logo>`
  (`src/components/brand/logo.tsx`, theme-swapped wordmark), linking to the app
  home. No per-area text badge — the sidebar shows context.
- **Center:** search input that opens the existing command menu
  (`src/components/layout/command-menu.tsx`, Cmd-K). One global search, already
  built.
- **Right:** avatar dropdown when signed in; a **Sign in** button
  (`/login?next=<path>`) when signed out.

### Profile dropdown (avatar ▾)

Header: avatar (initials tile) + display name + email. Then:

- **Become a Member** — only when `role !== premium`.
- **Admin** — only when `isAdmin`.
- **Theme ▸** — submenu System / Light / Dark / Torch (drives `next-themes`;
  Torch is the existing extra-dark theme).
- **Log out**.

The sidebar also has an Account section (below). The small overlap — Log out and
Account reachable from both — is deliberate: the dropdown is the always-visible
quick menu and owns Theme; the sidebar Account section is the browseable home for
identity pages.

## Sidebar — accordion

Main links expand/collapse a submenu. **Single-expand**: opening one section
collapses the others. The section matching the current route is auto-expanded on
load, with its active child highlighted (`bg-accent`, as members does today).
Clicking a main link expands its section and navigates to its first child.

| Main link | Submenu → route |
|---|---|
| **Community** | Explore → `/community` · Bookmarks → `/community/bookmarks` · Reblogs → `/community/reblogs` *(new)* · Likes → `/community/likes` *(new)* |
| **Membership** | Explore → `/members/explore` · Latest → `/members/latest` · Bookmarks → `/members/bookmarks` · Downloads → `/members/downloads` · Requests → `/members/requests` · Tools → `/members/tools` |
| **Game** | Alfazy → `/games/alfazy` · Hit and Blow → `/games/hit-and-blow` · Integra → `/games/integra` |
| **Account** | Profile → `/members/account` · Membership → `/members/account` · Logout → signOut |

Notes:

- **Membership** = the current `/members/*` area (the label the owner uses for
  it), distinct from the Account submenu's "Membership" (plan/billing view). Both
  currently land on `/members/account`; they split cleanly into
  `/account/profile` and `/account/membership` once the `account-hub` tabs exist.
- **Game-internal tabs** (Archive / Results / Leaderboard) stay inside the game
  page, not the sidebar — they are per-game and contextual to whichever game is
  open.
- **Gated items** (Downloads, member Bookmarks, Account) when signed out: the
  item stays visible; clicking routes to `/login?next=<href>`. The bottom of the
  sidebar shows a **Sign in** button in place of nothing.

## Community stub pages (new)

`/community/reblogs` and `/community/likes` are clones of
`src/app/community/bookmarks/page.tsx`:

- Same guard (`getMemberContext()` → redirect to login if signed out).
- Same `<PostCard>` list rendering.
- Reblogs: the posts the viewer has reblogged. Likes: the posts the viewer has
  upvoted (community votes).

**Query extension (the one non-trivial part):** `listFeed()` today supports
`bookmarked: true` via the feed RPC. Reblogs/Likes need equivalent viewer
filters. Add `reblogged` and `liked` options to `listFeed` and the matching
`p_reblogged` / `p_liked` params to the feed RPC — a Supabase migration
(hand-written SQL, run manually per the project workflow). No new tables:
reblogs read `community_posts.reblog_of = viewer`, likes read the existing votes
table.

## Content area

The shell owns the top bar + left sidebar + a `<main>`. Each area controls the
layout **inside** `main`:

- **Membership** — resource grids (as today), full width.
- **Games** — centered `max-w-md` column (as today).
- **Community** — feed + right-hand ad rail. The ad rail moves out of the layout
  and into community's own content (a page-level 2-column wrapper), so it appears
  only on community surfaces. `listAds()` moves with it.
- **Account** — the `account-hub` tabbed pages nest here.

## Mobile

- Hamburger opens a `Sheet` drawer containing the full accordion sidebar (reuse
  the existing `Sheet` primitive).
- Bottom nav: four top-level destinations — Community · Membership · Games ·
  Account — each linking to that section's first child.

## Testing

- Sidebar active-state + accordion logic is pure: given `pathname`, exactly one
  section is open and one child active. One unit test over the nav-config
  resolver (`activeSection(pathname)` / `isChildActive(href, pathname)`).
- Manual verification via the browser preview: each area renders the shell
  signed in and signed out; gated clicks bounce to `/login?next=`; theme submenu
  switches; Reblogs/Likes list the right posts.

## Build order

1. **Shell scaffold** — `app-shell/` (shell, sidebar, profile-menu, nav-config),
   adopt in **Membership** first (closest to the target already). Retire
   `members/shell.tsx`.
2. **Games** — layout renders `<AppShell active="game">`; retire `GamesHeader` /
   `use-game-auth`; game pages keep their internal tabs.
3. **Community** — layout renders `<AppShell active="community">`; ad rail moves
   into content; retire `left-nav`.
4. **Community stub pages** — `reblogs` + `likes` pages + `listFeed` filters +
   feed-RPC migration.
5. **Account** — `<AppShell active="account">`; coordinate with the
   `feat/account-hub` plan so its tabs nest in `main`.
