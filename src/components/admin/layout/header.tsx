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
