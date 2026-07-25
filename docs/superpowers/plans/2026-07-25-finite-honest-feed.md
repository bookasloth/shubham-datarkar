# Finite & Honest Feed Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the community feed finite and honest — a designed end-of-feed card, a per-stream "why you're seeing this" context strip, and engagement counts hidden from everyone except the post's own author.

**Architecture:** All render-only. A new pure helper builds the context line from the existing `FeedQuery`; the feed page renders it once above the stream. `FeedStream`'s existing `done` state becomes a designed card. `EngagementBar` gains a `showCounts` flag that `PostCard` sets from the author check it already computes. No schema, no migration, no new data.

**Tech Stack:** Next.js (App Router, RSC + client components), TypeScript, Vitest, Tailwind.

## Global Constraints

- **No schema / migration / tracking.** Everything derives from `FeedPost` and `FeedQuery` fields that already exist.
- **Preserve the finite feed.** `FeedStream` already stops at `done` with no algorithmic refill — do NOT add refill. Feature A only restyles the done-state.
- **Preserve logged-out gating.** The logged-out feed still ends in `SignInWall`; the new end-card is for the signed-in `done` branch only.
- **Counts are render-only.** `FeedPost` keeps all counts; Feature C hides the *rendered numeral*, nothing else. Actions stay fully functional.
- **Design:** monochrome, no emojis, Jakarta/Poppins (`font-display` headings), existing tokens (`rounded-card` = 8px, `text-muted-foreground`).
- **Copy uses "notes"**, not "posts"/"tweets", in user-facing strings.
- Verify `npx next build` exits 0 after the last code task.

---

### Task 1: `feedContextLine` pure helper (tested)

**Files:**
- Create: `src/lib/community/feed-context.ts`
- Test: `src/lib/community/feed-context.test.ts`

**Interfaces:**
- Produces: `feedContextLine(q: { sort?: FeedSort; window?: FeedWindow; following?: boolean; tag?: string }, signedIn: boolean): string` — the honest one-liner for a stream.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { feedContextLine } from "./feed-context";

