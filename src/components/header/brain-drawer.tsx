"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { ArrowUpRight, X } from "lucide-react";
import { leftBrain, rightBrain, site, socials, type NavGroup } from "@/lib/site";
import { caseStudies } from "@/lib/data/case-studies";
import { getLatestPostsForNav } from "@/lib/blog/actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";
import { Search } from "./search";

export type Brain = "left" | "right";

const latestCases = caseStudies.slice(0, 2);

type NavPost = { slug: string; title: string; category: string };

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

/** Grouped nav list for one brain — label heading + items with descriptions. */
function NavGroups({ groups, pathname }: { groups: NavGroup[]; pathname: string }) {
  return (
    <nav aria-label="Primary" className="flex min-w-0 flex-col gap-6">
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
                      <span className="block truncate text-xs text-muted-foreground">
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

/** Left-brain aside: proof at a glance — latest cases + recent writing. */
function LeftAside({ posts }: { posts: NavPost[] }) {
  return (
    <>
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
    </>
  );
}

/** Right-brain aside: search + the places to follow along. */
function RightAside() {
  return (
    <>
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        Find what you need
      </p>
      <Search className="mt-3" />

      <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
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
    </>
  );
}

/**
 * The dual-brain navigation drawer. Controlled by the header: `edge` sets which
 * side it slides from (and null = closed), `brain` sets which content shows.
 * The two are independent — you open the left burger onto the left edge with
 * left-brain content, then the in-drawer toggle can flip the *content* to the
 * right brain without the panel jumping edges. Radix Dialog gives focus trap,
 * scroll lock, and Esc/overlay dismissal for free.
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
  const [posts, setPosts] = React.useState<NavPost[]>([]);
  const open = edge !== null;

  // Recent posts live in the DB — fetch once, only after the drawer first opens.
  // ponytail: on-open fetch, revisit if it feels slow.
  React.useEffect(() => {
    if (open && posts.length === 0) {
      getLatestPostsForNav(2)
        .then(setPosts)
        .catch(() => {});
    }
  }, [open, posts.length]);

  const active = BRAINS[brain];

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="overlay-anim fixed inset-0 z-[95] bg-foreground/40 backdrop-blur-sm" />
        <Dialog.Content
          aria-describedby={undefined}
          className={cn(
            "fixed inset-y-0 z-[96] flex w-full max-w-[26rem] flex-col overflow-y-auto bg-background/90 backdrop-blur-md outline-none",
            edge === "left"
              ? "drawer-left left-0 border-r border-border"
              : "drawer-right right-0 border-l border-border",
          )}
        >
          {/* Top row — Logo + Close (the bar is covered while open) */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <Logo />
            <Dialog.Title className="sr-only">{active.title}</Dialog.Title>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" aria-label="Close menu">
                <X />
              </Button>
            </Dialog.Close>
          </div>

          {/* Brain toggle — flips content on any screen size */}
          <div className="px-4 pt-4">
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
            <p className="mt-2 text-xs text-muted-foreground">{active.tagline}</p>
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-8 p-4">
            <NavGroups groups={active.groups} pathname={pathname} />

            <aside className="flex min-w-0 flex-col border-t border-border pt-6">
              {brain === "left" ? <LeftAside posts={posts} /> : <RightAside />}
            </aside>

            <a
              href={site.bookingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(buttonVariants({ size: "lg" }), "mt-auto w-full")}
            >
              Book a call
            </a>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
