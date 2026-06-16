"use client";

import {
  CalendarCheck,
  Download,
  Envelope,
  Gear,
  House,
  MagnifyingGlass,
  Microphone,
  type Icon as PhosphorIcon,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

/**
 * Brand-button icon. Renders a linear (regular-weight) Phosphor glyph by
 * default and cross-fades to the solid (fill) glyph tinted #ff4800 when the
 * enclosing brand button is hovered. Relies on the button carrying the
 * `group/btn` class (see buttonVariants). Names mirror the lucide icons they
 * replace at the call sites, so swaps stay one-for-one.
 *
 * Excludes arrows, Spotify, and external-link glyphs by design — those keep
 * their lucide originals.
 */
const registry = {
  CalendarCheck,
  Download,
  Mail: Envelope,
  Mic: Microphone,
  Search: MagnifyingGlass,
  Home: House,
  Settings: Gear,
} satisfies Record<string, PhosphorIcon>;

export type BrandIconName = keyof typeof registry;

export function BrandIcon({
  name,
  className,
}: {
  name: BrandIconName;
  className?: string;
}) {
  const Glyph = registry[name];
  return (
    <span className={cn("relative inline-flex shrink-0", className)} aria-hidden>
      <Glyph
        weight="regular"
        className="transition-opacity duration-150 group-hover/btn:opacity-0"
      />
      <Glyph
        weight="fill"
        className="absolute inset-0 text-[#ff4800] opacity-0 transition-opacity duration-150 group-hover/btn:opacity-100"
      />
    </span>
  );
}
