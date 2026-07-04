# Admin UI Redesign — PR2: Shell (Sidebar + Header) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the plain `/admin` layout with a modern, collapsible admin shell — grouped icon sidebar with an orange active indicator, a sticky header with breadcrumbs + a Cmd+K command palette + quick actions + a notifications stub + a profile menu — all wrapped in `[data-admin]` so PR1's tokens activate. Every existing admin page renders unchanged inside the new frame; no route/API/logic/auth change.

**Architecture:** A single client `AdminShell` owns the collapsed state (persisted to localStorage) and renders `<div data-admin>` → `Sidebar` + `<main>`(`Header` + children). Navigation is defined once in a shared `nav-config` module (data + pure resolver functions) consumed by both the sidebar and the command palette. The server `admin/layout.tsx` keeps `requireAdmin()` and just hands `user` + `children` to `AdminShell`.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind v4, cmdk, Radix (dropdown-menu, popover, tooltip, dialog), lucide-react, next-themes, Vitest.

## Global Constraints

- ADDITIVE / UI-only: no changes to routes, APIs, server actions, `src/lib/**` (except reading existing exports), auth, permissions, or DB schema. The ONLY existing file modified is `src/app/admin/layout.tsx` (swap its body to render `AdminShell`; keep `requireAdmin`).
- Public site frozen: do not touch `components/ui/*`, `components/layout/*`, or any non-admin route. Build admin shell in `components/admin/layout/*`.
- All shell UI lives under `[data-admin]` and styles exclusively via PR1 admin tokens (`bg-admin-*`, `text-admin-*`, `border-admin-*`, `outline-admin-accent`). No public tokens (`bg-primary`, `bg-accent`, `bg-brand`) inside admin.
- Orange (`--admin-accent` / `#fe5100`) appears ONLY as: active-nav indicator, hover/focus border, focus ring, active command item. Never a fill flood. ~95/5 monochrome/orange.
- Interaction language: transitions ≤150ms, border-color/background/opacity only. No shadow-based hover, no scale/movement. Honor `prefers-reduced-motion` (global rule handles it).
- Dark mode must work (admin tokens inherit light/dark). Any client component reading theme must guard hydration (mounted flag) exactly like the existing `ThemeToggle` (`components/layout/theme-toggle.tsx`).
- Reuse existing primitives where they already exist: `@/components/ui/dropdown-menu`, `@/components/ui/popover`, `@/components/ui/tooltip`, `@/components/ui/kbd`, `cmdk`'s `Command`. Reuse PR1 admin primitives (`@/components/admin`) for buttons/badges inside the shell. Do NOT rebuild these.
- Sign-out uses the existing server action `signOut` from `@/lib/auth/actions` (same as current `SignOutButton`).
- Feature preservation: the sidebar's nav set must cover EVERY route the current `admin/layout.tsx` NAV lists — Dashboard, Posts, Updates, Links, all `ENTITY_LIST` content entities, Subscribers, Contacts, Payments, Affiliate, Integrations. Nothing dropped. Content entities are still derived from `ENTITY_LIST` (`@/lib/content/registry`) so adding an entity auto-appears.
- Branch from `origin/main` tip (4603587). PR title: `feat(admin): shell — sidebar + header (redesign PR2)`.

## Deliberate scope decision (documented)

The spec listed "layouts (DashboardLayout/ContentLayout/SettingsLayout/AuthLayout)" under PR2. They are **deferred to the PRs that consume them** (PR3 dashboard, PR5 content, PR7 commerce). Building empty pass-through wrappers now would be unused speculative code. PR2 delivers the shell, which `/admin` consumes immediately.

---

## File Structure

**Modify:**
- `src/app/admin/layout.tsx` — keep `requireAdmin()`; replace the inline aside/header/NAV with `<AdminShell user={{ email: user.email }}>{children}</AdminShell>`.

