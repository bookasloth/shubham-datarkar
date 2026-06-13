"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/** Dismissible announcement bar. Place above the navbar or inline. */
export function Banner({
  children,
  variant = "default",
  dismissible = true,
  className,
}: {
  children: React.ReactNode;
  variant?: "default" | "inverted";
  dismissible?: boolean;
  className?: string;
}) {
  const [show, setShow] = React.useState(true);
  if (!show) return null;

  return (
    <div
      role="region"
      aria-label="Announcement"
      className={cn(
        "flex items-center justify-center gap-3 px-4 py-2.5 text-sm",
        variant === "inverted" ? "bg-foreground text-background" : "border-b border-border bg-muted/60 text-foreground",
        className,
      )}
    >
      <div className="flex items-center gap-2 text-center">{children}</div>
      {dismissible && (
        <button
          type="button"
          onClick={() => setShow(false)}
          aria-label="Dismiss announcement"
          className={cn(
            "rounded-btn p-1 transition-ui",
            variant === "inverted" ? "hover:bg-background/15" : "hover:bg-accent",
          )}
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}
