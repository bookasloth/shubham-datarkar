"use client";

import * as React from "react";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { BurgerMenu } from "./burger-menu";
import { MoreMenu } from "./more-menu";
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
 * Site header. Centered-logo layout: burger (full nav + latest cases) on the
 * left, brand mark centered, theme + more controls and the booking CTA on the
 * right. Sticky, with a blur + border that fades in once scrolled.
 */
export function Header() {
  const scrolled = useScrolled();
  const { name, ready } = useHeaderUser();

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
        <div className="justify-self-start">
          <BurgerMenu />
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
              href="/membership"
              className={cn(
                buttonVariants({ size: "sm" }),
                "mr-1 hidden sm:inline-flex",
              )}
            >
              Join Community
            </Link>
          )}
          <ThemeToggle />
          <MoreMenu />
        </div>
      </div>
    </header>
  );
}
