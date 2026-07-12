"use client";
import { useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart, Egg, MessagesSquare, Repeat2, Send, Bookmark, Medal, Check } from "lucide-react";
import { cn, compactNumber } from "@/lib/utils";
import type { FeedPost } from "@/lib/community/types";
import { toggleVote, toggleBookmark, toggleReblog } from "@/lib/community/engage-actions";

// `active:scale-90` gives every action a tactile press; transition-ui already
// tweens transform so it eases back on release.
const ITEM =
  "inline-flex items-center gap-1.5 rounded-btn px-2 py-1 text-xs text-muted-foreground transition-ui hover:bg-accent active:scale-90 disabled:opacity-50";

type Engagement = {
  vote: -1 | 0 | 1;
  up: number;
  down: number;
  marked: boolean;
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
  if (a.kind === "bookmark") return { ...s, marked: !s.marked };
  return { ...s, reblogged: !s.reblogged, reblogs: s.reblogged ? s.reblogs - 1 : s.reblogs + 1 };
}

export function EngagementBar({ post }: { post: FeedPost }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [burst, setBurst] = useState<"up" | "down" | null>(null);
  const [copied, setCopied] = useState(false);
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
      reblogs: post.reblogCount,
      reblogged: post.viewerReblogged,
    },
    reduce,
  );

  function onVote(value: 1 | -1) {
    setBurst(value === 1 ? "up" : "down");
    setTimeout(() => setBurst(null), 400);
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

  async function onShare() {
    const url = `${window.location.origin}/community/p/${post.publicId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setError("Couldn't copy the link.");
    }
  }

  return (
    // z-10 keeps the whole action row above the card-wide click overlay so each
    // control fires its own handler instead of navigating to the post.
    <div className="relative z-10">
      {/* justify-between spreads the icons edge-to-edge across the full width
          with even gaps — no text labels, matching the compact icon+count spec. */}
      <div className="mt-2 flex items-center justify-between">
        <button
          type="button"
          disabled={pending}
          onClick={() => onVote(1)}
          aria-label="Upvote"
          aria-pressed={state.vote === 1}
          title="Upvote"
          className={cn(ITEM, state.vote === 1 && "text-brand")}
        >
          <Heart
            className={cn("size-4", state.vote === 1 && "fill-current", burst === "up" && "animate-pop")}
          />
          {compactNumber(state.up)}
        </button>

        <button
          type="button"
          disabled={pending}
          onClick={() => onVote(-1)}
          aria-label="Downvote"
          aria-pressed={state.vote === -1}
          title="Downvote"
          className={cn(ITEM, state.vote === -1 && "text-foreground")}
        >
          <Egg
            className={cn("size-4", state.vote === -1 && "fill-current", burst === "down" && "animate-wobble")}
          />
          {compactNumber(state.down)}
        </button>

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
          <Repeat2 className="size-4" />
          {compactNumber(state.reblogs)}
        </button>

        <button
          type="button"
          onClick={onShare}
          aria-label={copied ? "Link copied" : "Copy link"}
          title="Copy link"
          className={cn(ITEM, copied && "text-brand")}
        >
          {copied ? <Check className="size-4 animate-pop" /> : <Send className="size-4" />}
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
        </button>

        <span
          className={cn(ITEM, "cursor-not-allowed opacity-40")}
          title="Awards coming soon"
          aria-label="Awards, coming soon"
        >
          <Medal className="size-4" />
          {compactNumber(0)}
        </span>
      </div>
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}
