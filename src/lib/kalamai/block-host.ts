/**
 * SSRF guard for the crawler: reject hosts that point at the machine itself, a
 * private network, or the cloud metadata endpoint. Applied to every crawled URL
 * and to each redirect hop.
 *
 * ponytail: literal + name checks, no DNS resolution — so a determined
 * DNS-rebinding attacker isn't stopped, but the realistic vector ("a SERP result
 * 302s to http://169.254.169.254/…") is. Add resolve-then-check if this ever
 * faces attacker-chosen hostnames directly.
 */
export function isBlockedHost(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, ""); // strip IPv6 brackets

  if (h === "localhost" || h.endsWith(".local") || h.endsWith(".internal")) return true;

  if (h.includes(":")) {
    // IPv6 literal: loopback (::1), link-local (fe80::/10), unique-local (fc00::/7).
    if (h === "::1" || h.startsWith("fe80:") || h.startsWith("fc") || h.startsWith("fd")) return true;
    // fall through: mapped ::ffff:a.b.c.d is caught by the IPv4 tail match below
  }

  const v4 = h.match(/(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const a = Number(v4[1]);
    const b = Number(v4[2]);
    if (a === 0 || a === 127 || a === 10) return true; // this-host, loopback, private
    if (a === 169 && b === 254) return true; // link-local incl. 169.254.169.254 metadata
    if (a === 192 && b === 168) return true; // private
    if (a === 172 && b >= 16 && b <= 31) return true; // private
  }

  return false;
}
