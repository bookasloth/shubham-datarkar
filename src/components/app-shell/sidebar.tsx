"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Accordion, AccordionItem, AccordionTrigger, AccordionContent,
} from "@/components/ui/accordion";
import { APP_NAV, activeSection, activeChildHref, type AppNavItem } from "./nav-config";

function SidebarLink({
  item,
  activeHref,
  signedIn,
  onNavigate,
}: {
  item: AppNavItem;
  activeHref: string | null;
  signedIn: boolean;
  onNavigate?: () => void;
}) {
  const active = item.href === activeHref;
  const href =
    !signedIn && item.gated ? `/login?next=${encodeURIComponent(item.href)}` : item.href;
  return (
    <Link
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
}

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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (section) setOpen(section);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

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
        const isActive = s.key === section;
        return (
          <AccordionItem key={s.key} value={s.key} className="border-none">
            <AccordionTrigger
              className={cn(
                "rounded-input px-3 py-2 text-sm font-medium transition-ui hover:no-underline",
                isActive
                  ? "bg-brand text-brand-foreground hover:bg-brand"
                  : "hover:bg-accent",
              )}
            >
              <span className="flex items-center gap-3">
                <Icon className="size-4" /> {s.label}
              </span>
            </AccordionTrigger>
            <AccordionContent className="pb-1 pl-4">
              <nav className="space-y-0.5">
                {s.items.map((item) =>
                  // A group (each game) renders as a heading with its Play /
                  // Archive / Leaderboard links nested under it. The heading is not
                  // a link — its href duplicates Play, so two rows would highlight.
                  item.children ? (
                    <div key={item.label + item.href} className="pt-1.5 first:pt-0">
                      <p className="px-3 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {item.label}
                      </p>
                      <div className="space-y-0.5 pl-2">
                        {item.children.map((child) => (
                          <SidebarLink
                            key={child.label + child.href}
                            item={child}
                            activeHref={activeHref}
                            signedIn={signedIn}
                            onNavigate={onNavigate}
                          />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <SidebarLink
                      key={item.label + item.href}
                      item={item}
                      activeHref={activeHref}
                      signedIn={signedIn}
                      onNavigate={onNavigate}
                    />
                  ),
                )}
              </nav>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}
