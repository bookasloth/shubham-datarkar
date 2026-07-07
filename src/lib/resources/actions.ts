"use server";

import { redirect } from "next/navigation";
import { supabaseAuthServer } from "@/lib/supabase/auth-server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/session";
import { countWords } from "@/lib/blog/words";
import { slugify } from "@/lib/utils";
import type { ContentBlock } from "@/lib/data/types";
import type { ResourceMeta } from "./types";

/*
 * Members pages render dynamically (cookie session), so no revalidatePath is
 * needed — published edits are visible on the next request.
 */

function parseJson<T>(raw: FormDataEntryValue | null, fallback: T): T {
  if (typeof raw !== "string" || !raw.trim()) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new Error("Invalid JSON in meta field.");
  }
}

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

/** Assemble the type-specific meta object from dedicated form fields. */
function parseMeta(type: string, formData: FormData): ResourceMeta {
  switch (type) {
    case "prompt":
      return {
        role: str(formData, "meta_role") || undefined,
        goal: str(formData, "meta_goal") || undefined,
        promptBody: String(formData.get("meta_promptBody") ?? "").trimEnd() || undefined,
        variables: str(formData, "meta_variables")
          ? str(formData, "meta_variables").split(",").map((v) => v.trim()).filter(Boolean)
          : undefined,
        model: str(formData, "meta_model") || undefined,
        exampleOutput: String(formData.get("meta_exampleOutput") ?? "").trim() || undefined,
      };
    case "download":
      return {
        filePath: str(formData, "meta_filePath") || undefined,
        version: str(formData, "meta_version") || undefined,
        changelog: parseJson(formData.get("meta_changelog"), undefined),
      };
    case "workflow":
      return { steps: parseJson(formData.get("meta_steps"), []) };
    case "template":
      return { links: parseJson(formData.get("meta_links"), []) };
    case "video":
      return { url: str(formData, "meta_url") || undefined };
    case "tool":
      return { toolSlug: str(formData, "meta_toolSlug") || undefined };
    default:
      return {};
  }
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
  const content = parseBody(formData.get("body"));
  const type = str(formData, "type");
  const status = str(formData, "status") || "draft";
  const publishAtRaw = str(formData, "publish_at");
  const words = countWords(content);

  let published_at: string | null = null;
  if (status === "published") {
    published_at = publishAtRaw ? new Date(publishAtRaw).toISOString() : new Date().toISOString();
  }

  return {
    slug: str(formData, "slug") || slugify(str(formData, "title")),
    title: str(formData, "title"),
    description: str(formData, "description") || null,
    excerpt: String(formData.get("excerpt") ?? "").trim() || null,
    cover_image: str(formData, "cover_image") || null,
    type,
    category_id: str(formData, "category_id") || null,
    difficulty: str(formData, "difficulty") || null,
    status,
    visibility: str(formData, "visibility") || "free",
    content,
    meta: parseMeta(type, formData),
    featured: formData.get("featured") === "on",
    reading_time: words ? Math.max(1, Math.round(words / 200)) : null,
    published_at,
  };
}

/** Upsert tags by name and replace the resource's tag links. Service role: join table is admin-RLS but tag upserts happen with it too for one client. */
async function syncTags(resourceId: string, raw: string): Promise<void> {
  const names = raw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  const db = supabaseAdmin();

  await db.from("resource_tag").delete().eq("resource_id", resourceId);
  if (!names.length) return;

  const rows = names.map((name) => ({ name, slug: slugify(name) }));
  const { data: tags, error } = await db
    .from("tags")
    .upsert(rows, { onConflict: "name" })
    .select("id");
  if (error) throw new Error(error.message);

  const links = (tags ?? []).map((t) => ({ resource_id: resourceId, tag_id: t.id }));
  if (links.length) {
    const { error: linkError } = await db.from("resource_tag").insert(links);
    if (linkError) throw new Error(linkError.message);
  }
}

export async function createResource(formData: FormData): Promise<void> {
  await requireAdmin();
  const supabase = await supabaseAuthServer();
  const data = fields(formData);
  const { data: created, error } = await supabase
    .from("resources")
    .insert(data)
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  await syncTags(created.id, String(formData.get("tags") ?? ""));
  redirect("/admin/resources");
}

export async function updateResource(id: string, formData: FormData): Promise<void> {
  await requireAdmin();
  const supabase = await supabaseAuthServer();
  const data = fields(formData);
  const { error } = await supabase.from("resources").update(data).eq("id", id);
  if (error) throw new Error(error.message);
  await syncTags(id, String(formData.get("tags") ?? ""));
  redirect("/admin/resources");
}

export async function deleteResource(id: string): Promise<void> {
  await requireAdmin();
  const supabase = await supabaseAuthServer();
  const { error } = await supabase.from("resources").delete().eq("id", id);
  if (error) throw new Error(error.message);
  redirect("/admin/resources");
}

/** Upload a private member file (downloads). Returns its storage path. */
export async function uploadMemberFile(formData: FormData): Promise<{ path?: string; error?: string }> {
  await requireAdmin();
  const file = formData.get("file");
  if (!(file instanceof File) || !file.size) return { error: "No file selected." };
  if (file.size > 50 * 1024 * 1024) return { error: "File is larger than 50 MB." };

  const safeName = file.name.replace(/[^\w.-]+/g, "-");
  const path = `${Date.now()}-${safeName}`;
  const { error } = await supabaseAdmin()
    .storage.from("member-files")
    .upload(path, file, { contentType: file.type || "application/octet-stream" });
  if (error) return { error: error.message };
  return { path };
}
