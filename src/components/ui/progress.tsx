"use client";

import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import { cn } from "@/lib/utils";

export const Progress = React.forwardRef<
  React.ComponentRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> & { indeterminate?: boolean }
>(({ className, value, indeterminate, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    value={indeterminate ? undefined : value}
    className={cn("relative h-2 w-full overflow-hidden rounded-full bg-muted", className)}
    {...props}
  >
    {indeterminate ? (
      <div className="progress-indeterminate rounded-full bg-foreground" />
    ) : (
      <ProgressPrimitive.Indicator
        className="size-full flex-1 bg-foreground transition-transform duration-500"
        style={{ transform: `translateX(-${100 - (value ?? 0)}%)` }}
      />
    )}
  </ProgressPrimitive.Root>
));
Progress.displayName = "Progress";
