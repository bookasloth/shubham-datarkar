"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabaseAuthServer } from "@/lib/supabase/auth-server";
import { requireAdmin } from "@/lib/auth/session";
import { countWords } from "@/lib/blog/words";
import { pingIndexNow } from "@/lib/seo/indexnow";
import { site } from "@/lib/site";
import { getPublishedPosts } from "@/lib/blog/queries";
import type { ContentBlock } from "@/lib/data/types";

/** Public: latest N published posts for the nav menu (minimal, serializable). */
export async function getLatestPostsForNav(n = 2) {
  const posts = await getPublishedPosts();
  return posts
    .slice(0, n)
    .map((p) => ({ slug: p.slug, title: p.title, category: p.category }));
}

type PostFields = ReturnType<typeof fields>;

/** Revalidate every public ISR page that renders posts, so edits go live now. */
function revalidateBlog(): void {
  revalidatePath("/me"); // /me shows featured + recent posts
  revalidatePath("/blog");
  revalidatePath("/blog/[category]", "page");
  revalidatePath("/blog/[category]/[slug]", "page");
}

/** Ping IndexNow for a post that is published AND already live (not scheduled). */
async function notifyIfLive(p: PostFields): Promise<void> {
  if (p.status !== "published" || !p.published_at) return;
  if (new Date(p.published_at) > new Date()) return;
  await pingIndexNow([
    `${site.url}/blog/${p.category}/${p.slug}`,
    `${site.url}/blog`,
    `${site.url}/sitemap.xml`,
  ]);
}

function parseBody(raw: FormDataEntryValue | null): ContentBlock[] {
  if (typeof raw !== "string" || !raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ContentBlock[]) : [];
  } catch {
    return [];
  }
}

function fields(formData: FormData) {
  const body = parseBody(formData.get("body"));
  const status = String(formData.get("status") ?? "draft");
  const publishAtRaw = String(formData.get("publish_at") ?? "").trim();
  // published_at: set for published (now if empty) / scheduled (the chosen time); null for draft.
  let published_at: string | null = null;
  if (status === "published")
    published_at = publishAtRaw ? new Date(publishAtRaw).toISOString() : new Date().toISOString();
  else if (status === "scheduled")
    published_at = publishAtRaw ? new Date(publishAtRaw).toISOString() : null;

  // SEO copy is optional. Omit the columns entirely when all three are blank,
  // so posts written before the blog_seo_fields migration is applied still save
  // (a write to a missing column errors). Only a filled field touches them.
  const seoTitle = String(formData.get("seo_title") ?? "").trim();
  const ogTitle = String(formData.get("og_title") ?? "").trim();
  const ogDescription = String(formData.get("og_description") ?? "").trim();
  const seo: { seo_title?: string | null; og_title?: string | null; og_description?: string | null } =
    seoTitle || ogTitle || ogDescription
      ? { seo_title: seoTitle || null, og_title: ogTitle || null, og_description: ogDescription || null }
      : {};

  return {
    slug: String(formData.get("slug") ?? "").trim(),
    title: String(formData.get("title") ?? "").trim(),
    excerpt: String(formData.get("excerpt") ?? "").trim(),
    category: String(formData.get("category") ?? "").trim(),
    tags: String(formData.get("tags") ?? "")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean),
    featured: formData.get("featured") === "on",
    body,
    words: countWords(body),
    status,
    published_at,
    ...seo,
  };
}

export async function createPost(formData: FormData): Promise<void> {
  await requireAdmin();
  const supabase = await supabaseAuthServer();
  const data = fields(formData);
  const { error } = await supabase.from("posts").insert(data);
  if (error) throw new Error(error.message);
  revalidateBlog();
  await notifyIfLive(data);
  redirect("/admin/posts");
}

export async function updatePost(id: string, formData: FormData): Promise<void> {
  await requireAdmin();
  const supabase = await supabaseAuthServer();
  const data = fields(formData);
  const { error } = await supabase.from("posts").update(data).eq("id", id);
  if (error) throw new Error(error.message);
  revalidateBlog();
  await notifyIfLive(data);
  redirect("/admin/posts");
}

export async function deletePost(id: string): Promise<void> {
  await requireAdmin();
  const supabase = await supabaseAuthServer();
  const { error } = await supabase.from("posts").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidateBlog();
  redirect("/admin/posts");
}
