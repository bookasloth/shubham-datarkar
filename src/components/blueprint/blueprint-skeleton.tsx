import * as React from "react";
import { cn } from "@/lib/utils";
import { CrosshairGrid } from "./crosshair-grid";

/**
 * Loading fallback shell: a blueprint crosshair grid draws itself in behind
 * route-specific pulse placeholders (passed as children). The grid uses the
 * `mount` trigger because a loading state is visible immediately, never
 * scrolled into view. Announces busy state to assistive tech.
 */
export function BlueprintSkeleton({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={cn("relative", className)} aria-busy="true" aria-live="polite">
      <CrosshairGrid trigger="mount" className="opacity-50" />
      <div className="relative">{children}</div>
    </div>
  );
}
