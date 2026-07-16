import {
  Compass, Gamepad2, Users, UserRound, type LucideIcon,
} from "lucide-react";

export type AppNavItem = {
  label: string;
  href: string;
  gated?: boolean;
  /** Opens in a new tab (off-site links like the booking page). */
  external?: boolean;
  /** Sub-links rendered under the item (games: Play / Archive / Leaderboard). */
  children?: AppNavItem[];
};
export type SectionKey = "community" | "membership" | "game" | "account";
export type AppNavSection = {
  key: SectionKey;
  label: string;
  icon: LucideIcon;
  /** Section landing page when it differs from the first item (games hub). */
  home?: string;
  items: AppNavItem[];
};

export const APP_NAV: AppNavSection[] = [
  {
    key: "community",
    label: "Community",
    icon: Users,
    items: [
      { label: "Home", href: "/community" },
      { label: "Likes", href: "/community/likes", gated: true },
      { label: "Shares", href: "/community/reblogs", gated: true },
      { label: "Saved", href: "/community/bookmarks", gated: true },
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
    label: "Games",
    icon: Gamepad2,
    home: "/games",
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
    // Single item so sectionHref/activeChildHref keep working; the sidebar
    // renders accountItems() + Logout instead of this list.
    items: [{ label: "Account", href: "/members/account", gated: true }],
  },
];

export const BOOK_CALL_URL =
  "https://bookasloth.com/sndatarkar/talk-about-shubham-datarkar-dot-com";

/** Account submenu — first entry flips on membership status. */
export function accountItems(isPremium: boolean): AppNavItem[] {
  return [
    isPremium
      ? { label: "Support the Cause", href: "/support" }
      : { label: "Become Member", href: "/members/upgrade" },
    { label: "Raise a Complain", href: "/contact" },
    { label: "Book a Call with SD", href: BOOK_CALL_URL, external: true },
  ];
}

/** Section roots ordered so a longer prefix wins (account before membership). */
const ROOTS: [SectionKey, string][] = [
  ["account", "/members/account"],
  ["membership", "/members"],
  ["community", "/community"],
  ["game", "/games"],
];

export function matches(pathname: string, prefix: string): boolean {
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
  const s = APP_NAV.find((sec) => sec.key === key)!;
  return s.home ?? s.items[0].href;
}
