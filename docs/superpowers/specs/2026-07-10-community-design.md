# /community — Design

**Date:** 2026-07-10
**Status:** Draft (design), pending user review before implementation plan

## Concept

An X/Twitter-style single shared feed at `/community`, with Reddit-style
sorting and voting. Verified members and Shubham post; everyone can read a
metered slice. Server-rendered for SEO with optimistic client interactions.
Monochrome, no-emoji, matches the existing site system.

There is **one shared timeline** — no follow graph, no "For you"/"Following"
tabs. Content surfaces by ranking (New / Hot / Top / Controversial), not by a
social graph.

This builds directly on the identity system (see
`2026-07-09-unified-identity-people-design.md`): a community member is a
**verified account** (`auth.users` + `public.profiles`). Community is the
free-tier social surface that spec parked as "future".

## Decisions (locked with user)

1. **Model:** Twitter-style shared feed; you + any verified member post.
2. **Read access:** public but **metered** — an anonymous visitor sees **3
   posts/day**, then a login wall. Verified login = full feed.
3. **Post gate:** only logged-in, **email-verified**, non-banned accounts post.
4. **Post types:** `text` (≤500 chars) · `text + image` (≤4 images) · `poll`
   (2–4 options, one vote each, live tally) · `youtube` (paste URL →
   auto-embed).
5. **Engagement bar** (per post, left→right): Upvote (heart) · Downvote (rotten
   egg) · Comment (chats) · Reblog (retweet) · Share (paper plane) · Bookmark
   (bookmark) · Award (medal — **inactive placeholder**, built later).
6. **Voting, not liking:** one vote row per (user, post), value `+1`/`−1`.
   `score = up − down`.
