import type { MetadataRoute } from "next";
import { site } from "@/lib/site";
import { getPublishedPosts } from "@/lib/blog/queries";
import { getPublishedEntityDates } from "@/lib/content/queries";
import { discoverPages } from "@/lib/seo/discovery";
import { isIndexable } from "@/lib/seo/routes";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = site.url;
  const posts = await getPublishedPosts();
  const pages = await discoverPages(posts);

  // Real last-modified per route. Only set where a genuine content date exists
  // (blog posts + DB-driven entities); static pages get no lastmod rather than a
  // fake build-time stamp that would tell crawlers everything changed every deploy.
  const [serviceDates, caseStudyDates, productDates] = await Promise.all([
    getPublishedEntityDates("services"),
    getPublishedEntityDates("case_studies"),
    getPublishedEntityDates("products"),
  ]);
  const lastMod = new Map<string, Date>();
  for (const p of posts) {
    lastMod.set(`/blog/${p.category}/${p.slug}`, new Date(p.dateModified ?? p.date));
  }
  for (const d of serviceDates) lastMod.set(`/services/${d.slug}`, new Date(d.updatedAt));
  for (const d of caseStudyDates) lastMod.set(`/case-studies/${d.slug}`, new Date(d.updatedAt));
  for (const d of productDates) lastMod.set(`/products/${d.slug}`, new Date(d.updatedAt));

  const HIGH_PRIORITY_PREFIXES = ["/blog", "/services", "/case-studies"];
  const WEEKLY_PATHS = new Set(["/", "/me", "/blog"]);

  return pages
    .filter((p) => isIndexable(p.route))
    .map((p) => {
      const modified = lastMod.get(p.route);
      return {
        url: `${base}${p.route === "/" ? "" : p.route}`,
        ...(modified ? { lastModified: modified } : {}),
        changeFrequency: (WEEKLY_PATHS.has(p.route) ? "weekly" : "monthly") as MetadataRoute.Sitemap[number]["changeFrequency"],
        priority: p.route === "/"
          ? 1
          : HIGH_PRIORITY_PREFIXES.some((prefix) => p.route.startsWith(prefix))
            ? 0.8
            : 0.7,
      };
    });
}
