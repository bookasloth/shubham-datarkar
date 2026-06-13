import * as React from "react";
import { cn } from "@/lib/utils";

/** Page-width container. Caps at 1280px, 8px-grid horizontal padding. */
export function Container({
  className,
  size = "page",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { size?: "page" | "prose" | "narrow" }) {
  return (
    <div
      className={cn(
        "mx-auto w-full px-6 md:px-8",
        size === "page" && "max-w-[var(--container-page)]",
        size === "narrow" && "max-w-3xl",
        size === "prose" && "max-w-[var(--container-prose)]",
        className,
      )}
      {...props}
    />
  );
}

/** Vertical rhythm wrapper for full-bleed page sections. */
export function Section({
  className,
  bleed = false,
  ...props
}: React.HTMLAttributes<HTMLElement> & { bleed?: boolean }) {
  return (
    <section className={cn(!bleed && "py-16 md:py-24", className)} {...props} />
  );
}
