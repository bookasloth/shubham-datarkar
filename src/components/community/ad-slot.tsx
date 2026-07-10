import Image from "next/image";
import type { AdSlot } from "@/lib/community/types";

export function AdSlotView({ ad }: { ad: AdSlot }) {
  if (!ad.imagePath) {
    return (
      <div className="flex h-40 items-center justify-center rounded-card border border-dashed border-border text-xs text-muted-foreground">
        Ad slot {ad.slot}
      </div>
    );
  }
  const img = (
    <div className="relative h-40 overflow-hidden rounded-card border border-border">
      <Image src={ad.imagePath} alt="Sponsored" fill className="object-cover" />
    </div>
  );
  return ad.linkUrl ? (
    <a
      href={ad.linkUrl}
      target="_blank"
      rel="noopener sponsored"
      className="block transition-ui hover:opacity-90"
    >
      {img}
    </a>
  ) : (
    img
  );
}
