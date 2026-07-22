"use client";

import Link from "next/link";
import { Search, Plus } from "lucide-react";
import { Breadcrumbs } from "./breadcrumbs";
import { AdminCommand, ADMIN_OPEN_COMMAND_EVENT } from "./admin-command";
import { NotificationsBell } from "./notifications-bell";
import { ProfileMenu } from "./profile-menu";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

export function Header({ email }: { email: string }) {
  const openCommand = () => window.dispatchEvent(new Event(ADMIN_OPEN_COMMAND_EVENT));
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-admin-border bg-admin-bg/80 px-4 backdrop-blur">
      <Breadcrumbs />
      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          onClick={openCommand}
          aria-label="Search admin"
          className="flex h-9 w-9 items-center gap-2 rounded-input border border-admin-border text-sm text-admin-text-muted transition-[border-color,color] duration-150 hover:border-admin-border-hover hover:text-admin-text sm:w-64 sm:px-3 md:w-72"
        >
          <Search className="mx-auto size-4 shrink-0 sm:mx-0" aria-hidden />
          <span className="hidden sm:inline">Search or jump to…</span>
          <kbd className="ml-auto hidden rounded bg-admin-surface-hover px-1.5 py-0.5 text-[10px] sm:inline">⌘K</kbd>
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label="Quick create"
            className="flex size-9 items-center justify-center rounded-btn bg-admin-accent text-admin-accent-fg transition-[opacity] duration-150 hover:opacity-90 [&_svg]:size-4"
          >
            <Plus aria-hidden />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" data-admin>
            <DropdownMenuItem asChild>
              <Link href="/admin/posts/new">New post</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/admin/updates/new">New update</Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <NotificationsBell />
        <ProfileMenu email={email} />
      </div>
      <AdminCommand />
    </header>
  );
}
