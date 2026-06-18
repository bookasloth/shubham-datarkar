import "server-only";

import { site } from "@/lib/site";

// Self-issued IndexNow key. Must match the file served at /<key>.txt.
// Overridable via env if rotated without a redeploy of the key file.
const KEY = process.env.INDEXNOW_KEY ?? "d01583e4aa26fd91fff45ac639e57710";

/**
 * Notify IndexNow (Bing, Yandex — Bing is the retrieval path for ChatGPT Search)
 * that URLs changed, so crawlers re-fetch within minutes instead of days.
 * Fire-and-forget: never throws. No-ops on localhost, where the key file the
 * protocol validates against is not publicly reachable.
 */
export async function pingIndexNow(urls: string[]): Promise<void> {
  if (urls.length === 0) return;
  const host = new URL(site.url).host;
  if (host.includes("localhost") || host.includes("127.0.0.1")) return;
  try {
    await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host,
        key: KEY,
        keyLocation: `${site.url}/${KEY}.txt`,
        urlList: urls,
      }),
    });
  } catch {
    // Best-effort signal; engines re-crawl on their own schedule regardless.
  }
}
