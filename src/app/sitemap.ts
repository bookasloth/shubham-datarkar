import type { MetadataRoute } from "next";
import { site } from "@/lib/site";
import { blogCategories } from "@/lib/data/posts";
import { getPublishedPosts } from "@/lib/blog/queries";
import { caseStudies } from "@/lib/data/case-studies";
import { services } from "@/lib/data/services";
import { tools } from "@/lib/data/tools";
import { products } from "@/lib/data/products";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await getPublishedPosts();
  const base = site.url;
  const now = new Date();

  const staticPaths = [
    "",
    "/about",
    "/my-story",
    "/now",
    "/uses",
    "/philosophy",
    "/work",
    "/components/page-2",
    "/case-studies",
    "/testimonials",
    "/services",
    "/speaking",
    "/media-kit",
    "/blog",
    "/newsletter",
    "/resources",
    "/changelog",
    "/roadmap",
    "/products",
    "/tools",
    "/ai-experiments",
    "/components",
    "/contact",
    "/book",
    "/faq",
  ];

  const entries: MetadataRoute.Sitemap = staticPaths.map((path) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency: path === "" || path === "/blog" ? "weekly" : "monthly",
    priority: path === "" ? 1 : path === "/blog" || path === "/services" ? 0.9 : 0.7,
  }));

  for (const c of blogCategories) {
    entries.push({ url: `${base}/blog/${c.slug}`, lastModified: now, changeFrequency: "weekly", priority: 0.6 });
  }
  for (const p of posts) {
    entries.push({
      url: `${base}/blog/${p.category}/${p.slug}`,
      lastModified: new Date(p.date),
      changeFrequency: "monthly",
      priority: 0.7,
    });
  }
  for (const c of caseStudies) {
    entries.push({ url: `${base}/case-studies/${c.slug}`, lastModified: now, changeFrequency: "monthly", priority: 0.8 });
  }
  for (const s of services) {
    entries.push({ url: `${base}/services/${s.slug}`, lastModified: now, changeFrequency: "monthly", priority: 0.8 });
  }
  for (const t of tools) {
    entries.push({ url: `${base}/tools/${t.slug}`, lastModified: now, changeFrequency: "monthly", priority: 0.6 });
  }
  for (const p of products) {
    entries.push({ url: `${base}/products/${p.slug}`, lastModified: now, changeFrequency: "monthly", priority: 0.7 });
  }

  return entries;
}
