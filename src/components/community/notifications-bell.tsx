"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { getUnreadCount } from "@/lib/community/notification-actions";

/**
 * Header bell with an unread badge. Self-fetching so it needs no count threaded
 * through every layout: polls on mount, every 60s, and when the tab regains
 * focus — visible-tab only, so a backgrounded tab is silent.
 */
export function NotificationsBell() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const n = await getUnreadCount();
        if (alive) setCount(n);
      } catch {
        // Leave the last count; the next tick retries.
      }
    };
    void tick();
    const id = setInterval(tick, 60_000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      alive = false;
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, []);

  return (
    <Link
      href="/community/notifications"
      aria-label={count > 0 ? `Notifications, ${count} unread` : "Notifications"}
      className="relative rounded-btn p-2 text-muted-foreground transition-ui hover:bg-accent hover:text-foreground"
    >
      <Bell className="size-5" />
      {count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-semibold leading-4 text-white">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
