import { CONTENT_LABELS, type ContentType } from "@/lib/kalamai/writing";

export function ContentTypeBadge({ type }: { type: ContentType }) {
  return (
    <span className="shrink-0 rounded-btn border border-border bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
      {CONTENT_LABELS[type] ?? "Blog"}
    </span>
  );
}
