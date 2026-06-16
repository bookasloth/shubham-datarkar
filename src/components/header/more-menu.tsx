"use client";

import * as Popover from "@radix-ui/react-popover";
import { MoreVertical } from "lucide-react";
import { site, socials } from "@/lib/site";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Search } from "./search";

/**
 * Dropdown panel anchored to the "more" toggle. Radix Popover provides
 * anchoring, outside-click / Esc dismissal, and focus management. Holds a
 * search field, social links, and the booking CTA.
 */
export function MoreMenu() {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="More"
          className="data-[state=open]:[&_svg]:rotate-90"
        >
          <MoreVertical className="transition-transform duration-200" />
        </Button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          className="pop-anim z-[110] w-80 rounded-card border border-border bg-background/80 p-4 text-foreground shadow-md backdrop-blur-md outline-none"
        >
          <h2 className="font-display text-sm font-bold">Find what you need</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Search projects, ventures, and writing.
          </p>

          <Search className="mt-3" />

          <div className="mt-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Follow
            </p>
            <ul className="mt-2 flex flex-col">
              {socials.map((s) => (
                <li key={s.label}>
                  <a
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between rounded-btn px-2 py-2 text-sm transition-ui hover:bg-accent"
                  >
                    <span className="font-medium text-foreground">{s.label}</span>
                    <span className="text-xs text-muted-foreground">{s.handle}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <a
            href={site.bookingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ size: "default" }), "mt-4 w-full")}
          >
            Book a call
          </a>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
