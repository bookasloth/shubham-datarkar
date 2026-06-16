/**
 * Affiliate-link detection for blog/article content. A link whose host is (or
 * is a subdomain of) an allowlisted domain is treated as affiliate: "Sponsored"
 * tooltip + rel="sponsored". The allowlist is managed in /admin/affiliate
 * (Supabase); these defaults are the seed + the fallback when the table can't
 * be read.
 */
export const DEFAULT_AFFILIATE_DOMAINS: string[] = ["amzn.to", "amazon.in", "amazon.com"];

/** Reduce arbitrary user input to a bare hostname, or null if unusable. */
export function normalizeDomain(input: string): string | null {
  const raw = input.trim().toLowerCase();
  if (!raw) return null;
  try {
    const host = new URL(raw.includes("://") ? raw : `https://${raw}`).hostname.replace(/^www\./, "");
    return host || null;
  } catch {
    return null;
  }
}

/** True when href points at an allowlisted affiliate domain. */
export function isAffiliateUrl(href: string, domains: string[] = DEFAULT_AFFILIATE_DOMAINS): boolean {
  try {
    const host = new URL(href, "https://shubhamdatarkar.com").hostname.replace(/^www\./, "");
    return domains.some((d) => host === d || host.endsWith(`.${d}`));
  } catch {
    return false;
  }
}
