"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabaseAuthServer } from "@/lib/supabase/auth-server";
import { requireAdmin } from "@/lib/auth/session";
import { countWords } from "@/lib/blog/words";
import type { ContentBlock } from "@/lib/data/types";

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
  const { error } = await supabase.from("posts").insert(fields(formData));
  if (error) throw new Error(error.message);
  revalidatePath("/blog");
  redirect("/admin/posts");
}

export async function updatePost(id: string, formData: FormData): Promise<void> {
  await requireAdmin();
  const supabase = await supabaseAuthServer();
  const { error } = await supabase.from("posts").update(fields(formData)).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/blog");
  redirect("/admin/posts");
}

export async function deletePost(id: string): Promise<void> {
  await requireAdmin();
  const supabase = await supabaseAuthServer();
  const { error } = await supabase.from("posts").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/blog");
  redirect("/admin/posts");
}
