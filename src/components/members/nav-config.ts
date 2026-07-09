import type { LucideIcon } from "lucide-react";
import {
  Bookmark,
  Clock,
  Compass,
  Download,
  Gamepad2,
  LayoutDashboard,
  MessageSquarePlus,
  UserRound,
  Wrench,
} from "lucide-react";

export type MembersNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Shown in the mobile bottom bar (max 4). */
  mobile?: boolean;
};

export const MEMBERS_NAV: MembersNavItem[] = [
  { label: "Dashboard", href: "/members", icon: LayoutDashboard, mobile: true },
  { label: "Explore", href: "/members/explore", icon: Compass, mobile: true },
  { label: "Latest", href: "/members/latest", icon: Clock },
  { label: "Bookmarks", href: "/members/bookmarks", icon: Bookmark, mobile: true },
  { label: "Downloads", href: "/members/downloads", icon: Download },
  { label: "Requests", href: "/members/requests", icon: MessageSquarePlus },
  { label: "Tools", href: "/members/tools", icon: Wrench },
  { label: "Games", href: "/games", icon: Gamepad2 },
  { label: "Account", href: "/members/account", icon: UserRound, mobile: true },
];

export function isMembersNavActive(href: string, pathname: string): boolean {
  if (href === "/members") return pathname === "/members";
  return pathname === href || pathname.startsWith(`${href}/`);
}
