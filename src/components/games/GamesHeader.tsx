"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";

/**
 * Standalone games mini-app header. Replaces the site header/footer inside
 * /games/** for a clean, focused game surface.
 */
export default function GamesHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-md items-center justify-between px-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/" aria-label="Back to site">
            <ArrowLeft />
            <span className="hidden sm:inline">Back to site</span>
          </Link>
        </Button>
        <Link
          href="/games"
          className="font-display text-lg font-bold tracking-tight transition-ui hover:text-muted-foreground"
        >
          Games
        </Link>
        <ThemeToggle />
      </div>
    </header>
  );
}
