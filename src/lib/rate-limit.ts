/**
 * Fixed-window rate limiter, shared across the public write endpoints (support
 * orders, newsletter signup, blog reactions) to blunt scripted floods.
 *
 * ponytail: per-instance in-memory counters. Catches naive bursts, but on
 * serverless it resets on cold start and doesn't span instances — so it's a
 * first layer, not a hard quota. Swap the Map for Upstash/Redis (same
 * `allow(key, limit, windowMs)` signature) if distributed abuse shows up.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/** True if this hit is within budget; false once `limit` is exceeded in the window. */
export function allow(key: string, limit: number, windowMs: number, now: number = Date.now()): boolean {
  const b = buckets.get(key);
  if (!b || now >= b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    sweep(now); // bound memory: drop expired buckets opportunistically
    return true;
  }
  if (b.count >= limit) return false;
  b.count += 1;
  return true;
}

/** Drop expired buckets so the Map can't grow without bound. */
function sweep(now: number): void {
  if (buckets.size < 5000) return; // cheap: only bother once it's actually large
  for (const [k, b] of buckets) if (now >= b.resetAt) buckets.delete(k);
}

/** Best-effort client IP from proxy headers. Accepts Headers or next/headers'
 *  ReadonlyHeaders (structural: anything with a string `get`). */
export function clientIp(headers: { get(name: string): string | null }): string {
  const xff = headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return headers.get("x-real-ip")?.trim() || "unknown";
}

/** Test-only: reset internal state between cases. */
export function _reset(): void {
  buckets.clear();
}
