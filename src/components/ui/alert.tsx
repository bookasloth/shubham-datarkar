import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const alertVariants = cva(
  "relative flex gap-3 rounded-card border p-4 text-sm [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:mt-0.5",
  {
    variants: {
      variant: {
        default: "border-border bg-card text-card-foreground [&_svg]:text-muted-foreground",
        info: "border-border bg-muted/50 text-foreground [&_svg]:text-foreground",
        success: "border-success/30 bg-success/8 text-foreground [&_svg]:text-success",
        warning: "border-warning/30 bg-warning/8 text-foreground [&_svg]:text-warning",
        danger: "border-danger/30 bg-danger/8 text-foreground [&_svg]:text-danger",
        accent: "border-l-2 border-l-foreground border-y-border border-r-border bg-muted/40 text-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {}

export function Alert({ className, variant, ...props }: AlertProps) {
  return <div role="alert" className={cn(alertVariants({ variant }), className)} {...props} />;
}

export function AlertTitle({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("font-medium leading-tight", className)} {...props} />;
}

export function AlertDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <div className={cn("mt-1 text-muted-foreground [&_p]:leading-relaxed", className)} {...props} />;
}
