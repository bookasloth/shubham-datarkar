import "server-only";

import { supabaseAnon } from "@/lib/supabase/server";
import { supabaseAuthServer } from "@/lib/supabase/auth-server";
import type { Post, BlogCategory } from "@/lib/data/types";

/** Admin list row — includes draft/scheduled metadata the public type omits. */
export type AdminPostRow = {
  id: string;
  slug: string;
  title: string;
  category: string;
  status: "draft" | "published" | "scheduled";
  publishedAt: string | null;
  updatedAt: string;
};

type DbRow = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  tags: string[] | null;
  words: number | null;
  featured: boolean | null;
  body: unknown;
  status: string;
  published_at: string | null;
  updated_at: string;
  seo_title: string | null;
  og_title: string | null;
  og_description: string | null;
};

// The SEO columns land here now that migration 20260711000002 is applied. This
// constant feeds every blog query, and each query catch-and-returns-empty on
// error — so if the migration has NOT run in a given environment, selecting a
// missing column blanks the blog. Keep migrate-then-deploy ordering.
const POST_COLS =
  "slug,title,excerpt,category,tags,words,featured,body,published_at,updated_at,seo_title,og_title,og_description";

function toPost(r: DbRow): Post {
  return {
    slug: r.slug,
    title: r.title,
    excerpt: r.excerpt,
    category: r.category as BlogCategory,
    tags: r.tags ?? [],
    date: r.published_at ?? "",
    dateModified: r.updated_at ?? undefined,
    words: Number(r.words ?? 0),
    featured: r.featured ?? false,
    body: (Array.isArray(r.body) ? r.body : []) as Post["body"],
    // Nullable columns → undefined (not ""), so buildMetadata's `?? fallback` works.
    seoTitle: r.seo_title ?? undefined,
    ogTitle: r.og_title ?? undefined,
    ogDescription: r.og_description ?? undefined,
  };
}

function warn(where: string, e: unknown) {
  console.warn(`[blog] ${where} failed; returning empty:`, (e as Error)?.message ?? e);
}

/** All publicly-visible posts, newest first. */
export async function getPublishedPosts(): Promise<Post[]> {
  try {
    const { data, error } = await supabaseAnon()
      .from("posts")
      .select(POST_COLS)
      .order("published_at", { ascending: false });
    if (error) throw error;
    return ((data as DbRow[]) ?? []).map(toPost);
  } catch (e) {
    warn("getPublishedPosts", e);
    return [];
  }
}

/** One visible post by slug, or null. */
export async function getPublishedPost(slug: string): Promise<Post | null> {
  try {
    const { data, error } = await supabaseAnon()
      .from("posts")
      .select(POST_COLS)
      .eq("slug", slug)
      .maybeSingle();
    if (error) throw error;
    return data ? toPost(data as DbRow) : null;
  } catch (e) {
    warn("getPublishedPost", e);
    return null;
  }
}

export async function getPublishedPostsByCategory(category: BlogCategory): Promise<Post[]> {
  try {
    const { data, error } = await supabaseAnon()
      .from("posts")
      .select(POST_COLS)
      .eq("category", category)
      .order("published_at", { ascending: false });
    if (error) throw error;
    return ((data as DbRow[]) ?? []).map(toPost);
  } catch (e) {
    warn("getPublishedPostsByCategory", e);
    return [];
  }
}

/** Admin: ALL posts (incl. drafts/scheduled). Requires admin session. */
export async function getAllPostsAdmin(): Promise<AdminPostRow[]> {
  try {
    const supabase = await supabaseAuthServer();
    const { data, error } = await supabase
      .from("posts")
      .select("id,slug,title,category,status,published_at,updated_at")
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return ((data as DbRow[]) ?? []).map((r) => ({
      id: r.id,
      slug: r.slug,
      title: r.title,
      category: r.category,
      status: r.status as AdminPostRow["status"],
      publishedAt: r.published_at,
      updatedAt: r.updated_at,
    }));
  } catch (e) {
    warn("getAllPostsAdmin", e);
    return [];
  }
}

/** Admin: full editable post by id, or null. */
export async function getPostByIdAdmin(
  id: string,
): Promise<(Post & { id: string; status: string; publishedAt: string | null }) | null> {
  try {
    const supabase = await supabaseAuthServer();
    const { data, error } = await supabase
      .from("posts")
      .select("id," + POST_COLS + ",status")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const r = data as unknown as DbRow;
    return { ...toPost(r), id: r.id, status: r.status, publishedAt: r.published_at };
  } catch (e) {
    warn("getPostByIdAdmin", e);
    return null;
  }
}