**Create — `src/components/admin/layout/`:**
- `nav-config.tsx` — grouped nav data (icons + labels + hrefs, content entities from `ENTITY_LIST`) + pure helpers `isNavItemActive(pathname, href)` and `resolveBreadcrumbs(pathname)`.
- `sidebar.tsx` — client; grouped nav, lucide icons, orange active indicator, collapse toggle, workspace mark, user footer.
- `admin-command.tsx` — client; cmdk palette over admin nav + quick actions + theme toggle; Cmd+K + custom open event.
- `notifications-bell.tsx` — client; popover with an empty state (stub source returns `[]`).
- `profile-menu.tsx` — client; dropdown with email, theme toggle, sign out.
- `breadcrumbs.tsx` — client; renders `resolveBreadcrumbs(usePathname())`.
- `header.tsx` — client; assembles breadcrumbs + command trigger + quick actions + bell + profile.
- `admin-shell.tsx` — client; owns collapsed state, renders `[data-admin]` frame.

**Create — tests:**
- `src/components/admin/layout/__tests__/nav-config.test.ts` — pure tests for `isNavItemActive` and `resolveBreadcrumbs` (and that every legacy NAV route is present in the config).

---

## Task 1: Nav config + pure resolvers

**Files:**
- Create: `src/components/admin/layout/nav-config.tsx`
- Test: `src/components/admin/layout/__tests__/nav-config.test.ts`

**Interfaces:**
- Consumes: `ENTITY_LIST`, `EntityDef` from `@/lib/content/registry`; lucide icons.
- Produces:
  - `type AdminNavItem = { label: string; href: string; icon: LucideIcon }`
  - `type AdminNavGroup = { heading: string; items: AdminNavItem[] }`
  - `const ADMIN_NAV: AdminNavGroup[]`
  - `function isNavItemActive(pathname: string, href: string): boolean` — exact match for `/admin`; prefix match (`pathname === href || pathname.startsWith(href + "/")`) otherwise.
  - `function resolveBreadcrumbs(pathname: string): { label: string; href: string }[]` — always starts with `{ label: "Dashboard", href: "/admin" }`; appends a crumb per known nav item on the path; a trailing `/new` segment becomes `{ label: "New", href: pathname }`; an unknown id segment (e.g. a row id under an entity) becomes `{ label: "Edit", href: pathname }`.

- [ ] **Step 1: Write the failing test**

Create `src/components/admin/layout/__tests__/nav-config.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { ADMIN_NAV, isNavItemActive, resolveBreadcrumbs } from "@/components/admin/layout/nav-config";

const allHrefs = ADMIN_NAV.flatMap((g) => g.items.map((i) => i.href));

describe("ADMIN_NAV", () => {
  it("covers every legacy admin route", () => {
    for (const href of [
      "/admin", "/admin/posts", "/admin/updates", "/admin/links",
      "/admin/content/case-studies", "/admin/content/projects", "/admin/content/products",
      "/admin/content/services", "/admin/content/testimonials",
      "/admin/subscribers", "/admin/contacts", "/admin/payments", "/admin/affiliate", "/admin/integrations",
    ]) {
      expect(allHrefs).toContain(href);
    }
  });

  it("groups under the real-route headings", () => {
    expect(ADMIN_NAV.map((g) => g.heading)).toEqual([
      "Overview", "Content", "Audience", "Commerce", "Distribution",
    ]);
  });
});

describe("isNavItemActive", () => {
  it("matches /admin only exactly (not for every sub-route)", () => {
    expect(isNavItemActive("/admin", "/admin")).toBe(true);
    expect(isNavItemActive("/admin/posts", "/admin")).toBe(false);
  });
  it("matches a section and its descendants", () => {
    expect(isNavItemActive("/admin/posts", "/admin/posts")).toBe(true);
    expect(isNavItemActive("/admin/posts/new", "/admin/posts")).toBe(true);
    expect(isNavItemActive("/admin/postscript", "/admin/posts")).toBe(false);
  });
});

describe("resolveBreadcrumbs", () => {
  it("dashboard root is a single crumb", () => {
    expect(resolveBreadcrumbs("/admin")).toEqual([{ label: "Dashboard", href: "/admin" }]);
  });
  it("section page has dashboard + section", () => {
    expect(resolveBreadcrumbs("/admin/posts")).toEqual([
      { label: "Dashboard", href: "/admin" },
      { label: "Posts", href: "/admin/posts" },
    ]);
  });
  it("new page appends a New crumb", () => {
    const crumbs = resolveBreadcrumbs("/admin/posts/new");
    expect(crumbs[crumbs.length - 1]).toEqual({ label: "New", href: "/admin/posts/new" });
    expect(crumbs.some((c) => c.label === "Posts")).toBe(true);
  });
  it("entity row edit appends an Edit crumb", () => {
    const crumbs = resolveBreadcrumbs("/admin/content/projects/abc123");
    expect(crumbs.some((c) => c.label === "Projects")).toBe(true);
    expect(crumbs[crumbs.length - 1]).toEqual({ label: "Edit", href: "/admin/content/projects/abc123" });
  });
});
```

