# Community — Plan 4: Engage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the engagement bar real — upvote (heart) / downvote (rotten egg) / reply / reblog / share / bookmark, with optimistic UI and click motion. Award stays disabled. Ship the three routes the left nav already links to: post detail (`/community/p/[id]`), bookmarks, and profile.

**Architecture:** No new tables — Plan 1's schema (`community_votes`, `community_bookmarks`, `community_posts.parent_id/reblog_of`) and its counter triggers already cover this. One migration adds read RPCs (badges must be computed in SQL) and extends `community_feed` with `p_author` / `p_bookmarked` so **one** ranking function serves the feed, the bookmarks page, and profiles. Writes are `"use server"` actions using `supabaseAuthServer()` so RLS is the final authority; the client bar holds optimistic state and rolls back on error.

**Tech Stack:** Next.js 16.2.9 server actions, React 19 (`useTransition`), Supabase RLS, CSS keyframes, vitest.

## Global Constraints

- **Target project:** OWN Supabase, ref `oyzzgjrefkppqkxjccot`. NEVER the BAS project.
- **Manual SQL:** `20260710000005_community_engage.sql` is applied MANUALLY by the user.
- **Viewer identity always comes from `auth.uid()`**, never a parameter. (Plan 2 shipped an IDOR by trusting a `p_viewer` arg — do not reintroduce it.)
- **Writes go through `supabaseAuthServer()`** (user-scoped) so RLS enforces ownership. `supabaseAdmin()` is for storage only.
- **Counter columns are trigger-maintained.** Never hand-update `up_count`, `down_count`, `reply_count`, `reblog_count`.
- **Replies are 1-level.** A reply's `parent_id` must reference a ROOT post (`parent_id is null`). Enforce in the action.
- **Post gate:** every write requires `community_can_post()` (verified email, not banned).
- **Limits:** reply body ≤ 500 chars, blocklist-checked (reuse `validatePost`).
- **Style:** monochrome, no emoji, `text-brand`/`bg-brand` tokens only.
- **Motion must respect `prefers-reduced-motion: reduce`** — no animation, instant state change.
- **Server action convention:** validate → return typed `{ error }`, never throw for user errors; `revalidatePath` after mutation.
- **No new dependencies.**

---

### Task 1: Engage migration — read RPCs + generalized feed

**Files:**
- Create: `supabase/migrations/20260710000005_community_engage.sql`

**Interfaces:**
- Produces:
  - `community_feed(p_sort, p_window, p_limit, p_offset, p_author text default null, p_bookmarked boolean default false)` — same return shape as before, plus two optional filters. Existing 4-named-arg calls keep working (defaults).
  - `community_post(p_id uuid)` — one root post with author, badge, viewer state.
  - `community_replies(p_post uuid, p_limit int, p_offset int)` — that post's replies, oldest first.

Note on the drop: the previously-applied `community_feed(text,text,int,int)` must be dropped before creating the 6-arg version, or Postgres keeps both as overloads and PostgREST calls become ambiguous.

- [ ] **Step 1: Write the migration**

