import type { MetadataRoute } from "next";
import { site } from "@/lib/site";
import { getPublishedPosts } from "@/lib/blog/queries";
import { discoverPages } from "@/lib/seo/discovery";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = site.url;
  const now = new Date();
  const posts = await getPublishedPosts();
  const pages = await discoverPages(posts);

  const postDateMap = new Map(posts.map((p) => [`/blog/${p.category}/${p.slug}`, new Date(p.date)]));

  const HIGH_PRIORITY_PREFIXES = ["/blog", "/services", "/case-studies"];
  const WEEKLY_PATHS = new Set(["/", "/blog"]);

  return pages
    .filter((p) => !p.isPrivate && !p.route.includes("["))
    .map((p) => ({
      url: `${base}${p.route === "/" ? "" : p.route}`,
      lastModified: postDateMap.get(p.route) ?? now,
      changeFrequency: (WEEKLY_PATHS.has(p.route) ? "weekly" : "monthly") as MetadataRoute.Sitemap[number]["changeFrequency"],
      priority: p.route === "/"
        ? 1
        : HIGH_PRIORITY_PREFIXES.some((prefix) => p.route.startsWith(prefix))
          ? 0.8
          : 0.7,
    }));
}