- [ ] **Step 2: Run test — expect FAIL** (module not found)

Run: `npx vitest run src/components/admin/layout/__tests__/nav-config.test.ts`

- [ ] **Step 3: Implement `nav-config.tsx`**

```tsx
import {
  LayoutDashboard, FileText, Megaphone, Layers, FolderGit2, Package, Wrench,
  Quote, Users, Mail, CreditCard, Share2, Link2, Plug, type LucideIcon,
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
    heading: "Audience",
    items: [
      { label: "Subscribers", href: "/admin/subscribers", icon: Users },
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
      { label: "Integrations", href: "/admin/integrations", icon: Plug },
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
```

- [ ] **Step 4: Run test — expect PASS**

Run: `npx vitest run src/components/admin/layout/__tests__/nav-config.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/layout/nav-config.tsx src/components/admin/layout/__tests__/nav-config.test.ts
git commit -m "feat(admin): shell nav config + breadcrumb/active resolvers"
```

---

## Task 2: Sidebar

**Files:**
- Create: `src/components/admin/layout/sidebar.tsx`

**Interfaces:**
- Consumes: `ADMIN_NAV`, `isNavItemActive` (Task 1); `usePathname` from `next/navigation`; `cn`; lucide `PanelLeftClose`, `PanelLeft`.
- Produces: `Sidebar` — `function Sidebar({ collapsed, onToggleCollapsed }: { collapsed: boolean; onToggleCollapsed: () => void })`. Client component (`"use client"`).

- [ ] **Step 1: Implement `sidebar.tsx`**

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PanelLeft, PanelLeftClose } from "lucide-react";
import { cn } from "@/lib/utils";
import { ADMIN_NAV, isNavItemActive } from "./nav-config";

