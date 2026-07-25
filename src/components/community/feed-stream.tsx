"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowUp, Loader2, CheckCheck } from "lucide-react";
import { loadFeedPage, countNewNotes, type FeedPageResult } from "@/lib/community/feed-actions";
import type { FeedQuery } from "@/lib/community/feed-query";

const POLL_MS = 45_000;

export const FEED_PAGE = 10;

/**
 * Infinite feed. The first page is server-rendered as `children`; every page
 * after it arrives from `loadFeedPage` as a ready-made RSC payload.
 *
 * The next page is always already in flight: one is fetched the moment the
 * previous lands, so reaching the sentinel appends instantly instead of
 * starting a request and showing a spinner. The spinner below only appears if
 * scrolling outruns the network.
 *
 * `pending` is a ref, not state — it guards against the observer firing twice
 * before a render commits, which state can't do.
 */
export function FeedStream({
  query,
  initialCount,
  initialSince,
  showNewPill = false,
  children,
}: {
  query: FeedQuery;
  /** Rows in the server-rendered first page — where paging picks up. */
  initialCount: number;
  /** created_at of the newest row on screen — the "N New Notes" watermark. Its
   *  value re-seeds from the server on every refresh, so it never drifts. */
  initialSince?: string;
  /** The pill only makes sense on New: Hot is a shuffle (a new post has no
   *  position) and Top is vote-ranked (a 0-vote post belongs nowhere near it). */
  showNewPill?: boolean;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [pages, setPages] = useState<React.ReactNode[]>([]);
  const [done, setDone] = useState(initialCount < FEED_PAGE);
  const [waiting, setWaiting] = useState(false);
  const [newCount, setNewCount] = useState(0);

  const offset = useRef(initialCount);
  const buffer = useRef<Promise<FeedPageResult> | null>(null);
  const pending = useRef(false);
  const sentinel = useRef<HTMLDivElement | null>(null);
  // Watermark held in a ref and re-synced to the prop: after a refresh the page
  // re-renders with a newer `initialSince`, and the next poll counts from there.
  const since = useRef(initialSince ?? null);
  useEffect(() => {
    since.current = initialSince ?? null;
    setNewCount(0);
  }, [initialSince]);

  const fetchNext = useCallback(() => {
    const at = offset.current;
    offset.current += FEED_PAGE;
    return loadFeedPage(query, at, FEED_PAGE);
  }, [query]);

  // Prime the buffer once the first page is on screen, so the second page is
  // already home by the time anyone scrolls to it.
  useEffect(() => {
    if (done || buffer.current) return;
    buffer.current = fetchNext();
  }, [done, fetchNext]);

  const append = useCallback(async () => {
    if (pending.current || done || !buffer.current) return;
    pending.current = true;
    setWaiting(true);
    try {
      const page = await buffer.current;
      buffer.current = null;
      if (page.nodes) setPages((p) => [...p, page.nodes]);
      if (page.done) setDone(true);
      else buffer.current = fetchNext();
    } catch {
      // A failed page leaves the stream where it was; the observer will retry on
      // the next scroll rather than nailing a dead-end message to the feed.
      buffer.current = null;
    } finally {
      pending.current = false;
      setWaiting(false);
    }
  }, [done, fetchNext]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el || done) return;
    // 600px of runway: the append fires before the sentinel is visible, so the
    // cards are in place by the time they'd have been read.
    const io = new IntersectionObserver((entries) => entries[0]?.isIntersecting && void append(), {
      rootMargin: "600px 0px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, [append, done]);

  // Poll for new notes: one integer every 45s, and only while the tab is
  // visible — a background tab must not poll, that's the whole cost of this.
  useEffect(() => {
    if (!showNewPill) return;
    let polling = false;
    const tick = async () => {
      if (polling || document.visibilityState !== "visible" || !since.current) return;
      polling = true;
      try {
        setNewCount(await countNewNotes(query, since.current));
      } catch {
        // A failed poll leaves the last count; the next tick retries.
      } finally {
        polling = false;
      }
    };
    const id = setInterval(tick, POLL_MS);
    // Check once when the tab regains focus rather than waiting out the interval.
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [showNewPill, query]);

  // Refresh brings the newest page in and re-seeds the watermark from the server
  // (a fresh initialSince arrives via props). Scroll to top so the new notes are
  // the first thing read. ponytail: this uses router.refresh rather than an
  // in-place prepend — the prepend-and-anchor version keeps scroll position, but
  // clicking "show new" to jump to the top IS the intent, so the simpler refresh
  // wins until someone wants the scroll preserved.
  function showNew() {
    setNewCount(0);
    window.scrollTo({ top: 0, behavior: "smooth" });
    router.refresh();
  }

  return (
    <>
      {showNewPill && newCount > 0 && (
        <div className="pointer-events-none sticky top-2 z-20 flex justify-center">
          <button
            type="button"
            onClick={showNew}
            className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-1.5 text-sm font-medium text-background shadow-lg transition-ui hover:bg-brand hover:text-white"
          >
            <ArrowUp className="size-4" />
            {newCount === 50 ? "50+" : newCount} New {newCount === 1 ? "Note" : "Notes"}
          </button>
        </div>
      )}

      {children}
      {pages}

      {!done && <div ref={sentinel} aria-hidden className="h-px" />}

      {!done && waiting && (
        <div className="flex justify-center py-6" role="status" aria-label="Loading more posts">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      )}

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
    </>
  );
}
