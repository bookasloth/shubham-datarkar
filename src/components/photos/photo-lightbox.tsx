"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { CldImage } from "next-cloudinary";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import type { Photo } from "@/lib/photos/types";
import { formatPhotoDate, wrapIndex } from "@/lib/photos/gallery";
import { LikeButton } from "@/components/photos/like-button";
import { cn } from "@/lib/utils";

const SWIPE_THRESHOLD = 60; // px

/**
 * Full-screen photo viewer layered over the gallery. Opened by the gallery via
 * `openIndex`; closed by clearing it through `onOpenChange`. Built on the shared
 * Radix Dialog primitives (Escape + overlay-click close come for free) but with
 * a bespoke full-bleed content shell rather than the boxed `DialogContent`.
 *
 * Navigation wraps around in both directions via ArrowLeft/Right, on-screen
 * chevrons, thumbnail clicks, and horizontal swipe.
 */
export function PhotoLightbox({
  photos,
  openIndex,
  onOpenChange,
  onIndexChange,
}: {
  photos: Photo[];
  openIndex: number | null;
  onOpenChange: (open: boolean) => void;
  onIndexChange?: (index: number) => void;
}) {
  const open = openIndex !== null;
  const [index, setIndex] = React.useState(0);

  // Seed the internal index from the gallery whenever it (re)opens or the
  // gallery points us at a different card.
  React.useEffect(() => {
    if (openIndex !== null) setIndex(openIndex);
  }, [openIndex]);

  const count = photos.length;

  const go = React.useCallback(
    (next: number) => {
      const wrapped = wrapIndex(next, count);
      setIndex(wrapped);
      onIndexChange?.(wrapped);
    },
    [count, onIndexChange],
  );

  const prev = React.useCallback(() => go(index - 1), [go, index]);
  const next = React.useCallback(() => go(index + 1), [go, index]);

  // Keyboard arrows. Escape is handled by Radix Dialog.
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        prev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        next();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, prev, next]);

  // Touch swipe.
  const touchStartX = React.useRef<number | null>(null);
  const onTouchStart = React.useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null;
  }, []);
  const onTouchEnd = React.useCallback(
    (e: React.TouchEvent) => {
      const start = touchStartX.current;
      touchStartX.current = null;
      if (start === null) return;
      const dx = (e.changedTouches[0]?.clientX ?? start) - start;
      if (Math.abs(dx) < SWIPE_THRESHOLD) return;
      if (dx < 0) next();
      else prev();
    },
    [next, prev],
  );

  const photo = count > 0 ? photos[wrapIndex(index, count)] : undefined;
  const date = photo ? formatPhotoDate(photo.createdAt) : "";

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="overlay-anim fixed inset-0 z-50 bg-background/90 backdrop-blur-sm" />
        <DialogPrimitive.Content
          className="fixed inset-0 z-50 flex flex-col outline-none"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          {/* Accessible title/description, visually hidden. */}
          <DialogPrimitive.Title className="sr-only">
            {photo ? photo.title : "Photo viewer"}
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            {photo?.description ?? "Full-screen photo. Use arrow keys or swipe to navigate."}
          </DialogPrimitive.Description>

          {/* Close */}
          <DialogPrimitive.Close
            aria-label="Close"
            className="absolute right-4 top-4 z-20 rounded-btn p-2 text-muted-foreground transition-ui hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            <X className="size-5" />
          </DialogPrimitive.Close>

          {photo && (
            <>
              {/* Stage */}
              <div
                className="relative flex min-h-0 flex-1 items-center justify-center px-4 py-6 sm:px-16"
                onTouchStart={onTouchStart}
                onTouchEnd={onTouchEnd}
              >
                {count > 1 && (
                  <button
                    type="button"
                    onClick={prev}
                    aria-label="Previous photo"
                    className="absolute left-2 top-1/2 z-10 hidden -translate-y-1/2 rounded-btn p-2 text-muted-foreground transition-ui hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand sm:block"
                  >
                    <ChevronLeft className="size-7" />
                  </button>
                )}

                <CldImage
                  key={photo.id}
                  src={photo.cloudinaryPublicId}
                  alt={photo.title}
                  width={1600}
                  height={1200}
                  sizes="100vw"
                  className="max-h-full w-auto max-w-full object-contain"
                />

                {count > 1 && (
                  <button
                    type="button"
                    onClick={next}
                    aria-label="Next photo"
                    className="absolute right-2 top-1/2 z-10 hidden -translate-y-1/2 rounded-btn p-2 text-muted-foreground transition-ui hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand sm:block"
                  >
                    <ChevronRight className="size-7" />
                  </button>
                )}
              </div>

              {/* Bottom bar: meta + like + thumbnail strip */}
              <div className="shrink-0 border-t border-border bg-background/80 backdrop-blur">
                <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-3">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <h2 className="truncate font-display text-base font-semibold text-foreground">
                        {photo.title}
                      </h2>
                      {date && <p className="mt-0.5 text-xs text-muted-foreground">{date}</p>}
                    </div>
                    <LikeButton photoId={photo.id} />
                  </div>

                  {count > 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {photos.map((p, i) => {
                        const active = i === wrapIndex(index, count);
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => go(i)}
                            aria-label={`View ${p.title}`}
                            aria-current={active}
                            className={cn(
                              "relative h-14 w-20 shrink-0 overflow-hidden rounded-img border transition-ui",
                              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
                              active
                                ? "border-brand ring-2 ring-brand"
                                : "border-border opacity-60 hover:opacity-100",
                            )}
                          >
                            <CldImage
                              src={p.cloudinaryPublicId}
                              alt={p.title}
                              width={80}
                              height={56}
                              crop="fill"
                              gravity="auto"
                              className="h-full w-full object-cover"
                            />
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
