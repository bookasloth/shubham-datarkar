"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PanelLeft, PanelLeftClose } from "lucide-react";
import { cn } from "@/lib/utils";
import { ADMIN_NAV, isNavItemActive, resolveActiveGroup } from "./nav-config";

export function Sidebar({
  collapsed,
  onToggleCollapsed,
}: {
  collapsed: boolean;
  onToggleCollapsed: () => void;
}) {
  const pathname = usePathname();
  const activeGroup = resolveActiveGroup(pathname);

  return (
    <aside className="sticky top-0 flex h-screen shrink-0 bg-admin-surface">
      {/* Primary rail — one icon per section, navigates to the section's first page */}
      <div className="flex w-14 shrink-0 flex-col border-r border-admin-border">
        <div className="flex h-14 items-center justify-center border-b border-admin-border">
          <div className="flex size-8 items-center justify-center rounded-btn bg-admin-accent text-admin-accent-fg text-sm font-bold">
            S
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-3">
          <ul className="flex flex-col items-center gap-1">
            {ADMIN_NAV.map((group) => {
              const active = group.heading === activeGroup.heading;
              const Icon = group.icon;
              return (
                <li key={group.heading} className="w-full">
                  <Link
                    href={group.items[0].href}
                    title={group.heading}
                    aria-label={group.heading}
                    aria-current={active ? "true" : undefined}
                    className={cn(
                      "relative mx-auto flex size-9 items-center justify-center rounded-btn transition-[background-color,color] duration-150",
                      active
                        ? "bg-admin-surface-hover text-admin-text"
                        : "text-admin-text-muted hover:bg-admin-surface-hover hover:text-admin-text",
                    )}
                  >
                    <span
                      className={cn(
                        "absolute left-[-6px] top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-admin-accent transition-opacity duration-150",
                        active ? "opacity-100" : "opacity-0",
                      )}
                      aria-hidden
                    />
                    <Icon className="size-4" aria-hidden />
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t border-admin-border p-2">
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-label={collapsed ? "Show section pages" : "Hide section pages"}
            title={collapsed ? "Show section pages" : "Hide section pages"}
            className="flex size-9 mx-auto items-center justify-center rounded-btn text-admin-text-muted transition-[background-color,color] duration-150 hover:bg-admin-surface-hover hover:text-admin-text [&_svg]:size-4"
          >
            {collapsed ? <PanelLeft aria-hidden /> : <PanelLeftClose aria-hidden />}
          </button>
        </div>
      </div>

      {/* Secondary panel — pages of the active section */}
      {!collapsed && (
        <div className="flex w-52 shrink-0 flex-col border-r border-admin-border">
          <div className="flex h-14 items-center border-b border-admin-border px-4">
            <span className="truncate text-sm font-semibold text-admin-text">{activeGroup.heading}</span>
          </div>
          <nav className="flex-1 overflow-y-auto px-2 py-3">
            <ul className="flex flex-col gap-0.5">
              {activeGroup.items.map((item) => {
                const active = isNavItemActive(pathname, item.href);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "group relative flex items-center gap-3 rounded-btn px-2 py-1.5 text-sm transition-[background-color,color] duration-150",
                        active
                          ? "bg-admin-surface-hover font-medium text-admin-text"
                          : "text-admin-text-muted hover:bg-admin-surface-hover hover:text-admin-text",
                      )}
                    >
                      <span
                        className={cn(
                          "absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-admin-accent transition-opacity duration-150",
                          active ? "opacity-100" : "opacity-0",
                        )}
                        aria-hidden
                      />
                      <Icon className="size-4 shrink-0" aria-hidden />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      )}
    </aside>
  );
}
