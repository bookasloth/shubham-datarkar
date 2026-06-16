/**
 * Affiliate-link detection for blog/article content. Any link whose host is
 * (or is a subdomain of) a listed domain is treated as affiliate: it gets a
 * "Sponsored" tooltip and rel="sponsored". Add your partner/affiliate domains
 * here — no per-link tagging needed.
 */
export const AFFILIATE_DOMAINS: string[] = [
  "amzn.to",
  "amazon.in",
  "amazon.com",
  // add affiliate/partner domains here, e.g. "go.example.com", "ref.partner.com"
];

/** True when href points at a listed affiliate domain. */
export function isAffiliateUrl(href: string): boolean {
  try {
    const host = new URL(href, "https://shubhamdatarkar.com").hostname.replace(/^www\./, "");
    return AFFILIATE_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`));
  } catch {
    return false;
  }
}
