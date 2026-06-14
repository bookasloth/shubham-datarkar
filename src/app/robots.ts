import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  const privatePaths = ["/dashboard", "/profile", "/settings", "/login", "/success", "/search"];
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: privatePaths },
      // AI crawlers are welcome on content, kept off private/app routes.
      { userAgent: ["GPTBot", "ClaudeBot", "PerplexityBot", "Google-Extended"], allow: "/", disallow: privatePaths },
    ],
    sitemap: `${site.url}/sitemap.xml`,
    host: site.url,
  };
}
