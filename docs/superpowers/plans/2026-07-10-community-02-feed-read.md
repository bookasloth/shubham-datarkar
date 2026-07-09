# Community — Plan 2: Feed Read Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A working, read-only, SEO-indexed `/community` page — X-style 3-column layout, a ranked feed (New / Hot / Top+window / Controversial), post cards with badges + initials avatars, anonymous metering wall, and 2 ad slots. No posting or engagement writes yet (Plans 3–4).

**Architecture:** `/community` is a **public top-level route** (`src/app/community/`) with its own 3-column layout — NOT the `/members` shell, NOT gated by any capability. Ranking lives in one SQL RPC (`community_feed`) because Hot/Controversial need log+decay math the JS query builder can't express. A thin query layer (`src/lib/community/queries.ts`) calls the RPC. Server components render the feed for SEO; a few small client islands handle the sort dropdown and the metering overlay. Engagement-bar buttons render but are inert placeholders wired in Plan 4.

**Tech Stack:** Next.js 16.2.9 (App Router, async `searchParams`), React 19, Supabase (`@supabase/ssr`), Tailwind v4, `lucide-react`, `vitest`.

## Global Constraints

- **Read the Next docs first:** this is Next **16.2.9** with breaking changes vs training data. Before writing any `page.tsx`/`layout.tsx`, skim `node_modules/next/dist/docs/` for the current App Router / `searchParams` / `metadata` APIs (per `AGENTS.md`). `searchParams` and `cookies()` are **async** (`await`).
- **Style:** monochrome + no-emoji. Brand accent = `--brand` (`#ff4800` at top level) via `text-brand`/`bg-brand`/`border-brand` — never hardcode the hex. Radii `rounded-btn` (4px) / `rounded-input` (8px) / `rounded-card` (12px). Headings `font-display`. Custom transition utility `transition-ui`.
- **Supabase clients:** `supabaseAnon()` for anon public reads; `supabaseAuthServer()` when the viewer may be logged in (RLS as user); `supabaseAdmin()` only for RLS-bypassing needs. All from `src/lib/supabase/*`, `import "server-only"`.
- **Session:** `getMemberContext()` from `src/lib/members/session.ts` (cached) tells us `user` (null if anon). Do NOT `requireMember` — the feed is public.
- **Manual SQL:** the feed RPC ships as a new migration `20260710000003_community_feed.sql`, applied MANUALLY by the user (per project workflow). Plan 1's `20260710000001_community_schema.sql` is already live.
- **Server-action / mutation conventions** apply in later plans; Plan 2 is read-only except the RPC.
- **No new dependencies.** Everything needed is installed.
- **Test runner:** `vitest`. Pure functions get unit tests; UI is verified via the preview server.

---

### Task 1: Pure utilities — initials, avatar color, relative time, youtube id

**Files:**
- Modify: `src/lib/utils.ts` (append)
- Test: `src/lib/utils.test.ts` (create or append if it exists)

**Interfaces:**
- Produces:
  - `getInitials(name: string): string` — up to 2 uppercase letters.
  - `avatarColor(seed: string): string` — a deterministic HSL string from a handle, for the initials-avatar background.
  - `timeAgo(input: string | Date): string` — "5m", "3h", "2d", "4w", else `formatDate`.
  - `parseYouTubeId(url: string): string | null` — 11-char video id or null.
- Consumed by: post card + avatar (Tasks 4–5), and youtube posts later.

- [ ] **Step 1: Write the failing tests**

Append to `src/lib/utils.test.ts` (create with the import line if absent):

```ts
import { describe, it, expect } from "vitest";
import { getInitials, avatarColor, timeAgo, parseYouTubeId } from "./utils";

describe("getInitials", () => {
  it("takes first letters of two words", () => expect(getInitials("Shubham Datarkar")).toBe("SD"));
  it("single word → one letter", () => expect(getInitials("alfazy")).toBe("A"));
  it("handles empty", () => expect(getInitials("")).toBe("?"));
});

describe("avatarColor", () => {
  it("is deterministic", () => expect(avatarColor("sloth")).toBe(avatarColor("sloth")));
  it("differs by seed", () => expect(avatarColor("a")).not.toBe(avatarColor("bbbb")));
  it("returns an hsl string", () => expect(avatarColor("x")).toMatch(/^hsl\(/));
});

describe("timeAgo", () => {
  it("seconds → m/h/d", () => {
    const now = Date.now();
    expect(timeAgo(new Date(now - 5 * 60_000))).toBe("5m");
    expect(timeAgo(new Date(now - 3 * 3_600_000))).toBe("3h");
    expect(timeAgo(new Date(now - 2 * 86_400_000))).toBe("2d");
  });
  it("just now → 'now'", () => expect(timeAgo(new Date())).toBe("now"));
});

describe("parseYouTubeId", () => {
  it("watch url", () => expect(parseYouTubeId("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ"));
  it("short url", () => expect(parseYouTubeId("https://youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ"));
  it("rejects junk", () => expect(parseYouTubeId("https://example.com")).toBeNull());
});
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `npx vitest run src/lib/utils.test.ts`
Expected: FAIL — `getInitials is not a function` (etc).

- [ ] **Step 3: Implement in `src/lib/utils.ts`**

Append:

```ts
export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.charAt(0).toUpperCase();
  return (parts[0]!.charAt(0) + parts[parts.length - 1]!.charAt(0)).toUpperCase();
}

