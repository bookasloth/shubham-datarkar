"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { loadFeedPage, type FeedPageResult } from "@/lib/community/feed-actions";
import type { FeedQuery } from "@/lib/community/feed-query";

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
  children,
}: {
  query: FeedQuery;
  /** Rows in the server-rendered first page — where paging picks up. */
  initialCount: number;
  children: React.ReactNode;
}) {
  const [pages, setPages] = useState<React.ReactNode[]>([]);
  const [done, setDone] = useState(initialCount < FEED_PAGE);
  const [waiting, setWaiting] = useState(false);

  const offset = useRef(initialCount);
  const buffer = useRef<Promise<FeedPageResult> | null>(null);
  const pending = useRef(false);
  const sentinel = useRef<HTMLDivElement | null>(null);

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

  return (
    <>
      {children}
      {pages}

      {!done && <div ref={sentinel} aria-hidden className="h-px" />}

      {!done && waiting && (
        <div className="flex justify-center py-6" role="status" aria-label="Loading more posts">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {done && (
        <p className="px-4 py-10 text-center text-sm text-muted-foreground">
          You&apos;re all caught up.
        </p>
      )}
    </>
  );
}
