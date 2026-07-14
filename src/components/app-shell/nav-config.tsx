import {
  Compass, Gamepad2, Users, UserRound, type LucideIcon,
} from "lucide-react";

export type AppNavItem = {
  label: string;
  href: string;
  gated?: boolean;
  /** Sub-links rendered under the item (games: Play / Archive / Leaderboard). */
  children?: AppNavItem[];
};
export type SectionKey = "community" | "membership" | "game" | "account";
export type AppNavSection = {
  key: SectionKey;
  label: string;
  icon: LucideIcon;
  items: AppNavItem[];
};

export const APP_NAV: AppNavSection[] = [
  {
    key: "community",
    label: "Community",
    icon: Users,
    items: [
      { label: "Explore", href: "/community" },
      { label: "Bookmarks", href: "/community/bookmarks", gated: true },
      { label: "Reblogs", href: "/community/reblogs", gated: true },
      { label: "Likes", href: "/community/likes", gated: true },
    ],
  },
  {
    key: "membership",
    label: "Membership",
    icon: Compass,
    items: [
      { label: "Explore", href: "/members/explore" },
      { label: "Latest", href: "/members/latest" },
      { label: "Bookmarks", href: "/members/bookmarks", gated: true },
      { label: "Downloads", href: "/members/downloads", gated: true },
      { label: "Requests", href: "/members/requests", gated: true },
      { label: "Tools", href: "/members/tools" },
    ],
  },
  {
    key: "game",
    label: "Game",
    icon: Gamepad2,
    items: [
      {
        label: "Alfazy",
        href: "/games/alfazy",
        children: [
          { label: "Play", href: "/games/alfazy" },
          { label: "Archive", href: "/games/alfazy/archive" },
          { label: "Leaderboard", href: "/games/alfazy/leaderboard" },
        ],
      },
      {
        label: "Hit and Blow",
        href: "/games/hit-and-blow",
        children: [
          { label: "Play", href: "/games/hit-and-blow" },
          { label: "Archive", href: "/games/hit-and-blow/archive" },
          { label: "Leaderboard", href: "/games/hit-and-blow/leaderboard" },
        ],
      },
      {
        label: "Integra",
        href: "/games/integra",
        children: [
          { label: "Play", href: "/games/integra" },
          { label: "Archive", href: "/games/integra/archive" },
          { label: "Leaderboard", href: "/games/integra/leaderboard" },
        ],
      },
    ],
  },
  {
    key: "account",
    label: "Account",
    icon: UserRound,
    items: [
      { label: "Profile", href: "/members/account", gated: true },
      { label: "Membership", href: "/members/account", gated: true },
    ],
  },
];

/** Section roots ordered so a longer prefix wins (account before membership). */
const ROOTS: [SectionKey, string][] = [
  ["account", "/members/account"],
  ["membership", "/members"],
  ["community", "/community"],
  ["game", "/games"],
];

function matches(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(prefix + "/");
}

export function activeSection(pathname: string): SectionKey | null {
  const hit = ROOTS.filter(([, p]) => matches(pathname, p)).sort(
    (a, b) => b[1].length - a[1].length,
  )[0];
  return hit ? hit[0] : null;
}

// Flatten to LEAF links: a game group's href duplicates its Play child, so matching
// against groups would tie on length and make the highlight ambiguous.
const ALL_ITEMS = APP_NAV.flatMap((s) => s.items.flatMap((i) => i.children ?? [i]));

export function activeChildHref(pathname: string): string | null {
  const m = ALL_ITEMS.filter((i) => matches(pathname, i.href)).sort(
    (a, b) => b.href.length - a.href.length,
  )[0];
  return m ? m.href : null;
}

export function sectionHref(key: SectionKey): string {
  return APP_NAV.find((s) => s.key === key)!.items[0].href;
}
