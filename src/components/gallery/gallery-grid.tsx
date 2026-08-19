"use client";

import * as React from "react";
import Image from "next/image";
import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GalleryImage } from "@/lib/gallery/types";
import { Lightbox } from "./lightbox";

const BATCH = 24;

export function GalleryGrid({ images }: { images: GalleryImage[] }) {
  const [visible, setVisible] = React.useState(BATCH);
  const [lightboxIndex, setLightboxIndex] = React.useState<number | null>(null);
  const sentinelRef = React.useRef<HTMLDivElement>(null);

  // Reveal the next batch when the sentinel scrolls near the viewport.
  React.useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) setVisible((v) => Math.min(v + BATCH, images.length));
      },
      { rootMargin: "600px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [images.length]);

  if (images.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-card border border-dashed border-border py-20 text-center">
        <ImageIcon className="size-8 text-muted-foreground" aria-hidden />
        <p className="text-sm font-medium">Nothing here yet</p>
        <p className="text-sm text-muted-foreground">Photos are on their way — check back soon.</p>
      </div>
    );
  }

  return (
    // ponytail: right-click/drag blocking is a deterrent, not protection — the
    // files are on a public bucket by design.
    <div onContextMenu={(e) => e.preventDefault()} className="select-none">
      <div className="columns-2 gap-3 md:columns-3 lg:columns-4 xl:columns-5 [&>*]:mb-3 [&>*]:break-inside-avoid">
        {images.slice(0, visible).map((image, i) => (
          <GalleryTile key={image.id} image={image} onOpen={() => setLightboxIndex(i)} />
        ))}
      </div>
      {visible < images.length && <div ref={sentinelRef} className="h-px" aria-hidden />}
      <Lightbox images={images} index={lightboxIndex} onIndexChange={setLightboxIndex} />
    </div>
  );
}

function GalleryTile({ image, onOpen }: { image: GalleryImage; onOpen: () => void }) {
  const [loaded, setLoaded] = React.useState(false);
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`View image: ${image.caption || "untitled"}`}
      className={cn(
        "group block w-full overflow-hidden rounded-img bg-muted",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        !loaded && "animate-pulse",
      )}
    >
      {/* width/height reserve the aspect ratio before load — no layout shift. */}
      <Image
        src={image.imageUrl}
        alt={image.caption || ""}
        width={image.width}
        height={image.height}
        sizes="(min-width: 1280px) 20vw, (min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
        draggable={false}
        onLoad={() => setLoaded(true)}
        className={cn(
          "h-auto w-full transition duration-500 will-change-transform group-hover:scale-[1.03]",
          loaded ? "opacity-100" : "opacity-0",
        )}
      />
    </button>
  );
}