describe("feedContextLine", () => {
  it("logged out is the random-preview line regardless of sort", () => {
    expect(feedContextLine({ sort: "new" }, false)).toBe(
      "A few notes at random. Sign in to read the whole feed.",
    );
  });
  it("following overrides sort", () => {
    expect(feedContextLine({ sort: "new", following: true }, true)).toBe(
      "Only the people you follow.",
    );
  });
  it("tag overrides sort", () => {
    expect(feedContextLine({ sort: "hot", tag: "seo" }, true)).toBe("Notes tagged #seo.");
  });
  it("new is the unranked line", () => {
    expect(feedContextLine({ sort: "new" }, true)).toBe(
      "Latest notes, newest first. Nothing is ranked or hidden.",
    );
  });
  it("hot is the one-time shuffle line", () => {
    expect(feedContextLine({ sort: "hot" }, true)).toBe(
      "A one-time shuffle. Refresh for a new order — no profile of you involved.",
    );
  });
  it("top names the window", () => {
    expect(feedContextLine({ sort: "top", window: "week" }, true)).toBe(
      "The most-liked notes this week.",
    );
    expect(feedContextLine({ sort: "top", window: "all" }, true)).toBe(
      "The most-liked notes of all time.",
    );
  });
  it("defaults missing sort to new", () => {
    expect(feedContextLine({}, true)).toBe(
      "Latest notes, newest first. Nothing is ranked or hidden.",
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/community/feed-context.test.ts`
Expected: FAIL — "Cannot find module './feed-context'".

- [ ] **Step 3: Write the implementation**

```ts
import type { FeedSort, FeedWindow } from "./types";

const WINDOW_PHRASE: Record<FeedWindow, string> = {
  all: "of all time",
  today: "today",
  week: "this week",
  month: "this month",
  year: "this year",
};

/**
 * The honest "why you're seeing this" line for a stream. Same for every note in
 * the stream by design — it's rendered once at the top, not per note. Priority:
 * logged-out preview → following → tag → sort. Pure; derives only from the query.
 */
export function feedContextLine(
  q: { sort?: FeedSort; window?: FeedWindow; following?: boolean; tag?: string },
  signedIn: boolean,
): string {
  if (!signedIn) return "A few notes at random. Sign in to read the whole feed.";
  if (q.following) return "Only the people you follow.";
  if (q.tag) return `Notes tagged #${q.tag}.`;
  switch (q.sort) {
    case "hot":
      return "A one-time shuffle. Refresh for a new order — no profile of you involved.";
    case "top":
      return `The most-liked notes ${WINDOW_PHRASE[q.window ?? "all"]}.`;
    default:
      return "Latest notes, newest first. Nothing is ranked or hidden.";
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/community/feed-context.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/community/feed-context.ts src/lib/community/feed-context.test.ts
git commit -m "feat(community): feedContextLine honest stream helper"
```

---

### Task 2: Render the context strip on the feed page

**Files:**
- Modify: `src/app/community/page.tsx`

**Interfaces:**
- Consumes: `feedContextLine` (Task 1).

- [ ] **Step 1: Import the helper**

Add to the imports at the top of `src/app/community/page.tsx`:

```tsx
import { feedContextLine } from "@/lib/community/feed-context";
```

- [ ] **Step 2: Render the strip above the feed body**

The strip goes once, directly under the `SortMenu`/tag-header area and above the
posts-or-empty block. Insert it immediately before the `{posts.length === 0 ? (` block
(after the `{user && !canPost && ...}` verify-email notice):

```tsx
      {posts.length > 0 && (
        <p className="border-b border-border px-4 py-2 text-xs text-muted-foreground">
          {feedContextLine({ sort, window, following, tag }, Boolean(user))}
        </p>
      )}
```

Rationale: only shown when there are notes (an empty feed has its own message that already
explains itself). `Boolean(user)` drives the logged-out preview line.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/community/page.tsx
git commit -m "feat(community): honest context strip above the feed"
```

---

### Task 3: Hide engagement counts except on the viewer's own posts

**Files:**
- Modify: `src/components/community/engagement-bar.tsx`
- Modify: `src/components/community/post-card.tsx`

**Interfaces:**
- Produces: `EngagementBar` gains prop `showCounts?: boolean` (default `false`).
- Consumes: `PostCard` passes `showCounts={viewerId === post.userId}`.

- [ ] **Step 1: Add the prop and gate each numeral in `EngagementBar`**

Change the signature (line 57):

```tsx
export function EngagementBar({
  post,
  endSlot,
  showCounts = false,
}: {
  post: FeedPost;
  endSlot?: React.ReactNode;
  /** Render the like/reblog/reply/bookmark numerals. Only the post's own author
   *  sees them — everyone else gets the icons alone (no metrics theater). */
  showCounts?: boolean;
}) {
```

Then gate the four `compactNumber(...)` renders. Replace each with a conditional:

- Comment link (was `{compactNumber(post.replyCount)}`):
  ```tsx
  {showCounts && compactNumber(post.replyCount)}
  ```
- Reblog trigger (was `{compactNumber(state.reblogs)}`):
  ```tsx
  {showCounts && compactNumber(state.reblogs)}
  ```
- Upvote button (was `{compactNumber(state.up)}`):
  ```tsx
  {showCounts && compactNumber(state.up)}
  ```
- Bookmark button (was `{compactNumber(state.bookmarks)}`):
  ```tsx
  {showCounts && compactNumber(state.bookmarks)}
  ```

Leave the icons, the burst overlay, `aria-pressed`, titles, and the Award link untouched.

- [ ] **Step 2: Pass `showCounts` from `PostCard`**

In `src/components/community/post-card.tsx`, the `<EngagementBar ... />` at line 173 gets
the flag (the same author check already used for `isOwner` at line 181):

```tsx
          <EngagementBar
            post={post}
            showCounts={viewerId === post.userId}
            endSlot={
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors. (`EngagementBar`'s only caller is `PostCard`, confirmed — no other
call site needs the prop.)

- [ ] **Step 4: Commit**

```bash
git add src/components/community/engagement-bar.tsx src/components/community/post-card.tsx
git commit -m "feat(community): hide engagement counts except on your own notes"
```

---

### Task 4: Designed end-of-feed card

**Files:**
- Modify: `src/components/community/feed-stream.tsx`

**Interfaces:**
- Consumes: nothing new. Reuses the existing `done` state and scroll code.

- [ ] **Step 1: Replace the plain done-state with a card**

In `src/components/community/feed-stream.tsx`, replace the current done block:

```tsx
      {done && (
        <p className="px-4 py-10 text-center text-sm text-muted-foreground">
          You&apos;re all caught up.
        </p>
      )}
```

with a designed end-card. `signedIn` is derivable here as `initialSince != null`? No — pass
it explicitly is cleaner, but the component doesn't receive it. Instead: the logged-out feed
never renders `FeedStream` (page.tsx renders bare `cards` + `SignInWall` when `!user`), so
**`FeedStream` only ever runs for signed-in users** — the Compose CTA is always valid here.

```tsx
      {done && (
        <div className="mx-4 my-8 flex flex-col items-center gap-3 rounded-card border border-border bg-card px-6 py-10 text-center">
          <div className="flex size-12 items-center justify-center rounded-card bg-muted">
            <CheckCheck className="size-6 text-muted-foreground" />
          </div>
          <h2 className="font-display text-lg font-semibold">You&apos;re all caught up.</h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            That&apos;s everything new. No infinite scroll here — go build something.
          </p>
          <div className="mt-1 flex items-center gap-3">
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="rounded-btn border border-border px-4 py-2 text-sm font-medium transition-ui hover:bg-accent"
            >
              Back to top
            </button>
            <Link
              href="/community/compose"
              className="rounded-btn bg-foreground px-4 py-2 text-sm font-medium text-background transition-ui hover:opacity-85"
            >
              Compose
            </Link>
          </div>
        </div>
      )}
```

- [ ] **Step 2: Add the imports**

At the top of the file, extend the `lucide-react` import to include `CheckCheck` and add
the `next/link` import:

```tsx
import Link from "next/link";
import { ArrowUp, Loader2, CheckCheck } from "lucide-react";
```

(The existing import line is `import { ArrowUp, Loader2 } from "lucide-react";` — replace it.)

- [ ] **Step 3: Typecheck + build**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npx next build`
Expected: exit 0 (catches any client/server boundary issue in the modified client component).

- [ ] **Step 4: Commit**

```bash
git add src/components/community/feed-stream.tsx
git commit -m "feat(community): designed end-of-feed card"
```

---

### Task 5: Preview verification

**Files:** none (verification only).

- [ ] **Step 1: Start the dev server**

Use `preview_start { name: "dev" }`.

- [ ] **Step 2: Verify signed-out (no login needed)**

Navigate to `/community`. Confirm via the rendered DOM (the preview pane may not paint —
read the DOM / computed text):
- The context strip reads "A few notes at random. Sign in to read the whole feed."
- Post cards show engagement icons with **no numerals** (not your own posts).
- The logged-out end is still the `SignInWall` (no end-card for logged out).

- [ ] **Step 3: Verify the helper output across streams**

Navigate to `/community?sort=hot` (redirects to a seed), `/community?tab=following`,
`/community?tag=seo`. Confirm the strip text matches `feedContextLine` for each.

- [ ] **Step 4: Report**

Screenshot if the pane paints; otherwise report the DOM-verified strings. Note that the
signed-in end-card and "author sees own counts" require a logged-in session the reviewer
must confirm manually (login is password-gated).

---

## Notes for the implementer

- `EngagementBar`'s sole caller is `PostCard` (grep-confirmed) — Task 3 needs no other call-site edits.
- `FeedStream` is only mounted for signed-in users (page.tsx renders bare cards + `SignInWall` when `!user`), so the end-card's Compose CTA is always valid — no `signedIn` prop needed.
- Do not touch the profile Posts/Media tabs for the context strip — the "why" there is self-evident (it's that person's notes). Feature B is `/community` only.
- Counts remain in `FeedPost` and the DB; only the rendered numeral is conditional.
