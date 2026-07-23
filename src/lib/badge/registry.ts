import { getPublishedPosts } from "@/lib/blog/queries";
import type { BadgeData } from "./render";

/**
 * Available badge types → their live data. Each returns a {label, value} the
 * renderer turns into SVG. `getPublishedPosts` already catch-returns [] on
 * failure, so these degrade gracefully.
 */
export const BADGES: Record<string, () => Promise<BadgeData>> = {
  "latest-post": async () => {
    const posts = await getPublishedPosts();
    return { label: "Latest post", value: posts[0]?.title ?? "No posts yet" };
  },
  posts: async () => {
    const posts = await getPublishedPosts();
    return { label: "Published posts", value: String(posts.length) };
  },
};
