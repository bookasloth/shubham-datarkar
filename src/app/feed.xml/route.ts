import { site } from "@/lib/site";
import { getPublishedPosts } from "@/lib/blog/queries";

// DB-backed feed → always render at request time (never prerender an empty feed).
export const dynamic = "force-dynamic";

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET(): Promise<Response> {
  const posts = await getPublishedPosts();
  const self = `${site.url}/feed.xml`;
  const updated = posts[0]?.dateModified ?? posts[0]?.date;

  const items = posts
    .map((p) => {
      const url = `${site.url}/blog/${p.category}/${p.slug}`;
      const pubDate = p.date ? new Date(p.date).toUTCString() : "";
      return [
        "    <item>",
        `      <title>${escapeXml(p.title)}</title>`,
        `      <link>${url}</link>`,
        `      <guid isPermaLink="true">${url}</guid>`,
        pubDate ? `      <pubDate>${pubDate}</pubDate>` : "",
        `      <category>${escapeXml(p.category)}</category>`,
        `      <description>${escapeXml(p.excerpt)}</description>`,
        "    </item>",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(site.name)} — Blog</title>
    <link>${site.url}/blog</link>
    <atom:link href="${self}" rel="self" type="application/rss+xml" />
    <description>${escapeXml(site.description)}</description>
    <language>en</language>
    ${updated ? `<lastBuildDate>${new Date(updated).toUTCString()}</lastBuildDate>` : ""}
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
