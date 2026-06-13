import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";

/**
 * The one button. Shared interaction language across the whole site:
 * hover lifts 1px with a subtle shadow, active presses back down,
 * all in ~180ms. Focus-visible shows the monochrome ring.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-btn text-sm font-medium transition-ui select-none " +
    "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring " +
    "disabled:pointer-events-none disabled:opacity-50 active:translate-y-0 " +
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-xs hover:-translate-y-px hover:shadow-sm active:shadow-xs",
        secondary:
          "bg-secondary text-secondary-foreground hover:-translate-y-px hover:bg-accent hover:shadow-sm",
        outline:
          "border border-border bg-background text-foreground hover:-translate-y-px hover:bg-accent hover:shadow-sm",
        ghost: "text-foreground hover:bg-accent",
        link: "text-foreground underline-offset-4 hover:underline",
        destructive:
          "bg-danger text-danger-foreground shadow-xs hover:-translate-y-px hover:shadow-sm",
      },
      size: {
        sm: "h-8 px-3 text-xs [&_svg]:size-3.5",
        default: "h-10 px-4 [&_svg]:size-4",
        lg: "h-12 px-6 text-base [&_svg]:size-4.5",
        icon: "size-10 [&_svg]:size-4",
        "icon-sm": "size-8 [&_svg]:size-3.5",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading ? (
          <>
            <Spinner className="size-4" />
            {size !== "icon" && size !== "icon-sm" ? children : null}
          </>
        ) : (
          children
        )}
      </Comp>
    );
  },
);
Button.displayName = "Button";

export { buttonVariants };
