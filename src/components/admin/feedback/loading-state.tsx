import * as React from "react";
import { cn } from "@/lib/utils";

/** Skeleton placeholder rows. Pure CSS pulse — reduced-motion safe via the
 *  global prefers-reduced-motion rule in globals.css. */
export function AdminLoadingState({
  rows = 5,
  className,
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)} aria-busy="true" aria-live="polite">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-10 w-full animate-pulse rounded-input bg-admin-surface-hover"
        />
      ))}
    </div>
  );
}
