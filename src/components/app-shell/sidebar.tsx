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
