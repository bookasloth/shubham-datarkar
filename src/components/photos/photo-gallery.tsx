"use client";

import * as React from "react";
import { LayoutGrid, Columns3 } from "lucide-react";
import type { Photo } from "@/lib/photos/types";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Stagger, StaggerItem } from "@/components/motion/reveal";
import { PhotoCard } from "@/components/photos/photo-card";
import { PhotoSkeletonGrid } from "@/components/photos/photo-skeleton";
import { PhotoLightbox } from "@/components/photos/photo-lightbox";
import { computeHasMore, nextOffset } from "@/lib/photos/gallery";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 12;
const LAYOUT_KEY = "gallery-layout";

type Layout = "grid" | "masonry";

function isLayout(v: string | null): v is Layout {
  return v === "grid" || v === "masonry";
}

export function PhotoGallery({
  initialPhotos,
  initialHasMore,
  tags,
}: {
  initialPhotos: Photo[];
  initialHasMore: boolean;
  tags: string[];
}) {
  const [layout, setLayout] = React.useState<Layout>("grid");
  const [activeTag, setActiveTag] = React.useState<string | null>(null);
  const [photos, setPhotos] = React.useState<Photo[]>(initialPhotos);
  const [hasMore, setHasMore] = React.useState(initialHasMore);
  const [loading, setLoading] = React.useState(false);
  const [openIndex, setOpenIndex] = React.useState<number | null>(null);

  const sentinelRef = React.useRef<HTMLDivElement | null>(null);
  // Guards the observer from firing overlapping fetches for the same page.
  const loadingRef = React.useRef(false);

  // Restore persisted layout after mount (localStorage is client-only).
  React.useEffect(() => {
    const stored = window.localStorage.getItem(LAYOUT_KEY);
    if (isLayout(stored)) setLayout(stored);
  }, []);

  const onLayoutChange = React.useCallback((value: string) => {
    if (!isLayout(value)) return; // ToggleGroup emits "" when de-selecting; ignore.
    setLayout(value);
    window.localStorage.setItem(LAYOUT_KEY, value);
  }, []);

  // Fetch a page from the API. When `reset`, replaces the list (tag change);
  // otherwise appends (infinite scroll).
  const fetchPage = React.useCallback(
    async (opts: { tag: string | null; reset: boolean; offset: number }) => {
      if (loadingRef.current) return;
      loadingRef.current = true;
      setLoading(true);
      try {
        const params = new URLSearchParams({
          offset: String(opts.offset),
          limit: String(PAGE_SIZE),
        });
        if (opts.tag) params.set("tag", opts.tag);

        const res = await fetch(`/api/photos?${params.toString()}`);
        if (!res.ok) throw new Error(`photos fetch failed: ${res.status}`);
        const data = (await res.json()) as { photos: Photo[]; hasMore: boolean };

        setPhotos((prev) => (opts.reset ? data.photos : [...prev, ...data.photos]));
        setHasMore(
          typeof data.hasMore === "boolean"
            ? data.hasMore
            : computeHasMore(data.photos.length, data.photos.length, PAGE_SIZE),
        );
      } catch {
        // Fail soft: stop paginating rather than throwing in the UI.
        setHasMore(false);
      } finally {
        setLoading(false);
        loadingRef.current = false;
      }
    },
    [],
  );

  const onTagClick = React.useCallback(
    (tag: string | null) => {
      if (tag === activeTag) return;
      setActiveTag(tag);
      setPhotos([]);
      setHasMore(true);
      void fetchPage({ tag, reset: true, offset: 0 });
    },
    [activeTag, fetchPage],
  );

  // Infinite scroll: observe the sentinel; load the next page when it enters.
  React.useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !loadingRef.current) {
          void fetchPage({ tag: activeTag, reset: false, offset: nextOffset(photos.length) });
        }
      },
      { rootMargin: "400px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, activeTag, photos.length, fetchPage]);

  const showInitialSkeletons = loading && photos.length === 0;

  return (
    <div>
      {/* Toolbar: tag filter + layout switch */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        {tags.length > 0 ? (
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by tag">
            <TagPill active={activeTag === null} onClick={() => onTagClick(null)}>
              All
            </TagPill>
            {tags.map((tag) => (
              <TagPill key={tag} active={activeTag === tag} onClick={() => onTagClick(tag)}>
                {tag}
              </TagPill>
            ))}
          </div>
        ) : (
          <div />
        )}

        <ToggleGroup
          type="single"
          value={layout}
          onValueChange={onLayoutChange}
          aria-label="Gallery layout"
        >
          <ToggleGroupItem value="grid" aria-label="Grid layout">
            <LayoutGrid />
          </ToggleGroupItem>
          <ToggleGroupItem value="masonry" aria-label="Masonry layout">
            <Columns3 />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Photo container: CSS grid or CSS columns (masonry) */}
      {photos.length > 0 && (
        <Stagger
          key={`${layout}-${activeTag ?? "all"}`}
          className={cn(
            layout === "grid"
              ? "grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4"
              : "columns-1 gap-4 sm:columns-2 lg:columns-3",
          )}
        >
          {photos.map((photo, index) => (
            <StaggerItem key={photo.id}>
              <PhotoCard photo={photo} index={index} onOpen={setOpenIndex} />
            </StaggerItem>
          ))}
        </Stagger>
      )}

      {/* Loading skeletons */}
      {(showInitialSkeletons || (loading && photos.length > 0)) && (
        <div
          className={cn(
            "mt-4",
            layout === "grid"
              ? "grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4"
              : "columns-1 gap-4 sm:columns-2 lg:columns-3",
          )}
        >
          <PhotoSkeletonGrid count={showInitialSkeletons ? PAGE_SIZE : 3} />
        </div>
      )}

      {/* Empty state */}
      {!loading && photos.length === 0 && (
        <p className="py-16 text-center text-muted-foreground">
          No photos here yet{activeTag ? ` for "${activeTag}"` : ""}.
        </p>
      )}

      {/* Infinite-scroll sentinel */}
      {hasMore && <div ref={sentinelRef} aria-hidden className="h-px w-full" />}

      {/* Task 4 seam: lightbox reads openIndex + the full photo list. */}
      <PhotoLightbox
        photos={photos}
        openIndex={openIndex}
        onOpenChange={(open) => {
          if (!open) setOpenIndex(null);
        }}
      />
    </div>
  );
}

/**
 * A filter pill. Selected state uses the brand color (the one sanctioned
 * decorative-adjacent use: an active interaction state), everything else stays
 * monochrome.
 */
function TagPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-input border px-3 py-1.5 text-sm font-medium transition-ui",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        active
          ? "border-brand bg-brand text-brand-foreground"
          : "border-border bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
