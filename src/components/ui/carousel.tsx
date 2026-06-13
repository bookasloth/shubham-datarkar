"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** Scroll-snap carousel with prev/next controls. */
export function Carousel({
  children,
  itemClassName,
  className,
}: {
  children: React.ReactNode;
  itemClassName?: string;
  className?: string;
}) {
  const ref = React.useRef<HTMLDivElement>(null);

  function scroll(dir: 1 | -1) {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: "smooth" });
  }

  const btn =
    "flex size-9 items-center justify-center rounded-btn border border-border bg-background transition-ui hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring [&_svg]:size-4";

  return (
    <div className={cn("relative", className)}>
      <div
        ref={ref}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {React.Children.map(children, (child, i) => (
          <div key={i} className={cn("shrink-0 snap-start", itemClassName)}>
            {child}
          </div>
        ))}
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" onClick={() => scroll(-1)} aria-label="Previous" className={btn}>
          <ChevronLeft />
        </button>
        <button type="button" onClick={() => scroll(1)} aria-label="Next" className={btn}>
          <ChevronRight />
        </button>
      </div>
    </div>
  );
}
