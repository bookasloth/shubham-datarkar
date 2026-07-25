# Build-in-Public Spine — design

**Date:** 2026-07-25
**Branch:** `feat/build-in-public-spine`
**Status:** awaiting approval

Second slice of the "feed people crave" program (idea #1 thread-spine + idea #8 version
tags / release-notes view). Turns islands of PR-notes into readable arcs and a
feed-native changelog.

## The reader experience

- A note that belongs to a multi-PR feature shows a small chip: **Part of: Sign-in wall ·
  3 notes** (icon, not emoji — house rule). Tapping it opens the **thread page**
  `/community/thread/{key}` — every note in that arc, oldest → newest, as one story
  (idea → bug → fix → live).
- A note shows a **shipped in v3.6** chip. Tapping it opens the **release-notes view**
  `/community?version=v3.6` — everything that shipped in that version, newest first.

No other platform threads *the work* or turns its feed into a living changelog. That's the
draw.

## Decisions (confirmed by owner)

1. Grouping is an **opt-in `Thread:` line** in the PR body. No line → standalone note.
2. **Backfill** the real sagas that already exist (see Backfill).
3. Version comes from a **`Version:` line per PR**.

## How it works — the pipeline

PR-notes are created by the GitHub webhook
([route.ts](src/app/api/community/github/route.ts)) → `autoPost`
([post.ts](src/lib/community/auto/post.ts)), which stores one row in `community_posts`
keyed by `auto_key = pr:{repo}#{number}`. Two new opt-in body lines ride the exact same
pattern as the existing `Tweet:` line (`extractTweet` in
[pr.ts](src/lib/community/auto/pr.ts:142)):

```
Thread: sign-in-wall
Version: v3.6
```

- New pure helpers in `pr.ts`: `extractThread(body)` and `extractVersion(body)` — mirror
  `extractTweet`, unit-tested. `Thread:` is slugified (`lowercase`, spaces→`-`, charset
  `[a-z0-9-]`, capped 48) so it's URL-safe; `Version:` is trimmed, capped 16, matched
  loosely (`v3.6`, `3.6`, `v3.6.1`).
- `route.ts` extracts both and passes them to `autoPost`.
- `autoPost` writes them into the insert (nullable columns).

## Schema

New migration (manual SQL to run):

```sql
alter table public.community_posts add column if not exists thread  text;
alter table public.community_posts add column if not exists version text;

-- Thread/version pages read these; anon + authenticated already select community_posts
-- rows via the feed RPC, so no new grants — the columns ride the existing row read.
create index if not exists community_posts_thread_idx
  on public.community_posts (thread, created_at) where thread is not null;
create index if not exists community_posts_version_idx
  on public.community_posts (version, created_at) where version is not null;
```

Nullable, indexed partially (only tagged rows). No backfill in the migration itself —
backfill is a separate reviewed SQL step (below).

## Hydration — the one real risk

Thread and version pages must render **fully-hydrated note cards** (poll, images,
engagement, viewer vote/bookmark state, badges, quoted posts) — the same `FeedPost` shape
`listFeed` returns from the `community_feed` RPC. Two options:

**Chosen: extend `community_feed` with `p_thread` + `p_version` filters** (nullable,
default null), exactly as `p_author` was added in
`20260711000003_community_feed_viewer_filters.sql`. Reuses all hydration for free.

**Risk + mitigation (from prior pain):** PostgREST resolves an RPC by the *exact set of
argument keys*, and `community_feed` has a history of arg-count fragility (there's already
a defensive fallback in `queries.ts:129`). The plan MUST:
- `create or replace` the single current definition (not a new overload); confirm no stale
  overload remains.
- Update the one param builder in `listFeed` to always send the new keys.
- **Probe the deployed RPC** with the new key set before merging (per the known
  "PostgREST ignores DEFAULTs, resolves by exact key set" gotcha).

Rejected: a separate `community_thread_feed` RPC — duplicates ~40 lines of hydration SQL,
a maintenance trap when the card shape changes. The main-feed extension is the same kind of
filter already living in that function.

`FeedQuery` gains `thread?: string` and `version?: string`; `sanitizeQuery` validates both
(same charset rules as the extractors). `listFeed` passes them through.

