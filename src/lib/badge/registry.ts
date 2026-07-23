import { getPublishedPosts } from "@/lib/blog/queries";
import { caseStudies } from "@/lib/data/case-studies";
import { supabaseAdmin } from "@/lib/supabase/server";
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
  "latest-case-study": async () => {
    return { label: "Latest case study", value: caseStudies[0]?.title ?? "Coming soon" };
  },
  members: async () => {
    // Public aggregate count only — no PII. Guarded so the badge degrades
    // rather than 500s if the service client or env is unavailable.
    try {
      const { count } = await supabaseAdmin()
        .from("profiles")
        .select("id", { count: "exact", head: true });
      return { label: "Community members", value: String(count ?? 0) };
    } catch {
      return { label: "Community members", value: "—" };
    }
  },
};
