import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  /** Optional leading icon rendered inside the field (auth forms). */
  icon?: React.ReactNode;
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", icon, ...props }, ref) => {
    const field = (
      <input
        ref={ref}
        type={type}
        className={cn(
          "flex h-10 w-full rounded-input border border-input bg-background px-3 py-2 text-sm text-foreground",
          "transition-ui placeholder:text-muted-foreground/70",
          "focus-visible:border-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "aria-[invalid=true]:border-danger aria-[invalid=true]:focus-visible:outline-danger",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium",
          icon && "pl-10",
          className,
        )}
        {...props}
      />
    );
    if (!icon) return field;
    return (
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground [&_svg]:size-4">
          {icon}
        </span>
        {field}
      </div>
    );
  },
);
Input.displayName = "Input";
