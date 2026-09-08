"use client";

import * as React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Movie artwork with a graceful fallback. Renders a tasteful title tile when
 * the source is missing or fails to load — never a broken-image icon.
 * Parent must be positioned (relative) and sized: this fills it.
 */
export function Poster({
  src,
  alt,
  sizes,
  className,
  priority,
}: {
  src: string | null | undefined;
  alt: string;
  sizes?: string;
  className?: string;
  priority?: boolean;
}) {
  const [failed, setFailed] = React.useState(false);

  if (!src || failed) {
    return (
      <div
        className={cn(
          "flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-background p-4 text-center",
          className,
        )}
        aria-hidden
      >
        <span className="line-clamp-4 font-display text-sm font-semibold text-muted-foreground">
          {alt}
        </span>
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes ?? "(max-width: 640px) 45vw, 220px"}
      className={cn("object-cover", className)}
      onError={() => setFailed(true)}
      priority={priority}
    />
  );
}
