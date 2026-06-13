"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { Menu, X } from "lucide-react";
import { navGroups, primaryNav, site } from "@/lib/site";
import { Button, buttonVariants } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

export function MobileNav() {
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();

  // Close the menu when the route changes (intentional sync to navigation).
  // eslint-disable-next-line react-hooks/set-state-in-effect
  React.useEffect(() => setOpen(false), [pathname]);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
          <Menu />
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="overlay-anim fixed inset-0 z-[95] bg-foreground/40 backdrop-blur-sm lg:hidden" />
        <Dialog.Content
          className="sheet-anim fixed inset-y-0 right-0 z-[96] flex w-[88%] max-w-sm flex-col border-l border-border bg-background lg:hidden"
          aria-describedby={undefined}
        >
          <div className="flex items-center justify-between border-b border-border p-4">
            <Logo />
            <Dialog.Title className="sr-only">Navigation</Dialog.Title>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" aria-label="Close menu">
                <X />
              </Button>
            </Dialog.Close>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-2">
            <div className="flex flex-col">
              {primaryNav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "border-b border-border py-3 text-base font-medium transition-ui hover:text-muted-foreground",
                    pathname === item.href && "text-foreground",
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </div>

            <Accordion type="multiple" className="mt-2">
              {navGroups.map((group) => (
                <AccordionItem key={group.label} value={group.label}>
                  <AccordionTrigger className="text-base">{group.label}</AccordionTrigger>
                  <AccordionContent>
                    <ul className="flex flex-col gap-0.5">
                      {group.items.map((item) => (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            className="block rounded-btn px-2 py-2 text-sm text-muted-foreground transition-ui hover:bg-accent hover:text-foreground"
                          >
                            {item.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>

          <div className="border-t border-border p-4">
            <a
              href={site.bookingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(buttonVariants({ size: "lg" }), "w-full")}
            >
              Book a call
            </a>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
