"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { parseFirstTouch, type FirstTouch } from "@/lib/attribution";

const KEY = "sd_first_touch";

/**
 * Records where a visitor first landed and how many pages they have seen since.
 * localStorage rather than a cookie: the value is only ever read by the contact
 * form, so there is no reason to put it on every request. Client-side rather
 * than middleware: this app has no middleware, and App Router client navigation
 * means `document.referrer` on the first load is the true external referrer.
 *
 * Best-effort by design. Private mode, quota errors, and disabled storage all
 * fail silently — a lead without attribution is still a lead.
 */
export function AttributionProbe() {
  const pathname = usePathname();

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (!raw) {
        const first = parseFirstTouch(window.location.href, document.referrer);
        window.localStorage.setItem(KEY, JSON.stringify(first));
        return;
      }
      const touch = JSON.parse(raw) as FirstTouch;
      touch.pagesSeen = (Number(touch.pagesSeen) || 1) + 1;
      window.localStorage.setItem(KEY, JSON.stringify(touch));
    } catch {
      // No storage, no attribution. Not worth breaking a page over.
    }
  }, [pathname]);

  return null;
}

/** Reads the stored first touch. Returns null when absent or unparseable. */
export function readFirstTouch(): FirstTouch | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as FirstTouch) : null;
  } catch {
    return null;
  }
}
