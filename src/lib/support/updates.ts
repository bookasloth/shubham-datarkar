import "server-only";

import { supabaseAnon, supabaseAdmin } from "@/lib/supabase/server";
import { generateCode, type SupportUpdate, type UpdateType, type UpdateMedia, type UpdateAuthor } from "./update-code";
import { site } from "@/lib/site";
import { autoPost } from "@/lib/community/auto/post";
import { pick } from "@/lib/community/auto/templates";

const BUCKET = "support-media";

type Row = {
  code: string;
  type: UpdateType;
  body: string;
  media: UpdateMedia;
  author: UpdateAuthor | null;
  created_at: string;
};

function toUpdate(r: Row): SupportUpdate {
  return { code: r.code, type: r.type, body: r.body, media: r.media, author: r.author, createdAt: r.created_at };
}

function warn(where: string, e: unknown) {
  console.warn(`[updates] ${where} failed; returning empty:`, (e as Error)?.message ?? e);
}

/** Public: full feed, newest first. Fail-safe to []. */
export async function getUpdatesFeed(): Promise<SupportUpdate[]> {
  try {
    const { data, error } = await supabaseAnon()
      .from("support_updates")
      .select("code,type,body,media,author,created_at")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return ((data as Row[]) ?? []).map(toUpdate);
  } catch (e) {
    warn("getUpdatesFeed", e);
    return [];
  }
}

/** Public: one post by code, or null. */
export async function getUpdateByCode(code: string): Promise<SupportUpdate | null> {
  try {
    const { data, error } = await supabaseAnon()
      .from("support_updates")
      .select("code,type,body,media,author,created_at")
      .eq("code", code)
      .maybeSingle();
    if (error) throw error;
    return data ? toUpdate(data as Row) : null;
  } catch (e) {
    warn("getUpdateByCode", e);
    return null;
  }
}

/** Admin: insert a post, retrying on the rare 6-digit code collision. */
export async function insertUpdate(input: {
  type: UpdateType;
  body: string;
  media: UpdateMedia;
  author?: UpdateAuthor | null;
}): Promise<{ ok: boolean; code?: string; error?: string }> {
  const admin = supabaseAdmin();
  for (let attempt = 0; attempt < 6; attempt++) {
    const code = generateCode();
    const { error } = await admin.from("support_updates").insert({
      code,
      type: input.type,
      body: input.body,
      media: input.media,
      author: input.author ?? null,
    });
    if (!error) {
      if (input.type !== "thankyou") {
        const title = input.body.length > 140 ? input.body.slice(0, 137) + "..." : input.body;
        await autoPost({ sourceKey: `update:${code}`, body: pick("update", { title, url: `${site.url}/support/updates` }) });
      }
      return { ok: true, code };
    }
    // 23505 = unique_violation → regenerate and retry.
    if (error.code !== "23505") return { ok: false, error: error.message };
  }
  return { ok: false, error: "Could not allocate a unique code." };
}

/** Admin: delete a post by code. */
export async function deleteUpdate(code: string): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabaseAdmin().from("support_updates").delete().eq("code", code);
  return error ? { ok: false, error: error.message } : { ok: true };
}

/** Admin: upload an image to the support-media bucket, return its public URL. */
export async function uploadSupportImage(
  file: File,
  prefix: string,
): Promise<{ ok: boolean; url?: string; error?: string }> {
  try {
    const ext = (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
    const path = `${prefix}/${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;
    const admin = supabaseAdmin();
    const { error } = await admin.storage.from(BUCKET).upload(path, file, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });
    if (error) throw error;
    const { data } = admin.storage.from(BUCKET).getPublicUrl(path);
    return { ok: true, url: data.publicUrl };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/** Public/admin: the up-to-5 reusable thank-you image URLs. */
export async function getThankyouImages(): Promise<string[]> {
  try {
    const { data, error } = await supabaseAnon()
      .from("support_settings")
      .select("thankyou_images")
      .eq("id", 1)
      .maybeSingle();
    if (error) throw error;
    const arr = (data as { thankyou_images?: unknown } | null)?.thankyou_images;
    return Array.isArray(arr) ? (arr as string[]).filter((u) => typeof u === "string") : [];
  } catch (e) {
    warn("getThankyouImages", e);
    return [];
  }
}

/** Admin: replace the thank-you image list (max 5). */
export async function setThankyouImages(urls: string[]): Promise<{ ok: boolean; error?: string }> {
  const clean = urls.filter((u) => typeof u === "string" && u).slice(0, 5);
  const { error } = await supabaseAdmin()
    .from("support_settings")
    .update({ thankyou_images: clean })
    .eq("id", 1);
  return error ? { ok: false, error: error.message } : { ok: true };
}
