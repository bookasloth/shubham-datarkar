import Image from "next/image";
import type { ReactNode } from "react";
import type { AdSlot } from "@/lib/community/types";

// House creatives — designed defaults shown when no image_path is set in admin.
// A DB link_url still overrides the href, so the affiliate/tracking link can be
// swapped from /admin/community without a code change.
// ponytail: two fixed advertisers, so hardcoded. Move to DB-driven templates
// only if a third creative ever needs the same styling.
const HOUSE: Record<1 | 2, { href: string; node: ReactNode }> = {
  // Slot 1 — Book A Sloth (own property). Monochrome house style.
  1: {
    href: "https://bookasloth.com",
    node: (
      <div className="rounded-card border border-border bg-background p-4">
        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Partner
        </p>
        <p className="mt-2 font-display text-xl font-bold leading-tight">Book A Sloth</p>
        <p className="mt-1 text-sm text-muted-foreground">Scheduling and bookings, made simple.</p>
        <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium">
          bookasloth.com
          <span aria-hidden className="text-brand">
            →
          </span>
        </span>
      </div>
    ),
  },
  // Slot 2 — Hostinger (affiliate). Our card shape, Hostinger purple.
  2: {
    href: "https://hostinger.com",
    node: (
      <div
        className="rounded-card p-4 text-white"
        // ponytail: Hostinger brand purple — intentionally off our monochrome palette.
        style={{ background: "linear-gradient(150deg, #673DE6 0%, #2F1C6A 100%)" }}
      >
        <p className="text-[10px] font-medium uppercase tracking-wider text-white/60">Sponsored</p>
        <p className="mt-2 font-display text-xl font-bold leading-tight">Hostinger</p>
        <p className="mt-1 text-sm text-white/80">Fast, affordable web hosting.</p>
        <span className="mt-3 inline-flex items-center gap-1 rounded-btn bg-white px-3 py-1.5 text-sm font-semibold text-[#673DE6]">
          Get hosting
          <span aria-hidden>→</span>
        </span>
      </div>
    ),
  },
};

function AdLink({ href, slot, children }: { href: string; slot: 1 | 2; children: ReactNode }) {
  // Slot 2 is an external sponsor (affiliate); slot 1 is our own property.
  const rel = slot === 2 ? "noopener sponsored" : "noopener";
  return (
    <a href={href} target="_blank" rel={rel} className="block transition-ui hover:opacity-90">
      {children}
    </a>
  );
}

export function AdSlotView({ ad }: { ad: AdSlot }) {
  const house = HOUSE[ad.slot];

  // 1. Admin-uploaded image wins.
  if (ad.imagePath) {
    const img = (
      <div className="relative h-40 overflow-hidden rounded-card border border-border">
        <Image src={ad.imagePath} alt="Sponsored" fill className="object-cover" />
      </div>
    );
    const href = ad.linkUrl ?? house?.href;
    return href ? (
      <AdLink href={href} slot={ad.slot}>
        {img}
      </AdLink>
    ) : (
      img
    );
  }

  // 2. Designed house creative.
  if (house) {
    return (
      <AdLink href={ad.linkUrl ?? house.href} slot={ad.slot}>
        {house.node}
      </AdLink>
    );
  }

  // 3. Empty placeholder.
  return (
    <div className="flex h-40 items-center justify-center rounded-card border border-dashed border-border text-xs text-muted-foreground">
      Ad slot {ad.slot}
    </div>
  );
}
