import "server-only";
import { safeFetchHtml } from "@/lib/tools/safe-fetch";

export type Unfurled = { title?: string; desc?: string; image?: string };

const TITLE_MAX = 140;
const DESC_MAX = 200;

/** First matching capture of any of the patterns, trimmed and length-capped. */
function pick(html: string, patterns: RegExp[], max: number): string | undefined {
  for (const re of patterns) {
    const m = html.match(re);
    const v = m?.[1]?.trim();
    if (v) return decode(v).slice(0, max);
  }
  return undefined;
}

// Minimal entity decode — enough for the handful that show up in og tags.
function decode(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'");
}

/**
 * Fetch a link's OpenGraph card via the SSRF-safe fetcher already written for
 * the SEO audit (#297) — same private-IP / redirect / size / time guards. Pure
 * regex extraction, no DOM: jsdom crashes on Vercel [[jsdom-breaks-vercel-use-linkedom]],
 * and og tags are simple enough that a parser is overkill.
 *
 * Best-effort: any failure returns {} so a dead or hostile URL never blocks the
 * post — the link still renders as a bare link.
 */
export async function unfurl(url: string): Promise<Unfurled> {
  try {
    const { html } = await safeFetchHtml(url);
    const title =
      pick(
        html,
        [
          /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i,
          /<meta[^>]+name=["']twitter:title["'][^>]+content=["']([^"']+)["']/i,
          /<title[^>]*>([^<]+)<\/title>/i,
        ],
        TITLE_MAX,
      ) ?? undefined;
    const desc = pick(
      html,
      [
        /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i,
        /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i,
      ],
      DESC_MAX,
    );
    const image = pick(
      html,
      [/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i],
      500,
    );
    // Only keep an https image — an http one would break the card's mixed-content
    // and next/image needs an allowed host anyway (rendered as a plain <img>).
    const safeImage = image && /^https:\/\//i.test(image) ? image : undefined;
    return { title, desc, image: safeImage };
  } catch {
    return {};
  }
}
