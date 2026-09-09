import { cn } from "@/lib/utils";
import type { ReadingStatus } from "@/lib/books/types";

// Same chip idiom as RecommendationBadge (movies): monochrome, emphasis via
// inversion. "Currently reading" is the one status worth calling out loudly.
const LABELS: Record<ReadingStatus, string> = {
  want_to_read: "Want to Read",
  currently_reading: "Currently Reading",
  paused: "Paused",
  finished: "Finished",
  abandoned: "Abandoned",
};

export function ReadingStatusBadge({
  status,
  className,
}: {
  status: string | null;
  className?: string;
}) {
  if (!status || !(status in LABELS)) return null;
  const label = LABELS[status as ReadingStatus];
  const tone =
    status === "currently_reading"
      ? "bg-foreground text-background"
      : status === "abandoned"
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
      {label}
    </span>
  );
}
