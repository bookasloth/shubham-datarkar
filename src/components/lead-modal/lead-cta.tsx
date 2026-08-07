"use client";

import * as React from "react";
import type { VariantProps } from "class-variance-authority";
import { CalendarCheck } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { OPEN_LEAD_EVENT } from "./lead-modal";

type ButtonVariants = VariantProps<typeof buttonVariants>;

function openLead() {
  window.dispatchEvent(new Event(OPEN_LEAD_EVENT));
}

/** Any CTA on the page that should open the consultation modal. */
export function LeadCtaButton({
  children,
  variant,
  size = "lg",
  className,
  icon = true,
}: {
  children: React.ReactNode;
  variant?: ButtonVariants["variant"];
  size?: ButtonVariants["size"];
  className?: string;
  icon?: boolean;
}) {
  return (
    <button type="button" onClick={openLead} className={cn(buttonVariants({ variant, size }), className)}>
      {icon && <CalendarCheck />}
      {children}
    </button>
  );
}

/**
 * Persistent CTA so the visitor never has to hunt for the booking action:
 * a full-width bar on mobile, a floating pill on desktop. Both open the modal.
 */
export function StickyLeadCta({ label = "Book Free Consultation" }: { label?: string }) {
  return (
    <>
      {/* Mobile: fixed bottom bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 p-3 backdrop-blur lg:hidden">
        <button
          type="button"
          onClick={openLead}
          className={cn(buttonVariants({ size: "lg" }), "w-full")}
        >
          <CalendarCheck />
          {label}
        </button>
      </div>

      {/* Desktop: floating pill, bottom-right */}
      <button
        type="button"
        onClick={openLead}
        className={cn(
          buttonVariants({ size: "lg" }),
          "fixed bottom-6 right-6 z-40 hidden rounded-full shadow-lg lg:inline-flex",
        )}
      >
        <CalendarCheck />
        {label}
      </button>
    </>
  );
}
