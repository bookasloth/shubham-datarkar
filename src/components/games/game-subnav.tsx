"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/** Tabs available per game base. */
const TABS: Record<string, { label: string; seg: string }[]> = {
  "/games/alfazy": [
    { label: "Archive", seg: "archive" },
    { label: "Leaderboard", seg: "leaderboard" },
  ],
  "/games/hit-and-blow": [
    { label: "Archive", seg: "archive" },
    { label: "Leaderboard", seg: "leaderboard" },
  ],
  "/games/integra": [
    { label: "Archive", seg: "archive" },
    { label: "Leaderboard", seg: "leaderboard" },
  ],
};

export function GameSubnav({ base }: { base: keyof typeof TABS | string }) {
  const pathname = usePathname() ?? "";
  const tabs = TABS[base] ?? [];
  // "Play" covers today (=== base) and archive replays (base/<number>); the
  // other tabs live on named segments, so a numeric tail never collides.
  const playActive = pathname === base || new RegExp(`^${base}/\\d+$`).test(pathname);
  return (
    <div className="mx-auto flex items-center justify-center gap-1 px-4 pt-4">
      <Link
        href={base}
        className={cn(
          "rounded-btn px-2 py-1 text-sm transition-ui",
          playActive ? "bg-accent font-medium text-foreground" : "text-muted-foreground hover:bg-accent",
        )}
      >
        Play
      </Link>
      <span className="mx-1 text-muted-foreground">·</span>
      {tabs.map((t) => {
        const href = `${base}/${t.seg}`;
        const active = pathname.startsWith(href);
        return (
          <Link
            key={t.seg}
            href={href}
            className={cn(
              "rounded-btn px-2 py-1 text-sm transition-ui",
              active ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent",
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
