import type { MetadataRoute } from "next";
import { site } from "@/lib/site";
import { ROBOTS_DISALLOW_PREFIXES } from "@/lib/seo/routes";

export default function robots(): MetadataRoute.Robots {
  // Only the server-private subtrees are disallowed. Other app routes
  // (/members/account, /community/compose, ...) stay crawlable so Googlebot can read
  // the `noindex` each of them serves — a disallowed URL is never fetched, so
  // its noindex is never seen, and it can still be indexed URL-only.
  const disallow = [...ROBOTS_DISALLOW_PREFIXES];
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow },
      // AI crawlers are welcome on content, kept off private/app routes.
      { userAgent: ["GPTBot", "ClaudeBot", "PerplexityBot", "Google-Extended"], allow: "/", disallow },
    ],
    sitemap: `${site.url}/sitemap.xml`,
    host: site.url,
  };
}
