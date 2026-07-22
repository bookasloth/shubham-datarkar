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
  { label: "New note", href: "/community/compose" },
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
            placeholder="Search or jump to…"
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
