"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabaseAuthServer } from "@/lib/supabase/auth-server";
import { requireAdmin } from "@/lib/auth/session";
import { countWords } from "@/lib/blog/words";
import { pingIndexNow } from "@/lib/seo/indexnow";
import { site } from "@/lib/site";
import type { ContentBlock } from "@/lib/data/types";

type PostFields = ReturnType<typeof fields>;

/** Revalidate every public ISR page that renders posts, so edits go live now. */
function revalidateBlog(): void {
  revalidatePath("/"); // home shows featured posts
  revalidatePath("/me"); // /me shows them too
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
