"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
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
  // ponytail: the feed RPC has no viewer_reblogged column; first paint assumes
  // false. Join one in later if the wrong initial state ever matters.
  const [reblogged, setReblogged] = useState(false);
  const [burst, setBurst] = useState<"up" | "down" | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onVote(value: 1 | -1) {
    const prev = { vote, up, down };
    if (vote === value) {
      setVote(0);
      if (value === 1) setUp(up - 1);
      else setDown(down - 1);
    } else if (vote === 0) {
      setVote(value);
      if (value === 1) setUp(up + 1);
      else setDown(down + 1);
    } else {
      setVote(value);
      if (value === 1) {
        setUp(up + 1);
        setDown(down - 1);
      } else {
        setDown(down + 1);
        setUp(up - 1);
      }
    }
    setBurst(value === 1 ? "up" : "down");
    setTimeout(() => setBurst(null), 400);

    start(async () => {
      const r = await toggleVote(post.id, value);
      if ("error" in r) {
        setVote(prev.vote);
        setUp(prev.up);
        setDown(prev.down);
        setError(r.error);
      } else {
        setError(null);
        router.refresh();
      }
    });
  }

  function onBookmark() {
    const prev = marked;
    setMarked(!marked);
    start(async () => {
      const r = await toggleBookmark(post.id);
      if ("error" in r) {
        setMarked(prev);
        setError(r.error);
      } else setError(null);
    });
  }

  function onReblog() {
    const prev = { reblogged, reblogs };
    setReblogged(!reblogged);
    setReblogs(reblogged ? reblogs - 1 : reblogs + 1);
    start(async () => {
      const r = await toggleReblog(post.id);
      if ("error" in r) {
        setReblogged(prev.reblogged);
        setReblogs(prev.reblogs);
        setError(r.error);
      } else {
        setError(null);
        router.refresh();
      }
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
        <button
          type="button"
          disabled={pending}
          onClick={() => onVote(1)}
          aria-label="Upvote"
          aria-pressed={vote === 1}
          className={cn(ITEM, vote === 1 && "text-brand")}
        >
          <Heart className={cn("size-4", burst === "up" && "animate-pop")} /> {compactNumber(up)}
        </button>

        <button
          type="button"
          disabled={pending}
          onClick={() => onVote(-1)}
          aria-label="Downvote"
          aria-pressed={vote === -1}
          className={cn(ITEM, vote === -1 && "text-foreground")}
        >
          <Egg className={cn("size-4", burst === "down" && "animate-wobble")} />{" "}
          {compactNumber(down)}
        </button>

        <Link href={`/community/p/${post.id}`} className={ITEM} aria-label="Replies">
          <MessagesSquare className="size-4" /> {compactNumber(post.replyCount)}
        </Link>

        <button
          type="button"
          disabled={pending}
          onClick={onReblog}
          aria-label="Reblog"
          aria-pressed={reblogged}
          className={cn(ITEM, reblogged && "text-brand")}
        >
          <Repeat2 className="size-4" /> {compactNumber(reblogs)}
        </button>

        <button type="button" onClick={onShare} aria-label="Share link" className={ITEM}>
          <Send className="size-4" /> {copied && <span>Copied</span>}
        </button>

        <button
          type="button"
          disabled={pending}
          onClick={onBookmark}
          aria-label="Bookmark"
          aria-pressed={marked}
          className={cn(ITEM, marked && "text-brand")}
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
