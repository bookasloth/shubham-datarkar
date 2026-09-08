import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

/** My rating as an "8.5 / 10" chip. Renders nothing when unrated. */
export function MovieRating({
  rating,
  size = "sm",
  className,
}: {
  rating: number | null | undefined;
  size?: "sm" | "lg";
  className?: string;
}) {
  if (rating == null) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-btn bg-background/75 font-semibold text-foreground backdrop-blur",
        size === "lg" ? "px-2.5 py-1 text-sm" : "px-2 py-0.5 text-xs",
        className,
      )}
    >
      <Star className={cn("fill-current", size === "lg" ? "size-4" : "size-3")} aria-hidden />
      {rating.toFixed(1)}
      <span className="font-normal text-muted-foreground">/&nbsp;10</span>
    </span>
  );
}