```sql
-- =====================================================================
-- /community — engage: generalized feed + post/replies read RPCs.
-- Target: OWN Supabase (ref oyzzgjrefkppqkxjccot). Apply MANUALLY. Idempotent.
-- Depends on 20260710000001 + 20260710000003.
-- Viewer identity is auth.uid() everywhere — never a parameter.
-- =====================================================================

-- Old 4-arg version must go, or the 6-arg one becomes an ambiguous overload.
drop function if exists public.community_feed(text, text, int, int);

create or replace function public.community_feed(
  p_sort       text    default 'new',
  p_window     text    default 'all',
  p_limit      int     default 20,
  p_offset     int     default 0,
  p_author     text    default null,   -- username filter (profile pages)
  p_bookmarked boolean default false   -- only the viewer's bookmarks
)
returns table (
  id uuid, user_id uuid, username text, display_name text, badge text,
  type text, body text, images jsonb, youtube_id text, poll jsonb,
  up_count int, down_count int, score int, reply_count int, reblog_count int,
  reblog_of uuid, created_at timestamptz,
  viewer_vote smallint, viewer_bookmarked boolean
)
language sql stable security definer set search_path = public as $$
  with base as (
    select p.*,
           (p.up_count - p.down_count) as score,
           (p.down_count > p.up_count and (p.up_count + p.down_count) >= 5) as is_controversial
    from public.community_posts p
    join public.profiles pr0 on pr0.id = p.user_id
    where p.parent_id is null
      and not p.hidden
      and not pr0.banned
      and (p_author is null or lower(pr0.username) = lower(p_author))
      and (not p_bookmarked or exists (
            select 1 from public.community_bookmarks bm
            where bm.post_id = p.id and bm.user_id = auth.uid()))
  ),
  filtered as (
    select * from base
    where not demoted
      and (case when p_sort = 'controversial' then is_controversial
                else not is_controversial end)
      and (case
             when p_sort = 'top' and p_window <> 'all'
               then created_at >= now() - (case p_window
                      when 'today' then interval '1 day'
                      when 'week'  then interval '7 days'
                      when 'month' then interval '30 days'
                      when 'year'  then interval '365 days'
                      else interval '1000 years' end)
             else true end)
  )
  select f.id, f.user_id, pr.username, pr.display_name,
         public.community_badge(f.user_id) as badge,
         f.type, f.body, f.images, f.youtube_id, f.poll,
         f.up_count, f.down_count, f.score, f.reply_count, f.reblog_count,
         f.reblog_of, f.created_at,
         v.value as viewer_vote,
         (b.post_id is not null) as viewer_bookmarked
  from filtered f
  join public.profiles pr on pr.id = f.user_id
  left join public.community_votes     v on v.post_id = f.id and v.user_id = auth.uid()
  left join public.community_bookmarks b on b.post_id = f.id and b.user_id = auth.uid()
  order by
    case when p_sort = 'new' then extract(epoch from f.created_at) end desc nulls last,
    case when p_sort = 'top' then f.score end desc nulls last,
    case when p_sort = 'hot' then
      sign(f.score) * log(greatest(abs(f.score), 1)) + extract(epoch from f.created_at) / 45000
    end desc nulls last,
    case when p_sort = 'controversial' then
      power(greatest(f.up_count + f.down_count, 1),
            least(f.up_count, f.down_count)::numeric / greatest(f.up_count, f.down_count, 1))
    end desc nulls last,
    f.created_at desc
  limit greatest(p_limit, 0) offset greatest(p_offset, 0);
$$;

grant execute on function public.community_feed(text, text, int, int, text, boolean) to anon, authenticated;

-- ---------- single root post ----------
create or replace function public.community_post(p_id uuid)
returns table (
  id uuid, user_id uuid, username text, display_name text, badge text,
  type text, body text, images jsonb, youtube_id text, poll jsonb,
  up_count int, down_count int, score int, reply_count int, reblog_count int,
  reblog_of uuid, created_at timestamptz,
  viewer_vote smallint, viewer_bookmarked boolean
)
language sql stable security definer set search_path = public as $$
  select p.id, p.user_id, pr.username, pr.display_name,
         public.community_badge(p.user_id) as badge,
         p.type, p.body, p.images, p.youtube_id, p.poll,
         p.up_count, p.down_count, (p.up_count - p.down_count) as score,
         p.reply_count, p.reblog_count, p.reblog_of, p.created_at,
         v.value as viewer_vote,
         (b.post_id is not null) as viewer_bookmarked
  from public.community_posts p
  join public.profiles pr on pr.id = p.user_id
  left join public.community_votes     v on v.post_id = p.id and v.user_id = auth.uid()
  left join public.community_bookmarks b on b.post_id = p.id and b.user_id = auth.uid()
  where p.id = p_id and not p.hidden and not pr.banned;
$$;

grant execute on function public.community_post(uuid) to anon, authenticated;

-- ---------- replies to a post (oldest first) ----------
create or replace function public.community_replies(
  p_post   uuid,
  p_limit  int default 50,
  p_offset int default 0
)
returns table (
  id uuid, user_id uuid, username text, display_name text, badge text,
  type text, body text, images jsonb, youtube_id text, poll jsonb,
  up_count int, down_count int, score int, reply_count int, reblog_count int,
  reblog_of uuid, created_at timestamptz,
  viewer_vote smallint, viewer_bookmarked boolean
)
language sql stable security definer set search_path = public as $$
  select p.id, p.user_id, pr.username, pr.display_name,
         public.community_badge(p.user_id) as badge,
         p.type, p.body, p.images, p.youtube_id, p.poll,
         p.up_count, p.down_count, (p.up_count - p.down_count) as score,
         p.reply_count, p.reblog_count, p.reblog_of, p.created_at,
         v.value as viewer_vote,
         (b.post_id is not null) as viewer_bookmarked
  from public.community_posts p
  join public.profiles pr on pr.id = p.user_id
  left join public.community_votes     v on v.post_id = p.id and v.user_id = auth.uid()
  left join public.community_bookmarks b on b.post_id = p.id and b.user_id = auth.uid()
  where p.parent_id = p_post and not p.hidden and not pr.banned
  order by p.created_at asc
  limit greatest(p_limit, 0) offset greatest(p_offset, 0);
$$;

grant execute on function public.community_replies(uuid, int, int) to anon, authenticated;
```

