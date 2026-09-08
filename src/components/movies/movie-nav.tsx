"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/movies", label: "Discover" },
  { href: "/collections", label: "Collections" },
  { href: "/movies/my-list", label: "My List" },
];

export function MovieNav() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/movies" ? pathname === "/movies" : pathname.startsWith(href);

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <nav aria-label="Movies" className="flex items-center gap-1">
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            aria-current={isActive(l.href) ? "page" : undefined}
            className={cn(
              "rounded-btn px-3 py-1.5 text-sm font-medium transition-ui",
              isActive(l.href)
                ? "bg-secondary text-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            {l.label}
          </Link>
        ))}
      </nav>
      {/* Native GET form — search works without JS. */}
      <form action="/movies/search" className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          name="q"
          type="search"
          placeholder="Search movies…"
          aria-label="Search movies"
          className="h-9 w-full rounded-btn border border-border bg-background pl-8 pr-3 text-sm outline-none transition-ui focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:w-64"
        />
      </form>
    </div>
  );
}
