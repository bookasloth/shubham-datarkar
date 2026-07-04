import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/** Subtle tonal status pill — tinted background at 12% + solid token text.
 *  Never a bright/saturated fill (per admin design rules). */
const statusBadgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-btn border border-transparent px-2 py-0.5 text-xs font-medium [&_svg]:size-3",
  {
    variants: {
      tone: {
        neutral: "bg-admin-surface-hover text-admin-text-muted",
        success: "bg-admin-success/12 text-admin-success",
        warning: "bg-admin-warning/12 text-admin-warning",
        info: "bg-admin-info/12 text-admin-info",
        danger: "bg-admin-danger/12 text-admin-danger",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusBadgeVariants> {}

export function StatusBadge({ className, tone, ...props }: StatusBadgeProps) {
  return <span className={cn(statusBadgeVariants({ tone }), className)} {...props} />;
}

export { statusBadgeVariants };
