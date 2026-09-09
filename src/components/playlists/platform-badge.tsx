import { Music } from "lucide-react";
import { cn } from "@/lib/utils";
import { platformLabel } from "@/lib/playlists/types";

/** Monochrome platform chip (e.g. "Spotify"). No brand colours — house style. */
export function PlatformBadge({ platform, className }: { platform: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-btn border border-border px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground",
        className,
      )}
    >
      <Music className="size-3" aria-hidden />
      {platformLabel(platform)}
    </span>
  );
}
