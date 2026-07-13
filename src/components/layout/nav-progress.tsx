"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Global navigation progress bar — the "I heard your click" feedback the app had
 * nowhere, and the one lever that reaches first-entry and cross-shell navigations
 * that a route `loading.tsx` can't cover (their layouts await auth before any
 * fallback can paint).
 *
 * The App Router exposes no router events, so the bar is driven by:
 *  - intercepting internal-link clicks (capture phase),
 *  - patching history.pushState to catch programmatic router.push (e.g. the feed
 *    sort menu) and popstate for back/forward,
 *  - finishing when the resolved pathname/search actually change.
 *
 * It trickles toward 90% while the server responds — the placebo that says work
 * is happening — then snaps to 100% and fades. A 100ms reveal debounce keeps
 * instant (prefetched) navigations from flashing a bar.
 *
 * ponytail: click + history interception, not a router-events API (there is
 * none). If it ever misses an edge case, swap in `nextjs-toploader`; the whole
 * surface is this one file.
 */
export function NavProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const url = `${pathname}?${searchParams}`;
  const [progress, setProgress] = useState(0); // 0 = hidden
  const trickle = useRef<ReturnType<typeof setInterval> | null>(null);
  const reveal = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clear = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearTimers() {
    if (trickle.current) clearInterval(trickle.current);
    if (reveal.current) clearTimeout(reveal.current);
    if (clear.current) clearTimeout(clear.current);
    trickle.current = reveal.current = clear.current = null;
  }

  function begin() {
    clearTimers();
    // Only reveal if the navigation takes longer than 100ms — prefetched routes
    // resolve instantly and shouldn't flash the bar.
    reveal.current = setTimeout(() => {
      setProgress(10);
      trickle.current = setInterval(() => {
        setProgress((p) => (p >= 90 ? p : p + (90 - p) * 0.12));
      }, 200);
    }, 100);
  }

  function finish() {
    clearTimers();
    // Never revealed (fast nav) → stay hidden. Otherwise complete then fade.
    setProgress((p) => (p === 0 ? 0 : 100));
    clear.current = setTimeout(() => setProgress(0), 250);
  }

  // Navigation landed whenever the resolved URL changes. Defer a tick so the
  // completion runs from a timer callback, not synchronously in the effect body.
  useEffect(() => {
    const t = setTimeout(finish, 0);
    return () => {
      clearTimeout(t);
      clearTimers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  // Start on internal-link clicks + programmatic history changes.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement | null)?.closest?.("a");
      if (!a) return;
      const href = a.getAttribute("href");
      if (!href || href.startsWith("#") || a.hasAttribute("download")) return;
      if (a.target === "_blank") return;
      let dest: URL;
      try {
        dest = new URL(href, window.location.href);
      } catch {
        return;
      }
      if (dest.origin !== window.location.origin) return;
      if (dest.href === window.location.href) return; // same page, no navigation
      begin();
    }

    const origPush = history.pushState;
    history.pushState = function (...args) {
      begin();
      return origPush.apply(this, args as Parameters<typeof origPush>);
    };
    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", begin);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", begin);
      history.pushState = origPush;
      clearTimers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (progress === 0) return null;
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-[9999] h-0.5"
    >
      <div
        className="h-full bg-brand shadow-[0_0_8px] shadow-brand/50"
        style={{
          width: `${progress}%`,
          opacity: progress >= 100 ? 0 : 1,
          transition: "width 200ms ease, opacity 250ms ease",
        }}
      />
    </div>
  );
}
