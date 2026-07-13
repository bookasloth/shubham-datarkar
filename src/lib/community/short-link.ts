import "server-only";
import { supabaseAnon } from "@/lib/supabase/server";

// Display host for shortened links. Swap to "datarkar.com" once that domain is
// bought and pointed at this Vercel project — the resolver href stays relative
// (/s/{slug}), so this constant is the only thing that changes.
export const SHORT_HOST = "shubhamdatarkar.com";

/**
 * Map each http(s) URL to its short slug, minting codes on first sight.
 * Best-effort: on any RPC error returns an empty map and callers fall back to
 * the raw href, so a shortener hiccup never blanks a post.
 *
 * ponytail: one RPC per PostCard that has links (cards render in parallel under
 * RSC, so the calls overlap). Batch across the whole feed only if it lags.
 */
export async function ensureShortLinks(urls: string[]): Promise<Map<string, string>> {
  const uniq = [...new Set(urls)];
  if (uniq.length === 0) return new Map();
  const { data, error } = await supabaseAnon().rpc("ensure_short_links", { p_urls: uniq });
  if (error) {
    console.warn("ensure_short_links failed:", error.message);
    return new Map();
  }
  const out = new Map<string, string>();
  for (const row of (data ?? []) as { url: string; slug: string }[]) out.set(row.url, row.slug);
  return out;
}
