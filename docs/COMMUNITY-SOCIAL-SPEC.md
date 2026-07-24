# /community — social layer + feed engine spec

Eight features that close the biggest gaps between `/community` and an X-style feed.
Written 2026-07-24. Nothing here is built yet.

Ship order and PR grouping are deliberate — see [Sequencing](#sequencing). Every
migration is applied MANUALLY against our own Supabase (`oyzzgjrefkppqkxjccot`),
per the project's usual workflow: the migration file lands in the PR, the SQL is
handed over to run by hand.

---

## 0. Ground truth (what exists today)

| Thing | Where | State |
|---|---|---|
| Feed rows | `community_feed(text,text,int,int,text,bool,bool,bool)` | 8-arg, `security definer`, in `20260718000002_community_avatar_url.sql` |
| Single post | `community_post(bigint)` | keyed by `public_id` |
| Replies | `community_replies(uuid,int,int)` | flat, `order by created_at asc` |
| Reply depth | [engage-actions.ts:187](../src/lib/community/engage-actions.ts) | hard-blocked: `"You can't reply to a reply."` |
| Reblog | `community_posts.reblog_of` | a row with `reblog_of` set and `body` null |
| Sorts | `new` / `hot` / `top` (+ dormant `controversial`) | see §1 |
| Query sanitizing | [feed-query.ts](../src/lib/community/feed-query.ts) | `sanitizeQuery` is the trust boundary |
| Paging | [feed-actions.tsx](../src/lib/community/feed-actions.tsx) `loadFeedPage` | **public endpoint** — re-checks auth, clamps limit |
| Mentions | [linkify.ts](../src/lib/community/linkify.ts) `mentionedHandles` | parse-only, no autocomplete |

**Two constraints that shape every migration below.**

1. **PostgREST resolves an RPC by exact key set, not by name.** Adding a param to
   `community_feed` means every caller must send it, or the call 404s. `listFeed`
   already dances around this (it omits `p_reblogged`/`p_liked` unless set) — new
   params follow the same rule: send only when non-default, and probe against the
   real DB before merging.
2. **`create or replace` cannot change a function's OUT columns or signature.**
   Any signature change = `drop function` + full recreate of the body. So all
   signature changes below are batched into ONE migration instead of four.

---

## 1. Feed engine — Hot is broken

### The bug

```sql
case when p_sort = 'hot' then
  sign(f.score) * log(greatest(abs(f.score), 1)) + extract(epoch from f.row_created_at) / 45000
end desc nulls last
```

`score = up_count - down_count`. Downvotes were removed (#162) and almost nothing
gets upvoted, so `score` is 0 on nearly every row. Then:

- `sign(0) = 0`, `log(1) = 0` → the vote term is **0 for every post**
- what's left is `epoch(created_at) / 45000`, a strictly increasing function of time
- → **Hot is exactly New, with extra arithmetic.**

Not a tuning problem. With no vote signal there is nothing for a Reddit-style hot
score to rank by. Any "smarter" formula built on `score` degenerates the same way.

### The fix

Three sorts, three genuinely different jobs:

| Sort | Means | Ordering |
|---|---|---|
| **New** | reverse chronological | `row_created_at desc` (unchanged) |
| **Hot** | shuffle — a different slice of the archive each visit | seeded random (below) |
| **Top** | most-upvoted in a window | `score desc` (unchanged) |

Hot becomes the **discovery** surface: with ~a few hundred auto-posted notes, a
stable random order is strictly more useful than a second copy of New. It also
resurfaces old posts, which nothing currently does.

### Seeded shuffle — why not `order by random()`

`random()` is re-evaluated per query. The feed pages with `limit`/`offset`, so page
2 would reshuffle: duplicate cards, silently skipped cards. Instead, order by a
hash of `(row_id, seed)` where the seed is fixed for the browsing session.

```sql
-- new 9th param
p_seed int default 0
...
case when p_sort = 'hot' then hashtext(f.row_id::text || p_seed::text) end asc
```

- deterministic for a given seed → offset paging is stable and correct
- new seed per session → a different order on each visit
- `hashtext` is built in, no extension, no new column, no index needed at this size

**Seed lifecycle.** The page generates the seed and puts it in the URL
(`/community?sort=hot&seed=41273`), so:

- SSR and the `loadFeedPage` client action see the same value with no extra plumbing
- refresh keeps the order; a fresh visit to `?sort=hot` with no seed mints a new one
- a shared link reproduces exactly what the sharer saw

`sanitizeQuery` gains `seed`: coerce to int, clamp `0..2_147_483_647`, default 0.
`FeedQuery` and `FeedSort` types unchanged except the added `seed?: number`.

**Freshness bias (optional, recommended).** Pure random buries today's posts. Bias
it so ~a third of a page is recent:

```sql
case when p_sort = 'hot' then
  hashtext(f.row_id::text || p_seed::text)
  - case when f.row_created_at > now() - interval '2 days' then 1500000000 else 0 end
end asc
```

i.e. posts under 2 days old get a constant bump into the front of the shuffle,
still shuffled among themselves. One line, no tuning loop. Skip if it reads odd in
practice; the plain shuffle is the fallback.

**Empty-state note.** `hot` currently shares New's exclusion of `demoted` posts and
the inert `is_controversial` filter. Both stay as-is.

### Also

`sort-menu.tsx` gets a one-line label change: **Hot** → subtitle/tooltip "Shuffled",
so the behaviour isn't mistaken for a bug. Window dropdown stays Top-only.

---

## 2. Follow / unfollow

### Schema

```sql
create table if not exists public.community_follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  followee_id uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (follower_id, followee_id),
  constraint no_self_follow check (follower_id <> followee_id)
);
create index if not exists community_follows_followee_idx on public.community_follows(followee_id);

alter table public.community_follows enable row level security;
-- readable by all (counts are public), writable only as yourself
create policy follows_read   on public.community_follows for select using (true);
create policy follows_insert on public.community_follows for insert with check (follower_id = auth.uid());
create policy follows_delete on public.community_follows for delete using (follower_id = auth.uid());
```

The composite PK is the idempotency guard — a double-click can't create two rows.

### Server action

`toggleFollow(username)` in `src/lib/community/engage-actions.ts`, matching the
shape of `toggleBookmark`:

- resolve `username` → `followee_id` via `profiles`; unknown handle → `{ error }`
- require a verified member (same gate as `viewerCanPost`)
- self-follow → `{ error }` (also enforced by the CHECK)
- delete-then-insert on toggle, return `{ following: boolean, followers: number }`

### Feed tab

`community_feed` gains `p_following boolean default false`. When true, add to the
`rows_` CTE:

```sql
and exists (select 1 from public.community_follows f
            where f.follower_id = auth.uid() and f.followee_id = r.user_id)
```

Filtering on `r.user_id` (the actor) not `p.user_id` (the source author) is
deliberate: if you follow someone, their reblogs belong in your Following feed.

`sort-menu.tsx` grows a left-side tab pair — **For you** | **Following** — rather
than a fourth entry in the sort dropdown. Following + sort compose freely
(`?tab=following&sort=new`).

Empty Following feed → a short prompt with 3 suggested handles (most-followed,
excluding self and already-followed). One extra query, no ML.

### UI

- Follow button on `/community/u/[username]`, optimistic (see
  `EngagementBar` — the happy path must NOT call `router.refresh()`)
- follower / following counts on the profile header, both clickable →
  `/community/u/[username]/followers` and `/following` (plain paged lists)
- no follow button on post cards in v1 — the card is already dense

### Notification

Reuse `community-notify.ts`: a `follow` email kind, same 1-per-event pattern as
`notifyMentions`. Respect the existing unsubscribe/preference path.

---

## 3. Mute

Deliberately paired with follow — same shape, same migration, and it needs the
same `community_feed` recreate.

```sql
create table if not exists public.community_mutes (
  muter_id uuid not null references public.profiles(id) on delete cascade,
  muted_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (muter_id, muted_id),
  constraint no_self_mute check (muter_id <> muted_id)
);
alter table public.community_mutes enable row level security;
-- private: only the muter can see or change their own mutes
create policy mutes_rw on public.community_mutes for all
  using (muter_id = auth.uid()) with check (muter_id = auth.uid());
```

**Mute is private** — unlike follows, the read policy is self-only. A muted user
must not be able to discover they're muted.

Applied in `community_feed`'s `rows_` CTE, unconditionally (no param — mute always
applies), on **both** the actor and the source author:

```sql
and not exists (select 1 from public.community_mutes m
                where m.muter_id = auth.uid() and m.muted_id = r.user_id)
```

…and the equivalent in `src` for `p.user_id`, so a muted person's post stays hidden
even when someone you follow reblogs it.

Same filter in `community_replies`.

**Not filtered:** direct permalinks (`/community/p/{id}`) and the muted user's own
profile page. Mute quiets the feed; it doesn't erase content you navigated to on
purpose. Matches X.

UI: a "Mute @handle" item in `post-menu.tsx` (already has the report/delete menu
pattern) + an unmute list at `/community/me`.

---

## 4. @mention autocomplete

### Search RPC

```sql
create or replace function public.community_handle_search(p_q text, p_limit int default 8)
returns table (username text, display_name text, avatar_url text, badge text)
language sql stable security definer set search_path = public as $$
  select pr.username, pr.display_name, pr.avatar_url, public.community_badge(pr.id)
  from public.profiles pr
  where not pr.banned
    and pr.username is not null
    and (pr.username ilike p_q || '%' or pr.display_name ilike p_q || '%')
  order by (pr.username ilike p_q || '%') desc, length(pr.username), pr.username
  limit least(greatest(p_limit, 1), 10);
$$;
```

- prefix-only (`p_q || '%'`), so it's index-friendly and can't be used to dump the
  table by searching `%`
- `p_q` is escaped for `_` and `%` server-side before concatenation, or the client
  strips them via the same handle charset check
- exact-prefix-on-username ranks above display-name matches
- **grant to `authenticated` only** — not `anon`. A logged-out visitor has no
  composer, and this is a user-enumeration surface.

### Client

`composer.tsx` and `reply-box.tsx` both wrap a plain `<textarea>`. Shared hook
`useMentionAutocomplete(ref)`:

1. on every change, read `selectionStart`, walk backwards to the nearest `@`
2. active only if that `@` is at string start or preceded by whitespace, and the
   run since it matches `/^[a-z0-9._-]{0,64}$/i` — **dots are legal in real handles**
3. debounce 150ms → call the RPC → render a listbox under the caret
4. `↑ ↓` move, `Enter`/`Tab` accept, `Esc` dismiss, click accepts
5. accept = splice `@handle ` over the token, restore caret after the trailing space

Accessibility: `role="listbox"`, `aria-activedescendant`, and the textarea keeps
focus throughout. Enter must NOT submit the post while the listbox is open.

No change to `mentionedHandles` — it re-parses the final body server-side and stays
the source of truth for notifications. Autocomplete is convenience only.

---

## 5. Nested replies

Riskiest item. `parent_id` already exists; the depth-1 cap is a guard in
[engage-actions.ts:187](../src/lib/community/engage-actions.ts), not a schema limit.

### Depth

Cap at **3** (root → reply → reply → reply). Beyond that, replying attaches to the
level-3 ancestor — same as most threaded UIs, and it bounds the recursion and the
indent width on mobile.

Depth is computed, not stored, so no backfill:

```sql
with recursive t as (
  select p.*, 1 as depth, array[p.created_at] as path
  from community_posts p where p.parent_id = p_post
  union all
  select c.*, t.depth + 1, t.path || c.created_at
  from community_posts c join t on c.parent_id = t.id
  where t.depth < 3
)
select ... from t order by path asc
```

The `path` array is what makes a thread render correctly: sorting by it yields
pre-order traversal — every child directly under its parent — so the client just
indents by `depth` and never has to build a tree.

`community_replies` therefore gains a `depth int` output column, which means
drop + recreate (batched into the same migration).

### Counts

`community_posts.reply_count` currently counts direct children. Decide once:
**`reply_count` stays direct children** (what the card shows next to a reply), and
the root card additionally shows a total when it differs. Total comes from the same
recursive query — no new counter column, no trigger rewrite, nothing to drift.

### Guard change

`if (parent.parent_id) return { error: "You can't reply to a reply." }` becomes a
depth lookup: walk up to 3 levels; at depth ≥ 3, re-point `parent_id` to the
depth-3 ancestor instead of erroring. Silent re-parenting beats a dead-end error.

### Notifications

`notifyReply` currently notifies the parent's author. Keep exactly that — notify
the direct parent author only, not the whole ancestor chain. One email per reply.

### UI

- indent per depth on desktop; on mobile flatten to a single indent step with an
  `@parent` prefix line (nested indents are unreadable under 400px)
- collapse subthreads over 3 children behind "Show N more replies"
- `/community/p/{id}` of a reply shows its ancestors above it as context

---

## 6. Quote reblog

A reblog is already a `community_posts` row with `reblog_of` set. Today its `body`
is always null. A quote is that same row **with a body**. No schema change.

### Rules

- `validatePost` allows a body on a reblog row, 500-char cap, same blocklist
- a quote may carry text only — no images/poll/YouTube in v1 (keeps the card sane)
- quoting is **not idempotent**: unlike a bare reblog you may quote the same post
  more than once. So `toggleReblog` stays as-is for the bare case, and quoting is a
  separate `createQuote(postId, body)` action that always inserts.
- the reblog button's filled/unfilled state continues to reflect **bare** reblogs
  only, so the toggle never lies
- `reblog_count` counts both. Bare and quote are both amplification.
- quoting a quote: allowed, but render only one level of nesting — the inner quote
  collapses to a "Quoting @handle" link.
- if the quoted post is deleted or hidden, the embedded card becomes
  "This post is unavailable"; the quote itself survives (its body is the author's
  own words). `community_feed` already left-joins the source, so this is a render
  branch, not a query change.

### Feed query

`community_feed`'s `src` CTE resolves a reblog row to its source and shows the
source's content. For a quote we need **both**: the quote's own body and the source
card. Add source-post output columns (`quoted_id`, `quoted_username`,
`quoted_body`, `quoted_type`, `quoted_images`, `quoted_created_at`), populated only
when `reblog_of is not null and r.body is not null`.

That's another output-column change → same drop-and-recreate, same migration.

### UI

- `post-menu.tsx` / `engagement-bar.tsx` reblog control becomes a small menu:
  **Reblog** (instant toggle, as today) | **Quote** (opens the composer prefilled)
- `post-card.tsx` renders the embedded source in a bordered inset card, non-
  interactive except a click-through to the permalink
- the OG card route `p/[id]/card` renders the quote's own body, not the source's

---

## 7. Composer — Tumblr-style modal + new post types

Today `composer.tsx` is an inline textarea with four types (`text`, `image`,
`youtube`, `poll`) selected by a small toolbar. The target is the Tumblr shape:
a **modal** with a clickable icon row that switches the editor, one type at a
time.

**Out of scope, permanently: audio and video upload.** Both mean a storage
bucket, size caps, and transcoding for a feed whose posts are ~200 characters.
`youtube` stays what it is — an embed of a link, not an upload.

### The type row

Icons, one active at a time, clicking swaps the editor body:

| Type | New? | Storage | Editor |
|---|---|---|---|
| Text | — | `body` | textarea |
| Photo | — | `images` jsonb | existing uploader (now also accepts `.gif`) |
| Quote | **new** | `body` = the quote, `meta.source` = attribution | large-type textarea + a "— source" field |
| Link | **new** | `meta.url` + unfurled `meta.title` / `meta.desc` / `meta.image` | url field, live preview card |
| Chat | **new** | `body`, raw `Name: line` per line | plain textarea, parsed at render only |
| Poll | — | `poll` jsonb | existing poll editor |
| YouTube | — | `youtube_id` | existing url field |

`type` check constraint grows `'quote','link','chat'`. Three render branches in
`post-card.tsx`; no new tables.

**GIF is not a type.** A GIF is a photo whose file is a `.gif` — the existing
uploader takes it with a mimetype allow-list addition. No Tenor/Giphy API, no new
key, no CSP entry, no third-party request per keystroke. If a real GIF *search*
is wanted later it's a separate spec.

### One `meta` column, not six

```sql
alter table public.community_posts add column if not exists meta jsonb;
```

`meta` holds `title`, `source`, `url`, `link_title`, `link_desc`, `link_image`,
`place` — all optional, all type-scoped, all validated in `validatePost` before
insert. Six nullable columns for fields that never appear together buys nothing
over one jsonb, and `images`/`poll` already set that precedent in this table.

`meta` is an output column on `community_feed`/`community_replies`/
`community_post`, so **it lands in PR A's drop-and-recreate** with the rest — not
in its own migration.

### The other composer fields

- **Title** — optional, ≤120 chars, offered on Text / Quote / Link / Chat only
  (a titled poll is noise). Renders as the card heading when present.
- **Tags** — `tags text[]` column + a GIN index. v1 is **display and filter
  only**: chips on the card, `?tag=seo` filters the feed via a new
  `p_tag text default null` param. Tag *pages*, trending, and following a tag stay
  out of scope. Cap 5 tags, each ≤32 chars, same blocklist as the body.
- **Location** — a free-text place label in `meta.place`, ≤60 chars. **No
  Geolocation API, no coordinates, no reverse geocoding.** The browser
  permission prompt is a privacy surface this feed does not need, and a typed
  "Nagpur" reads the same on the card.
- **Emoji** — a small static grid picker that splices into the textarea at the
  caret. No dependency: an emoji is a character, and the OS picker already
  exists. The grid is for people who don't know that.
- **Audience** — `audience text not null default 'everyone'` check
  `in ('everyone','followers')`. `followers` posts are filtered out of the feed
  for non-followers inside the same `rows_` CTE as mute. **Depends on §2**, so it
  ships after Follow exists, not before.
- **Schedule / draft** — one nullable column, three states:

  ```sql
  alter table public.community_posts add column if not exists publish_at timestamptz default now();
  -- null = draft, future = scheduled, past/now = live
  ```

  The feed filters `publish_at is not null and publish_at <= now()`. **No cron
  job** — a scheduled post simply becomes visible when the clock passes it, which
  is what a cron would have done, minus the cron. Drafts live at `/community/me`.
  "Post now ▾" gets Save draft / Schedule; the queue (Tumblr's drip-feed) is out
  of scope.

### Modal mechanics

Reuse the existing Radix `Dialog` (same primitive the nav drawer and join modal
use). `composer-fab.tsx` already opens the composer on mobile — it becomes the
single entry point on every breakpoint.

- switching type **keeps the body** if the new type can hold one, and warns
  before dropping images/poll options
- `Esc` / backdrop close prompts if anything was typed; nothing is auto-saved as
  a draft without an explicit Save draft
- the §4 mention autocomplete listbox must sit above the dialog overlay and must
  not close it on `Esc` while open (dismiss the listbox first)

### Validation

All of it goes in `validatePost` next to the existing rules, and is unit-tested
in `validate.test.ts` — that file is already the pattern (per-type accept/reject
cases). New cases: quote without body, link with a non-http scheme, chat with
zero `Name:` lines, >5 tags, tag charset, title length, `publish_at` in the past
on a scheduled post, `audience` outside the enum.

**Link unfurl is server-side and reuses `lib/tools/safe-fetch.ts`** — the
SSRF-safe fetcher already written for the SEO audit (#297), with its private-IP,
redirect, size, and time guards. A composer that fetches arbitrary user-supplied
URLs is exactly the endpoint that guard exists for. Do not write a second fetcher.

---

## 8. Live feed — "5 New Notes"

X shows "Show 35 posts" above the feed when rows arrive after you loaded. Ours
says **"5 New Notes"** (per the house vocabulary — they're notes, not tweets) and
refreshes in place.

### Applies to New only

The three sorts are **Hot = shuffled, New = newest first, Top = most upvoted in a
window**. A "new posts" pill only means something on **New**:

- on **Hot** the order is a seeded shuffle — a new post has no defined position
- on **Top** a brand-new post has no votes and belongs nowhere near the top

So the pill renders on `sort=new` only, on both the For you and Following tabs.

### Counting

New server action beside `loadFeedPage`, with the same public-endpoint discipline
(re-check auth, sanitize the query, clamp):

```ts
export async function countNewNotes(query: FeedQuery, sinceIso: string): Promise<number>
```

Backed by a tiny `community_new_count(p_since timestamptz, p_following boolean)`
RPC that applies the same mute / audience / demoted filters as the feed and
returns `least(count(*), 50)` — an uncapped count is a full scan for a number
nobody reads past "50+". Excludes the viewer's own posts: your own note appearing
as "1 New Note" is a bug that looks like one.

### Polling

`setInterval` every **45s**, in `feed-stream.tsx`, gated on
`document.visibilityState === "visible"` and paused while a fetch is in flight. A
background tab must not poll — that's the whole cost of this feature.

No websockets, no Supabase realtime subscription. One count query per visible
minute is cheaper than a socket per reader, and the payload is an integer.

### Refresh behaviour

Click the pill → refetch page 0 via the existing `loadFeedPage` and **prepend**
the new cards, then reset the `since` watermark. Deliberately:

- **no `router.refresh()`** — same rule as the optimistic engagement work; a full
  RSC refresh throws away the whole scroll position and every appended page
- scroll position is preserved by anchoring on the first previously-visible card
  (`scrollBy` the inserted height), so reading isn't interrupted
- the pill disappears on click and reappears on the next non-zero count

`since` is the `created_at` of the newest row currently on screen, held in a ref —
not a timestamp captured at mount, which would double-count after a prepend.

---

## Sequencing

Six PRs. The grouping is driven by the drop-and-recreate constraint, not by
feature affinity.

| PR | Contents | Why grouped | Est |
|---|---|---|---|
| **A** | **One migration** that drops + recreates `community_feed`, `community_replies`, `community_post` with ALL new params and columns at once: `p_seed`, `p_following`, `p_tag`, mute filters, audience filter, `publish_at` filter, `depth`, `quoted_*`, `meta`, `tags`. Adds the `community_posts` columns (`meta`, `tags`, `publish_at`, `audience`) and the widened `type` check. Ships **§1 Hot shuffle** only, wired end to end. | Every later feature needs a signature change to the same three functions. Doing it once means one migration to review and one manual SQL run, instead of six. Later PRs are then pure application code. | 4h |
| **B** | §2 Follow + §3 Mute (tables, RLS, actions, UI) | Both tables are new, both are read by the filters PR A already installed | 3.5h |
| **C** | §6 Quote reblog + §4 @mention autocomplete | Both are composer work, no DB coupling | 4h |
| **D** | §5 Nested replies | Riskiest; lands alone so a revert is clean | 3.5h |
| **E** | §7 Composer modal + Quote/Link/Chat types, GIF, emoji, title, tags, location, drafts + schedule | The columns already exist after A; this is the modal rewrite and the render branches. **Audience ships here only if B has landed** — otherwise it's held back, since `followers` visibility is meaningless without follows. | 5h |
| **F** | §8 "5 New Notes" pill + `community_new_count` | Small and self-contained, but it must be written against the *final* feed filters — so it lands last, after mute, audience, and `publish_at` are all in the `rows_` CTE. | 1.5h |

**~21.5h.** PR A must be verified against the real DB before B–F start — a wrong
column order in the recreate breaks the whole feed, and `mapRow` reads by name but
the RPC contract is positional in places.

### Verification per PR

- `npx tsc --noEmit` and **`next build` exit code** — a client importing
  `server-only` type-checks fine and still breaks the build
- unit tests next to the logic: seeded-shuffle stability (same seed + different
  offsets never repeat or skip a row), `sanitizeQuery` seed clamping, depth
  re-parenting, quote validation, every new `validatePost` branch (§7), and the
  `since`-watermark arithmetic (§8)
- in-memory Supabase mocks do NOT prove the schema — grep the migration for every
  column a test asserts on
- after merge: **check prod HTML.** Auto-deploy has failed silently before; a merge
  is not a deploy.

### Explicitly out of scope

Search, hashtag pages, trending, in-app notification centre, DMs, edit-post, view
counts, alt text, lists, Tumblr's post queue, GIF *search* (Tenor/Giphy).

**Audio and video upload are out permanently**, not deferred — see §7. YouTube
embeds cover the video case at zero storage cost.

Follow is the prerequisite for a personalized feed; the rest are separate specs.
