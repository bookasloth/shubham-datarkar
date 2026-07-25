# Finite & Honest Feed — design

**Date:** 2026-07-25
**Branch:** `feat/finite-honest-feed`
**Status:** awaiting approval

First slice of the "feed people crave" program. Three features that share a theme
(anti-algorithm honesty) and mostly touch the same feed-render code:

- **A — Real end-of-feed** (idea #2): the feed finishes, on purpose, with a designed
  moment instead of a grey line. No infinite refill.
- **B — Honest context strip** (idea #3): a small line telling the reader *why* this
  stream looks the way it does — no black box.
- **C — No metrics theater** (idea #10): engagement counts hidden from everyone
  **except on the viewer's own posts**.

## Grounding: what already exists

- `FeedStream` (`src/components/community/feed-stream.tsx`) is **already finite** — it
  paginates real notes, sets `done`, and renders "You're all caught up." There is **no
  algorithmic refill** to remove. Feature A is an *upgrade of the existing done-state*,
  not new plumbing.
- `EngagementBar` (`src/components/community/engagement-bar.tsx`) renders a count next to
  each icon via `compactNumber(...)` (reply, reblog, up, bookmark). Feature C conditions
  those counts.
- `PostCard` already computes `isOwner={viewerId === post.userId}` and passes `viewerId`.
  `FeedPost.userId` is the author id. Feature C's "own post" check reuses this exactly.
- `FeedQuery` (`src/lib/community/feed-query.ts`) carries `sort` (new/hot/top),
  `window`, `following`, `author`, `tag`. Feature B's line is derived purely from this +
  sign-in state. No new columns, no tracking.

## Feature A — Real end-of-feed card

**Behavior:** when `FeedStream` reaches `done`, replace the plain
"You're all caught up." paragraph with a designed end-card:

- A calm headline ("You're all caught up.") + one honest subline ("That's everything new.
  No infinite scroll here — go build something.").
- Two quiet actions: **Back to top** (smooth-scrolls up, reuses the existing scroll code)
  and **Compose** (→ `/community/compose`, signed-in only; omitted when logged out).
- Muted styling, generous padding, `rounded-card` — reads as an intentional finish line,
  not an error or a dead-end.

**Explicitly preserved:** the feed still stops. No auto-refill, no "here are old posts
you've seen." The card is the reward for finishing.

**Not touched:** the logged-out preview path already ends in `SignInWall` (its own end
state) — Feature A's card is for the signed-in `done` branch only. Empty feed keeps its
existing "No posts yet." message.

**Files:** `src/components/community/feed-stream.tsx` (replace the `{done && ...}` block;
extract the card into a small `FeedEndCard` component in the same file or a sibling).

## Feature B — Honest context strip

**Decision (recommended): one per-stream strip at the top of the feed, not a repeated
per-note line.** In this product the feed is a single ordered stream, so the "why" is the
same for every note in it — repeating it under all 10 cards is noise, not transparency.
One honest line at the top says what the reader is looking at and how it's ordered.

**Copy, by stream (derived from `FeedQuery` + signed-in):**

| Stream | Line |
|---|---|
| Home / `sort=new` | "Latest notes, newest first. Nothing is ranked or hidden." |
| For You / `sort=hot` | "A one-time shuffle. Refresh for a new order — no profile of you involved." |
| `sort=top` | "The most-liked notes {window-phrase}." |
| Following (`following=true`) | "Only the people you follow." |
| `tag` set | "Notes tagged #{tag}." |
| Logged-out preview | "A few notes at random. Sign in to read the whole feed." |

Rendered as a small muted strip above the first note (`text-xs text-muted-foreground`,
a divider under it). Pure function `feedContextLine(query, signedIn): string` — unit
tested. `window-phrase` maps `today→"today"`, `week→"this week"`, etc.

**Placement:** rendered by the feed page(s) above `FeedStream`/the cards, so it appears
once per stream. Surfaces: `/community` (Home + tabs), not the profile (there the "why"
is obviously "by this person") and not the permalink.

## Feature C — No metrics theater

**Rule:** engagement counts (reply / reblog / like / bookmark numbers) render **only when
the viewer is the author of that post**. Everyone else sees the action icons with no
number. Counts remain in the DB and in `FeedPost` — this is render-only.

**Implementation:** `EngagementBar` takes a new prop `showCounts: boolean`.
`PostCard` passes `showCounts={viewerId === post.userId}` (reusing the existing `isOwner`
computation). When false, each control renders its icon without the `compactNumber(...)`
label. The comment count `Link`, reblog menu, vote, and bookmark buttons all stay
functional — only the numeral is dropped.

**Bonus:** kills the "0 0 0 0" clutter on every fresh note for non-authors.

**Surfaces:** `EngagementBar` is shared, so this applies wherever it renders — feed,
permalink, profile. The author still sees their own counts everywhere. Consistent.

**Out of scope (noted):** a private per-author analytics view ("your note got 40 likes"
in a dashboard) is a separate future build. For now the author simply still sees the
inline counts on their own posts.

## Data / schema

None. No migrations, no new columns, no tracking. Everything derives from data already on
`FeedPost` and `FeedQuery`.

## Testing

- `feedContextLine(query, signedIn)` — pure, unit-tested across every stream + window +
  logged-out.
- Feature C: a small assertion that `EngagementBar` omits counts when `showCounts` is
  false (render check or a pure helper that decides count visibility).
- Feature A: manual preview (done-state card appears at feed end; Back-to-top + Compose
  work; logged-out still hits SignInWall).

## Ponytail cuts

- Feature A reuses the existing finite pagination + scroll code — only the done-state UI
  changes.
- Feature B is a stream-level strip, not per-note repetition, and a pure string function —
  no per-note follow lookups, no new data.
- Feature C reuses the existing `isOwner` check and only gates a render — no new auth,
  no query change.

## Open decisions for your review

1. **Feature B placement** — per-stream strip (recommended) vs. a line under every note.
   I chose the strip to avoid repeating the same sentence 10×. Say if you want per-note.
2. **Feature C scope** — confirmed "author sees own counts". Flagging that this hides
   counts on the permalink and profile too (not just the feed), since `EngagementBar` is
   shared. If you want counts visible on permalinks, that's a carve-out.
3. **Feature A Compose CTA** — included for signed-in users. Say if the end-card should be
   text-only.
