"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, MoreVertical } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { BrainDrawer, type Brain } from "./brain-drawer";
import { useHeaderUser } from "./use-header-user";

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

/**
 * Site header. Centered-logo layout with dual-brain navigation: a left burger
 * opens "Growth & Systems" from the left edge, a right kebab opens "Ideas &
 * Play" from the right edge. Both share one drawer with an in-panel toggle to
 * flip between the two. Sticky, with a blur + border that fades in on scroll.
 */
export function Header() {
  const scrolled = useScrolled();
  const { name, ready } = useHeaderUser();
  const pathname = usePathname();

  // `edge` = which side the drawer is anchored to (null = closed).
  // `brain` = which content it shows; opening a side seeds the matching brain,
  // after which the in-drawer toggle can change it independently.
  const [edge, setEdge] = React.useState<Brain | null>(null);
  const [brain, setBrain] = React.useState<Brain>("left");

  const openDrawer = (side: Brain) => {
    setBrain(side);
    setEdge(side);
  };

  // Close on route change (intentional sync to navigation).
  // eslint-disable-next-line react-hooks/set-state-in-effect
  React.useEffect(() => setEdge(null), [pathname]);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full border-b transition-ui",
        scrolled
          ? "border-border bg-background/80 backdrop-blur-md"
          : "border-transparent bg-background",
      )}
    >
      <div className="mx-auto grid h-16 max-w-[var(--container-page)] grid-cols-[1fr_auto_1fr] items-center px-4 md:px-8">
        <div className="flex items-center gap-1 justify-self-start">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Growth & Systems menu"
            onClick={() => openDrawer("left")}
          >
            <Menu />
          </Button>
        </div>

        <div className="justify-self-center">
          <Logo />
        </div>

        <div className="flex items-center gap-1 justify-self-end">
          {ready && name ? (
            <Link
              href="/members"
              className={cn(
                buttonVariants({ size: "sm" }),
                "welcome-ripple relative mr-1 hidden max-w-[12rem] overflow-hidden sm:inline-flex",
              )}
            >
              <span className="ripple" aria-hidden />
              <span className="ripple" aria-hidden />
              <span className="ripple" aria-hidden />
              <span className="relative z-10 truncate">Welcome, {name}</span>
            </Link>
          ) : (
            <Link
              href="/community"
              className={cn(
                buttonVariants({ size: "sm" }),
                "mr-1 hidden sm:inline-flex",
              )}
            >
              Join Community
            </Link>
          )}
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            aria-label="Ideas & Play menu"
            onClick={() => openDrawer("right")}
          >
            <MoreVertical />
          </Button>
        </div>
      </div>

      <BrainDrawer
        edge={edge}
        brain={brain}
        onBrainChange={setBrain}
        onClose={() => setEdge(null)}
      />
    </header>
  );
}
