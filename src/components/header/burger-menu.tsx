"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { primaryNav, site } from "@/lib/site";
import { caseStudies } from "@/lib/data/case-studies";
import { getLatestPostsForNav } from "@/lib/blog/actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

const latestCases = caseStudies.slice(0, 2);

type NavPost = { slug: string; title: string; category: string };

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

/**
 * Primary navigation surface. Radix Dialog gives focus trap, scroll lock,
 * Esc + overlay dismissal for free. Renders as a left drawer on mobile and a
 * full-width slide-down mega panel on desktop (>= lg), animated via the
 * shared `.burger-anim` vocabulary in globals.css.
 */
export function BurgerMenu() {
  const [open, setOpen] = React.useState(false);
  const [posts, setPosts] = React.useState<NavPost[]>([]);
  const pathname = usePathname();

  // Close on route change (intentional sync to navigation).
  // eslint-disable-next-line react-hooks/set-state-in-effect
  React.useEffect(() => setOpen(false), [pathname]);

  // Recent posts live in the DB — fetch once, only when the menu first opens,
  // so no per-page-load cost. ponytail: on-open fetch, revisit if it feels slow.
  React.useEffect(() => {
    if (open && posts.length === 0) {
      getLatestPostsForNav(2)
        .then(setPosts)
        .catch(() => {});
    }
  }, [open, posts.length]);

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
            "burger-anim fixed inset-x-0 top-0 z-[96] flex max-h-[100dvh] w-full flex-col",
            "overflow-y-auto border-b border-border bg-background/80 backdrop-blur-md outline-none",
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

          <div className="grid min-w-0 flex-1 grid-cols-1 items-stretch gap-8 overflow-y-auto p-4 lg:mx-auto lg:w-full lg:max-w-[var(--container-page)] lg:grid-cols-[1.1fr_1fr] lg:gap-12 lg:overflow-visible lg:px-8 lg:pb-12 lg:pt-2">
            {/* Left: navigation */}
            <nav aria-label="Primary" className="flex min-w-0 flex-col">
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

              {/* Listen — YouTube + Spotify side by side */}
              <div className="mt-8 grid grid-cols-2 gap-3">
                <a
                  href={site.youtubeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col justify-center gap-1 rounded-btn bg-[#FF0000] px-4 py-5 text-white transition-ui hover:bg-[#ff1a1a]"
                >
                  <span className="text-[11px] font-medium uppercase tracking-wide text-white/80">
                    Watch me build
                  </span>
                  <span className="flex items-center gap-2 font-semibold">
                    <YouTubeIcon className="size-5" />
                    YouTube
                  </span>
                </a>
                <a
                  href={site.spotifyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col justify-center gap-1 rounded-btn bg-[#1DB954] px-4 py-5 text-black transition-ui hover:bg-[#1ed760]"
                >
                  <span className="text-[11px] font-medium uppercase tracking-wide text-black/70">
                    Focus, build, repeat
                  </span>
                  <span className="flex items-center gap-2 font-semibold">
                    <SpotifyIcon className="size-5" />
                    Spotify
                  </span>
                </a>
              </div>
            </nav>

            {/* Right: latest cases + recent writing */}
            <aside className="flex min-w-0 flex-col">
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

              {posts.length > 0 && (
                <>
                  <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Notes/Updates
                  </p>
                  <ul className="mt-3 flex flex-col gap-2">
                    {posts.map((p) => (
                      <li key={p.slug}>
                        <Link
                          href={`/blog/${p.category}/${p.slug}`}
                          className="group flex items-center gap-3 rounded-card p-2 transition-ui hover:bg-accent"
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium text-foreground">
                              {p.title}
                            </span>
                            <span className="text-xs capitalize text-muted-foreground">
                              {p.category.replace(/-/g, " ")}
                            </span>
                          </span>
                          <ArrowUpRight className="size-4 shrink-0 text-muted-foreground transition-ui group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </>
              )}

              <a
                href={site.bookingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(buttonVariants({ size: "lg" }), "mt-auto w-full")}
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
