import * as React from "react";
import { cn } from "@/lib/utils";

export type TimelineEntry = { marker: string; title: string; description?: string };

/** Reusable vertical timeline. */
export function Timeline({ items, className }: { items: TimelineEntry[]; className?: string }) {
  return (
    <ol className={cn("relative border-l border-border", className)}>
      {items.map((item, i) => (
        <li key={`${item.title}-${i}`} className="relative ml-6 pb-8 last:pb-0">
          <span
            className="absolute -left-[31px] flex size-4 items-center justify-center rounded-full border-2 border-background bg-foreground"
            aria-hidden
          />
          <div className="flex items-center gap-3">
            <span className="font-display text-xs font-bold text-muted-foreground">{item.marker}</span>
            <h3 className="text-base font-semibold">{item.title}</h3>
          </div>
          {item.description && <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{item.description}</p>}
        </li>
      ))}
    </ol>
  );
}
