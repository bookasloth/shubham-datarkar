"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Search } from "lucide-react";
import { navGroups, primaryNav, site } from "@/lib/site";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { MobileNav } from "@/components/layout/mobile-nav";
import { OPEN_COMMAND_EVENT } from "@/components/layout/command-menu";
import { buttonVariants } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";

function useScrolled() {
  const [scrolled, setScrolled] = React.useState(false);
  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return scrolled;
}

function openCommand() {
  window.dispatchEvent(new Event(OPEN_COMMAND_EVENT));
}

export function Navbar() {
  const scrolled = useScrolled();
  const pathname = usePathname();

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full border-b transition-ui",
        scrolled
          ? "border-border bg-background/80 backdrop-blur-md"
          : "border-transparent bg-background",
      )}
    >
      <div className="mx-auto flex h-16 max-w-[var(--container-page)] items-center gap-4 px-6 md:px-8">
        <Logo />

        {/* Desktop nav */}
        <nav className="ml-4 hidden items-center gap-1 lg:flex" aria-label="Primary">
          {primaryNav.slice(0, 1).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-btn px-3 py-2 text-sm font-medium text-muted-foreground transition-ui hover:text-foreground",
                pathname === item.href && "text-foreground",
              )}
            >
              {item.label}
            </Link>
          ))}

          {navGroups.map((group) => (
            <div key={group.label} className="group relative">
              <button
                className="flex items-center gap-1 rounded-btn px-3 py-2 text-sm font-medium text-muted-foreground transition-ui hover:text-foreground group-focus-within:text-foreground"
                aria-haspopup="true"
              >
                {group.label}
                <ChevronDown className="size-3.5 transition-transform duration-200 group-hover:rotate-180" />
              </button>
              {/* Bridge padding keeps hover alive between trigger and panel */}
              <div className="invisible absolute left-0 top-full pt-2 opacity-0 transition-ui group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
                <div className="w-72 rounded-card border border-border bg-popover p-2 shadow-md">
                  {group.items.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="flex flex-col gap-0.5 rounded-btn px-3 py-2 transition-ui hover:bg-accent"
                    >
                      <span className="text-sm font-medium text-foreground">{item.label}</span>
                      {item.description && (
                        <span className="text-xs text-muted-foreground">{item.description}</span>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {/* Search trigger — desktop shows full pill, mobile shows icon */}
          <button
            onClick={openCommand}
            aria-label="Search"
            className="hidden h-9 items-center gap-2 rounded-input border border-border bg-muted/40 px-3 text-sm text-muted-foreground transition-ui hover:bg-accent md:flex"
          >
            <Search className="size-4" />
            <span>Search</span>
            <Kbd className="ml-2">⌘K</Kbd>
          </button>
          <button
            onClick={openCommand}
            aria-label="Search"
            className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "md:hidden")}
          >
            <Search />
          </button>

          <ThemeToggle />

          <a
            href={site.bookingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ size: "default" }), "hidden sm:inline-flex")}
          >
            Book a call
          </a>

          <MobileNav />
        </div>
      </div>
    </header>
  );
}
