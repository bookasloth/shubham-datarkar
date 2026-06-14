import { cn } from "@/lib/utils";

/** Loading placeholder. Uses a subtle monochrome pulse. */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("animate-pulse rounded-input bg-muted", className)} {...props} />;
}