- [ ] **Step 2: Commit. Hand to user for manual apply.** Verify:
```sql
select count(*) from public.community_feed('new','all',5,0);              -- existing call still works
select count(*) from public.community_feed('new','all',5,0,null,false);   -- 6-arg form
select count(*) from public.community_post((select id from public.community_posts limit 1));
```

---

### Task 2: Engage server actions

**Files:**
- Create: `src/lib/community/engage-actions.ts`

**Interfaces:**
- Produces:
  ```ts
  export type EngageResult = { ok: true } | { error: string };
  export async function toggleVote(postId: string, value: 1 | -1): Promise<EngageResult>;
  export async function toggleBookmark(postId: string): Promise<EngageResult>;
  export async function toggleReblog(postId: string): Promise<EngageResult>;
  export async function createReply(postId: string, body: string): Promise<EngageResult>;
  ```
- Consumed by the client engagement bar (Task 4) and the reply box (Task 6).

Semantics:
- `toggleVote`: no existing vote → insert. Same value → delete (un-vote). Opposite value → update. Counter triggers keep `up_count`/`down_count` right in all three paths.
- `toggleBookmark` / `toggleReblog`: insert if absent, delete if present.
- `toggleReblog` inserts a `community_posts` row with `reblog_of = postId`, `type='text'`, `body=null`. Un-reblog deletes the viewer's own reblog row.
- `createReply`: parent must be a ROOT post; reuse `validatePost` for body rules.

- [ ] **Step 1: Write it**

```ts
"use server";
import { revalidatePath } from "next/cache";
import { supabaseAuthServer } from "@/lib/supabase/auth-server";
import { validatePost } from "./validate";

export type EngageResult = { ok: true } | { error: string };

async function gate() {
  const sb = await supabaseAuthServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { sb, user: null, error: "Sign in first." as const };
  const { data: canPost } = await sb.rpc("community_can_post");
  if (!canPost) return { sb, user: null, error: "Verify your email first." as const };
  return { sb, user, error: null };
}

export async function toggleVote(postId: string, value: 1 | -1): Promise<EngageResult> {
  const { sb, user, error } = await gate();
  if (error || !user) return { error: error ?? "Sign in first." };

  const { data: existing } = await sb
    .from("community_votes")
    .select("value")
    .eq("post_id", postId)
    .eq("user_id", user.id)
    .maybeSingle();

  let err;
  if (!existing) {
    ({ error: err } = await sb.from("community_votes").insert({ post_id: postId, user_id: user.id, value }));
  } else if (existing.value === value) {
    ({ error: err } = await sb.from("community_votes").delete().eq("post_id", postId).eq("user_id", user.id));
  } else {
    ({ error: err } = await sb.from("community_votes").update({ value }).eq("post_id", postId).eq("user_id", user.id));
  }
  if (err) return { error: err.message };
  revalidatePath("/community");
  return { ok: true };
}

export async function toggleBookmark(postId: string): Promise<EngageResult> {
  const { sb, user, error } = await gate();
  if (error || !user) return { error: error ?? "Sign in first." };

  const { data: existing } = await sb
    .from("community_bookmarks")
    .select("post_id")
    .eq("post_id", postId)
    .eq("user_id", user.id)
    .maybeSingle();

  const { error: err } = existing
    ? await sb.from("community_bookmarks").delete().eq("post_id", postId).eq("user_id", user.id)
    : await sb.from("community_bookmarks").insert({ post_id: postId, user_id: user.id });
  if (err) return { error: err.message };
  revalidatePath("/community");
  return { ok: true };
}

export async function toggleReblog(postId: string): Promise<EngageResult> {
  const { sb, user, error } = await gate();
  if (error || !user) return { error: error ?? "Sign in first." };

  const { data: existing } = await sb
    .from("community_posts")
    .select("id")
    .eq("reblog_of", postId)
    .eq("user_id", user.id)
    .maybeSingle();

  const { error: err } = existing
    ? await sb.from("community_posts").delete().eq("id", existing.id)
    : await sb.from("community_posts").insert({ user_id: user.id, type: "text", reblog_of: postId });
  if (err) return { error: err.message };
  revalidatePath("/community");
  return { ok: true };
}

export async function createReply(postId: string, body: string): Promise<EngageResult> {
  const { sb, user, error } = await gate();
  if (error || !user) return { error: error ?? "Sign in first." };

  const valid = validatePost({ type: "text", body, imageCount: 0, youtubeUrl: "" });
  if (!valid.ok) return { error: valid.error };

  // 1-level threading: you may only reply to a root post.
  const { data: parent } = await sb
    .from("community_posts")
    .select("id, parent_id")
    .eq("id", postId)
    .maybeSingle();
  if (!parent) return { error: "That post no longer exists." };
  if (parent.parent_id) return { error: "You can't reply to a reply." };

  const { error: err } = await sb.from("community_posts").insert({
    user_id: user.id,
    parent_id: postId,
    type: "text",
    body: valid.body,
  });
  if (err) return { error: err.message };
  revalidatePath(`/community/p/${postId}`);
  revalidatePath("/community");
  return { ok: true };
}
```

