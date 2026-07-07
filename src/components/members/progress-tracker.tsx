"use client";

import { useEffect, useRef } from "react";
import { saveProgress } from "@/lib/members/progress-actions";

/**
 * Tracks how far the member has scrolled through a resource and persists the
 * max ratio: every 10s while it changes, and on tab hide/unmount.
 */
export function ProgressTracker({
  resourceId,
  initialProgress,
}: {
  resourceId: string;
  initialProgress: number;
}) {
  const maxRatio = useRef(initialProgress);
  const lastSaved = useRef(initialProgress);

  useEffect(() => {
    function ratio(): number {
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - window.innerHeight;
      if (scrollable <= 0) return 1;
      return Math.min(1, Math.max(0, (window.scrollY + window.innerHeight) / doc.scrollHeight));
    }

    function onScroll() {
      maxRatio.current = Math.max(maxRatio.current, ratio());
    }

    function flush() {
      if (Math.abs(maxRatio.current - lastSaved.current) < 0.02) return;
      lastSaved.current = maxRatio.current;
      void saveProgress(resourceId, maxRatio.current);
    }

    function onVisibility() {
      if (document.visibilityState === "hidden") flush();
    }

    onScroll(); // count the initial viewport
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    const timer = window.setInterval(flush, 10_000);

    return () => {
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onVisibility);
      window.clearInterval(timer);
      flush();
    };
  }, [resourceId]);

  return null;
}
