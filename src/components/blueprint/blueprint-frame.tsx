import * as React from "react";
import { cn } from "@/lib/utils";

/** A `+` corner tick, positioned by the parent. */
function Corner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "pointer-events-none absolute select-none leading-none text-muted-foreground",
        className,
      )}
    >
      +
    </span>
  );
}

/**
 * Bordered blueprint box with optional corner `+` markers. The workhorse
 * wrapper for heroes, sections, and the 404 canvas. Server-safe (no client JS).
 */
export function BlueprintFrame({
  variant = "dashed",
  // Grid/calendar style: plain framed box, no blueprint `+` corner ticks.
  markers = false,
  className,
  children,
}: {
  variant?: "dashed" | "solid";
  markers?: boolean;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "relative border border-border",
        variant === "dashed" && "border-dashed",
        className,
      )}
    >
      {markers && (
        <>
          <Corner className="-left-2 -top-2.5" />
          <Corner className="-right-2 -top-2.5" />
          <Corner className="-bottom-3.5 -left-2" />
          <Corner className="-bottom-3.5 -right-2" />
        </>
      )}
      {children}
    </div>
  );
}