- [ ] **Step 2: `tsc` clean. Commit.**

---

### Task 3: Click motion (CSS)

**Files:**
- Modify: `src/app/globals.css`

**Interfaces:**
- Produces utility classes `animate-pop` (heart), `animate-wobble` (rotten egg), both no-ops under `prefers-reduced-motion: reduce`.

- [ ] **Step 1: Append to the `@layer utilities` block**

```css
@keyframes community-pop {
  0%   { transform: scale(1); }
  40%  { transform: scale(1.35); }
  100% { transform: scale(1); }
}
@keyframes community-wobble {
  0%, 100% { transform: rotate(0deg); }
  25%      { transform: rotate(-14deg); }
  75%      { transform: rotate(14deg); }
}
.animate-pop    { animation: community-pop 320ms var(--ease-out-quint); }
.animate-wobble { animation: community-wobble 380ms var(--ease-out-quint); }

@media (prefers-reduced-motion: reduce) {
  .animate-pop, .animate-wobble { animation: none; }
}
```

- [ ] **Step 2: Commit.**

---

### Task 4: Optimistic engagement bar (client)

**Files:**
- Rewrite: `src/components/community/engagement-bar.tsx`

**Interfaces:**
- Consumes: `toggleVote`, `toggleBookmark`, `toggleReblog` (Task 2), `FeedPost`.
- Produces: `<EngagementBar post={FeedPost} />` — now `"use client"`, optimistic, with rollback on error, motion on click, share = copy link, award still disabled.

Optimistic vote math (the only subtle part). From current `viewerVote` and clicked `value`:
- `viewerVote === value` → un-vote: that counter −1, vote → 0.
- `viewerVote === 0` → that counter +1, vote → value.
- `viewerVote === -value` → opposite counter −1, this counter +1, vote → value.

- [ ] **Step 1: Write it**