export function avatarColor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 360;
  return `hsl(${h} 45% 42%)`; // mid-saturation so white initials stay legible
}

export function timeAgo(input: string | Date): string {
  const then = new Date(input).getTime();
  const s = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (s < 45) return "now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  const w = Math.floor(d / 7);
  if (w < 5) return `${w}w`;
  return formatDate(input);
}

export function parseYouTubeId(url: string): string | null {
  try {
    const u = new URL(url);
    let id = "";
    if (u.hostname === "youtu.be") id = u.pathname.slice(1);
    else if (u.hostname.endsWith("youtube.com")) id = u.searchParams.get("v") ?? "";
    return /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}
```
(`formatDate` already exists in this file — reuse it.)

- [ ] **Step 4: Run tests, verify pass**

Run: `npx vitest run src/lib/utils.test.ts`
Expected: PASS (all).

- [ ] **Step 5: Commit**

```bash
git add src/lib/utils.ts src/lib/utils.test.ts
git commit -m "feat(community): initials, avatar color, timeAgo, youtube-id utils"
```

---

### Task 2: Feed ranking RPC (`community_feed`) migration

**Files:**
- Create: `supabase/migrations/20260710000003_community_feed.sql`

**Interfaces:**
- Produces: `public.community_feed(p_sort text, p_window text, p_viewer uuid, p_limit int, p_offset int)` returning one row per root post with author + badge + counts + the viewer's own vote/bookmark state. Consumed by `listFeed` (Task 3).
- Sort keys: `'new' | 'hot' | 'top' | 'controversial'`. Window (for `top`): `'all' | 'today' | 'week' | 'month' | 'year'`.

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260710000003_community_feed.sql`:

```sql
-- =====================================================================
-- /community — feed read RPC (ranking lives here; JS can't express it).
-- Target: OWN Supabase (ref oyzzgjrefkppqkxjccot). Apply MANUALLY. Idempotent.
-- Depends on 20260710000001_community_schema.sql.
-- =====================================================================

-- ponytail: security definer so community_badge (reads auth.users/supports)
-- works and hidden filtering is centralized. p_viewer only drives the
-- viewer's OWN vote/bookmark join, so the server MUST pass the authenticated
-- user's id (never a client-supplied one).
create or replace function public.community_feed(
  p_sort   text default 'new',
  p_window text default 'all',
  p_viewer uuid default null,
  p_limit  int  default 20,
  p_offset int  default 0
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
           (p.up_count - p.down_count)                                as score,
           (p.up_count + p.down_count)                                as n,
           (p.down_count > p.up_count and (p.up_count + p.down_count) >= 5) as is_controversial
    from public.community_posts p
    where p.parent_id is null   -- feed shows root posts + reblogs, not replies
      and not p.hidden
  ),
  filtered as (
    select * from base
    where (case when p_sort = 'controversial' then is_controversial
                else (not is_controversial and not demoted) end)
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
  left join public.community_votes     v on v.post_id = f.id and v.user_id = p_viewer
  left join public.community_bookmarks b on b.post_id = f.id and b.user_id = p_viewer
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
    f.created_at desc  -- stable tiebreak for all sorts
  limit greatest(p_limit, 0) offset greatest(p_offset, 0);
$$;

grant execute on function public.community_feed(text, text, uuid, int, int) to anon, authenticated;
```

- [ ] **Step 2: Commit the migration file**

```bash
git add supabase/migrations/20260710000003_community_feed.sql
git commit -m "feat(community): community_feed ranking RPC (new/hot/top/controversial)"
```

- [ ] **Step 3: Hand to user for manual apply + verify**

Tell the user: "Run `supabase/migrations/20260710000003_community_feed.sql` in your Supabase SQL editor." Then verify with:

```sql
-- returns rows without error (empty feed is fine on a fresh table)
select id, username, badge, score from public.community_feed('new','all',null,5,0);
select id, score from public.community_feed('hot','all',null,5,0);
select id from public.community_feed('controversial','all',null,5,0);
```
Expected: three queries succeed (0+ rows). Any error = fix the RPC and re-apply.

---

### Task 3: Feed query layer

**Files:**
- Create: `src/lib/community/queries.ts`
- Create: `src/lib/community/types.ts`

**Interfaces:**
- Consumes: `community_feed` RPC (Task 2), `community_ads` table.
- Produces:
  - `type FeedSort = "new" | "hot" | "top" | "controversial"`, `type FeedWindow = "all" | "today" | "week" | "month" | "year"`.
  - `type FeedPost = { id; userId; username; displayName; badge: "grey"|"orange"|"gold"; type: "text"|"image"|"poll"|"youtube"; body; images; youtubeId; poll; upCount; downCount; score; replyCount; reblogCount; reblogOf; createdAt; viewerVote: -1|0|1; viewerBookmarked }`.
  - `listFeed(opts: { sort: FeedSort; window: FeedWindow; viewerId: string | null; limit?: number; offset?: number }): Promise<FeedPost[]>`.
  - `type AdSlot = { slot: 1|2; imagePath: string|null; linkUrl: string|null }`; `listAds(): Promise<AdSlot[]>`.

- [ ] **Step 1: Write `types.ts`**

Create `src/lib/community/types.ts`:

```ts
export type FeedSort = "new" | "hot" | "top" | "controversial";
export type FeedWindow = "all" | "today" | "week" | "month" | "year";
export type Badge = "grey" | "orange" | "gold";
export type PostType = "text" | "image" | "poll" | "youtube";

export type PollData = { options: { i: number; label: string }[]; closes_at?: string };

export type FeedPost = {
  id: string;
  userId: string;
  username: string;
  displayName: string | null;
  badge: Badge;
  type: PostType;
  body: string | null;
  images: string[] | null;
  youtubeId: string | null;
  poll: PollData | null;
  upCount: number;
  downCount: number;
  score: number;
  replyCount: number;
  reblogCount: number;
  reblogOf: string | null;
  createdAt: string;
  viewerVote: -1 | 0 | 1;
  viewerBookmarked: boolean;
};

export type AdSlot = { slot: 1 | 2; imagePath: string | null; linkUrl: string | null };
```

- [ ] **Step 2: Write `queries.ts`**

Create `src/lib/community/queries.ts`:

```ts
import "server-only";
import { supabaseAnon } from "@/lib/supabase/server";
import type { AdSlot, FeedPost, FeedSort, FeedWindow } from "./types";

export async function listFeed(opts: {
  sort: FeedSort;
  window: FeedWindow;
  viewerId: string | null;
  limit?: number;
  offset?: number;
}): Promise<FeedPost[]> {
  const sb = supabaseAnon();
  const { data, error } = await sb.rpc("community_feed", {
    p_sort: opts.sort,
    p_window: opts.window,
    p_viewer: opts.viewerId,
    p_limit: opts.limit ?? 20,
    p_offset: opts.offset ?? 0,
  });
  if (error) {
    console.warn("community_feed failed:", error.message);
    return [];
  }
  return (data ?? []).map((r: Record<string, unknown>) => ({
    id: r.id as string,
    userId: r.user_id as string,
    username: r.username as string,
    displayName: (r.display_name as string) ?? null,
    badge: r.badge as FeedPost["badge"],
    type: r.type as FeedPost["type"],
    body: (r.body as string) ?? null,
    images: (r.images as string[]) ?? null,
    youtubeId: (r.youtube_id as string) ?? null,
    poll: (r.poll as FeedPost["poll"]) ?? null,
    upCount: r.up_count as number,
    downCount: r.down_count as number,
    score: r.score as number,
    replyCount: r.reply_count as number,
    reblogCount: r.reblog_count as number,
    reblogOf: (r.reblog_of as string) ?? null,
    createdAt: r.created_at as string,
    viewerVote: ((r.viewer_vote as number) ?? 0) as -1 | 0 | 1,
    viewerBookmarked: Boolean(r.viewer_bookmarked),
  }));
}

export async function listAds(): Promise<AdSlot[]> {
  const sb = supabaseAnon();
  const { data, error } = await sb
    .from("community_ads")
    .select("slot, image_path, link_url")
    .eq("active", true)
    .order("slot");
  if (error) return [];
  return (data ?? []).map((a) => ({
    slot: a.slot as 1 | 2,
    imagePath: a.image_path,
    linkUrl: a.link_url,
  }));
}
```

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors from these files. (Supabase `.rpc` returns loosely-typed rows; the `Record<string, unknown>` mapping is deliberate.)

- [ ] **Step 4: Commit**

```bash
git add src/lib/community/
git commit -m "feat(community): feed query layer (listFeed, listAds) + types"
```

---

### Task 4: Badge tick + initials avatar components

**Files:**
- Create: `src/components/community/badge-tick.tsx`
- Create: `src/components/community/community-avatar.tsx`

**Interfaces:**
- Consumes: `getInitials`, `avatarColor` (Task 1), `Badge` type (Task 3).
- Produces:
  - `<BadgeTick badge={Badge} />` — grey (hover→orange bg, white tick) / orange (solid) / gold. Renders nothing for a missing badge.
  - `<CommunityAvatar name={string} size?: number />` — circular initials avatar with deterministic bg.

- [ ] **Step 1: Write `BadgeTick`**

Create `src/components/community/badge-tick.tsx`:

```tsx
import { BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Badge } from "@/lib/community/types";

export function BadgeTick({ badge }: { badge: Badge }) {
  return (
    <span
      className={cn(
        "group/tick inline-flex size-4 items-center justify-center rounded-full transition-ui",
        badge === "gold" && "text-[#d4af37]",
        badge === "orange" && "text-brand",
        badge === "grey" &&
          "text-muted-foreground hover:bg-brand hover:text-brand-foreground",
      )}
      title={badge === "gold" ? "Founder" : badge === "orange" ? "Supporter" : "Verified"}
    >
      <BadgeCheck className="size-3.5" strokeWidth={2.5} />
    </span>
  );
}
```
(lucide has no plain "tick-in-circle"; `BadgeCheck` is the verified glyph. Grey uses the hover→orange behavior from the design.)

- [ ] **Step 2: Write `CommunityAvatar`**

Create `src/components/community/community-avatar.tsx`:

```tsx
import { avatarColor, getInitials } from "@/lib/utils";

export function CommunityAvatar({ name, size = 40 }: { name: string; size?: number }) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
      style={{ width: size, height: size, background: avatarColor(name), fontSize: size * 0.4 }}
      aria-hidden
    >
      {getInitials(name)}
    </span>
  );
}
```

- [ ] **Step 3: Verify compile**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/community/badge-tick.tsx src/components/community/community-avatar.tsx
git commit -m "feat(community): badge tick + initials avatar components"
```

---

### Task 5: Post card

**Files:**
- Create: `src/components/community/post-card.tsx`
- Create: `src/components/community/engagement-bar.tsx`

**Interfaces:**
- Consumes: `FeedPost` (Task 3), `BadgeTick`, `CommunityAvatar` (Task 4), `timeAgo`, `compactNumber` (utils), `parseYouTubeId` not needed here (youtubeId is stored).
- Produces:
  - `<PostCard post={FeedPost} />` — full card: header, body by type, engagement bar.
  - `<EngagementBar post={FeedPost} />` — the 7 icons + counts. **Inert in this plan** (buttons render, no handlers). Wired in Plan 4.

- [ ] **Step 1: Write the engagement bar (inert)**

Create `src/components/community/engagement-bar.tsx`:

```tsx
import { Heart, Egg, MessagesSquare, Repeat2, Send, Bookmark, Medal } from "lucide-react";
import { cn, compactNumber } from "@/lib/utils";
import type { FeedPost } from "@/lib/community/types";

// ponytail: buttons are inert here (read-only plan). Plan 4 adds handlers +
// optimistic state; keep the markup so the layout is final now.
export function EngagementBar({ post }: { post: FeedPost }) {
  const item = "inline-flex items-center gap-1.5 rounded-btn px-2 py-1 text-xs text-muted-foreground transition-ui hover:bg-accent";
  return (
    <div className="mt-2 flex items-center gap-1 text-muted-foreground">
      <span className={cn(item, post.viewerVote === 1 && "text-brand")}>
        <Heart className="size-4" /> {compactNumber(post.upCount)}
      </span>
      <span className={cn(item, post.viewerVote === -1 && "text-foreground")}>
        <Egg className="size-4" /> {compactNumber(post.downCount)}
      </span>
      <span className={item}><MessagesSquare className="size-4" /> {compactNumber(post.replyCount)}</span>
      <span className={item}><Repeat2 className="size-4" /> {compactNumber(post.reblogCount)}</span>
      <span className={item}><Send className="size-4" /></span>
      <span className={cn(item, post.viewerBookmarked && "text-brand")}><Bookmark className="size-4" /></span>
      <span className={cn(item, "cursor-not-allowed opacity-40")} title="Awards coming soon"><Medal className="size-4" /></span>
    </div>
  );
}
```

- [ ] **Step 2: Write the post card**

Create `src/components/community/post-card.tsx`:

```tsx
import Image from "next/image";
import { cn, timeAgo } from "@/lib/utils";
import type { FeedPost } from "@/lib/community/types";
import { BadgeTick } from "./badge-tick";
import { CommunityAvatar } from "./community-avatar";
import { EngagementBar } from "./engagement-bar";

export function PostCard({ post }: { post: FeedPost }) {
  const name = post.displayName || post.username;
  return (
    <article className="border-b border-border px-4 py-3">
      <div className="flex gap-3">
        <CommunityAvatar name={name} size={40} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1 text-sm">
            <span className="font-semibold text-foreground truncate">{name}</span>
            <BadgeTick badge={post.badge} />
            <span className="text-muted-foreground truncate">@{post.username}</span>
            <span className="text-muted-foreground">· {timeAgo(post.createdAt)}</span>
          </div>

          {post.body && <p className="mt-1 whitespace-pre-wrap break-words text-sm">{post.body}</p>}

          {post.type === "image" && post.images?.length ? (
            <div className={cn("mt-2 grid gap-1 overflow-hidden rounded-card", post.images.length > 1 ? "grid-cols-2" : "grid-cols-1")}>
              {post.images.slice(0, 4).map((src) => (
                <div key={src} className="relative aspect-video bg-muted">
                  <Image src={src} alt="" fill className="object-cover" />
                </div>
              ))}
            </div>
          ) : null}

          {post.type === "youtube" && post.youtubeId ? (
            <div className="mt-2 aspect-video overflow-hidden rounded-card">
              <iframe
                className="h-full w-full"
                src={`https://www.youtube-nocookie.com/embed/${post.youtubeId}`}
                title="YouTube video"
                loading="lazy"
                allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : null}

          {post.type === "poll" && post.poll ? <PollStatic post={post} /> : null}

          <EngagementBar post={post} />
        </div>
      </div>
    </article>
  );
}

// Read-only poll render (voting lands in Plan 5). Shows options + current tally bars.
function PollStatic({ post }: { post: FeedPost }) {
  const opts = post.poll?.options ?? [];
  return (
    <div className="mt-2 space-y-1.5">
      {opts.map((o) => (
        <div key={o.i} className="rounded-input border border-border px-3 py-1.5 text-sm">
          {o.label}
        </div>
      ))}
    </div>
  );
}
```
Note: `next/image` remote src needs `images.remotePatterns` for the Supabase storage host — that config lands in Plan 3 (upload). Until then image posts don't exist, so no runtime hit. Add a `// TODO(plan-3)` comment is NOT allowed — instead this is tracked in Plan 3's Task list explicitly.

- [ ] **Step 3: Verify compile**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/community/post-card.tsx src/components/community/engagement-bar.tsx
git commit -m "feat(community): post card + inert engagement bar"
```

---

### Task 6: Sort menu (client dropdown)

**Files:**
- Create: `src/components/community/sort-menu.tsx`

**Interfaces:**
- Consumes: `FeedSort`, `FeedWindow` (Task 3), `next/navigation` router.
- Produces: `<SortMenu sort={FeedSort} window={FeedWindow} />` — a dropdown updating `?sort=` (and `?window=` when `sort=top`) via the router. Reddit-style.

- [ ] **Step 1: Write the sort menu**

Create `src/components/community/sort-menu.tsx`:

```tsx
"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { FeedSort, FeedWindow } from "@/lib/community/types";

const SORTS: { key: FeedSort; label: string }[] = [
  { key: "new", label: "New" },
  { key: "hot", label: "Hot" },
  { key: "top", label: "Top" },
  { key: "controversial", label: "Controversial" },
];
const WINDOWS: { key: FeedWindow; label: string }[] = [
  { key: "today", label: "Today" }, { key: "week", label: "This Week" },
  { key: "month", label: "This Month" }, { key: "year", label: "This Year" },
  { key: "all", label: "All Time" },
];

export function SortMenu({ sort, window }: { sort: FeedSort; window: FeedWindow }) {
  const router = useRouter();
  const sp = useSearchParams();
  const go = (next: Record<string, string>) => {
    const params = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(next)) params.set(k, v);
    router.push(`/community?${params.toString()}`);
  };
  const current = SORTS.find((s) => s.key === sort)?.label ?? "New";
  return (
    <div className="flex items-center gap-2 border-b border-border px-4 py-2">
      <DropdownMenu>
        <DropdownMenuTrigger className="inline-flex items-center gap-1 rounded-btn px-2 py-1 text-sm font-medium transition-ui hover:bg-accent">
          {current} <ChevronDown className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {SORTS.map((s) => (
            <DropdownMenuItem key={s.key} onClick={() => go({ sort: s.key })}>{s.label}</DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {sort === "top" && (
        <DropdownMenu>
          <DropdownMenuTrigger className="inline-flex items-center gap-1 rounded-btn px-2 py-1 text-sm text-muted-foreground transition-ui hover:bg-accent">
            {WINDOWS.find((w) => w.key === window)?.label ?? "All Time"} <ChevronDown className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {WINDOWS.map((w) => (
              <DropdownMenuItem key={w.key} onClick={() => go({ sort: "top", window: w.key })}>{w.label}</DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
```
(`@/components/ui/dropdown-menu` is the existing Radix wrapper — confirm exports match; the members shell uses the same primitives.)

- [ ] **Step 2: Verify compile**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/community/sort-menu.tsx
git commit -m "feat(community): reddit-style sort menu"
```

---

### Task 7: Ad slot component

**Files:**
- Create: `src/components/community/ad-slot.tsx`

**Interfaces:**
- Consumes: `AdSlot` (Task 3).
- Produces: `<AdSlotView ad={AdSlot} />` — renders a linked image, or a neutral placeholder when the slot is empty.

- [ ] **Step 1: Write the ad slot**

Create `src/components/community/ad-slot.tsx`:

```tsx
import Image from "next/image";
import type { AdSlot } from "@/lib/community/types";

export function AdSlotView({ ad }: { ad: AdSlot }) {
  if (!ad.imagePath) {
    return (
      <div className="flex h-40 items-center justify-center rounded-card border border-dashed border-border text-xs text-muted-foreground">
        Ad slot {ad.slot}
      </div>
    );
  }
  const img = (
    <div className="relative h-40 overflow-hidden rounded-card border border-border">
      <Image src={ad.imagePath} alt="Sponsored" fill className="object-cover" />
    </div>
  );
  return ad.linkUrl ? (
    <a href={ad.linkUrl} target="_blank" rel="noopener sponsored" className="block transition-ui hover:opacity-90">{img}</a>
  ) : img;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/community/ad-slot.tsx
git commit -m "feat(community): ad slot component"
```

---

### Task 8: Metering gate (anon 3/day)

**Files:**
- Create: `src/components/community/meter-gate.tsx`

**Interfaces:**
- Consumes: nothing server-side.
- Produces: `<MeterGate isLoggedIn={boolean}>{children}</MeterGate>` — when logged out and the localStorage day-count exceeds 3 post-views, blurs the overflow and shows a login-wall CTA. When logged in, renders children untouched.

- [ ] **Step 1: Write the meter gate**

Create `src/components/community/meter-gate.tsx`:

```tsx
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

const LIMIT = 3;
const KEY = "community_meter";

// ponytail: localStorage day-bucket, bypassable by design. Server-side/IP
// metering only if abuse shows up.
export function MeterGate({ isLoggedIn, children }: { isLoggedIn: boolean; children: React.ReactNode }) {
  const [walled, setWalled] = useState(false);
  useEffect(() => {
    if (isLoggedIn) return;
    const today = new Date().toISOString().slice(0, 10);
    let state: { day: string; count: number } = { day: today, count: 0 };
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) state = JSON.parse(raw);
    } catch {}
    if (state.day !== today) state = { day: today, count: 0 };
    state.count += 1;
    localStorage.setItem(KEY, JSON.stringify(state));
    if (state.count > LIMIT) setWalled(true);
  }, [isLoggedIn]);

  if (isLoggedIn) return <>{children}</>;
  return (
    <div className="relative">
      <div className={walled ? "pointer-events-none max-h-[60vh] overflow-hidden [mask-image:linear-gradient(to_bottom,black,transparent)]" : ""}>
        {children}
      </div>
      {walled && (
        <div className="mt-4 rounded-card border border-border bg-card p-6 text-center">
          <h2 className="font-display text-lg font-bold">You've hit today's free reads</h2>
          <p className="mt-1 text-sm text-muted-foreground">Sign in to keep reading the community — it's free.</p>
          <Link href="/members/login?next=/community" className="mt-3 inline-flex rounded-btn bg-brand px-4 py-2 text-sm font-medium text-brand-foreground transition-ui hover:opacity-90">
            Sign in — free
          </Link>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/community/meter-gate.tsx
git commit -m "feat(community): anon metering gate (3/day localStorage wall)"
```

---

### Task 9: Community layout (3-column shell + left nav)

**Files:**
- Create: `src/app/community/layout.tsx`
- Create: `src/components/community/left-nav.tsx`

**Interfaces:**
- Consumes: `getMemberContext` (for logged-in state in the nav), `listAds` (Task 3), `AdSlotView` (Task 7).
- Produces: the 3-column frame with a left nav (Home / Bookmarks / Profile / Post), a center slot for `children`, and a right rail of 2 ad slots. Metadata sets an indexable title.

- [ ] **Step 1: Write the left nav**

Create `src/components/community/left-nav.tsx`:

```tsx
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Bookmark, User, PenSquare } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { label: "Home", href: "/community", icon: Home },
  { label: "Bookmarks", href: "/community/bookmarks", icon: Bookmark },
  { label: "Profile", href: "/community/me", icon: User },
];

export function LeftNav() {
  const pathname = usePathname();
  return (
    <nav className="space-y-1">
      {ITEMS.map(({ label, href, icon: Icon }) => {
        const active = href === "/community" ? pathname === href : pathname.startsWith(href);
        return (
          <Link key={href} href={href}
            className={cn("flex items-center gap-3 rounded-input px-3 py-2 text-sm transition-ui",
              active ? "bg-accent font-medium text-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground")}>
            <Icon className="size-5" /> {label}
          </Link>
        );
      })}
      <Link href="/community/compose"
        className="mt-2 flex items-center justify-center gap-2 rounded-btn bg-brand px-4 py-2 text-sm font-medium text-brand-foreground transition-ui hover:opacity-90">
        <PenSquare className="size-4" /> Post
      </Link>
    </nav>
  );
}
```
(Routes `/community/bookmarks`, `/community/me`, `/community/compose` are wired in later plans; the links exist now and 404 until then — acceptable for the shell. The plan for Plan 3/4 creates them.)

- [ ] **Step 2: Write the layout**

Create `src/app/community/layout.tsx`:

```tsx
import type { Metadata } from "next";
import { listAds } from "@/lib/community/queries";
import { AdSlotView } from "@/components/community/ad-slot";
import { LeftNav } from "@/components/community/left-nav";

export const metadata: Metadata = {
  title: { default: "Community", template: "%s | Community" },
  description: "The Shubham Datarkar community — build in public, share, discuss.",
};

export default async function CommunityLayout({ children }: { children: React.ReactNode }) {
  const ads = await listAds();
  const bySlot = (n: 1 | 2) => ads.find((a) => a.slot === n) ?? { slot: n, imagePath: null, linkUrl: null };
  return (
    <div className="mx-auto flex max-w-6xl gap-6 px-4">
      <aside className="hidden w-56 shrink-0 py-4 md:block">
        <div className="sticky top-4"><LeftNav /></div>
      </aside>
      <main className="min-w-0 flex-1 border-x border-border">{children}</main>
      <aside className="hidden w-72 shrink-0 py-4 lg:block">
        <div className="sticky top-4 space-y-4">
          <AdSlotView ad={bySlot(1)} />
          <AdSlotView ad={bySlot(2)} />
        </div>
      </aside>
    </div>
  );
}
```

- [ ] **Step 3: Verify compile**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/community/layout.tsx src/components/community/left-nav.tsx
git commit -m "feat(community): 3-column layout + left nav"
```

---

### Task 10: Feed page (wire it together) + preview verification

**Files:**
- Create: `src/app/community/page.tsx`

**Interfaces:**
- Consumes: everything above — `getMemberContext`, `listFeed`, `SortMenu`, `PostCard`, `MeterGate`.
- Produces: the rendered `/community` feed. This is the plan's shippable deliverable.

- [ ] **Step 1: Write the page**

Create `src/app/community/page.tsx`:

```tsx
import { getMemberContext } from "@/lib/members/session";
import { listFeed } from "@/lib/community/queries";
import type { FeedSort, FeedWindow } from "@/lib/community/types";
import { SortMenu } from "@/components/community/sort-menu";
import { PostCard } from "@/components/community/post-card";
import { MeterGate } from "@/components/community/meter-gate";

const SORTS = new Set<FeedSort>(["new", "hot", "top", "controversial"]);
const WINDOWS = new Set<FeedWindow>(["all", "today", "week", "month", "year"]);

export default async function CommunityPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; window?: string }>;
}) {
  const sp = await searchParams;
  const sort: FeedSort = SORTS.has(sp.sort as FeedSort) ? (sp.sort as FeedSort) : "new";
  const window: FeedWindow = WINDOWS.has(sp.window as FeedWindow) ? (sp.window as FeedWindow) : "all";

  const { user } = await getMemberContext();
  const posts = await listFeed({ sort, window, viewerId: user?.id ?? null, limit: 30 });

  return (
    <div>
      <SortMenu sort={sort} window={window} />
      <MeterGate isLoggedIn={Boolean(user)}>
        {posts.length === 0 ? (
          <p className="px-4 py-16 text-center text-sm text-muted-foreground">
            No posts yet. Be the first once posting opens.
          </p>
        ) : (
          posts.map((post) => <PostCard key={post.id} post={post} />)
        )}
      </MeterGate>
    </div>
  );
}
```

- [ ] **Step 2: Apply the feed RPC (if not already)** — see Task 2 Step 3. The page returns an empty feed gracefully if the RPC is missing, but sorts won't work until it's applied.

- [ ] **Step 3: Seed 2–3 test posts (temporary, via SQL editor)**

So the preview shows cards. User runs:

```sql
insert into public.community_posts (user_id, type, body)
select id, 'text', 'Hello community — first post!' from public.profiles limit 1;
insert into public.community_posts (user_id, type, body)
select id, 'text', 'Second post to test the feed ordering.' from public.profiles limit 1;
```

- [ ] **Step 4: Preview-verify the feed renders**

Start the dev server (preview_start) and load `/community`. Verify with preview tools (not screenshot-only):
- `preview_snapshot` → the two post bodies appear, with `@handle`, a time like "now", and the engagement bar icons.
- `preview_inspect` on a post card → `border-bottom` present, avatar has a non-transparent `background`.
- Click the sort dropdown (`preview_click`) → New/Hot/Top/Controversial items appear; selecting **Top** reveals the time-window dropdown; URL gains `?sort=top`.
- `preview_console_logs` (level error) → no errors.
- Resize to mobile (`preview_resize` mobile) → left/right rails hidden, feed full-width.

Fix any issue in source, re-verify from this step.

- [ ] **Step 5: Remove the seed rows (cleanup)**

```sql
delete from public.community_posts where body like 'Hello community%' or body like 'Second post to test%';
```

- [ ] **Step 6: Commit**

```bash
git add src/app/community/page.tsx
git commit -m "feat(community): read-only feed page with sorts + metering"
```

---

## Self-Review

**Spec coverage (Plan 2 scope = design §2 layout, §3 feed+metering, §5 badges read, §9 stack, §10 phase 2):**
- 3-column layout (left nav / feed / 2 ad slots) → Task 9 ✓
- New/Hot/Top(+window)/Controversial sorts → Task 2 RPC + Task 6 menu + Task 10 page ✓
- Anon 3/day metering wall → Task 8 ✓
- Post cards (text/image/youtube/poll-static) → Task 5 ✓
- 3-tier badges (grey hover→orange, orange, gold) → Task 4 `BadgeTick` ✓
- Initials avatar, deterministic bg → Task 1 + Task 4 ✓
- Engagement bar rendered (inert, award disabled) → Task 5 ✓
- 2 admin-editable ad slots (read side) → Task 3 `listAds` + Task 7 ✓
- Public + SEO-indexed route → Task 9 metadata ✓
- **Deferred by design (correct):** engagement writes (Plan 4), poll voting (Plan 5), image upload + `next/image` remotePatterns (Plan 3), `/community/bookmarks|me|compose` routes (Plans 3–4), admin ad editor (Plan 6). Nav links to not-yet-built routes are noted in Task 9 Step 1.

**Placeholder scan:** none. Every step has literal code. (The one "TODO" mention in Task 5 Step 2 is prose explaining a Plan-3 dependency, not a code placeholder — the image render is complete; only the Supabase host allowlist is deferred, and image posts can't exist until Plan 3 creates them.)

**Type consistency:** `FeedSort`/`FeedWindow`/`FeedPost`/`AdSlot`/`Badge` defined in Task 3 `types.ts` are imported unchanged in Tasks 4–10. RPC column names (`up_count`, `viewer_vote`, `reblog_of`, …) in Task 2 map 1:1 to the `listFeed` mapper in Task 3. `getInitials`/`avatarColor`/`timeAgo`/`parseYouTubeId` signatures (Task 1) match their calls in Tasks 4–5.

**Load-bearing assumptions to check at execution:** (a) `@/components/ui/dropdown-menu` exports `DropdownMenu*` as used (verify against the members shell import); (b) `supabaseAnon()` is exported from `@/lib/supabase/server` (confirmed in exploration); (c) `compactNumber` and `formatDate` already exist in `src/lib/utils.ts` (confirmed). If any export name differs, adjust the import — do not restructure.
