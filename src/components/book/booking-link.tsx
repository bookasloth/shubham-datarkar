"use client";

import * as React from "react";
import { BrandIcon } from "@/components/ui/brand-icon";
import { readFirstTouch } from "@/components/analytics/attribution-probe";
import { bookingQuery } from "@/lib/attribution";
import { trackViewContent, trackInitiateCheckout } from "@/lib/analytics/track-lead";
import { site } from "@/lib/site";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * The real "book a call" action: an anchor to the external scheduler
 * (bookasloth.com) that (1) marks the consultation page as viewed, (2) fires
 * InitiateCheckout when the calendar is opened, and (3) carries the visitor's
 * attribution + fbclid across to the scheduler as query params — the only way a
 * different-origin calendar can know the booking came from a Reel.
 *
 * The href is rebuilt from localStorage at click time (not render) so SSR output
 * stays static and the params reflect the real first touch.
 */
export function BookingLink({
  source = "book-page",
  children,
  className,
  size = "lg",
}: {
  source?: string;
  children?: React.ReactNode;
  className?: string;
  size?: "sm" | "default" | "lg";
}) {
  // Consultation page viewed — fires once when the booking surface mounts.
  React.useEffect(() => {
    trackViewContent(`consultation:${source}`);
  }, [source]);

  function onClick(e: React.MouseEvent<HTMLAnchorElement>) {
    trackInitiateCheckout(source);
    try {
      const params = new URLSearchParams(bookingQuery(readFirstTouch()));
      const qs = params.toString();
      if (qs) e.currentTarget.href = `${site.bookingUrl}?${qs}`;
    } catch {
      // Fall back to the plain booking URL already on the anchor.
    }
  }

  return (
    <a
      href={site.bookingUrl}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onClick}
      className={cn(buttonVariants({ size }), className)}
    >
      <BrandIcon name="CalendarCheck" />
      {children ?? "Open the calendar"}
    </a>
  );
}