```tsx
"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Heart, Egg, MessagesSquare, Repeat2, Send, Bookmark, Medal } from "lucide-react";
import { cn, compactNumber } from "@/lib/utils";
import type { FeedPost } from "@/lib/community/types";
import { toggleVote, toggleBookmark, toggleReblog } from "@/lib/community/engage-actions";

const ITEM =
  "inline-flex items-center gap-1.5 rounded-btn px-2 py-1 text-xs text-muted-foreground transition-ui hover:bg-accent disabled:opacity-50";

export function EngagementBar({ post }: { post: FeedPost }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [vote, setVote] = useState<-1 | 0 | 1>(post.viewerVote);
  const [up, setUp] = useState(post.upCount);
  const [down, setDown] = useState(post.downCount);
  const [marked, setMarked] = useState(post.viewerBookmarked);
  const [reblogs, setReblogs] = useState(post.reblogCount);
  const [reblogged, setReblogged] = useState(false);
  const [burst, setBurst] = useState<"up" | "down" | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onVote(value: 1 | -1) {
    const prev = { vote, up, down };
    // optimistic
    if (vote === value) {
      setVote(0);
      value === 1 ? setUp(up - 1) : setDown(down - 1);
    } else if (vote === 0) {
      setVote(value);
      value === 1 ? setUp(up + 1) : setDown(down + 1);
    } else {
      setVote(value);
      if (value === 1) { setUp(up + 1); setDown(down - 1); }
      else { setDown(down + 1); setUp(up - 1); }
    }
    setBurst(value === 1 ? "up" : "down");
    setTimeout(() => setBurst(null), 400);

    start(async () => {
      const r = await toggleVote(post.id, value);
      if ("error" in r) {
        setVote(prev.vote); setUp(prev.up); setDown(prev.down);
        setError(r.error);
      } else {
        router.refresh();
      }
    });
  }

  function onBookmark() {
    const prev = marked;
    setMarked(!marked);
    start(async () => {
      const r = await toggleBookmark(post.id);
      if ("error" in r) { setMarked(prev); setError(r.error); }
    });
  }

  function onReblog() {
    const prev = { reblogged, reblogs };
    setReblogged(!reblogged);
    setReblogs(reblogged ? reblogs - 1 : reblogs + 1);
    start(async () => {
      const r = await toggleReblog(post.id);
      if ("error" in r) { setReblogged(prev.reblogged); setReblogs(prev.reblogs); setError(r.error); }
      else router.refresh();
    });
  }

  async function onShare() {
    const url = `${window.location.origin}/community/p/${post.id}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setError("Couldn't copy the link.");
    }
  }

  return (
    <div>
      <div className="mt-2 flex items-center gap-1">
        <button type="button" disabled={pending} onClick={() => onVote(1)}
          aria-label="Upvote" aria-pressed={vote === 1}
          className={cn(ITEM, vote === 1 && "text-brand")}>
          <Heart className={cn("size-4", burst === "up" && "animate-pop")} /> {compactNumber(up)}
        </button>

        <button type="button" disabled={pending} onClick={() => onVote(-1)}
          aria-label="Downvote" aria-pressed={vote === -1}
          className={cn(ITEM, vote === -1 && "text-foreground")}>
          <Egg className={cn("size-4", burst === "down" && "animate-wobble")} /> {compactNumber(down)}
        </button>

        <a href={`/community/p/${post.id}`} className={ITEM} aria-label="Replies">
          <MessagesSquare className="size-4" /> {compactNumber(post.replyCount)}
        </a>

        <button type="button" disabled={pending} onClick={onReblog}
          aria-label="Reblog" aria-pressed={reblogged}
          className={cn(ITEM, reblogged && "text-brand")}>
          <Repeat2 className="size-4" /> {compactNumber(reblogs)}
        </button>

        <button type="button" onClick={onShare} aria-label="Share link" className={ITEM}>
          <Send className="size-4" /> {copied && <span>Copied</span>}
        </button>

        <button type="button" disabled={pending} onClick={onBookmark}
          aria-label="Bookmark" aria-pressed={marked}
          className={cn(ITEM, marked && "text-brand")}>
          <Bookmark className="size-4" />
        </button>

        <span className={cn(ITEM, "cursor-not-allowed opacity-40")} title="Awards coming soon">
          <Medal className="size-4" />
        </span>
      </div>
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}
```

Note: `reblogged` starts `false` because the feed RPC does not report whether the viewer reblogged. That means the button reads "not reblogged" on first paint even if they did. Accept for now and say so in code — a `viewer_reblogged` column can join in later if it matters. `// ponytail: no viewer_reblogged in the RPC; first paint assumes false.`

- [ ] **Step 2: `tsc` + `eslint` clean. Commit.**

---

### Task 5: Feed queries for post, replies, filters

**Files:**
- Modify: `src/lib/community/queries.ts`

**Interfaces:**
- Produces:
  ```ts
  export async function listFeed(opts: { sort; window; limit?; offset?; author?: string; bookmarked?: boolean }): Promise<FeedPost[]>;
  export async function getPost(id: string): Promise<FeedPost | null>;
  export async function listReplies(postId: string): Promise<FeedPost[]>;
  ```
- A single `mapRow` helper is extracted since four call sites now share the RPC row shape (DRY — the mapper was already duplicated once).

