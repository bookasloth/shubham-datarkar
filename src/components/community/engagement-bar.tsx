"use client";
import { useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ThumbsUp, MessagesSquare, Repeat2, Bookmark, Medal } from "lucide-react";
import { cn, compactNumber } from "@/lib/utils";
import type { FeedPost } from "@/lib/community/types";
import { toggleVote, toggleBookmark, toggleReblog } from "@/lib/community/engage-actions";

// `relative` anchors the like-burst overlay; `active:scale-90` gives every
// action a tactile press that transition-ui eases back on release.
const ITEM =
  "relative inline-flex items-center gap-1.5 rounded-btn px-2 py-1 text-xs text-muted-foreground transition-ui hover:bg-accent active:scale-90 disabled:opacity-50";

// Six sparks flung at 60° intervals when a post is liked.
const SPARKS = [0, 60, 120, 180, 240, 300];

type Engagement = {
  vote: -1 | 0 | 1;
  up: number;
  down: number;
  marked: boolean;
  bookmarks: number;
  reblogs: number;
  reblogged: boolean;
};

type Action = { kind: "vote"; value: 1 | -1 } | { kind: "bookmark" } | { kind: "reblog" };

function reduce(s: Engagement, a: Action): Engagement {
  if (a.kind === "vote") {
    const v = a.value;
    if (s.vote === v) {
      // clicking the same arrow again removes the vote
      return { ...s, vote: 0, up: v === 1 ? s.up - 1 : s.up, down: v === -1 ? s.down - 1 : s.down };
    }
    if (s.vote === 0) {
      return { ...s, vote: v, up: v === 1 ? s.up + 1 : s.up, down: v === -1 ? s.down + 1 : s.down };
    }
    // switching sides moves the count across
    return { ...s, vote: v, up: v === 1 ? s.up + 1 : s.up - 1, down: v === -1 ? s.down + 1 : s.down - 1 };
  }
  if (a.kind === "bookmark")
    return { ...s, marked: !s.marked, bookmarks: s.marked ? s.bookmarks - 1 : s.bookmarks + 1 };
  return { ...s, reblogged: !s.reblogged, reblogs: s.reblogged ? s.reblogs - 1 : s.reblogs + 1 };
}

export function EngagementBar({ post, endSlot }: { post: FeedPost; endSlot?: React.ReactNode }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [burst, setBurst] = useState<"up" | "down" | null>(null);
  const [reblogFx, setReblogFx] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Base comes straight from props, so a router.refresh() (or any re-render with
  // fresh server data) is what resets the optimistic overlay. Seeding useState
  // once would freeze these counts at mount and never pick the new values up.
  // A failed action leaves props unchanged, so the overlay reverts on its own.
  const [state, addOptimistic] = useOptimistic<Engagement, Action>(
    {
      vote: post.viewerVote,
      up: post.upCount,
      down: post.downCount,
      marked: post.viewerBookmarked,
      bookmarks: post.bookmarkCount,
      reblogs: post.reblogCount,
      reblogged: post.viewerReblogged,
    },
    reduce,
  );

  function onVote(value: 1 | -1) {
    setBurst(value === 1 ? "up" : "down");
    setTimeout(() => setBurst(null), 480);
    start(async () => {
      addOptimistic({ kind: "vote", value });
      const r = await toggleVote(post.id, value);
      if ("error" in r) setError(r.error);
      else {
        setError(null);
        router.refresh();
      }
    });
  }

  function onBookmark() {
    start(async () => {
      addOptimistic({ kind: "bookmark" });
      const r = await toggleBookmark(post.id);
      if ("error" in r) setError(r.error);
      else {
        setError(null);
        router.refresh();
      }
    });
  }

  function onReblog() {
    setReblogFx(true);
    setTimeout(() => setReblogFx(false), 500);
    start(async () => {
      addOptimistic({ kind: "reblog" });
      const r = await toggleReblog(post.id);
      if ("error" in r) setError(r.error);
      else {
        setError(null);
        router.refresh();
      }
    });
  }

  // Fire the like burst only when the vote lands ON (not when toggling it off).
  const showLikeBurst = burst === "up" && state.vote === 1;

  return (
    // z-10 keeps the whole action row above the card-wide click overlay so each
    // control fires its own handler instead of navigating to the post. The
    // divider (border-t + padding) fences the actions off from the post body.
    <div className="relative z-10 mt-3 border-t border-border/60 pt-2">
      {/* justify-between spreads the icons edge-to-edge with even gaps — no text
          labels, matching the compact icon+count spec. */}
      <div className="flex items-center justify-between">
        <Link href={`/community/p/${post.publicId}`} className={ITEM} aria-label="Comments" title="Comments">
          <MessagesSquare className="size-4" />
          {compactNumber(post.replyCount)}
        </Link>

        <button
          type="button"
          disabled={pending}
          onClick={onReblog}
          aria-label="Reblog"
          aria-pressed={state.reblogged}
          title="Reblog"
          className={cn(ITEM, state.reblogged && "text-brand")}
        >
          <Repeat2 className={cn("size-4", reblogFx && "animate-reblog-spin")} />
          {compactNumber(state.reblogs)}
        </button>

        <button
          type="button"
          disabled={pending}
          onClick={() => onVote(1)}
          aria-label="Upvote"
          aria-pressed={state.vote === 1}
          title="Upvote"
          className={cn(ITEM, state.vote === 1 && "text-brand")}
        >
          <ThumbsUp
            className={cn("size-4", state.vote === 1 && "fill-current", burst === "up" && "animate-pop")}
          />
          {showLikeBurst && (
            <span className="like-burst" aria-hidden="true">
              <span className="like-ring" />
              {SPARKS.map((a) => (
                <span
                  key={a}
                  className="like-spark"
                  style={{ "--a": `${a}deg` } as React.CSSProperties}
                />
              ))}
            </span>
          )}
          {compactNumber(state.up)}
        </button>

        <button
          type="button"
          disabled={pending}
          onClick={onBookmark}
          aria-label="Bookmark"
          aria-pressed={state.marked}
          title="Bookmark"
          className={cn(ITEM, state.marked && "text-brand")}
        >
          <Bookmark className={cn("size-4", state.marked && "fill-current animate-pop")} />
          {compactNumber(state.bookmarks)}
        </button>

        <Link href="/support" className={ITEM} aria-label="Award this post" title="Award">
          <Medal className="size-4" />
        </Link>

        {endSlot && <span className="ml-auto">{endSlot}</span>}
      </div>
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}
