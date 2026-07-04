"use client";

import { CldImage } from "next-cloudinary";
import type { Photo } from "@/lib/photos/types";
import { formatPhotoDate } from "@/lib/photos/gallery";
import { cn } from "@/lib/utils";

/**
 * A single gallery tile. Cloudinary fill image, gradient scrim carrying the
 * title + month-year, and a hover lift (card rises, image scales) driven by the
 * shared `--ease-out-quint`. Clicking calls `onOpen(index)` — the seam the Task
 * 4 lightbox hangs off of. Pure monochrome + brand focus ring only.
 */
export function PhotoCard({
  photo,
  index,
  onOpen,
  className,
}: {
  photo: Photo;
  index: number;
  onOpen: (index: number) => void;
  className?: string;
}) {
  const date = formatPhotoDate(photo.createdAt);

  return (
    <button
      type="button"
      onClick={() => onOpen(index)}
      aria-label={`Open ${photo.title}`}
      className={cn(
        "group relative block w-full overflow-hidden rounded-img border border-border bg-card text-left",
        "shadow-xs transition-[transform,box-shadow] duration-[--dur-base] ease-[--ease-out-quint]",
        "hover:-translate-y-1 hover:shadow-lg",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
        // masonry: never split a card across columns
        "mb-4 break-inside-avoid",
        className,
      )}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden">
        <CldImage
          src={photo.cloudinaryPublicId}
          alt={photo.title}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          crop="fill"
          gravity="auto"
          className="object-cover transition-transform duration-[--dur-slow] ease-[--ease-out-quint] group-hover:scale-[1.02]"
        />
        {/* Scrim: only as dark as it needs to be to seat the caption. */}
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent"
          aria-hidden
        />
        <div className="absolute inset-x-0 bottom-0 p-4">
          <h3 className="font-display text-base font-semibold text-white drop-shadow-sm">
            {photo.title}
          </h3>
          {date && <p className="mt-0.5 text-xs font-medium text-white/70">{date}</p>}
        </div>
      </div>
    </button>
  );
}
