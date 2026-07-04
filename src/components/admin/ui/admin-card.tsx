import * as React from "react";
import { cn } from "@/lib/utils";

export interface AdminCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** When true, the border shifts to accent on hover (for clickable cards). */
  interactive?: boolean;
}

/** The one admin surface: shared radius (rounded-card), gray border,
 *  optional accent-on-hover for clickable cards. Border transition only. */
export const AdminCard = React.forwardRef<HTMLDivElement, AdminCardProps>(
  ({ className, interactive = false, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-card border border-admin-border bg-admin-surface p-4 " +
          "transition-[border-color] duration-150",
        interactive && "cursor-pointer hover:border-admin-border-hover",
        className,
      )}
      {...props}
    />
  ),
);
AdminCard.displayName = "AdminCard";
