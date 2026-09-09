import { cn } from "@/lib/utils";

// Emphasis is monochrome by design (site palette reserves the brand orange for
// focus/selection). Top recommendations invert to solid; a pass reads muted.
const EMPHASIS = new Set(["Must Watch", "Highly Recommended", "Must Read"]);
const PASS = new Set(["Skip It", "Not For Me"]);

export function RecommendationBadge({
  type,
  className,
}: {
  type: string | null | undefined;
  className?: string;
}) {
  if (!type) return null;
  const tone = EMPHASIS.has(type)
    ? "bg-foreground text-background"
    : PASS.has(type)
      ? "border border-border bg-background/70 text-muted-foreground"
      : "border border-border bg-background/70 text-foreground";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-btn px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-wide backdrop-blur",
        tone,
        className,
      )}
    >
      {type}
    </span>
  );
}
