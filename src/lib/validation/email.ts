/**
 * Shared email validator. The domain side is restricted to real domain
 * characters (letters, digits, dots, hyphens ending in a TLD) so that URLs
 * like `https://youtube.com/@handle?si=…` — which contain an `@` and a `.`
 * and no whitespace — can no longer masquerade as an email address.
 *
 * The local part allows the common subset (`user+tag`, dotted locals, `_ % -`)
 * but NOT url characters like `:` or `/`, so `https://youtube.com/@user.name`
 * is rejected even though its handle tail looks domain-shaped. Intentionally
 * not RFC-complete; it exists to reject obvious junk at trust boundaries.
 */
export const EMAIL_RE = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;

/** Trim + validate. Returns true for a plausible email address. */
export function isEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim());
}
