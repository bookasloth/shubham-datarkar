# Unified App Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One shared app shell (top bar + accordion sidebar + avatar dropdown) reused across Members, Community, Games, and Account so every signed-in surface looks and behaves like one product.

**Architecture:** Clone the existing admin shell idiom (`src/components/admin/layout/`) into a new `src/components/app-shell/`: a pure nav-config module with a tested active-resolver, a radix-accordion sidebar, a dropdown profile menu, and an `AppShell` wrapper. Each area's `layout.tsx` swaps its bespoke chrome for `<AppShell>`. All areas already share one Supabase session, read once per render via `getMemberContext()`.

**Tech Stack:** Next.js 16.2.9 (App Router, RSC), React 19, Tailwind v4, radix-ui (accordion, dropdown-menu, avatar — all already installed), next-themes, vitest.

## Global Constraints

- **Design tokens only** — monochrome, no emojis. Use existing classes: `bg-background` `text-foreground` `bg-accent` `border-border` `text-muted-foreground` `rounded-btn` `rounded-input` `transition-ui` `font-display`. No new colors. (`user-shubham-build-prefs`)
- **Next.js 16 is not the Next.js you know** — before writing any routing/layout code, read the relevant guide in `node_modules/next/dist/docs/`. (`AGENTS.md`)
- **PR flow** — all work on branch `feat/unified-app-shell` (already checked out from `origin/main`). Commit per task. Never commit to `main`. (`always-use-pr-flow`)
- **Migrations are manual** — write the `.sql` file; hand the SQL to the user to run in the Supabase dashboard. Never apply directly. (`supabase-manual-sql-workflow`)
- **Verify the build by its own exit code** — `npm run build`; a client component importing `server-only` passes `tsc` but breaks the build. (`verify-next-build-exit-and-server-only`)
- **UI verification** — pure-logic tasks get a vitest test; UI-only tasks are verified in the browser preview (no `@testing-library` installed — matches how the admin shell is tested: only its `nav-config` has a unit test).
- **Unified signOut** — use `signOut` from `@/lib/auth/actions` everywhere. Do not create per-area sign-out.

---

### Task 1: Nav config + active resolver (pure, TDD)

The single source of nav truth plus the two pure functions the sidebar uses to decide which section is open and which child is active. Mirrors `src/components/admin/layout/nav-config.tsx` + its test.

**Files:**
- Create: `src/components/app-shell/nav-config.tsx`
- Test: `src/components/app-shell/__tests__/nav-config.test.ts`

