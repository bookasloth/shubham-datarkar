import * as React from "react";
import { cn } from "@/lib/utils";

/** Default dot-grid illustration used when none is supplied. */
function DotGrid() {
  return (
    <div
      aria-hidden
      className="h-24 w-full rounded-input border border-border"
      style={{
        backgroundImage: "radial-gradient(var(--border) 1px, transparent 1px)",
        backgroundSize: "10px 10px",
      }}
    />
  );
}

/**
 * Thin-border feature card with an illustration slot (dot-grid by default),
 * a title, and optional description. Server-safe. Uses the locked card radius.
 */
export function BentoCard({
  title,
  desc,
  illustration,
  className,
  children,
}: {
  title: string;
  desc?: string;
  illustration?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-card border border-border bg-card p-5 transition-ui",
        className,
      )}
    >
      {illustration ?? <DotGrid />}
      <h3 className="mt-4 font-display text-base font-bold tracking-tight text-foreground">
        {title}
      </h3>
      {desc && <p className="mt-1.5 text-sm text-muted-foreground">{desc}</p>}
      {children}
    </div>
  );
}
