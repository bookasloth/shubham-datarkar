// Client-side funnel events → Meta Pixel (fbq) + GA4 (gtag). Both globals are
// injected by the analytics components in the root layout and may be absent
// (blocked, still loading) — optional-chained so this never throws.
//
// Every Meta event carries an `eventID`. When the same conversion is ALSO sent
// server-side via the Conversions API with the same id, Meta deduplicates the
// pair instead of double-counting. Callers that mirror an event to CAPI (Lead,
// Schedule) use the returned id; fire-and-forget callers can ignore it.

/** A dedup id shared between the browser Pixel event and its CAPI twin. */
export function newEventId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `e-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

/** Lead captured (email handed over). `source` tags which surface produced it. */
export function trackLead(source: string, eventId = newEventId()): string {
  if (typeof window === "undefined") return eventId;
  window.fbq?.("track", "Lead", { content_name: source }, { eventID: eventId });
  window.gtag?.("event", "generate_lead", { source });
  return eventId;
}

/** Consultation page / offer viewed. */
export function trackViewContent(contentName: string): void {
  if (typeof window === "undefined") return;
  window.fbq?.("track", "ViewContent", { content_name: contentName });
  window.gtag?.("event", "view_content", { content_name: contentName });
}

/** A booking CTA was clicked (intent, not yet a lead). */
export function trackCtaClick(source: string): void {
  if (typeof window === "undefined") return;
  window.fbq?.("trackCustom", "ConsultCTAClick", { content_name: source });
  window.gtag?.("event", "cta_click", { source });
}

/** The external calendar was opened — top of the booking step. */
export function trackInitiateCheckout(source: string): void {
  if (typeof window === "undefined") return;
  window.fbq?.("track", "InitiateCheckout", { content_name: source });
  window.gtag?.("event", "begin_checkout", { source });
}

/** A consultation was booked — the conversion. Usually fired server-side via
 *  CAPI from the booking webhook; this is the browser twin for same-tab bookings. */
export function trackSchedule(source: string, eventId = newEventId()): string {
  if (typeof window === "undefined") return eventId;
  window.fbq?.("track", "Schedule", { content_name: source }, { eventID: eventId });
  window.gtag?.("event", "schedule", { source });
  return eventId;
}