**Interfaces:**
- Produces:
  - `type AppNavItem = { label: string; href: string; gated?: boolean }`
  - `type SectionKey = "community" | "membership" | "game" | "account"`
  - `type AppNavSection = { key: SectionKey; label: string; icon: LucideIcon; items: AppNavItem[] }`
  - `const APP_NAV: AppNavSection[]`
  - `function activeSection(pathname: string): SectionKey | null`
  - `function activeChildHref(pathname: string): string | null`
  - `function sectionHref(key: SectionKey): string` (the section's first child href — used by the mobile bottom nav)

- [ ] **Step 1: Write the failing test**

```ts
// src/components/app-shell/__tests__/nav-config.test.ts
import { describe, it, expect } from "vitest";
import {
  APP_NAV, activeSection, activeChildHref, sectionHref,
} from "@/components/app-shell/nav-config";

describe("APP_NAV", () => {
  it("has the four sections in order", () => {
    expect(APP_NAV.map((s) => s.key)).toEqual(["community", "membership", "game", "account"]);
  });
  it("marks member-only items gated", () => {
    const all = APP_NAV.flatMap((s) => s.items);
    const downloads = all.find((i) => i.href === "/members/downloads");
    expect(downloads?.gated).toBe(true);
    const explore = all.find((i) => i.href === "/community");
    expect(explore?.gated).toBeFalsy();
  });
});

describe("activeSection", () => {
  it("resolves each area by prefix", () => {
    expect(activeSection("/community")).toBe("community");
    expect(activeSection("/community/bookmarks")).toBe("community");
    expect(activeSection("/members")).toBe("membership");
    expect(activeSection("/members/explore")).toBe("membership");
    expect(activeSection("/games/alfazy")).toBe("game");
  });
  it("prefers the more specific /members/account over /members", () => {
    expect(activeSection("/members/account")).toBe("account");
  });
  it("returns null off-shell", () => {
    expect(activeSection("/")).toBeNull();
    expect(activeSection("/blog")).toBeNull();
  });
});

describe("activeChildHref", () => {
  it("picks the longest matching item", () => {
    expect(activeChildHref("/community")).toBe("/community");
    expect(activeChildHref("/community/bookmarks")).toBe("/community/bookmarks");
    expect(activeChildHref("/games/alfazy/archive")).toBe("/games/alfazy");
  });
  it("returns null off-shell", () => {
    expect(activeChildHref("/blog")).toBeNull();
  });
});

describe("sectionHref", () => {
  it("returns each section's first child", () => {
    expect(sectionHref("community")).toBe("/community");
    expect(sectionHref("membership")).toBe("/members/explore");
    expect(sectionHref("game")).toBe("/games/alfazy");
    expect(sectionHref("account")).toBe("/members/account");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/components/app-shell/__tests__/nav-config.test.ts`
Expected: FAIL — "Failed to resolve import @/components/app-shell/nav-config".

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/components/app-shell/nav-config.tsx
import {
  Compass, Bookmark, Repeat2, Heart, Clock, Download, MessageSquarePlus,
  Wrench, Gamepad2, Users, UserRound, CreditCard, type LucideIcon,
} from "lucide-react";

export type AppNavItem = { label: string; href: string; gated?: boolean };
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
      { label: "Alfazy", href: "/games/alfazy" },
      { label: "Hit and Blow", href: "/games/hit-and-blow" },
      { label: "Integra", href: "/games/integra" },
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

// Unused icon imports kept for parity with future items; strip if lint complains.
void Bookmark; void Repeat2; void Heart; void Clock; void Download;
void MessageSquarePlus; void Wrench; void CreditCard;

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

const ALL_ITEMS = APP_NAV.flatMap((s) => s.items);

export function activeChildHref(pathname: string): string | null {
  const m = ALL_ITEMS.filter((i) => matches(pathname, i.href)).sort(
    (a, b) => b.href.length - a.href.length,
  )[0];
  return m ? m.href : null;
}

export function sectionHref(key: SectionKey): string {
  return APP_NAV.find((s) => s.key === key)!.items[0].href;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/components/app-shell/__tests__/nav-config.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add src/components/app-shell/nav-config.tsx src/components/app-shell/__tests__/nav-config.test.ts
git commit -m "feat(shell): app-shell nav config + active resolver"
```

---

### Task 2: Shell user helper (server)

One server helper the four layouts call to get exactly the serializable slice the shell needs — so no layout duplicates the profiles lookup.

**Files:**
- Create: `src/lib/app-shell/user.ts`

**Interfaces:**
- Consumes: `getMemberContext()` from `@/lib/members/session`.
- Produces:
  - `type ShellUser = { email: string; displayName: string; role: MemberRole; isAdmin: boolean; isPremium: boolean } | null`
  - `async function getShellUser(): Promise<ShellUser>`

- [ ] **Step 1: Implement the helper**

```ts
// src/lib/app-shell/user.ts
import "server-only";
import { supabaseAuthServer } from "@/lib/supabase/auth-server";
import { getMemberContext, type MemberRole } from "@/lib/members/session";

export type ShellUser = {
  email: string;
  displayName: string;
  role: MemberRole;
  isAdmin: boolean;
  isPremium: boolean;
} | null;

/** The serializable identity slice the client AppShell renders. Null when signed out. */
export async function getShellUser(): Promise<ShellUser> {
  const ctx = await getMemberContext();
  if (!ctx.user) return null;

  const email = ctx.user.email ?? "";
  // display_name → username → email local part, in that order.
  const sb = await supabaseAuthServer();
  const { data: profile } = await sb
    .from("profiles")
    .select("display_name, username")
    .eq("id", ctx.user.id)
    .maybeSingle();

  const displayName =
    profile?.display_name?.trim() ||
    profile?.username?.trim() ||
    email.split("@")[0] ||
    "Account";

  return {
    email,
    displayName,
    role: ctx.role,
    isAdmin: ctx.role === "admin",
    isPremium: ctx.role === "premium" || ctx.role === "admin",
  };
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors. (Confirm `profiles` has `display_name` and `username` columns — both are read elsewhere, e.g. `src/lib/community/queries.ts:122`.)

- [ ] **Step 3: Commit**

```bash
git add src/lib/app-shell/user.ts
git commit -m "feat(shell): getShellUser server helper"
```

---

### Task 3: Profile menu (avatar dropdown)

Top-right avatar dropdown. Adapts `src/components/admin/layout/profile-menu.tsx`, swapping the single theme toggle for a 4-option theme list and adding conditional Become-a-Member / Admin / Account links.

**Files:**
- Create: `src/components/app-shell/profile-menu.tsx`

**Interfaces:**
- Consumes: `ShellUser` fields via props; `signOut` from `@/lib/auth/actions`; `@/components/ui/dropdown-menu`, `@/components/ui/avatar`.
- Produces: `function ProfileMenu(props: { displayName: string; email: string; isAdmin: boolean; isPremium: boolean }): JSX.Element`

- [ ] **Step 1: Implement**

```tsx
// src/components/app-shell/profile-menu.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { UserRound, Sparkles, Shield, LogOut, Check } from "lucide-react";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { signOut } from "@/lib/auth/actions";

const THEMES = [
  { key: "system", label: "System" },
  { key: "light", label: "Light" },
  { key: "dark", label: "Dark" },
  { key: "torch", label: "Torch" },
] as const;

export function ProfileMenu({
  displayName, email, isAdmin, isPremium,
}: {
  displayName: string; email: string; isAdmin: boolean; isPremium: boolean;
}) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  React.useEffect(() => setMounted(true), []);
  const initial = (displayName || email || "?").charAt(0).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Account menu"
        className="rounded-full outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <Avatar className="size-8">
          <AvatarFallback className="bg-accent text-xs font-medium text-foreground">
            {initial}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span className="truncate font-medium text-foreground">{displayName}</span>
          <span className="truncate text-xs font-normal text-muted-foreground">{email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link href="/members/account"><UserRound /> <span>Account</span></Link>
        </DropdownMenuItem>
        {!isPremium && (
          <DropdownMenuItem asChild>
            <Link href="/members/upgrade"><Sparkles /> <span>Become a Member</span></Link>
          </DropdownMenuItem>
        )}
        {isAdmin && (
          <DropdownMenuItem asChild>
            <Link href="/admin"><Shield /> <span>Admin</span></Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />

        <DropdownMenuLabel className="text-xs text-muted-foreground">Theme</DropdownMenuLabel>
        {THEMES.map((t) => (
          <DropdownMenuItem
            key={t.key}
            onSelect={(e) => { e.preventDefault(); if (mounted) setTheme(t.key); }}
          >
            <span className="flex w-4 justify-center">
              {mounted && theme === t.key ? <Check className="size-4" /> : null}
            </span>
            <span>{t.label}</span>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <form action={signOut}>
            <button type="submit" className="flex w-full items-center gap-2">
              <LogOut /> <span>Log out</span>
            </button>
          </form>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors. If `DropdownMenuItem asChild` with a `<Link>` trips a type error, confirm the wrapper forwards `asChild` (it does in `admin/layout/profile-menu.tsx` — same pattern).

- [ ] **Step 3: Commit**

```bash
git add src/components/app-shell/profile-menu.tsx
git commit -m "feat(shell): profile dropdown menu"
```

*(Rendered verification happens in Task 6 once the shell mounts it.)*

---

### Task 4: Accordion sidebar

The grouped, single-expand sidebar used both on desktop and inside the mobile drawer. Auto-opens the current section; gated items route to `/login?next=` when signed out.

**Files:**
- Create: `src/components/app-shell/sidebar.tsx`

**Interfaces:**
- Consumes: `APP_NAV`, `activeSection`, `activeChildHref` from `./nav-config`; `@/components/ui/accordion`; `usePathname`.
- Produces: `function AppSidebar(props: { signedIn: boolean; onNavigate?: () => void }): JSX.Element`

- [ ] **Step 1: Read the accordion wrapper API**

Run: open `src/components/ui/accordion.tsx` and confirm it re-exports radix `Accordion`, `AccordionItem`, `AccordionTrigger`, `AccordionContent` and accepts `type="single"`, `collapsible`, `value`, `onValueChange`. Use those names below verbatim.

- [ ] **Step 2: Implement**

```tsx
// src/components/app-shell/sidebar.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Accordion, AccordionItem, AccordionTrigger, AccordionContent,
} from "@/components/ui/accordion";
import { APP_NAV, activeSection, activeChildHref } from "./nav-config";

export function AppSidebar({
  signedIn, onNavigate,
}: {
  signedIn: boolean; onNavigate?: () => void;
}) {
  const pathname = usePathname() ?? "/";
  const section = activeSection(pathname);
  const activeHref = activeChildHref(pathname);

  // Controlled + synced: opening one section closes the others (single-expand),
  // and route changes re-open the section you navigated into.
  const [open, setOpen] = React.useState<string>(section ?? "");
  React.useEffect(() => {
    if (section) setOpen(section);
  }, [section]);

  return (
    <Accordion
      type="single"
      collapsible
      value={open}
      onValueChange={setOpen}
      className="space-y-1"
    >
      {APP_NAV.map((s) => {
        const Icon = s.icon;
        return (
          <AccordionItem key={s.key} value={s.key} className="border-none">
            <AccordionTrigger className="rounded-input px-3 py-2 text-sm font-medium hover:bg-accent hover:no-underline">
              <span className="flex items-center gap-3">
                <Icon className="size-4" /> {s.label}
              </span>
            </AccordionTrigger>
            <AccordionContent className="pb-1 pl-4">
              <nav className="space-y-0.5">
                {s.items.map((item) => {
                  const active = item.href === activeHref;
                  const href =
                    !signedIn && item.gated
                      ? `/login?next=${encodeURIComponent(item.href)}`
                      : item.href;
                  return (
                    <Link
                      key={item.label + item.href}
                      href={href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "block rounded-input px-3 py-1.5 text-sm transition-ui",
                        active
                          ? "bg-accent font-medium text-foreground"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground",
                      )}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/app-shell/sidebar.tsx
git commit -m "feat(shell): accordion sidebar"
```

---

### Task 5: AppShell wrapper (top bar + drawer + bottom nav)

The outer chrome. Top bar (hamburger, Logo, search, ProfileMenu/Sign-in), desktop sidebar, mobile `Sheet` drawer, mobile bottom nav.

**Files:**
- Create: `src/components/app-shell/shell.tsx`

**Interfaces:**
- Consumes: `AppSidebar`, `ProfileMenu`, `ShellUser`, `<Logo>` (`@/components/brand/logo`), `@/components/ui/sheet`, `sectionHref` + `APP_NAV` for the bottom nav.
- Produces: `function AppShell(props: { user: ShellUser; children: React.ReactNode }): JSX.Element`

- [ ] **Step 1: Implement**

```tsx
// src/components/app-shell/shell.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/brand/logo";
import {
  Sheet, SheetBody, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import { AppSidebar } from "./sidebar";
import { ProfileMenu } from "./profile-menu";
import { APP_NAV, activeSection, sectionHref } from "./nav-config";
import type { ShellUser } from "@/lib/app-shell/user";

export function AppShell({ user, children }: { user: ShellUser; children: React.ReactNode }) {
  const pathname = usePathname() ?? "/";
  const [drawer, setDrawer] = React.useState(false);
  const signedIn = !!user;
  const currentSection = activeSection(pathname);

  return (
    <div className="flex min-h-dvh flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
        <div className="flex h-14 items-center gap-3 px-4 lg:px-6">
          <Sheet open={drawer} onOpenChange={setDrawer}>
            <SheetTrigger
              aria-label="Open menu"
              className="rounded-btn p-2 text-muted-foreground transition-ui hover:bg-accent hover:text-foreground lg:hidden"
            >
              <Menu className="size-5" />
            </SheetTrigger>
            <SheetContent className="left-0 right-auto border-l-0 border-r border-border">
              <SheetHeader><SheetTitle><Logo /></SheetTitle></SheetHeader>
              <SheetBody>
                <AppSidebar signedIn={signedIn} onNavigate={() => setDrawer(false)} />
              </SheetBody>
            </SheetContent>
          </Sheet>

          <Logo />

          {/* Global search → opens the Cmd-K command menu. It listens for a custom
              event dispatched here so we reuse the one already mounted in the root. */}
          <button
            type="button"
            onClick={() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))}
            className="ml-auto hidden max-w-xs flex-1 items-center gap-2 rounded-input border border-input bg-background px-3 py-1.5 text-sm text-muted-foreground transition-ui hover:border-brand sm:flex"
          >
            <Search className="size-4" /> Search…
          </button>

          <div className="ml-auto flex items-center gap-2 sm:ml-0">
            {signedIn ? (
              <ProfileMenu
                displayName={user!.displayName}
                email={user!.email}
                isAdmin={user!.isAdmin}
                isPremium={user!.isPremium}
              />
            ) : (
              <Link
                href={`/login?next=${encodeURIComponent(pathname)}`}
                className="rounded-btn border border-border px-3 py-1.5 text-xs font-medium transition-ui hover:bg-accent"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Desktop sidebar */}
        <aside className="sticky top-14 hidden h-[calc(100dvh-3.5rem)] w-60 shrink-0 overflow-y-auto border-r border-border p-3 lg:block">
          <AppSidebar signedIn={signedIn} />
        </aside>
        <main className="min-w-0 flex-1 pb-24 lg:pb-10">{children}</main>
      </div>

      {/* Mobile bottom nav — one entry per section */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background lg:hidden">
        <div className="grid grid-cols-4">
          {APP_NAV.map((s) => {
            const Icon = s.icon;
            const active = currentSection === s.key;
            return (
              <Link
                key={s.key}
                href={sectionHref(s.key)}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 text-[11px] transition-ui",
                  active ? "text-foreground" : "text-muted-foreground",
                )}
              >
                <Icon className="size-5" /> {s.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
```

- [ ] **Step 2: Confirm the command-menu trigger**

Run: open `src/components/layout/command-menu.tsx` and verify it opens on a `⌘K`/`Ctrl+K` `keydown`. If it listens on `window` rather than `document`, dispatch on `window` instead. If it exposes a context/store, prefer calling that over synthesizing a keyboard event. Adjust the `onClick` accordingly.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/app-shell/shell.tsx
git commit -m "feat(shell): AppShell top bar, drawer, bottom nav"
```

---

### Task 6: Adopt the shell in Membership (first adopter + live verification)

Swap the members chrome for `<AppShell>` and delete the old shell. This is where the whole shell renders for the first time.

**Files:**
- Modify: `src/app/members/layout.tsx`
- Delete: `src/components/members/shell.tsx`, `src/components/members/nav-config.ts`
- Check: grep for other importers of the deleted files before removing.

- [ ] **Step 1: Find importers of the old shell**

Run: `git grep -n "members/shell\|members/nav-config"`
Expected: only `src/app/members/layout.tsx`. If anything else imports them, note it and migrate in this task.

- [ ] **Step 2: Rewrite the layout**

```tsx
// src/app/members/layout.tsx
import type { Metadata } from "next";
import { getShellUser } from "@/lib/app-shell/user";
import { AppShell } from "@/components/app-shell/shell";

export const metadata: Metadata = {
  title: { default: "Members", template: "%s | Members" },
  robots: { index: false, follow: false },
};

export default async function MembersLayout({ children }: { children: React.ReactNode }) {
  const user = await getShellUser();
  return (
    <div data-members>
      <AppShell user={user}>
        <div className="px-4 pt-6 lg:px-8">{children}</div>
      </AppShell>
    </div>
  );
}
```

> Note: the announcement banner that lived in the old members shell is dropped from the chrome. If it must stay, render it inside `children` at the page level, or add an optional `banner` slot to `AppShell` — decide during review; not required for parity of the nav.

- [ ] **Step 3: Delete the old shell**

```bash
git rm src/components/members/shell.tsx src/components/members/nav-config.ts
```

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: exit code 0. (Catches any lingering import of the deleted files and any `server-only`-in-client leak.)

- [ ] **Step 5: Verify in the browser**

Start the dev server (preview_start with the project's dev config) and open `/members/explore`:
- Top bar shows the `<Logo>`, search button, and avatar (signed in) or Sign in (signed out).
- Sidebar shows all four sections; **Membership** is expanded with the current page highlighted.
- Signed out: click a gated item (e.g. Downloads) → routes to `/login?next=/members/downloads`.
- Open the avatar dropdown → Account, Theme (System/Light/Dark/Torch), Log out; theme switch works.
- Resize to mobile: hamburger opens the drawer with the same sidebar; bottom nav shows 4 sections.

Fix any issue in the app-shell components, rebuild, re-verify.

- [ ] **Step 6: Commit**

```bash
git add src/app/members/layout.tsx
git commit -m "feat(shell): adopt AppShell in members, retire members shell"
```

---

### Task 7: Adopt the shell in Games

Replace `GamesHeader` with `<AppShell>`. Relocate the per-game tabs (Archive / Results / Leaderboard) — which used to live in `GamesHeader` — into a small per-game sub-nav, since the shell chrome is game-agnostic. `useGameAuth` **stays** (the game boards still use it).

**Files:**
- Modify: `src/app/games/layout.tsx`
- Create: `src/components/games/game-subnav.tsx`
- Create: `src/app/games/alfazy/layout.tsx`, `src/app/games/hit-and-blow/layout.tsx`, `src/app/games/integra/layout.tsx`
- Delete: `src/components/games/GamesHeader.tsx`
- Do NOT delete: `src/components/games/use-game-auth.ts` (imported by `AlfazyBoard`, `HitAndBlowBoard`, `IntegraBoard`).

- [ ] **Step 1: Rewrite the games layout**

```tsx
// src/app/games/layout.tsx
import type { Metadata } from "next";
import { getShellUser } from "@/lib/app-shell/user";
import { AppShell } from "@/components/app-shell/shell";

export const metadata: Metadata = {
  title: "Games",
  description: "Daily word and code puzzles — Alfazy, Hit and Blow, Integra.",
};

export default async function GamesLayout({ children }: { children: React.ReactNode }) {
  const user = await getShellUser();
  return (
    <AppShell user={user}>
      <div className="mx-auto max-w-md px-4 py-8">{children}</div>
    </AppShell>
  );
}
```

- [ ] **Step 2: Create the per-game sub-nav**

```tsx
// src/components/games/game-subnav.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/** Tabs available per game base. Integra has archive only today. */
const TABS: Record<string, { label: string; seg: string }[]> = {
  "/games/alfazy": [
    { label: "Archive", seg: "archive" },
    { label: "Results", seg: "results" },
    { label: "Leaderboard", seg: "leaderboard" },
  ],
  "/games/hit-and-blow": [
    { label: "Archive", seg: "archive" },
    { label: "Results", seg: "results" },
    { label: "Leaderboard", seg: "leaderboard" },
  ],
  "/games/integra": [{ label: "Archive", seg: "archive" }],
};

export function GameSubnav({ base }: { base: keyof typeof TABS | string }) {
  const pathname = usePathname() ?? "";
  const tabs = TABS[base] ?? [];
  return (
    <div className="mx-auto flex max-w-md items-center gap-1 px-4 pt-4">
      <Link href={base} className="text-sm font-medium">Play</Link>
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
```

- [ ] **Step 3: Add the three per-game layouts**

```tsx
// src/app/games/alfazy/layout.tsx
import { GameSubnav } from "@/components/games/game-subnav";
export default function Layout({ children }: { children: React.ReactNode }) {
  return (<><GameSubnav base="/games/alfazy" />{children}</>);
}
```

```tsx
// src/app/games/hit-and-blow/layout.tsx
import { GameSubnav } from "@/components/games/game-subnav";
export default function Layout({ children }: { children: React.ReactNode }) {
  return (<><GameSubnav base="/games/hit-and-blow" />{children}</>);
}
```

```tsx
// src/app/games/integra/layout.tsx
import { GameSubnav } from "@/components/games/game-subnav";
export default function Layout({ children }: { children: React.ReactNode }) {
  return (<><GameSubnav base="/games/integra" />{children}</>);
}
```

- [ ] **Step 4: Delete GamesHeader and find stragglers**

```bash
git grep -n "GamesHeader"
git rm src/components/games/GamesHeader.tsx
```
Expected after removal: no remaining references. (The old header's "Back to site" and standalone `ThemeToggle` are superseded by the shell's Logo link home and the theme options in the profile dropdown.)

- [ ] **Step 5: Build**

Run: `npm run build`
Expected: exit 0.

- [ ] **Step 6: Verify in the browser**

Open `/games`, `/games/alfazy`, `/games/alfazy/archive`:
- Same shell as members; **Game** section expanded, correct child highlighted.
- Per-game sub-nav shows Play · Archive · Results · Leaderboard (Integra: Play · Archive).
- Signed out still renders the full shell (games must work logged out); gameplay still saves when signed in (board still uses `useGameAuth`).

- [ ] **Step 7: Commit**

```bash
git add src/app/games src/components/games/game-subnav.tsx
git commit -m "feat(shell): adopt AppShell in games, per-game sub-nav, retire GamesHeader"
```

---

### Task 8: Adopt the shell in Community

Replace the 3-column layout with `<AppShell>`; the shell owns the left sidebar, so community keeps only its feed + right ad rail inside `main`. Delete `left-nav.tsx`.

**Files:**
- Modify: `src/app/community/layout.tsx`
- Delete: `src/components/community/left-nav.tsx`

- [ ] **Step 1: Rewrite the community layout**

```tsx
// src/app/community/layout.tsx
import type { Metadata } from "next";
import { listAds } from "@/lib/community/queries";
import { AdSlotView } from "@/components/community/ad-slot";
import { getShellUser } from "@/lib/app-shell/user";
import { AppShell } from "@/components/app-shell/shell";

export const metadata: Metadata = {
  title: { default: "Community", template: "%s | Community" },
  description: "The Shubham Datarkar community — build in public, share, discuss.",
};

export default async function CommunityLayout({ children }: { children: React.ReactNode }) {
  const [user, ads] = await Promise.all([getShellUser(), listAds()]);
  const bySlot = (n: 1 | 2) =>
    ads.find((a) => a.slot === n) ?? { slot: n, imagePath: null, linkUrl: null };
  return (
    <AppShell user={user}>
      <div className="mx-auto flex max-w-4xl gap-6 px-4">
        <main className="min-w-0 flex-1 border-x border-border">{children}</main>
        <aside className="hidden w-72 shrink-0 py-4 lg:block">
          <div className="sticky top-20 space-y-4">
            <AdSlotView ad={bySlot(1)} />
            <AdSlotView ad={bySlot(2)} />
          </div>
        </aside>
      </div>
    </AppShell>
  );
}
```

- [ ] **Step 2: Delete the old left nav**

```bash
git grep -n "community/left-nav"
git rm src/components/community/left-nav.tsx
```
Expected: no importers other than the old layout.

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: exit 0.

- [ ] **Step 4: Verify in the browser**

Open `/community`:
- Shell sidebar with **Community** expanded (Explore active); ad rail on the right ≥ lg.
- The old center "Home/Bookmarks/Profile/Post" left column is gone (those live in the shell sidebar now). Confirm a **Post** entry point still exists — the composer link. If posting is no longer reachable from chrome, add a "Post" affordance to the Community section or the feed header (small follow-up; note it).

- [ ] **Step 5: Commit**

```bash
git add src/app/community/layout.tsx
git commit -m "feat(shell): adopt AppShell in community, retire left-nav"
```

---

### Task 9: Community Reblogs & Likes pages (+ feed filters + RPC migration)

Two new list pages cloning `src/app/community/bookmarks/page.tsx`, backed by two new `listFeed` filters and a migration that adds `p_reblogged` / `p_liked` to the `community_feed` RPC.

**Files:**
- Create: `supabase/migrations/20260711000003_community_feed_viewer_filters.sql`
- Modify: `src/lib/community/queries.ts` (add `reblogged?` / `liked?` to `listFeed`)
- Create: `src/app/community/reblogs/page.tsx`, `src/app/community/likes/page.tsx`

- [ ] **Step 1: Read the current RPC definition**

Run: open `supabase/migrations/20260710000003_community_feed.sql` and locate the `create ... function community_feed(...)` signature and its main `select`/`where`. Copy that function body as the starting point for the new migration.

- [ ] **Step 2: Write the migration**

Base the new file on the copied definition. Add two params and two predicates. The exact additions:

- Add to the parameter list (with defaults, so existing callers keep working):
  ```sql
  p_reblogged boolean default false,
  p_liked     boolean default false,
  ```
- Add to the `where` clause (viewer derived from `auth.uid()`, matching how `p_bookmarked` already scopes to the viewer):
  ```sql
  and (not p_reblogged or exists (
        select 1 from community_posts rp
        where rp.reblog_of = p.id and rp.user_id = auth.uid()))
  and (not p_liked or exists (
        select 1 from community_votes v
        where v.post_id = p.id and v.user_id = auth.uid() and v.value = 1))
  ```
  > Verify the votes table/column names against `20260710000005_community_engage.sql` (likely `community_votes(post_id, user_id, value)`; if the "up" value is stored differently, match it). Verify `community_posts.reblog_of` exists (`src/lib/community/engage-actions.ts:88` uses it).

Write the full `create or replace function community_feed(...) ... $$ language sql stable;` with the two additions folded into the copied body.

- [ ] **Step 3: Hand the SQL to the user to run**

Per the manual-SQL workflow: do **not** apply. Tell the user:
> Run `supabase/migrations/20260711000003_community_feed_viewer_filters.sql` in the Supabase SQL editor before the Reblogs/Likes pages will return data.

- [ ] **Step 4: Extend `listFeed`**

In `src/lib/community/queries.ts`, add the two options and pass them to the RPC:

```ts
export async function listFeed(opts: {
  sort: FeedSort;
  window: FeedWindow;
  limit?: number;
  offset?: number;
  author?: string;
  bookmarked?: boolean;
  reblogged?: boolean;   // NEW
  liked?: boolean;       // NEW
}): Promise<FeedPost[]> {
  const sb = await supabaseAuthServer();
  const { data, error } = await sb.rpc("community_feed", {
    p_sort: opts.sort,
    p_window: opts.window,
    p_limit: opts.limit ?? 20,
    p_offset: opts.offset ?? 0,
    p_author: opts.author ?? null,
    p_bookmarked: opts.bookmarked ?? false,
    p_reblogged: opts.reblogged ?? false,  // NEW
    p_liked: opts.liked ?? false,          // NEW
  });
  if (error) {
    console.warn("community_feed failed:", error.message);
    return [];
  }
  return (data ?? []).map(mapRow);
}
```

- [ ] **Step 5: Create the two pages**

```tsx
// src/app/community/reblogs/page.tsx
import { buildMetadata } from "@/lib/seo";
import { redirect } from "next/navigation";
import { getMemberContext } from "@/lib/members/session";
import { listFeed, listPollResults, viewerCanPost } from "@/lib/community/queries";
import { PostCard } from "@/components/community/post-card";

export const metadata = buildMetadata({ title: "Reblogs", path: "/community/reblogs", noIndex: true });

export default async function ReblogsPage() {
  const { user } = await getMemberContext();
  if (!user) redirect("/login?next=/community/reblogs");

  const [canPost, posts] = await Promise.all([
    viewerCanPost(),
    listFeed({ sort: "new", window: "all", reblogged: true, limit: 50 }),
  ]);
  const pollResults = await listPollResults(
    posts.filter((p) => p.type === "poll").map((p) => p.id),
  );

  return (
    <div>
      <h1 className="border-b border-border px-4 py-3 font-display text-lg font-bold">Reblogs</h1>
      {posts.length === 0 ? (
        <p className="px-4 py-16 text-center text-sm text-muted-foreground">Nothing reblogged yet.</p>
      ) : (
        posts.map((post) => (
          <PostCard key={post.rowId} post={post} pollResult={pollResults[post.id]} canVote={canPost} viewerId={user.id} />
        ))
      )}
    </div>
  );
}
```

```tsx
// src/app/community/likes/page.tsx
import { buildMetadata } from "@/lib/seo";
import { redirect } from "next/navigation";
import { getMemberContext } from "@/lib/members/session";
import { listFeed, listPollResults, viewerCanPost } from "@/lib/community/queries";
import { PostCard } from "@/components/community/post-card";

export const metadata = buildMetadata({ title: "Likes", path: "/community/likes", noIndex: true });

export default async function LikesPage() {
  const { user } = await getMemberContext();
  if (!user) redirect("/login?next=/community/likes");

  const [canPost, posts] = await Promise.all([
    viewerCanPost(),
    listFeed({ sort: "new", window: "all", liked: true, limit: 50 }),
  ]);
  const pollResults = await listPollResults(
    posts.filter((p) => p.type === "poll").map((p) => p.id),
  );

  return (
    <div>
      <h1 className="border-b border-border px-4 py-3 font-display text-lg font-bold">Likes</h1>
      {posts.length === 0 ? (
        <p className="px-4 py-16 text-center text-sm text-muted-foreground">Nothing liked yet.</p>
      ) : (
        posts.map((post) => (
          <PostCard key={post.rowId} post={post} pollResult={pollResults[post.id]} canVote={canPost} viewerId={user.id} />
        ))
      )}
    </div>
  );
}
```

- [ ] **Step 6: Build**

Run: `npm run build`
Expected: exit 0.

- [ ] **Step 7: Verify in the browser (after the user runs the migration)**

Open `/community/reblogs` and `/community/likes` signed in: the sidebar shows them under Community, active state correct, and lists the viewer's reblogged / liked posts (empty-state copy when none). Signed out → redirect to `/login?next=`.

- [ ] **Step 8: Commit**

```bash
git add supabase/migrations/20260711000003_community_feed_viewer_filters.sql src/lib/community/queries.ts src/app/community/reblogs/page.tsx src/app/community/likes/page.tsx
git commit -m "feat(community): reblogs + likes pages, viewer feed filters"
```

---

## Account adoption (no task — already covered)

The Account sidebar items point to `/members/account`, which lives under the members layout and therefore already renders `<AppShell>` after Task 6. When the `feat/account-hub` `/account` hub is built, its `src/app/account/layout.tsx` renders `<AppShell user={await getShellUser()}>` the same way — coordinate there; nothing to build in this plan.

---

## Self-Review

**Spec coverage:**
- Shared component, four adopters → Tasks 5–8 (+ account note). ✓
- Data via `getMemberContext()` once → Task 2 `getShellUser()`. ✓
- Retire `GamesHeader` / `left-nav` / `members shell`; keep `use-game-auth` → Tasks 6–8 (corrected: boards import it). ✓
- Top bar: Logo, Cmd-K search, avatar dropdown / Sign in → Task 5. ✓
- Profile dropdown minimal (identity + Become Member + Admin + Theme + Log out) → Task 3. ✓
- Accordion sidebar, single-expand, auto-open active, gated → login → Tasks 1 + 4. ✓
- Logged-out full sidebar → gated items to `/login?next=` → Task 4 + verified Tasks 6/7. ✓
- Community stub pages + `listFeed` filters + feed-RPC migration → Task 9. ✓
- Ad rail community-only → Task 8. ✓
- Mobile drawer + bottom nav → Task 5. ✓
- Testing: nav-config unit test + browser verification → Task 1 + per-task browser steps. ✓

**Placeholder scan:** No "TBD/TODO". Two explicit "verify against existing file" steps (Task 5 command-menu trigger, Task 9 votes column names) are real verification actions with a named source, not vague hand-waving.

**Type consistency:** `ShellUser` (Task 2) consumed by `AppShell` (Task 5) and `ProfileMenu` (Task 3); `activeSection`/`activeChildHref`/`sectionHref`/`APP_NAV` (Task 1) consumed by `AppSidebar` (Task 4) and `AppShell` (Task 5); `listFeed` new params (Task 9 step 4) consumed by the two pages (step 5). Names match across tasks.

**Known follow-ups flagged in-plan (not blockers):** members announcement banner relocation (Task 6), community "Post" affordance (Task 8), Account>Profile vs Account>Membership share one route until `/account` tabs split them.
