"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { ThumbsUp, MessagesSquare, Repeat2, Bookmark, Medal } from "lucide-react";
import { cn, compactNumber } from "@/lib/utils";
import type { FeedPost } from "@/lib/community/types";
import { toggleVote, toggleBookmark, toggleReblog } from "@/lib/community/engage-actions";
import { JoinModal } from "@/components/community/join-modal";
import { QuoteModal } from "@/components/community/quote-modal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GATE } from "@/lib/community/gate-messages";
import { useToast } from "@/components/ui/toast";

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
  const { toast } = useToast();
  const [burst, setBurst] = useState<"up" | "down" | null>(null);
  const [reblogFx, setReblogFx] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [quoting, setQuoting] = useState(false);

  // A logged-out tap is the one "error" worth acting on rather than reporting:
  // it means someone wanted in. Everything else surfaces as a toast.
  function report(message: string) {
    if (message === GATE.SIGNED_OUT) setJoining(true);
    else {
      setError(message);
      toast({ title: "That didn't go through", description: message, variant: "danger" });
    }
  }

  // Plain client-authoritative state seeded once from the server render. The UI
  // moves the instant you tap (a synchronous setState — no useOptimistic overlay
  // that would tear down a beat before the confirmed value lands and flash the
  // old count). We never refetch to reconcile: `sRef` mirrors state synchronously
  // so rapid clicks reduce over the latest value, and a failure rolls just the
  // affected fields back to their pre-tap snapshot.
  const [state, setState] = useState<Engagement>({
    vote: post.viewerVote,
    up: post.upCount,
    down: post.downCount,
    marked: post.viewerBookmarked,
    bookmarks: post.bookmarkCount,
    reblogs: post.reblogCount,
    reblogged: post.viewerReblogged,
  });
  const sRef = useRef(state);

  // Serialize each channel's server calls in click order so the DB lands on the
  // final intent regardless of which request resolves first. Toggle actions are
  // read-then-write on the server, so overlapping them races; a promise chain
  // per channel keeps them strictly ordered without blocking the UI.
  const voteChain = useRef<Promise<unknown>>(Promise.resolve());
  const bmChain = useRef<Promise<unknown>>(Promise.resolve());
  const rbChain = useRef<Promise<unknown>>(Promise.resolve());

  function set(next: Engagement) {
    sRef.current = next;
    setState(next);
  }

  function run(
    chain: React.MutableRefObject<Promise<unknown>>,
    action: Action,
    call: () => ReturnType<typeof toggleVote>,
    fields: (keyof Engagement)[],
  ) {
    const before = sRef.current;
    set(reduce(before, action)); // instant, synchronous — no flash
    setError(null);
    const next = chain.current.then(call);
    chain.current = next;
    void next.then((r) => {
      if (r && "error" in r) {
        // Roll only this channel's fields back to their pre-tap values, leaving
        // any other channel's newer state intact. No refetch — sRef is truth.
        const rolled = { ...sRef.current };
        Object.assign(rolled, Object.fromEntries(fields.map((f) => [f, before[f]])));
        set(rolled);
        report(r.error);
      }
    });
  }

  function onVote(value: 1 | -1) {
    setBurst(value === 1 ? "up" : "down");
    setTimeout(() => setBurst(null), 480);
    run(voteChain, { kind: "vote", value }, () => toggleVote(post.id, value), ["vote", "up", "down"]);
  }

  function onBookmark() {
    run(bmChain, { kind: "bookmark" }, () => toggleBookmark(post.id), ["marked", "bookmarks"]);
  }

  function onReblog() {
    setReblogFx(true);
    setTimeout(() => setReblogFx(false), 500);
    run(rbChain, { kind: "reblog" }, () => toggleReblog(post.id), ["reblogged", "reblogs"]);
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
          {showCounts && compactNumber(post.replyCount)}
        </Link>

        {/* Reblog splits into a menu: bare Reblog (instant toggle, as before) or
            Quote (opens the composer). The pressed/filled state still tracks the
            BARE reblog only, so the toggle never lies about a quote. */}
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label="Reblog or quote"
            aria-pressed={state.reblogged}
            title="Reblog"
            className={cn(ITEM, state.reblogged && "text-brand")}
          >
            <Repeat2 className={cn("size-4", reblogFx && "animate-reblog-spin")} />
            {showCounts && compactNumber(state.reblogs)}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={onReblog}>
              {state.reblogged ? "Undo reblog" : "Reblog"}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setQuoting(true)}>Quote</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <button
          type="button"
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
          {showCounts && compactNumber(state.up)}
        </button>

        <button
          type="button"
          onClick={onBookmark}
          aria-label="Bookmark"
          aria-pressed={state.marked}
          title="Bookmark"
          className={cn(ITEM, state.marked && "text-brand")}
        >
          <Bookmark className={cn("size-4", state.marked && "fill-current animate-pop")} />
          {showCounts && compactNumber(state.bookmarks)}
        </button>

        <Link href="/support" className={ITEM} aria-label="Award this post" title="Award">
          <Medal className="size-4" />
        </Link>

        {endSlot && <span className="ml-auto">{endSlot}</span>}
      </div>
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
      <JoinModal open={joining} onOpenChange={setJoining} />
      <QuoteModal post={post} open={quoting} onOpenChange={setQuoting} />
    </div>
  );
}
