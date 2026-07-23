"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { ArrowUpRight, X } from "lucide-react";
import { leftBrain, rightBrain, site, socials, type NavGroup } from "@/lib/site";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type Brain = "left" | "right";

const BRAINS: Record<Brain, { title: string; tagline: string; groups: NavGroup[] }> = {
  left: {
    title: "Growth & Systems",
    tagline: "Services, proof, and the machine behind the businesses.",
    groups: leftBrain,
  },
  right: {
    title: "Ideas & Play",
    tagline: "Writing, community, experiments — the human side.",
    groups: rightBrain,
  },
};

function SpotifyIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.586 14.424a.622.622 0 0 1-.857.207c-2.348-1.435-5.304-1.76-8.785-.964a.622.622 0 1 1-.277-1.215c3.809-.871 7.077-.496 9.713 1.115a.623.623 0 0 1 .206.857zM17.81 13.7a.78.78 0 0 1-1.072.257c-2.687-1.652-6.785-2.131-9.965-1.166a.779.779 0 1 1-.45-1.49c3.632-1.102 8.147-.568 11.23 1.327a.78.78 0 0 1 .257 1.072zm.105-2.835C14.692 8.95 9.375 8.775 6.298 9.71a.935.935 0 1 1-.542-1.79c3.532-1.072 9.404-.866 13.115 1.337a.935.935 0 0 1-.956 1.608z" />
    </svg>
  );
}

function YouTubeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

/** Three nav groups as three columns on desktop, a single title stack on mobile. */
function NavGroups({ groups, pathname }: { groups: NavGroup[]; pathname: string }) {
  return (
    <nav
      aria-label="Primary"
      className="grid min-w-0 grid-cols-1 gap-x-8 gap-y-6 lg:grid-cols-3"
    >
      {groups.map((group) => (
        <div key={group.label} className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {group.label}
          </p>
          <ul className="mt-2 flex flex-col">
            {group.items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "group flex items-baseline justify-between gap-3 rounded-btn px-2 py-2 transition-ui hover:bg-accent",
                    pathname === item.href && "bg-accent",
                  )}
                >
                  <span className="min-w-0">
                    <span className="block font-display text-base font-semibold text-foreground">
                      {item.label}
                    </span>
                    {item.description && (
                      <span className="hidden truncate text-xs text-muted-foreground lg:block">
                        {item.description}
                      </span>
                    )}
                  </span>
                  <ArrowUpRight className="size-4 shrink-0 translate-y-1 text-muted-foreground transition-ui group-hover:-translate-y-0 group-hover:text-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

// w-full stretches it on the mobile column; sm:flex-1 gives equal width on the
// desktop row. (flex-1 alone would set flex-basis on the column's main axis and
// collapse the button's height, overriding h-12.)
const bookACall = cn(buttonVariants({ size: "lg" }), "w-full sm:flex-1");

/** Left-brain button row: YouTube + Spotify (both build-themed) + Book a call. */
function LeftButtons() {
  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      {/* YouTube + Spotify share one line on mobile; sm:contents dissolves this
          wrapper so all three sit inline on desktop. */}
      <div className="flex gap-3 sm:contents">
        <a
          href={site.youtubeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-12 flex-1 items-center justify-center gap-2 rounded-btn bg-[#FF0000] px-4 font-semibold text-white transition-ui hover:bg-[#ff1a1a]"
        >
          <YouTubeIcon className="size-5" />
          YouTube
        </a>
        <a
          href={site.spotifyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-12 flex-1 items-center justify-center gap-2 rounded-btn bg-[#1DB954] px-4 font-semibold text-black transition-ui hover:bg-[#1ed760]"
        >
          <SpotifyIcon className="size-5" />
          Spotify
        </a>
      </div>
      <a href={site.bookingUrl} target="_blank" rel="noopener noreferrer" className={bookACall}>
        Book a call
      </a>
    </div>
  );
}

/** Right-brain button row: socials + Book a call, all on one line. */
function RightButtons() {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="flex flex-1 flex-wrap gap-2">
        {socials
          .filter((s) => s.href !== site.bookingUrl)
          .map((s) => (
            <a
              key={s.label}
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-12 flex-1 items-center justify-center whitespace-nowrap rounded-btn border border-border px-3 text-sm font-medium text-foreground transition-ui hover:bg-accent"
            >
              {s.label}
            </a>
          ))}
      </div>
      <a href={site.bookingUrl} target="_blank" rel="noopener noreferrer" className={bookACall}>
        Book a call
      </a>
    </div>
  );
}

/**
 * The dual-brain navigation menu. Drops as a centered panel under the navbar.
 * `edge` (null = closed) opens it and seeds `brain`; on desktop the left burger
 * and right kebab are two fixed menus (no toggle), on mobile a single panel with
 * an in-panel toggle to switch brains. Radix Dialog gives focus trap, scroll
 * lock, and Esc/overlay dismissal for free.
 */
export function BrainDrawer({
  edge,
  brain,
  onBrainChange,
  onClose,
}: {
  edge: Brain | null;
  brain: Brain;
  onBrainChange: (brain: Brain) => void;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const open = edge !== null;
  const active = BRAINS[brain];

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="overlay-anim fixed inset-0 z-[95] bg-foreground/40 backdrop-blur-sm" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed inset-x-0 top-[4.25rem] z-[96] flex justify-center px-3 outline-none md:px-8"
        >
          <div
            className={cn(
              "pop-anim flex max-h-[calc(100dvh-5.5rem)] w-full max-w-[var(--container-page)]",
              "flex-col overflow-y-auto rounded-card border border-border bg-background/95 p-4 shadow-lg backdrop-blur-md sm:p-6",
            )}
          >
          {/* Header row: title (desktop) / toggle (mobile) + close */}
          <div className="flex items-start justify-between gap-4">
            {/* Desktop: the menu is fixed to one brain, so just name it. */}
            <div className="hidden lg:block">
              <Dialog.Title className="font-display text-lg font-bold text-foreground">
                {active.title}
              </Dialog.Title>
              <p className="mt-1 text-xs text-muted-foreground">{active.tagline}</p>
            </div>

            {/* Mobile: one panel, toggle between brains. */}
            <div className="min-w-0 flex-1 lg:hidden">
              <Dialog.Title className="sr-only">{active.title}</Dialog.Title>
              <div
                role="tablist"
                aria-label="Switch menu"
                className="grid grid-cols-2 gap-1 rounded-btn bg-secondary p-1"
              >
                {(["left", "right"] as const).map((b) => (
                  <button
                    key={b}
                    role="tab"
                    aria-selected={brain === b}
                    onClick={() => onBrainChange(b)}
                    className={cn(
                      "rounded-btn px-3 py-2 text-sm font-medium transition-ui",
                      brain === b
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {BRAINS[b].title}
                  </button>
                ))}
              </div>
            </div>

            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" aria-label="Close menu" className="shrink-0">
                <X />
              </Button>
            </Dialog.Close>
          </div>

          <div className="mt-6 min-w-0">
            <NavGroups groups={active.groups} pathname={pathname} />
          </div>

          <div className="mt-8 border-t border-border pt-6">
            {brain === "left" ? <LeftButtons /> : <RightButtons />}
          </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
