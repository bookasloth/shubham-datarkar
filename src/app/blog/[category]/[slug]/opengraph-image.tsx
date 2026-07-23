import { getPublishedPost } from "@/lib/blog/queries";
import { ogImage, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/seo/og";

// Per-post OG card. Reads the post title from the DB, so it renders at request
// time. Uses the shared dark/orange card (see lib/seo/og.tsx).
export const alt = "Blog — Shubham Datarkar";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}) {
  const { slug, category } = await params;
  const post = await getPublishedPost(slug);
  return ogImage({
    category: `Blog · ${(post?.category ?? category).replace(/-/g, " ")}`,
    title: post?.title ?? "Essays, playbooks & teardowns",
    subtitle: post?.excerpt,
    kind: "blog",
  });
}
