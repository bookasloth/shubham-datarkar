import { headers } from "next/headers";

/** Cache tag; the Re-run Audit action revalidates it. */
export const SEO_AUDIT_TAG = "seo-audit";

const TIMEOUT_MS = 10_000;
const REVALIDATE_SECONDS = 3600;

/**
 * Origin of the running app, from request headers. The audit page is
 * `force-dynamic`, so headers are available. Development therefore hits
 * localhost and production hits the deployed host, with no environment
 * variable to drift out of sync.
 */
export async function getOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/**
 * Rendered HTML for a route, or `null` if it could not be retrieved. Never
 * throws: a null result means "unknown", which the audit surfaces as
 * "Could not fetch" rather than scoring the page zero.
 */
export async function getRenderedHtml(origin: string, route: string): Promise<string | null> {
  try {
    const res = await fetch(`${origin}${route}`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      next: { revalidate: REVALIDATE_SECONDS, tags: [SEO_AUDIT_TAG] },
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

/**
 * Runs `fn` over `items` with at most `limit` in flight, preserving order.
 * A 60-way self-fetch fan-out against a single dev server wedges it.
 */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;

  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await fn(items[index]);
    }
  });

  await Promise.all(workers);
  return results;
}
