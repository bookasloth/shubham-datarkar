import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Admin interaction language: hover/focus/active shift the BORDER to
 * accent (#FE5100) rather than moving or scaling. Transitions ≤150ms,
 * border-color only. Primary is the one accent-filled control per view.
 */
const adminButtonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-btn border text-sm font-medium " +
    "transition-[color,background-color,border-color] duration-150 select-none outline-none " +
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-admin-accent " +
    "disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg]:size-4",
  {
    variants: {
      variant: {
        primary:
          "border-transparent bg-admin-accent text-admin-accent-fg hover:opacity-90",
        secondary:
          "border-admin-border bg-admin-surface text-admin-text hover:border-admin-border-hover",
        ghost:
          "border-transparent bg-transparent text-admin-text hover:bg-admin-surface-hover",
        danger:
          "border-transparent bg-admin-danger text-white hover:opacity-90",
      },
      size: {
        sm: "h-8 px-3 text-xs [&_svg]:size-3.5",
        default: "h-9 px-4",
        icon: "size-9",
      },
    },
    defaultVariants: { variant: "primary", size: "default" },
  },
);

export interface AdminButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof adminButtonVariants> {
  asChild?: boolean;
}

export const AdminButton = React.forwardRef<HTMLButtonElement, AdminButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp ref={ref} className={cn(adminButtonVariants({ variant, size, className }))} {...props} />
    );
  },
);
AdminButton.displayName = "AdminButton";

export { adminButtonVariants };
