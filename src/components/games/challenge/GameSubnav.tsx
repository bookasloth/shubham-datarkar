"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { gameBySlug } from "@/lib/games/registry";

/**
 * Per-game tab strip: Play · Leaderboard · Archive · Challenge. Self-hides off
 * game pages (mirrors GameRail). Slug is derived from the path, so switching
 * games needs no server round-trip.
 */
export function GameSubnav() {
  const pathname = usePathname();
  const slug = pathname.split("/")[2] ?? "";
  const game = gameBySlug(slug);
  if (!game) return null;

  const base = `/games/${slug}`;
  const tabs = [
    { label: "Play", href: base, active: pathname === base },
    { label: "Leaderboard", href: `${base}/leaderboard`, active: pathname.startsWith(`${base}/leaderboard`) },
    { label: "Archive", href: `${base}/archive`, active: pathname.startsWith(`${base}/archive`) },
    { label: "Challenge", href: `${base}/challenge`, active: pathname.startsWith(`${base}/challenge`) },
  ];

  return (
    <nav className="mx-auto mb-6 flex max-w-md flex-wrap justify-center gap-1 rounded-input border border-border bg-muted/50 p-1">
      {tabs.map((t) => (
        <Link
          key={t.label}
          href={t.href}
          aria-current={t.active ? "page" : undefined}
          className={
            "rounded-btn px-3 py-1.5 text-sm font-medium transition-ui " +
            (t.active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")
          }
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
