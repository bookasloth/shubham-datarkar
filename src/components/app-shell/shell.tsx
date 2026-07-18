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
import { OPEN_COMMAND_EVENT } from "@/components/layout/command-menu";
import { AppSidebar } from "./sidebar";
import { ProfileMenu } from "./profile-menu";
import { APP_NAV, activeSection, sectionHref } from "./nav-config";
import type { ShellUser } from "@/lib/app-shell/user";

export function AppShell({
  user,
  rail,
  children,
}: {
  user: ShellUser;
  rail?: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? "/";
  const [drawer, setDrawer] = React.useState(false);
  const signedIn = !!user;
  const isPremium = !!user?.isPremium;
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
            <SheetContent>
              <SheetHeader><SheetTitle onClick={() => setDrawer(false)}><Logo /></SheetTitle></SheetHeader>
              <SheetBody>
                <AppSidebar signedIn={signedIn} isPremium={isPremium} onNavigate={() => setDrawer(false)} />
              </SheetBody>
            </SheetContent>
          </Sheet>

          <Logo />

          {/* Global search → opens the existing Cmd-K command menu via its exported
              open event (same pattern as admin/layout/header.tsx + admin-command.tsx). */}
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event(OPEN_COMMAND_EVENT))}
            className="ml-auto hidden max-w-xs flex-1 items-center gap-2 rounded-input border border-input bg-background px-3 py-1.5 text-sm text-muted-foreground transition-ui hover:border-brand sm:flex"
          >
            <Search className="size-4" /> Search…
          </button>

          <button
            type="button"
            aria-label="Search"
            onClick={() => window.dispatchEvent(new Event(OPEN_COMMAND_EVENT))}
            className="ml-auto rounded-btn p-2 text-muted-foreground transition-ui hover:bg-accent hover:text-foreground sm:hidden"
          >
            <Search className="size-5" />
          </button>

          <div className="flex items-center gap-2">
            {signedIn ? (
              <ProfileMenu
                displayName={user!.displayName}
                email={user!.email}
                username={user!.username}
                avatarUrl={user!.avatarUrl}
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

      <div className="mx-auto flex w-full max-w-[1240px] flex-1 justify-center gap-6 px-4">
        {/* Desktop sidebar — floating card, glued to the middle column */}
        <aside className="sticky top-14 hidden h-[calc(100dvh-3.5rem)] w-64 shrink-0 py-4 lg:block">
          <div className="max-h-full overflow-y-auto rounded-card border border-border bg-card p-2 shadow-sm">
            <AppSidebar signedIn={signedIn} isPremium={isPremium} />
          </div>
        </aside>
        <main className="min-w-0 w-full max-w-[600px] pb-24 lg:pb-10">
          {children}
          {/* Below xl the rail column is hidden, so stack it under the board —
              otherwise these panels are unreachable on tablet/phone widths. */}
          {rail && <div className="mt-8 xl:hidden">{rail}</div>}
        </main>
        {rail && (
          <aside className="hidden w-80 shrink-0 py-4 xl:block">
            <div className="sticky top-[4.5rem]">{rail}</div>
          </aside>
        )}
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
