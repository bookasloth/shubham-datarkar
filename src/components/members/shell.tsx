"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Menu, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { signOut } from "@/lib/members/auth-actions";
import { MEMBERS_NAV, isMembersNavActive } from "./nav-config";
import { AnnouncementBanner } from "./announcement-banner";
import type { Announcement } from "@/lib/members/queries";
import type { MemberRole } from "@/lib/members/access";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useState } from "react";

type ShellProps = {
  user: { email: string } | null;
  role: MemberRole;
  announcement: Announcement | null;
  children: React.ReactNode;
};

function NavLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="space-y-1">
      {MEMBERS_NAV.map((item) => {
        const active = isMembersNavActive(item.href, pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-input px-3 py-2 text-sm transition-ui",
              active
                ? "bg-accent font-medium text-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            <item.icon className="size-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function MembersShell({ user, role, announcement, children }: ShellProps) {
  const pathname = usePathname() ?? "/members";
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="flex min-h-dvh flex-col">
      {announcement && <AnnouncementBanner announcement={announcement} />}

      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
        <div className="flex h-14 items-center gap-3 px-4 lg:px-6">
          {/* Mobile drawer */}
          <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
            <SheetTrigger
              aria-label="Open menu"
              className="rounded-btn p-2 text-muted-foreground transition-ui hover:bg-accent hover:text-foreground lg:hidden"
            >
              <Menu className="size-5" />
            </SheetTrigger>
            <SheetContent className="left-0 right-auto border-l-0 border-r border-border">
              <SheetHeader>
                <SheetTitle>Members</SheetTitle>
              </SheetHeader>
              <SheetBody>
                <NavLinks pathname={pathname} onNavigate={() => setDrawerOpen(false)} />
              </SheetBody>
            </SheetContent>
          </Sheet>

          <Link href="/members" className="font-display text-sm font-bold tracking-tight">
            Shubham Datarkar
            <span className="ml-2 rounded-btn bg-accent px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
              Members
            </span>
          </Link>

          {/* Global search */}
          <form
            action="/members/explore"
            method="get"
            className="ml-auto hidden max-w-xs flex-1 sm:block"
          >
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                name="q"
                type="search"
                placeholder="Search resources"
                className="w-full rounded-input border border-input bg-background py-1.5 pl-9 pr-3 text-sm outline-none transition-ui focus:border-brand"
              />
            </div>
          </form>

          <div className="ml-auto flex items-center gap-2 sm:ml-0">
            {role === "member" && (
              <Link
                href="/members/upgrade"
                className="rounded-btn bg-foreground px-3 py-1.5 text-xs font-medium text-background transition-ui hover:opacity-85"
              >
                Go premium
              </Link>
            )}
            {user ? (
              <form action={signOut}>
                <button
                  type="submit"
                  title={`Sign out (${user.email})`}
                  className="flex items-center gap-2 rounded-btn px-2 py-1.5 text-xs text-muted-foreground transition-ui hover:bg-accent hover:text-foreground"
                >
                  <span className="hidden max-w-[16ch] truncate md:inline">{user.email}</span>
                  <LogOut className="size-4" />
                </button>
              </form>
            ) : (
              <Link
                href={`/members/login?next=${encodeURIComponent(pathname)}`}
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
        <aside className="sticky top-14 hidden h-[calc(100dvh-3.5rem)] w-60 shrink-0 border-r border-border p-4 lg:block">
          <NavLinks pathname={pathname} />
        </aside>

        <main className="min-w-0 flex-1 px-4 pb-24 pt-6 lg:px-8 lg:pb-10">{children}</main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background lg:hidden">
        <div className="grid grid-cols-4">
          {MEMBERS_NAV.filter((i) => i.mobile).map((item) => {
            const active = isMembersNavActive(item.href, pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 text-[11px] transition-ui",
                  active ? "text-foreground" : "text-muted-foreground",
                )}
              >
                <item.icon className="size-5" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
