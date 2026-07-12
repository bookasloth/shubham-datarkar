import Image from "next/image";
import type { ReactNode } from "react";
import type { AdSlot } from "@/lib/community/types";

// House creatives — designed defaults shown when no image_path is set in admin.
// A DB link_url still overrides the href, so the affiliate/tracking link can be
// swapped from /admin/community without a code change. Layout renders slot 1
// then slot 2, so slot 1 = Hostinger (sponsored, top), slot 2 = Book A Sloth.
// Logos are the brands' real favicons (public/ads/*.png), stripped to transparent.
// ponytail: two fixed advertisers, so hardcoded. Move to DB-driven templates
// only if a third creative ever needs the same styling.
const HOSTINGER_PURPLE = "#673DE6";

const HOUSE: Record<1 | 2, { href: string; sponsored: boolean; node: ReactNode }> = {
  // Slot 1 — Hostinger (affiliate). Neutral card, brand-purple accents.
  1: {
    href: "https://www.hostinger.com/in/pricing?REFERRALCODE=SND1995",
    sponsored: true,
    node: (
      <div className="rounded-card border border-border bg-card p-5 font-display">
        <p
          className="text-[10px] font-semibold uppercase tracking-wider"
          style={{ color: HOSTINGER_PURPLE }}
        >
          Recommended
        </p>
        <div className="mt-3 flex items-center gap-3">
          <Image src="/ads/hostinger.png" alt="Hostinger" width={40} height={40} className="shrink-0" />
          <span className="text-xl font-bold leading-none">Hostinger</span>
        </div>
        <p className="mt-3 text-sm leading-snug text-muted-foreground">
          Fast, reliable web hosting for your next big idea.
        </p>
        <span
          className="mt-4 inline-flex items-center gap-2 rounded-btn border px-3 py-1.5 text-sm font-semibold"
          style={{ color: HOSTINGER_PURPLE, borderColor: HOSTINGER_PURPLE }}
        >
          Get hosting
          <span aria-hidden>→</span>
        </span>
      </div>
    ),
  },
  // Slot 2 — Book A Sloth (own property). Monochrome card, brand-orange accents.
  2: {
    href: "https://bookasloth.com/enterprises",
    sponsored: false,
    node: (
      <div className="rounded-card border border-border bg-card p-5 font-display">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-brand">Partner</p>
        <div className="mt-3 flex items-center gap-3">
          <Image
            src="https://company-assets.bookasloth.in/images/sd/partner/logo/book-a-sloth.png"
            alt="Book A Sloth"
            width={40}
            height={40}
            className="shrink-0"
          />
          <span className="text-xl font-bold leading-none">Book A Sloth</span>
        </div>
        <p className="mt-3 text-sm leading-snug text-muted-foreground">
          Scheduling and bookings, made simple.
        </p>
        <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold">
          bookasloth.com
          <span aria-hidden className="text-brand">
            →
          </span>
        </span>
      </div>
    ),
  },
};

function AdLink({
  href,
  sponsored,
  children,
}: {
  href: string;
  sponsored: boolean;
  children: ReactNode;
}) {
  // Affiliate/sponsor links carry rel="sponsored"; own properties don't.
  const rel = sponsored ? "noopener sponsored" : "noopener";
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
      <AdLink href={href} sponsored={house?.sponsored ?? false}>
        {img}
      </AdLink>
    ) : (
      img
    );
  }

  // 2. Designed house creative.
  if (house) {
    return (
      <AdLink href={ad.linkUrl ?? house.href} sponsored={house.sponsored}>
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
