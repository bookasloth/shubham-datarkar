// Fire a "Lead" conversion to Meta Pixel (fbq) and GA4 (gtag) at the moment an
// email is captured. Both globals are injected by the analytics components in
// the root layout and may be absent (blocked, still loading) — optional-chained
// so this never throws. `source` tags which surface produced the lead.
export function trackLead(source: string) {
  if (typeof window === "undefined") return;
  window.fbq?.("track", "Lead", { content_name: source });
  window.gtag?.("event", "generate_lead", { source });
}
