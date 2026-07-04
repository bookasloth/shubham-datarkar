"use client";

import type { Photo } from "@/lib/photos/types";

/**
 * Seam for Task 4. The gallery already tracks `openIndex` and renders this
 * component with the full photo list; Task 4 fills in the modal, likes, and
 * confetti. For now it renders nothing so the browse layer compiles and the
 * prop contract is frozen.
 */
export function PhotoLightbox(_props: {
  photos: Photo[];
  openIndex: number | null;
  onOpenChange: (open: boolean) => void;
}) {
  // Task 4: implement lightbox
  return null;
}