export function Sidebar({
  collapsed,
  onToggleCollapsed,
}: {
  collapsed: boolean;
  onToggleCollapsed: () => void;
}) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "sticky top-0 flex h-screen shrink-0 flex-col border-r border-admin-border bg-admin-surface",
        "transition-[width] duration-150",
        collapsed ? "w-14" : "w-56",
      )}
    >
      {/* Workspace mark */}
      <div className="flex h-14 items-center gap-2 border-b border-admin-border px-3">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-btn bg-admin-accent text-admin-accent-fg text-sm font-bold">
          S
        </div>
        {!collapsed && <span className="truncate text-sm font-semibold text-admin-text">Admin</span>}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {ADMIN_NAV.map((group) => (
          <div key={group.heading} className="mb-4">
            {!collapsed && (
              <p className="px-2 pb-1 text-[10px] font-medium uppercase tracking-wide text-admin-text-muted">
                {group.heading}
              </p>
            )}
            <ul className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const active = isNavItemActive(pathname, item.href);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      title={collapsed ? item.label : undefined}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "group relative flex items-center gap-3 rounded-btn px-2 py-1.5 text-sm transition-[background-color,color] duration-150",
                        active
                          ? "bg-admin-surface-hover font-medium text-admin-text"
                          : "text-admin-text-muted hover:bg-admin-surface-hover hover:text-admin-text",
                      )}
                    >
                      {/* Orange active indicator */}
                      <span
                        className={cn(
                          "absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-admin-accent transition-opacity duration-150",
                          active ? "opacity-100" : "opacity-0",
                        )}
                        aria-hidden
                      />
                      <Icon className="size-4 shrink-0" aria-hidden />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Collapse toggle */}
      <div className="border-t border-admin-border p-2">
        <button
          type="button"
          onClick={onToggleCollapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="flex w-full items-center gap-3 rounded-btn px-2 py-1.5 text-sm text-admin-text-muted transition-[background-color,color] duration-150 hover:bg-admin-surface-hover hover:text-admin-text [&_svg]:size-4"
        >
          {collapsed ? <PanelLeft aria-hidden /> : <PanelLeftClose aria-hidden />}
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  );
}
```

- [ ] **Step 2: Typecheck** — `npx tsc --noEmit` (no errors).

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/layout/sidebar.tsx
git commit -m "feat(admin): collapsible sidebar with grouped nav + orange active indicator"
```

---

## Task 3: Command palette

**Files:**
- Create: `src/components/admin/layout/admin-command.tsx`

**Interfaces:**
- Consumes: `ADMIN_NAV` (Task 1); `cmdk` `Command`; `@radix-ui/react-dialog` `Title`; `useRouter`, `useTheme`; `@/components/ui/kbd` `Kbd`; lucide `Search`, `Plus`, `MoonStar`.
- Produces:
  - `const ADMIN_OPEN_COMMAND_EVENT = "open-admin-command"`
  - `AdminCommand` — client component, self-contained (owns its open state, Cmd+K listener, and a `window` event listener for `ADMIN_OPEN_COMMAND_EVENT` so the header button can open it).

- [ ] **Step 1: Implement `admin-command.tsx`** (model the class patterns on the existing public `components/layout/command-menu.tsx`, but style with admin tokens)

