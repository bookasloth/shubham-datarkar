/**
 * First-touch attribution. Pure functions only — no `window`, no I/O, no
 * `server-only`. Imported by the client probe and by the contact server action,
 * so it must stay safe on both sides of the boundary.
 */

export type FirstTouch = {
  landingPage: string;
  referrer: string | null;
  aiSource: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  utmTerm: string | null;
  // Paid-click IDs. fbclid is what lets Meta match a booking back to the exact
  // Instagram Reel ad; without it, paid attribution is guesswork.
  fbclid: string | null;
  gclid: string | null;
  pagesSeen: number;
};

/**
 * AI answer engines. They are invisible in normal referrer reports because most
 * strip or proxy the referrer, so an explicit host map is the only way to see
 * GEO/AEO traffic.
 */
export const AI_HOSTS: Record<string, string> = {
  "chat.openai.com": "ChatGPT",
  "chatgpt.com": "ChatGPT",
  "perplexity.ai": "Perplexity",
  "www.perplexity.ai": "Perplexity",
  "gemini.google.com": "Gemini",
  "copilot.microsoft.com": "Copilot",
  "www.bing.com": "Bing Copilot",
  "claude.ai": "Claude",
};

export function aiSourceFor(referrer: string): string | null {
  if (!referrer) return null;
  try {
    return AI_HOSTS[new URL(referrer).hostname] ?? null;
  } catch {
    return null;
  }
}

export function parseFirstTouch(href: string, referrer: string): FirstTouch {
  const url = new URL(href);
  const q = url.searchParams;
  return {
    landingPage: url.pathname,
    referrer: referrer || null,
    aiSource: aiSourceFor(referrer),
    utmSource: q.get("utm_source"),
    utmMedium: q.get("utm_medium"),
    utmCampaign: q.get("utm_campaign"),
    utmContent: q.get("utm_content"),
    utmTerm: q.get("utm_term"),
    fbclid: q.get("fbclid"),
    gclid: q.get("gclid"),
    pagesSeen: 1,
  };
}

const clamp = (v: string | null, max: number) => (v ? String(v).slice(0, max) : null);

/**
 * Maps a client-supplied FirstTouch onto `contacts` columns. This is a trust
 * boundary: the payload arrives from localStorage, which the user controls.
 * Every field is length-clamped and pagesSeen is range-checked.
 */
export function toAttributionRow(a: FirstTouch | null | undefined): Record<string, string | number | null> {
  if (!a) return {};
  const pages = Number(a.pagesSeen);
  return {
    first_landing_page: clamp(a.landingPage, 300),
    referrer: clamp(a.referrer, 500),
    ai_source: clamp(a.aiSource, 60),
    utm_source: clamp(a.utmSource, 120),
    utm_medium: clamp(a.utmMedium, 120),
    utm_campaign: clamp(a.utmCampaign, 120),
    utm_content: clamp(a.utmContent, 120),
    utm_term: clamp(a.utmTerm, 120),
    fbclid: clamp(a.fbclid, 255),
    gclid: clamp(a.gclid, 255),
    pages_seen: Number.isFinite(pages) ? Math.max(1, Math.min(9999, Math.trunc(pages))) : null,
  };
}

/**
 * Query params to carry onto the external booking URL (bookasloth.com), so the
 * scheduler — a different origin that can't read our localStorage — knows the
 * booking came from a Reel. The booking webhook reads these back. Only non-empty
 * values are included to keep the URL clean.
 */
export function bookingQuery(a: FirstTouch | null | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!a) return out;
  const add = (k: string, v: string | null) => {
    if (v) out[k] = String(v).slice(0, 255);
  };
  add("utm_source", a.utmSource);
  add("utm_medium", a.utmMedium);
  add("utm_campaign", a.utmCampaign);
  add("utm_content", a.utmContent);
  add("utm_term", a.utmTerm);
  add("fbclid", a.fbclid);
  add("gclid", a.gclid);
  add("sd_landing", a.landingPage);
  return out;
}
