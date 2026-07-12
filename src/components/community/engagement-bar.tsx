"use client";
import { useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart, Egg, MessagesSquare, Repeat2, Send, Bookmark, Medal } from "lucide-react";
import { cn, compactNumber } from "@/lib/utils";
import type { FeedPost } from "@/lib/community/types";
import { toggleVote, toggleBookmark, toggleReblog } from "@/lib/community/engage-actions";

const ITEM =
  "inline-flex items-center gap-1.5 rounded-btn px-2 py-1 text-xs text-muted-foreground transition-ui hover:bg-accent disabled:opacity-50";

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
    <div>
      <div className="mt-2 flex items-center gap-1">
        <button
          type="button"
          disabled={pending}
          onClick={() => onVote(1)}
          aria-label="Upvote"
          aria-pressed={state.vote === 1}
          className={cn(ITEM, state.vote === 1 && "text-brand")}
        >
          <Heart className={cn("size-4", burst === "up" && "animate-pop")} />
          <span className="hidden sm:inline">Upvote</span> {compactNumber(state.up)}
        </button>

        <button
          type="button"
          disabled={pending}
          onClick={() => onVote(-1)}
          aria-label="Downvote"
          aria-pressed={state.vote === -1}
          className={cn(ITEM, state.vote === -1 && "text-foreground")}
        >
          <Egg className={cn("size-4", burst === "down" && "animate-wobble")} />
          <span className="hidden sm:inline">Downvote</span> {compactNumber(state.down)}
        </button>

        <Link href={`/community/p/${post.publicId}`} className={ITEM} aria-label="Comments">
          <MessagesSquare className="size-4" />
          <span className="hidden sm:inline">Comments</span> {compactNumber(post.replyCount)}
        </Link>

        <button
          type="button"
          disabled={pending}
          onClick={onReblog}
          aria-label="Reblog"
          aria-pressed={state.reblogged}
          className={cn(ITEM, state.reblogged && "text-brand")}
        >
          <Repeat2 className="size-4" /> {compactNumber(state.reblogs)}
        </button>

        <button type="button" onClick={onShare} aria-label="Share link" className={ITEM}>
          <Send className="size-4" />
          {copied ? <span>Copied</span> : <span className="hidden sm:inline">Share</span>}
        </button>

        <button
          type="button"
          disabled={pending}
          onClick={onBookmark}
          aria-label="Bookmark"
          aria-pressed={state.marked}
          className={cn(ITEM, state.marked && "text-brand")}
        >
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
