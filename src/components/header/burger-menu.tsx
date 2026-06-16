"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { primaryNav, site } from "@/lib/site";
import { caseStudies } from "@/lib/data/case-studies";
import { Button, buttonVariants } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

const latestCases = caseStudies.slice(0, 4);

function SpotifyIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.586 14.424a.622.622 0 0 1-.857.207c-2.348-1.435-5.304-1.76-8.785-.964a.622.622 0 1 1-.277-1.215c3.809-.871 7.077-.496 9.713 1.115a.623.623 0 0 1 .206.857zM17.81 13.7a.78.78 0 0 1-1.072.257c-2.687-1.652-6.785-2.131-9.965-1.166a.779.779 0 1 1-.45-1.49c3.632-1.102 8.147-.568 11.23 1.327a.78.78 0 0 1 .257 1.072zm.105-2.835C14.692 8.95 9.375 8.775 6.298 9.71a.935.935 0 1 1-.542-1.79c3.532-1.072 9.404-.866 13.115 1.337a.935.935 0 0 1-.956 1.608z" />
    </svg>
  );
}

/**
 * Primary navigation surface. Radix Dialog gives focus trap, scroll lock,
 * Esc + overlay dismissal for free. Renders as a left drawer on mobile and a
 * full-width slide-down mega panel on desktop (>= lg), animated via the
 * shared `.burger-anim` vocabulary in globals.css.
 */
export function BurgerMenu() {
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();

  // Close on route change (intentional sync to navigation).
  // eslint-disable-next-line react-hooks/set-state-in-effect
  React.useEffect(() => setOpen(false), [pathname]);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button variant="ghost" size="icon" aria-label="Open menu">
          <Menu />
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="overlay-anim fixed inset-0 z-[95] bg-foreground/40 backdrop-blur-sm" />
        <Dialog.Content
          aria-describedby={undefined}
          className={cn(
            "burger-anim fixed z-[96] flex flex-col bg-background outline-none",
            // Mobile: left drawer
            "inset-y-0 left-0 w-[88%] max-w-sm border-r border-border",
            // Desktop (>= lg): full-width slide-down mega panel
            "lg:inset-x-0 lg:bottom-auto lg:max-h-[100dvh] lg:w-full lg:max-w-none lg:overflow-y-auto lg:border-r-0 lg:border-b lg:border-border",
          )}
        >
          {/* Top row — own Logo + Close (the bar is covered while open) */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3 lg:mx-auto lg:w-full lg:max-w-[var(--container-page)] lg:border-b-0 lg:px-8">
            <Logo />
            <Dialog.Title className="sr-only">Menu</Dialog.Title>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" aria-label="Close menu">
                <X />
              </Button>
            </Dialog.Close>
          </div>

          <div className="grid min-w-0 flex-1 grid-cols-1 gap-8 overflow-y-auto p-4 lg:mx-auto lg:w-full lg:max-w-[var(--container-page)] lg:grid-cols-[1.1fr_1fr] lg:gap-12 lg:overflow-visible lg:px-8 lg:pb-12 lg:pt-2">
            {/* Left: navigation */}
            <nav aria-label="Primary" className="min-w-0">
              <div className="flex flex-col">
                {primaryNav.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "border-b border-border py-3 font-display text-lg font-semibold transition-ui hover:text-muted-foreground",
                      pathname === item.href && "text-foreground",
                    )}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>

              {/* Spotify — dedicated section with a playlist CTA */}
              <div className="mt-8 rounded-card border border-border bg-card p-5">
                <div className="flex items-center gap-2.5">
                  <SpotifyIcon className="size-6 text-[#1DB954]" />
                  <p className="font-display text-base font-bold">Spotify</p>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  The soundtrack behind the work — focus, build, repeat.
                </p>
                <a
                  href={site.spotifyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    buttonVariants({ size: "default" }),
                    "mt-4 w-full bg-[#1DB954] text-black hover:bg-[#1ed760]",
                  )}
                >
                  <SpotifyIcon className="size-4" />
                  Visit My Playlist
                </a>
              </div>
            </nav>

            {/* Right: latest cases */}
            <aside className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Latest cases
              </p>
              <ul className="mt-3 flex flex-col gap-2">
                {latestCases.map((c) => (
                  <li key={c.slug}>
                    <Link
                      href={`/case-studies/${c.slug}`}
                      className="group flex items-center gap-4 rounded-card p-2 transition-ui hover:bg-accent"
                    >
                      <span
                        aria-hidden
                        className="grid size-14 shrink-0 place-items-center rounded-img bg-secondary text-center font-display text-xs font-bold text-foreground"
                      >
                        {c.heroMetric.value}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-foreground">
                          {c.title}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {c.client} · {c.sector}
                        </span>
                      </span>
                      <ArrowUpRight className="size-4 shrink-0 text-muted-foreground transition-ui group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground" />
                    </Link>
                  </li>
                ))}
              </ul>

              <a
                href={site.bookingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(buttonVariants({ size: "lg" }), "mt-6 w-full")}
              >
                Book a call
              </a>
            </aside>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
