import * as React from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

/** Overlapping avatar stack with an optional "+N" overflow chip. */
export function AvatarGroup({
  items,
  max = 4,
  className,
}: {
  items: { initials: string }[];
  max?: number;
  className?: string;
}) {
  const shown = items.slice(0, max);
  const extra = items.length - shown.length;

  return (
    <div className={cn("flex -space-x-2", className)}>
      {shown.map((item, i) => (
        <Avatar key={i} className="size-9 ring-2 ring-background">
          <AvatarFallback className="text-xs">{item.initials}</AvatarFallback>
        </Avatar>
      ))}
      {extra > 0 && (
        <span className="flex size-9 items-center justify-center rounded-btn border border-border bg-muted text-xs font-semibold text-muted-foreground ring-2 ring-background">
          +{extra}
        </span>
      )}
    </div>
  );
}
