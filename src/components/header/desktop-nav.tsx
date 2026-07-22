"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import * as Popover from "@radix-ui/react-popover";
import { ChevronDown } from "lucide-react";
import { navGroups } from "@/lib/site";
import { cn } from "@/lib/utils";

/**
 * Inline desktop navigation. Renders the `navGroups` mega-menu as a row of
 * click-to-open dropdowns (Radix Popover gives anchoring, Esc, outside-click,
 * and focus management for free). Hidden below `lg`, where the burger drawer
 * takes over. ponytail: click-to-open, not hover — Radix keeps it accessible.
 */
export function DesktopNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Primary" className="hidden items-center gap-1 lg:flex">
      {navGroups.map((group) => {
        const active = group.items.some(
          (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
        );
        return (
          <Popover.Root key={group.label}>
            <Popover.Trigger
              className={cn(
                "flex items-center gap-1 rounded-btn px-3 py-2 text-sm font-medium transition-ui hover:bg-accent data-[state=open]:bg-accent data-[state=open]:[&_svg]:rotate-180",
                active ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {group.label}
              <ChevronDown className="size-3.5 transition-transform" />
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Content
                align="start"
                sideOffset={8}
                className="pop-anim z-[110] w-72 rounded-card border border-border bg-background/80 p-2 text-foreground shadow-md backdrop-blur-md outline-none"
              >
                <ul className="flex flex-col">
                  {group.items.map((item) => (
                    <li key={item.href}>
                      <Popover.Close asChild>
                        <Link
                          href={item.href}
                          className="block rounded-btn px-3 py-2 transition-ui hover:bg-accent"
                        >
                          <span className="block text-sm font-medium text-foreground">
                            {item.label}
                          </span>
                          {item.description && (
                            <span className="block text-xs text-muted-foreground">
                              {item.description}
                            </span>
                          )}
                        </Link>
                      </Popover.Close>
                    </li>
                  ))}
                </ul>
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>
        );
      })}
    </nav>
  );
}
