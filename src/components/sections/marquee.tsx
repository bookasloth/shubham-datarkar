import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Infinite, CSS-only horizontal ticker. Renders the children twice so the
 * loop is seamless; the second copy is hidden from assistive tech.
 * The track translates by exactly -50% (one copy width). Pauses on hover.
 * Pass `reverse` to scroll the other direction.
 */
export function Marquee({
  children,
  duration = 40,
  reverse = false,
  className,
}: {
  children: React.ReactNode;
  duration?: number;
  reverse?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("marquee-mask group relative w-full overflow-hidden", className)}>
      <div
        className={cn("flex w-max animate-marquee group-hover:[animation-play-state:paused]", reverse && "[animation-direction:reverse]")}
        style={{ ["--marquee-duration" as string]: `${duration}s` }}
      >
        <div className="flex shrink-0 gap-4 pr-4">{children}</div>
        <div className="flex shrink-0 gap-4 pr-4" aria-hidden>
          {children}
        </div>
      </div>
    </div>
  );
}