```tsx
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useTheme } from "next-themes";
import { Search, Plus, MoonStar } from "lucide-react";
import { Kbd } from "@/components/ui/kbd";
import { ADMIN_NAV } from "./nav-config";

export const ADMIN_OPEN_COMMAND_EVENT = "open-admin-command";

const QUICK_ACTIONS: { label: string; href: string }[] = [
  { label: "New post", href: "/admin/posts/new" },
  { label: "New update", href: "/admin/updates/new" },
];

export function AdminCommand() {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();
  const { setTheme, resolvedTheme } = useTheme();

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    const onOpen = () => setOpen(true);
    document.addEventListener("keydown", onKey);
    window.addEventListener(ADMIN_OPEN_COMMAND_EVENT, onOpen);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener(ADMIN_OPEN_COMMAND_EVENT, onOpen);
    };
  }, []);

  const run = React.useCallback((fn: () => void) => {
    setOpen(false);
    requestAnimationFrame(fn);
  }, []);

  const itemClass =
    "flex cursor-pointer items-center gap-3 rounded-btn px-2.5 py-2 text-sm text-admin-text transition-[background-color] duration-150 data-[selected=true]:bg-admin-surface-hover [&_svg]:size-4 [&_svg]:text-admin-text-muted";
  const groupClass =
    "px-1 pb-1 pt-2 text-xs font-medium text-admin-text-muted [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pb-1";

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label="Admin command menu"
      overlayClassName="fixed inset-0 z-[90] bg-black/40 backdrop-blur-sm overlay-anim"
      contentClassName="pop-anim fixed left-1/2 top-[12vh] z-[91] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 overflow-hidden rounded-card border border-admin-border bg-admin-surface text-admin-text shadow-lg"
    >
      <div data-admin>
        <DialogPrimitive.Title className="sr-only">Admin command menu</DialogPrimitive.Title>
        <div className="flex items-center gap-2 border-b border-admin-border px-4">
          <Search className="size-4 text-admin-text-muted" />
          <Command.Input
            placeholder="Search admin…"
            className="h-12 w-full bg-transparent text-sm text-admin-text outline-none placeholder:text-admin-text-muted"
          />
          <Kbd>Esc</Kbd>
        </div>
        <Command.List className="max-h-[60vh] overflow-y-auto p-2">
          <Command.Empty className="py-10 text-center text-sm text-admin-text-muted">
            No results found.
          </Command.Empty>

          {ADMIN_NAV.map((group) => (
            <Command.Group key={group.heading} heading={group.heading} className={groupClass}>
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <Command.Item
                    key={item.href}
                    value={`${group.heading} ${item.label}`}
                    onSelect={() => run(() => router.push(item.href))}
                    className={itemClass}
                  >
                    <Icon />
                    <span className="flex-1">{item.label}</span>
                  </Command.Item>
                );
              })}
            </Command.Group>
          ))}

          <Command.Group heading="Quick actions" className={groupClass}>
            {QUICK_ACTIONS.map((a) => (
              <Command.Item
                key={a.href}
                value={`new create ${a.label}`}
                onSelect={() => run(() => router.push(a.href))}
                className={itemClass}
              >
                <Plus />
                <span className="flex-1">{a.label}</span>
              </Command.Item>
            ))}
            <Command.Item
              value="toggle theme dark light"
              onSelect={() => run(() => setTheme(resolvedTheme === "dark" ? "light" : "dark"))}
              className={itemClass}
            >
              <MoonStar />
              <span className="flex-1">Toggle theme</span>
            </Command.Item>
          </Command.Group>
        </Command.List>
      </div>
    </Command.Dialog>
  );
}
```

- [ ] **Step 2: Typecheck** — `npx tsc --noEmit`.

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/layout/admin-command.tsx
git commit -m "feat(admin): Cmd+K command palette (nav + quick actions)"
```

---

## Task 4: Notifications bell + Profile menu

**Files:**
- Create: `src/components/admin/layout/notifications-bell.tsx`
- Create: `src/components/admin/layout/profile-menu.tsx`

**Interfaces:**
- `notifications-bell.tsx` consumes `@/components/ui/popover` (`Popover`, `PopoverTrigger`, `PopoverContent`), lucide `Bell`. Produces `NotificationsBell` (client). Reads a local stub `useAdminNotifications()` returning `[]` — clearly marked placeholder, no network.
- `profile-menu.tsx` consumes `@/components/ui/dropdown-menu` (`DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuLabel`, `DropdownMenuSeparator`), `@/components/ui/avatar` (`Avatar`, `AvatarFallback`), `useTheme`, `signOut` from `@/lib/auth/actions`, lucide `Sun`, `Moon`, `LogOut`. Produces `ProfileMenu({ email }: { email: string })` (client).

- [ ] **Step 1: Implement `notifications-bell.tsx`**

```tsx
"use client";

import { Bell } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";

type AdminNotification = { id: string; title: string };

/** Placeholder feed — no backing API yet (see spec §7). Returns an empty list
 *  so the bell renders its empty state; wire to a real source in a later PR. */
function useAdminNotifications(): AdminNotification[] {
  return [];
}

