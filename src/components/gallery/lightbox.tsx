"use client";

import * as React from "react";
import Image from "next/image";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GalleryImage } from "@/lib/gallery/types";

const navButton = cn(
  "rounded-full bg-background/70 p-2 text-foreground shadow-sm backdrop-blur transition-ui",
  "hover:bg-background disabled:pointer-events-none disabled:opacity-30",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
);

export function Lightbox({
  images,
  index,
  onIndexChange,
}: {
  images: GalleryImage[];
  index: number | null;
  onIndexChange: (index: number | null) => void;
}) {
  const touchStartX = React.useRef<number | null>(null);
  const open = index !== null && index >= 0 && index < images.length;
  const image = open ? images[index] : null;

  const step = React.useCallback(
    (delta: number) => {
      if (index === null) return;
      const next = index + delta;
      if (next >= 0 && next < images.length) onIndexChange(next);
    },
    [index, images.length, onIndexChange],
  );

  if (!image) return null;

  const date = new Date(image.createdAt).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const meta = [image.location, image.photographer && `Photo: ${image.photographer}`, date]
    .filter(Boolean)
    .join(" · ");

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => !o && onIndexChange(null)}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="overlay-anim fixed inset-0 z-50 bg-background/90 backdrop-blur-md" />
        <DialogPrimitive.Content
          className="fixed inset-0 z-50 flex flex-col outline-none"
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") step(-1);
            if (e.key === "ArrowRight") step(1);
          }}
          onTouchStart={(e) => {
            touchStartX.current = e.touches[0].clientX;
          }}
          onTouchEnd={(e) => {
            if (touchStartX.current === null) return;
            const dx = e.changedTouches[0].clientX - touchStartX.current;
            touchStartX.current = null;
            if (Math.abs(dx) > 48) step(dx < 0 ? 1 : -1);
          }}
        >
          <DialogPrimitive.Title className="sr-only">
            {image.caption || "Gallery image"}
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            Image {index! + 1} of {images.length}. Use the arrow keys to navigate, Escape to close.
          </DialogPrimitive.Description>

          <div className="flex items-center justify-between p-4">
            <span className="text-sm tabular-nums text-muted-foreground">
              {index! + 1} / {images.length}
            </span>
            <DialogPrimitive.Close aria-label="Close" className={navButton}>
              <X className="size-5" />
            </DialogPrimitive.Close>
          </div>

          <div className="relative flex min-h-0 flex-1 items-center justify-center px-4 md:px-16">
            <button
              type="button"
              onClick={() => step(-1)}
              disabled={index === 0}
              aria-label="Previous image"
              className={cn(navButton, "absolute left-2 z-10 hidden md:inline-flex md:left-4")}
            >
              <ChevronLeft className="size-5" />
            </button>
            <Image
              key={image.id}
              src={image.imageUrl}
              alt={image.caption || ""}
              width={image.width}
              height={image.height}
              sizes="100vw"
              quality={90}
              priority
              draggable={false}
              onContextMenu={(e) => e.preventDefault()}
              className="max-h-full w-auto max-w-full select-none rounded-img object-contain"
            />
            <button
              type="button"
              onClick={() => step(1)}
              disabled={index === images.length - 1}
              aria-label="Next image"
              className={cn(navButton, "absolute right-2 z-10 hidden md:inline-flex md:right-4")}
            >
              <ChevronRight className="size-5" />
            </button>
          </div>

          <div className="mx-auto w-full max-w-2xl px-6 pb-6 pt-4 text-center">
            {image.caption && <p className="text-sm font-medium">{image.caption}</p>}
            {image.description && (
              <p className="mt-1 text-sm text-muted-foreground">{image.description}</p>
            )}
            {meta && <p className="mt-1 text-xs text-muted-foreground">{meta}</p>}
          </div>

          {/* Preload the neighbours so arrow/swipe navigation is instant. */}
          <div className="sr-only" aria-hidden>
            {[images[index! - 1], images[index! + 1]].filter(Boolean).map((n) => (
              <Image
                key={n!.id}
                src={n!.imageUrl}
                alt=""
                width={n!.width}
                height={n!.height}
                sizes="100vw"
                quality={90}
              />
            ))}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
