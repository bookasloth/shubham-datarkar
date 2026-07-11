/**
 * Fixed-window rate limiter for the public write endpoints (support orders,
 * newsletter signup, blog reactions, contact form) to blunt scripted floods.
 *
 * Durable when a KV/Redis REST store is configured — Vercel KV or Upstash, both
 * the same Upstash REST protocol — so the window spans every serverless instance
 * and survives cold starts. Falls back to a per-instance in-memory Map when no
 * store is set, and fails OPEN to that Map on any KV error (a rate limiter must
 * never take the site down when its backing store blips).
 *
 * async because the durable store is a network call; every caller awaits.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

// Vercel KV exposes KV_REST_API_*; Upstash native exposes UPSTASH_REDIS_REST_*.
// Either works — same REST endpoint + Bearer-token auth.
const KV_URL = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
const kvEnabled = Boolean(KV_URL && KV_TOKEN);

// Atomic fixed window in one round-trip: INCR the counter, and set the TTL only
// on the first hit (count === 1) so later hits don't slide the window. Returns
// the post-increment count.
const WINDOW_SCRIPT =
  "local c = redis.call('INCR', KEYS[1]) " +
  "if c == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end " +
  "return c";

/** In-memory fixed window. Deterministic (honours `now`) — fallback + tests. */
function allowInMemory(key: string, limit: number, windowMs: number, now: number): boolean {
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

/** Durable fixed window via KV/Upstash REST EVAL. Throws on any transport/protocol error. */
async function allowKv(key: string, limit: number, windowMs: number): Promise<boolean> {
  const res = await fetch(KV_URL!, {
    method: "POST",
    headers: { Authorization: `Bearer ${KV_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(["EVAL", WINDOW_SCRIPT, "1", `rl:${key}`, String(windowMs)]),
    signal: AbortSignal.timeout(1000), // don't let a slow store stall the request
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`KV ${res.status}`);
  const body = (await res.json()) as { result?: number; error?: string };
  if (typeof body.result !== "number") throw new Error(body.error ?? "KV bad response");
  return body.result <= limit;
}

/** True if this hit is within budget; false once `limit` is exceeded in the window. */
export async function allow(
  key: string,
  limit: number,
  windowMs: number,
  now: number = Date.now(),
): Promise<boolean> {
  if (kvEnabled) {
    try {
      return await allowKv(key, limit, windowMs);
    } catch {
      // Fail open to the in-memory limiter rather than block real traffic.
    }
  }
  return allowInMemory(key, limit, windowMs, now);
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