7. **Ranking:** New / Hot / Top(+time window) in v1; **Best** and **Rising** are
   a fast-follow. **Controversial** posts (`down > up` past a threshold) are
   pulled out of the main sorts into their own bucket ("more rotten eggs →
   sinks, not shown above all"). Algorithm owned here (see §5).
8. **Badges (3 tiers):** grey tick (email-verified) → **orange** tick (active
   membership OR any donation) → **gold** tick (Shubham only, admin-assigned).
   Grey tick hovers to orange bg / white tick.
9. **Avatars:** initials on a **deterministic bg color hashed from the handle**.
   No upload pipeline in v1.
10. **Right rail:** 2 sticky, admin-editable ad slots (image + link). No search,
    no trends.
11. **Moderation:** post-hoc. Report button + admin actions (delete, hide with
    optional user notice, ban, demote). Auto text-slur blocklist on create.
    Image NSFW auto-detection deferred (report + manual now; `nsfwjs`
    client-side, free, later).
12. **Liveness:** static server-render + revalidate + optimistic UI. No Supabase
    Realtime in v1.

## Layout (3-column)

```
┌──────────────┬───────────────────────────────┬──────────────┐
│  LEFT NAV    │          CENTER FEED          │  RIGHT RAIL  │
│              │                               │              │
│  Home        │  [ Sort ▾ ]  New/Hot/Top…     │  ┌────────┐  │
│  Bookmarks   │                               │  │ Ad 1   │  │
│  Profile     │  [ Composer ] (if logged in)  │  └────────┘  │
│  ─────────   │                               │  ┌────────┐  │
│  [ Post ]    │  ┌─────────────────────────┐  │  │ Ad 2   │  │
│              │  │ Post card               │  │  └────────┘  │
│  (Admin →    │  │  avatar @handle · badge │  │   (sticky)   │
│   if admin)  │  │  body / image / poll /  │  │              │
│              │  │  youtube embed          │  │              │
│              │  │  ♥ 🥚 💬 ↻ ➤ 🔖 🏅       │  │              │
│              │  └─────────────────────────┘  │              │
└──────────────┴───────────────────────────────┴──────────────┘
```

- **Left nav:** Home · Bookmarks · Profile · **Post** button. Admin sees an
  extra Admin link. Collapses to a bottom bar on mobile.
- **Center:** sort dropdown → composer (logged in only) → feed of post cards.
- **Right rail:** 2 sticky ad slots; hidden on mobile.

Icons render monochrome; hover/active states use the site's orange accent.

## Post card

- Header: initials avatar (hashed bg) · `@handle` · badge tick · relative time.
  Reblogs prepend a "@handle reblogged" line above the original card.
- Body by type: text; image grid (1–4); poll (options with live % bars, vote
  once); youtube (lazy iframe from the video id).
- Engagement bar (§ Decisions 5). Counts denormalized on the post for cheap
  reads. Award icon is rendered disabled.
- Menu (⋯): Report; owner sees Delete; admin sees moderation actions.

## Ranking algorithm

Definitions per post: `up`, `down` (denormalized vote counts),
`score = up − down`, `n = up + down`, `age = now − created_at`.

- **New** — `created_at desc`.
- **Hot** — Reddit hot, recency + score:
  ```
  sign  = score > 0 ? 1 : score < 0 ? -1 : 0
  order = log10(max(|score|, 1))
  hot   = order * sign + (epoch_seconds(created_at) - 1_600_000_000) / 45000
  sort by hot desc
  ```
  ~1 order-of-magnitude of votes ≈ 12.5h of freshness.
- **Top** — `score desc`, filtered to a time window (Now / Today / Week /
  Month / Year / All).
- **Controversial** — a post is controversial when `down > up AND n ≥ 5`. These
  are **excluded from New / Hot / Top** and shown only under the Controversial
  sort, ranked by `controversy = n ^ (min(up,down) / max(up,down))` desc. This
  is the "more rotten eggs sinks the post" rule.
  `// ponytail: 5 and the down>up cutoff are knobs — tune from real vote data.`
- **Best** (fast-follow) — Wilson lower bound of `up / n`, most-reliably-upvoted.
- **Rising** (fast-follow) — score gained in the last ~90 min (needs a small
  vote-timestamp rollup; skipped in v1 because it is meaningless at low volume).

Admin **demote** = a manual `demoted` flag that forces a post into the
controversial/low bucket regardless of votes (same exclusion from main sorts).

Hot and controversy are computed in the feed SQL (or a scheduled refresh of a
`hot` numeric column if query cost bites — start inline). No ML, no external
service.

## Data model

New tables (all `public` schema, `snake_case`, RLS on):

```sql
-- one row per post; replies are rows with parent_id set (1-level threading)
community_posts (
  id           uuid pk default gen_random_uuid(),
  user_id      uuid not null references profiles(id) on delete cascade,
  parent_id    uuid references community_posts(id) on delete cascade, -- reply
  reblog_of    uuid references community_posts(id) on delete cascade, -- reblog
  type         text not null check (type in ('text','image','poll','youtube')),
  body         text check (char_length(body) <= 500),
  images       jsonb,          -- array of storage paths, ≤4 (type='image')
  youtube_id   text,           -- parsed video id (type='youtube')
  poll         jsonb,          -- {options:[{i,label}], closes_at} (type='poll')
  up_count     int not null default 0,
  down_count   int not null default 0,
  reply_count  int not null default 0,
  reblog_count int not null default 0,
  hidden       boolean not null default false,
  hidden_reason text,
  hidden_notified boolean not null default false,
  demoted      boolean not null default false,
  created_at   timestamptz not null default now()
)

community_votes (
  post_id  uuid not null references community_posts(id) on delete cascade,
  user_id  uuid not null references profiles(id) on delete cascade,
  value    smallint not null check (value in (-1, 1)),
  primary key (post_id, user_id)
)

community_poll_votes (
  post_id     uuid not null references community_posts(id) on delete cascade,
  user_id     uuid not null references profiles(id) on delete cascade,
  option_index int not null,
  primary key (post_id, user_id)
)

community_bookmarks (
  post_id  uuid not null references community_posts(id) on delete cascade,
  user_id  uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
)

community_reports (
  id          uuid pk default gen_random_uuid(),
  post_id     uuid not null references community_posts(id) on delete cascade,
  reporter_id uuid not null references profiles(id) on delete cascade,
  reason      text,
  resolved    boolean not null default false,
  created_at  timestamptz not null default now()
)

community_ads (
  id         uuid pk default gen_random_uuid(),
  slot       smallint not null check (slot in (1,2)),
  image_path text,
  link_url   text,
  active     boolean not null default true,
  updated_at timestamptz not null default now()
)
```

Reblog is a `community_posts` row with `reblog_of` set (no body); the feed query
resolves it to the original for display. Award has **no table in v1** — the
medal renders disabled.

Additions to existing `public.profiles`:

```sql
alter table profiles add column display_name text;
alter table profiles add column bio         text;
alter table profiles add column is_founder  boolean not null default false; -- gold badge, admin only
alter table profiles add column banned      boolean not null default false;
alter table profiles add column banned_reason text;
```

Storage bucket `community-media` for post images (public read; authenticated
write, size/type limited).

Denormalized counters (`up_count`, `down_count`, `reply_count`,
`reblog_count`) are maintained by triggers on the vote/reply/reblog tables so
feed reads never aggregate.

### Badge computation (read-time)

```
gold   if profiles.is_founder
orange else if (active membership for user) OR (any donation/support payment for user)
grey   else            -- email-verified account (the post gate guarantees this)
```

Membership joins `memberships`; donation joins the Razorpay/support payments
tables (by `user_id`, falling back to the identity spec's email-join for
account-less donations). Exact source columns resolved in the plan.

## RLS & access

- `community_posts` **select**: public (metering is enforced in the app layer,
  not RLS — an anon read of 3 rows is still an anon read). Non-hidden only for
  non-admins; owners and admins see hidden.
- `community_posts` **insert**: `authenticated` AND `email_confirmed_at not
  null` AND `not banned`. Enforced in the create server action + a check
  constraint / policy.
- `community_votes`, `community_poll_votes`, `community_bookmarks`: users
  read/write only their own rows.
- `community_reports` **insert**: authenticated; **select**: admin only.
- Moderation (delete / hide / ban / demote / resolve report) goes through
  `is_admin()`-gated security-definer RPCs, matching the existing games/members
  admin pattern. `community_ads` writes are admin-only.

## Metering (anon read limit)

Anonymous visitors get **3 posts/day**. Implementation: a client-side
`localStorage` day-bucketed counter; on the 4th, a login-wall overlay replaces
further feed content with a "sign in to keep reading" CTA linking to
`/members/login`.

`// ponytail: localStorage counter is bypassable (clear storage / incognito).
Acceptable for v1 reach-vs-friction; move to a server cookie or IP bucket only
if abuse shows up.`

## Motion

Click micro-interactions, CSS keyframes (reach for GSAP only if a spring needs
it): heart scale-pop, rotten-egg wobble/crack, bookmark fill, reblog spin,
share lift. All gated behind `prefers-reduced-motion: reduce` (no animation,
instant state change).

## Stack & patterns

- Feed pages are **server components** (SEO + matches the codebase); post/vote/
  reply/reblog/bookmark/report are **server actions**; composer and the
  engagement bar are **client islands** with optimistic updates.
- Reuse the members-platform conventions (`src/lib/members/*`,
  `src/components/members/*` structure, `getMemberContext`, admin nav config).
- Read `node_modules/next/dist/docs/` for the current Next APIs before coding
  (per AGENTS.md — this Next has breaking changes).
- **No new dependencies.**

## Admin surface

New `/admin/community`: reports queue (resolve), post search + delete/hide/
demote, user ban/unban, ad-slot editor. Add **Community** to the admin nav.
Backed by `is_admin()` RPCs.

## Phases

1. **Schema** — migration: new tables, `profiles` columns, `community-media`
   bucket, RLS, counter triggers, moderation + badge RPCs. (Manual SQL handoff
   per project workflow.)
2. **Read** — 3-column layout, feed read with New/Hot/Top(+time) sorts,
   Controversial bucket, metering wall, post cards, badges, avatars, 2 ad slots.
3. **Compose** — composer for text / image / youtube, create server action,
   text-slur blocklist, image upload to bucket.
4. **Engage** — upvote/downvote, reply (1-level), reblog, bookmark, share, with
   optimistic UI + click motion. Award icon disabled.
5. **Polls** — poll composer, vote-once, live tally.
6. **Moderate** — report button + `/admin/community` (delete/hide/ban/demote/
   resolve) + ad-slot editor.

## Out of scope / deferred

- **Best** and **Rising** sorts (fast-follow after volume exists).
- **Award / medal** system (icon ships disabled).
- Image NSFW auto-detection (`nsfwjs`, client-side, free) — report + manual now.
- Avatar image upload (initials only in v1).
- Supabase **Realtime** (static + revalidate in v1).
- Follow graph, "For you"/"Following" tabs, quote-post beyond reblog,
  notifications, search, trends.
- Server-side / IP-based metering (localStorage in v1).

## Edge cases

- **Deleted parent** — replies/reblogs cascade-delete with the parent.
- **Banned user** — existing posts stay (admin may hide); new inserts blocked.
- **Vote toggle** — re-voting the same value removes the vote; opposite value
  switches it (counter triggers handle both).
- **Poll after close** — `closes_at` past → read-only tally, no new votes.
- **YouTube parse fail** — invalid URL rejected at compose time; store only a
  valid video id.
- **Controversial edge** — a post crossing/leaving the `down > up, n ≥ 5`
  threshold moves between buckets purely by the read query; no state to migrate.
- **Metering reset** — day bucket keyed by local date; timezone drift is
  acceptable for a soft wall.
