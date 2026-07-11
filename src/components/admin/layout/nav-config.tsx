import {
  LayoutDashboard, FileText, Megaphone, Layers, FolderGit2, Package, Wrench,
  Quote, Users, Mail, CreditCard, Share2, Link2, Plug, Gamepad2, Search,
  Library, Tags, MessageSquarePlus, UserRound, Bell, BarChart3, MessagesSquare,
  Contact, Send, type LucideIcon,
} from "lucide-react";
import { ENTITY_LIST } from "@/lib/content/registry";

export type AdminNavItem = { label: string; href: string; icon: LucideIcon };
export type AdminNavGroup = { heading: string; items: AdminNavItem[] };

const ENTITY_ICONS: Record<string, LucideIcon> = {
  "case-studies": Layers,
  projects: FolderGit2,
  products: Package,
  services: Wrench,
  testimonials: Quote,
};

const contentEntityItems: AdminNavItem[] = ENTITY_LIST.map((e) => ({
  label: e.label,
  href: `/admin/content/${e.key}`,
  icon: ENTITY_ICONS[e.key] ?? Layers,
}));

export const ADMIN_NAV: AdminNavGroup[] = [
  { heading: "Overview", items: [{ label: "Dashboard", href: "/admin", icon: LayoutDashboard }] },
  {
    heading: "Content",
    items: [
      { label: "Posts", href: "/admin/posts", icon: FileText },
      { label: "Updates", href: "/admin/updates", icon: Megaphone },
      ...contentEntityItems,
    ],
  },
  {
    heading: "Members",
    items: [
      { label: "Resources", href: "/admin/resources", icon: Library },
      { label: "Taxonomy", href: "/admin/resources/taxonomy", icon: Tags },
      { label: "Tools", href: "/admin/resources/tools", icon: Wrench },
      { label: "Analytics", href: "/admin/members/analytics", icon: BarChart3 },
      { label: "Requests", href: "/admin/requests", icon: MessageSquarePlus },
      { label: "Members", href: "/admin/members", icon: UserRound },
      { label: "Plans", href: "/admin/plans", icon: CreditCard },
      { label: "Community", href: "/admin/community", icon: MessagesSquare },
      { label: "Announcements", href: "/admin/announcements", icon: Bell },
    ],
  },
  {
    heading: "Audience",
    items: [
      { label: "People", href: "/admin/people", icon: Contact },
      { label: "Subscribers", href: "/admin/subscribers", icon: Users },
      { label: "Broadcast", href: "/admin/broadcast", icon: Send },
      { label: "Contacts", href: "/admin/contacts", icon: Mail },
    ],
  },
  {
    heading: "Commerce",
    items: [
      { label: "Payments", href: "/admin/payments", icon: CreditCard },
      { label: "Affiliate", href: "/admin/affiliate", icon: Share2 },
    ],
  },
  {
    heading: "Distribution",
    items: [
      { label: "Links", href: "/admin/links", icon: Link2 },
      { label: "Games", href: "/admin/games", icon: Gamepad2 },
      { label: "Integrations", href: "/admin/integrations", icon: Plug },
    ],
  },
  {
    heading: "SEO",
    items: [
      { label: "Dashboard", href: "/admin/seo", icon: Search },
      { label: "Pages", href: "/admin/seo/pages", icon: FileText },
    ],
  },
];

const ALL_ITEMS: AdminNavItem[] = ADMIN_NAV.flatMap((g) => g.items);

/** /admin matches only exactly; every other item matches itself + descendants. */
export function isNavItemActive(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(href + "/");
}

/** Breadcrumb trail: always Dashboard first, then the deepest matching nav
 *  item, then a New/Edit leaf for create/detail routes. */
export function resolveBreadcrumbs(pathname: string): { label: string; href: string }[] {
  const crumbs: { label: string; href: string }[] = [{ label: "Dashboard", href: "/admin" }];
  if (pathname === "/admin") return crumbs;

  // Deepest non-Dashboard nav item that this path falls under.
  const section = ALL_ITEMS
    .filter((i) => i.href !== "/admin" && isNavItemActive(pathname, i.href))
    .sort((a, b) => b.href.length - a.href.length)[0];
  if (section) crumbs.push({ label: section.label, href: section.href });

  if (pathname.endsWith("/new")) {
    crumbs.push({ label: "New", href: pathname });
  } else if (section && pathname !== section.href) {
    // A deeper segment remains (e.g. an entity/post row id) → detail edit.
    crumbs.push({ label: "Edit", href: pathname });
  }
  return crumbs;
}
