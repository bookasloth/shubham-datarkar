"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Movie } from "@/lib/movies/types";
import { MovieCard } from "./movie-card";

/**
 * A horizontal, snap-scrolling row of movie cards. Native touch/trackpad
 * scrolling on every device; overlay arrow buttons appear on hover (desktop).
 */
export function MovieRail({
  title,
  movies,
  href,
  className,
}: {
  title?: string;
  movies: Movie[];
  href?: string;
  className?: string;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  if (movies.length === 0) return null;

  function scroll(dir: 1 | -1) {
    const el = ref.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  }

  const arrow =
    "absolute top-1/2 z-10 hidden -translate-y-1/2 size-10 items-center justify-center rounded-full border border-border bg-background/80 text-foreground opacity-0 backdrop-blur transition-opacity duration-200 hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring group-hover/rail:opacity-100 focus-visible:opacity-100 md:flex [&_svg]:size-5";

  return (
    <section className={cn("group/rail relative", className)}>
      {title && (
        <div className="mb-3 flex items-baseline justify-between gap-4 px-1">
          <h2 className="font-display text-lg font-bold tracking-tight sm:text-xl">{title}</h2>
          {href && (
            <Link
              href={href}
              className="inline-flex shrink-0 items-center gap-1 text-sm text-muted-foreground transition-ui hover:text-foreground"
            >
              See all <ArrowRight className="size-3.5" />
            </Link>
          )}
        </div>
      )}

      <div className="relative">
        <button
          type="button"
          aria-label="Scroll left"
          onClick={() => scroll(-1)}
          className={cn(arrow, "left-1")}
        >
          <ChevronLeft aria-hidden />
        </button>
        <div
          ref={ref}
          className="flex snap-x gap-3 overflow-x-auto scroll-smooth pb-2 [-ms-overflow-style:none] [scrollbar-width:none] sm:gap-4 [&::-webkit-scrollbar]:hidden"
        >
          {movies.map((m) => (
            <div key={m.id} className="w-[140px] shrink-0 snap-start sm:w-[160px] md:w-[176px]">
              <MovieCard movie={m} />
            </div>
          ))}
        </div>
        <button
          type="button"
          aria-label="Scroll right"
          onClick={() => scroll(1)}
          className={cn(arrow, "right-1")}
        >
          <ChevronRight aria-hidden />
        </button>
      </div>
    </section>
  );
}