export function NotificationsBell() {
  const notifications = useAdminNotifications();
  return (
    <Popover>
      <PopoverTrigger
        aria-label="Notifications"
        className="relative flex size-9 items-center justify-center rounded-btn border border-transparent text-admin-text-muted transition-[color,border-color] duration-150 hover:border-admin-border-hover hover:text-admin-text [&_svg]:size-4"
      >
        <Bell aria-hidden />
        {notifications.length > 0 && (
          <span className="absolute right-2 top-2 size-1.5 rounded-full bg-admin-accent" aria-hidden />
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 border-admin-border bg-admin-surface p-0 text-admin-text">
        <div className="border-b border-admin-border px-3 py-2 text-sm font-medium">Notifications</div>
        {notifications.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-admin-text-muted">You're all caught up.</p>
        ) : (
          <ul className="max-h-72 overflow-y-auto">
            {notifications.map((n) => (
              <li key={n.id} className="border-b border-admin-border px-3 py-2 text-sm last:border-0">
                {n.title}
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
```

- [ ] **Step 2: Implement `profile-menu.tsx`**

```tsx
"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Sun, Moon, LogOut } from "lucide-react";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { signOut } from "@/lib/auth/actions";

export function ProfileMenu({ email }: { email: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  React.useEffect(() => setMounted(true), []);
  const isDark = resolvedTheme === "dark";
  const initial = email.charAt(0).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Account menu"
        className="rounded-full outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-admin-accent"
      >
        <Avatar className="size-8">
          <AvatarFallback className="bg-admin-surface-hover text-xs font-medium text-admin-text">
            {initial}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56" data-admin>
        <DropdownMenuLabel className="truncate text-admin-text-muted">{email}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            if (mounted) setTheme(isDark ? "light" : "dark");
          }}
        >
          {mounted && isDark ? <Sun /> : <Moon />}
          <span>Toggle theme</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <form action={signOut}>
            <button type="submit" className="flex w-full items-center gap-2">
              <LogOut />
              <span>Sign out</span>
            </button>
          </form>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

- [ ] **Step 3: Typecheck** — `npx tsc --noEmit`. (If `DropdownMenuContent`/`PopoverContent` reject a `data-admin` attribute, it is a passthrough HTML attr on a Radix content div; if TS complains, spread it via `{...{ "data-admin": "" }}` — but the Radix content already renders in a portal outside the shell's `[data-admin]`, so `data-admin` here is REQUIRED to re-scope admin tokens inside the portal.)

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/layout/notifications-bell.tsx src/components/admin/layout/profile-menu.tsx
git commit -m "feat(admin): notifications bell (stub) + profile menu"
```

---

## Task 5: Breadcrumbs + Header

**Files:**
- Create: `src/components/admin/layout/breadcrumbs.tsx`
- Create: `src/components/admin/layout/header.tsx`

**Interfaces:**
- `breadcrumbs.tsx` consumes `resolveBreadcrumbs` (Task 1), `usePathname`, `Link`, lucide `ChevronRight`. Produces `Breadcrumbs` (client).
- `header.tsx` consumes `Breadcrumbs`, `AdminCommand` + `ADMIN_OPEN_COMMAND_EVENT` (Task 3), `NotificationsBell` + `ProfileMenu` (Task 4), `@/components/admin` `AdminButton`, lucide `Search`, `Plus`. Produces `Header({ email }: { email: string })` (client).

- [ ] **Step 1: Implement `breadcrumbs.tsx`**

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { resolveBreadcrumbs } from "./nav-config";

export function Breadcrumbs() {
  const pathname = usePathname();
  const crumbs = resolveBreadcrumbs(pathname);
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm">
      {crumbs.map((c, i) => {
        const last = i === crumbs.length - 1;
        return (
          <span key={c.href} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="size-3.5 text-admin-text-muted" aria-hidden />}
            {last ? (
              <span className="font-medium text-admin-text" aria-current="page">{c.label}</span>
            ) : (
              <Link href={c.href} className="text-admin-text-muted transition-[color] duration-150 hover:text-admin-text">
                {c.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 2: Implement `header.tsx`**

```tsx
"use client";

import { Search, Plus } from "lucide-react";
import { Breadcrumbs } from "./breadcrumbs";
import { AdminCommand, ADMIN_OPEN_COMMAND_EVENT } from "./admin-command";
import { NotificationsBell } from "./notifications-bell";
import { ProfileMenu } from "./profile-menu";

export function Header({ email }: { email: string }) {
  const openCommand = () => window.dispatchEvent(new Event(ADMIN_OPEN_COMMAND_EVENT));
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-admin-border bg-admin-bg/80 px-4 backdrop-blur">
      <Breadcrumbs />
      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          onClick={openCommand}
          className="flex h-9 items-center gap-2 rounded-input border border-admin-border px-3 text-sm text-admin-text-muted transition-[border-color,color] duration-150 hover:border-admin-border-hover hover:text-admin-text"
        >
          <Search className="size-4" aria-hidden />
          <span className="hidden sm:inline">Search…</span>
          <kbd className="hidden rounded bg-admin-surface-hover px-1.5 text-[10px] sm:inline">⌘K</kbd>
        </button>
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event(ADMIN_OPEN_COMMAND_EVENT))}
          aria-label="Quick create"
          className="flex size-9 items-center justify-center rounded-btn bg-admin-accent text-admin-accent-fg transition-[opacity] duration-150 hover:opacity-90 [&_svg]:size-4"
        >
          <Plus aria-hidden />
        </button>
        <NotificationsBell />
        <ProfileMenu email={email} />
      </div>
      <AdminCommand />
    </header>
  );
}
```

- [ ] **Step 3: Typecheck** — `npx tsc --noEmit`.

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/layout/breadcrumbs.tsx src/components/admin/layout/header.tsx
git commit -m "feat(admin): sticky header — breadcrumbs, search trigger, quick create"
```

---

## Task 6: AdminShell + wire layout

**Files:**
- Create: `src/components/admin/layout/admin-shell.tsx`
- Modify: `src/app/admin/layout.tsx`

**Interfaces:**
- `admin-shell.tsx` consumes `Sidebar` (Task 2), `Header` (Task 5). Produces `AdminShell({ user, children }: { user: { email: string }; children: React.ReactNode })` (client) — owns `collapsed` state persisted to `localStorage["admin:sidebar-collapsed"]`, hydration-guarded.
- `admin/layout.tsx` (modified) keeps `requireAdmin()` (server), renders `<AdminShell user={{ email: user.email }}>{children}</AdminShell>`.

- [ ] **Step 1: Implement `admin-shell.tsx`**

```tsx
"use client";

import * as React from "react";
import { Sidebar } from "./sidebar";
import { Header } from "./header";

const STORAGE_KEY = "admin:sidebar-collapsed";

export function AdminShell({
  user,
  children,
}: {
  user: { email: string };
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = React.useState(false);
  // Hydration-safe: read persisted state after mount (avoids SSR mismatch).
  // eslint-disable-next-line react-hooks/set-state-in-effect
  React.useEffect(() => {
    setCollapsed(localStorage.getItem(STORAGE_KEY) === "1");
  }, []);

  const toggle = React.useCallback(() => {
    setCollapsed((c) => {
      const next = !c;
      localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  }, []);

  return (
    <div data-admin className="flex min-h-screen bg-admin-bg text-admin-text">
      <Sidebar collapsed={collapsed} onToggleCollapsed={toggle} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header email={user.email} />
        <main className="min-w-0 flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Rewrite `src/app/admin/layout.tsx`** (keep `requireAdmin`; drop the old inline nav/aside/header/`ENTITY_LIST` import)

```tsx
import { requireAdmin } from "@/lib/auth/session";
import { AdminShell } from "@/components/admin/layout/admin-shell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  return <AdminShell user={{ email: user.email }}>{children}</AdminShell>;
}
```

- [ ] **Step 3: Typecheck + full test suite**

Run: `npx tsc --noEmit && npx vitest run`
Expected: no type errors; all tests pass (existing + nav-config tests).

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/layout/admin-shell.tsx src/app/admin/layout.tsx
git commit -m "feat(admin): AdminShell frame + wire admin layout to new shell"
```

---

## Task 7: Build-integration verification

Prove the shell renders in a real build and the admin scope is active — without a login (auth gates `/admin`), via a throwaway unauthed route, then delete it.

**Files:**
- Create (temporary): `src/app/admin-shell-preview/page.tsx`

- [ ] **Step 1: Create the throwaway preview route**

```tsx
import { AdminShell } from "@/components/admin/layout/admin-shell";

export default function AdminShellPreview() {
  return (
    <AdminShell user={{ email: "preview@example.com" }}>
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p className="mt-2 text-admin-text-muted">Shell preview content.</p>
    </AdminShell>
  );
}
```

- [ ] **Step 2: Production build**

Run: `npm run build`
Expected: exit 0, "Compiled successfully", and `/admin-shell-preview` appears in the route manifest. If it fails, read the error, fix genuine integration bugs in the shell components (report each), rebuild.

- [ ] **Step 3: (Optional) DOM smoke via preview tooling** — per project convention (no screenshots). If a dev server can be started in this worktree: load `/admin-shell-preview`, and via `preview_eval` confirm `getComputedStyle(document.querySelector('[data-admin]')).getPropertyValue('--admin-accent')` is `#fe5100`/`rgb(254, 81, 0)`, and that the sidebar + header render (query `aside` and `header`). Check `preview_console_logs` for errors. If the dev server cannot run here, skip and rely on the build + typecheck (note the skip).

- [ ] **Step 4: Delete the throwaway route**

```bash
git rm -r src/app/admin-shell-preview
git commit -m "chore(admin): remove shell-preview scratch route"
```

---

## Self-Review

**1. Spec coverage (PR2 slice):**
- Sidebar: grouped nav ✓ (Task 1/2), lucide icons ✓, orange active indicator ✓ (left bar span), collapsible + persisted ✓ (Task 6), workspace mark ✓, user/profile section ✓ (header ProfileMenu). "Search" in sidebar → provided via header Cmd+K instead (single palette, no duplicate) — deliberate.
- Header: sticky ✓, breadcrumbs ✓ (Task 1/5), global search = Cmd+K palette ✓ (Task 3), quick actions ✓ (palette + `+` button), notifications ✓ (stub, Task 4), profile menu ✓ (Task 4).
- `[data-admin]` wrapper activates PR1 tokens ✓ (Task 6 shell + re-scoped in portals for command/dropdown/popover).
- Feature preservation: every legacy NAV route present — asserted by the Task 1 test ✓.
- Dark mode + reduced-motion + ≤150ms border/opacity transitions ✓ across components.

**2. Placeholder scan:** no TBD/TODO; every step has full code. Notifications explicitly a documented stub, not a placeholder-to-fill. ✓

**3. Type consistency:** `ADMIN_NAV`/`isNavItemActive`/`resolveBreadcrumbs` names identical across nav-config, sidebar, breadcrumbs, command, and tests. `ADMIN_OPEN_COMMAND_EVENT` shared between `admin-command` and `header`. `AdminShell` prop `user: { email }` matches `admin/layout.tsx` call. `ProfileMenu({ email })` / `Header({ email })` consistent. ✓

**4. Portal scoping risk (named):** cmdk dialog, dropdown, and popover render in Radix portals OUTSIDE the shell's `[data-admin]` div, so admin tokens would be undefined there. Mitigated: each portalled content re-declares `data-admin` (command wraps content in `<div data-admin>`; dropdown/popover content carry `data-admin`). Task 7 build + the token check confirm. If any portal still renders unstyled, that's an Important fix during review.

**5. Deferred correctly:** layout wrappers (Dashboard/Content/Settings/Auth) → consuming PRs; dashboard redesign → PR3; DataTable/forms → PR4. ✓