- [ ] **Step 1: Extract `mapRow`, add `author`/`bookmarked` to `listFeed`, add `getPost` + `listReplies`** (all call the RPCs from Task 1, all via `supabaseAuthServer()` so `auth.uid()` is real).

- [ ] **Step 2: `tsc` clean. Commit.**

---

### Task 6: Post detail page + reply box

**Files:**
- Create: `src/app/community/p/[id]/page.tsx`
- Create: `src/components/community/reply-box.tsx`

**Interfaces:**
- Consumes: `getPost`, `listReplies` (Task 5), `createReply` (Task 2), `PostCard`.
- Produces: `/community/p/[id]` — the root post, a reply box (for eligible users), then replies oldest-first. `notFound()` when the post is missing/hidden.

Next 16: `params` is a Promise — `const { id } = await params`.

- [ ] **Step 1: Reply box** — client component, `useTransition`, calls `createReply(postId, body)`, clears on success, shows `{error}` inline, disabled over 500 chars.
- [ ] **Step 2: Post page** — server component; `const post = await getPost(id); if (!post) notFound();`
- [ ] **Step 3: Verify** — `GET /community/p/<seeded-id>` → 200 and contains the post body; `GET /community/p/00000000-0000-0000-0000-000000000000` → 404.
- [ ] **Step 4: Commit.**

---

### Task 7: Bookmarks + profile pages

**Files:**
- Create: `src/app/community/bookmarks/page.tsx`
- Create: `src/app/community/me/page.tsx`

Both routes are already linked from the left nav and currently 404 — this closes that.

**Interfaces:**
- `bookmarks`: `requireMember`-style gate → redirect to login if signed out; else `listFeed({ sort:"new", window:"all", bookmarked:true })`. Empty state: "Nothing bookmarked yet."
- `me`: signed out → redirect to login. Signed in → read the viewer's `profiles.username`, then `listFeed({ sort:"new", window:"all", author:username })`. Header shows avatar, `@handle`, badge, post count. Empty state: "You haven't posted yet."

- [ ] **Step 1: Write both pages.**
- [ ] **Step 2: Verify** — signed out, both 307 to `/members/login`. `tsc` + `eslint` clean.
- [ ] **Step 3: Commit.**

---

### Task 8: Full verification

- [ ] `npx vitest run` → all suites pass.
- [ ] `npx tsc --noEmit` → exit 0.
- [ ] `npx eslint src/lib/community src/components/community src/app/community` → exit 0.
- [ ] `npx next build` → **check its own exit code** (a pipe masks it). A client component transitively importing a `server-only` module passes `tsc` but fails here.
- [ ] Dev server: `/community` 200 with the engagement bar; `/community/p/<id>` 200; `/community/bookmarks` and `/community/me` 307 when signed out.
- [ ] User applies `20260710000005_community_engage.sql`, then signs in and exercises: upvote → count +1 and persists on reload; click again → un-vote; downvote → switches; reply appears under the post and `reply_count` increments; bookmark shows on `/community/bookmarks`; reblog increments `reblog_count`; share copies the link.

---

## Self-Review

**Spec coverage (design Phase 4):** upvote/downvote ✓ (Tasks 2, 4) · reply, 1-level ✓ (Tasks 2, 6) · reblog ✓ · share ✓ · bookmark ✓ · optimistic UI + click motion ✓ (Tasks 3, 4) · award disabled ✓. Nav routes `/community/bookmarks` + `/community/me` ✓ (Task 7).

**No new tables** — Plan 1's schema and counter triggers already cover votes/bookmarks/replies/reblogs. Only read RPCs are added, because badges must be computed in SQL.

**Security:** every RPC and action derives the viewer from `auth.uid()`; no `p_viewer`-style parameter is reintroduced. Writes run as the user, so `community_votes_self` / `community_bookmarks_self` / `community_posts_insert|delete` RLS is the final authority — a forged `postId` cannot mutate another user's rows.

**Known ceilings (stated in code):**
- `viewer_reblogged` is not in the RPC, so the reblog button's first paint assumes "not reblogged".
- Optimistic counters can drift from a concurrent voter until `router.refresh()`; the trigger-maintained columns are the source of truth on reload.

**Placeholder scan:** Tasks 5–7 give interfaces + exact behavior rather than full JSX for pages that are near-copies of the already-written feed page; every non-obvious unit (RPC SQL, actions, optimistic math, motion) carries literal code. No "TBD".
