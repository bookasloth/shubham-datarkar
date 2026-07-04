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