## Components / pages

- `src/components/community/note-badges.tsx` (new) — renders the **Part of {thread}** and
  **shipped in {version}** chips from `post.thread` / `post.version`. Icon via lucide
  (e.g. `GitBranch` / `Tag`), muted, small, `rounded-btn`. Links to the thread page and
  the version view. Rendered inside `PostCard` under the body (near tags).
- `FeedPost` type gains `thread: string | null` and `version: string | null`; the RPC
  row-map in `queries.ts` reads them.
- `src/app/community/thread/[key]/page.tsx` (new) — header ("The {humanized} story · N
  notes") + the arc rendered **oldest-first** via `listFeed({ thread: key })` +
  `FeedStream`. Logged-out gets the same preview + `SignInWall` gate as every other feed
  surface (this is still a feed of member content — no new hole).
- Release-notes view: `/community?version=v3.6` — the existing community page already reads
  `searchParams`; add `version` handling that flows into the feed query and shows a small
  header ("Release notes · v3.6"). Reuses the whole existing page + `FeedStream`.

## Ordering

- Thread page: **oldest-first** (`created_at asc`) — an arc reads as a story. This is a new
  sort mode for the RPC (`p_sort = 'old'`) OR a reverse applied in the thread query. The
  plan picks the lighter of the two after inspecting the RPC's sort handling.
- Version view: newest-first (default `new`) — release notes read top-down.

## Backfill (separate reviewed SQL)

Real multi-PR sagas already in the feed, tagged by `auto_key`. The plan **first SELECTs the
candidate `auto_key`s to confirm the note rows exist**, then UPDATEs only those (a note may
be missing if its PR predated the live auto-poster).

Candidate sagas:

| Thread | PRs (auto_key `pr:bookasloth/shubham-datarkar#N`) | Story |
|---|---|---|
| `sign-in-wall` | #323, #325 | tease overlap → looked broken → reverted to fade |
| `sidebar` | #324, #327 | Tumblr sidebar → hide dropdowns when logged out |
| `social-layer` | #312, #314, #315, #316, #317, #318 | the community launch, PR A→F |

Example (run only for confirmed-existing rows):

```sql
update public.community_posts set thread = 'sign-in-wall'
 where auto_key in ('pr:bookasloth/shubham-datarkar#323','pr:bookasloth/shubham-datarkar#325');
```

Version backfill is optional/manual — the changelog versions (v3.5, v3.6) map to date
ranges, not cleanly to individual old PRs, so v1 leaves historical `version` null and lets
it accrue going forward. (Owner can hand-tag a release later.)

## Testing

- `extractThread` / `extractVersion` — pure, unit-tested (present/absent/blank, slugify,
  charset caps, CRLF trailing-`\r` like `extractTweet` handles).
- `sanitizeQuery` — thread/version validated and rejected when malformed.
- Manual/preview: a tagged note shows both chips; thread page renders the arc oldest-first;
  version view filters; logged-out thread page still hits `SignInWall`.

## Ponytail cuts

- Reuse the `Tweet:`-line pattern for both new lines — no new parsing machinery.
- Reuse `community_feed` hydration rather than a parallel RPC.
- Reuse the existing community page for the version view (just a new `searchParam`).
- Partial indexes only on tagged rows.
- No version backfill archaeology — accrues forward.

## Out of scope

- Auto-detecting threads (no AI clustering — opt-in only).
- Version backfill of old PRs.
- A dedicated changelog page rebuild (the static `site-content.ts` changelog stays;
  the release-notes *view* is additive).
- Cross-repo threads (a thread key is per-feed; Book A Sloth notes tag their own).

## Open decisions for review

1. **Thread chip label** — humanize the slug (`sign-in-wall` → "Sign-in wall") or let the
   `Thread:` line carry a display title separately? Recommend humanize the slug (one field,
   good enough).
2. **`social-layer` backfill** — include the 6-PR A→F arc if the notes exist? Recommend yes;
   it's the best day-one spine. Plan verifies existence first.
3. **Thread page ordering** — oldest-first (arc/story, recommended) vs newest-first.
