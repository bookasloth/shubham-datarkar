"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getAdminUser } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES } from "@/lib/media/image-upload";
import {
  slugify,
  detectPlatform,
  isValidPlaylistUrl,
  toEmbedUrl,
  type Platform,
} from "./types";
import { fetchOembed } from "./oembed";

const BUCKET = "playlists";

/* ------------------------------ Result types ------------------------------ */

export type ActionResult = { ok: true } | { error: string };
export type SavePlaylistResult = { ok: true; id: string; slug: string } | { error: string };
export type UploadTargetResult = { ok: true; path: string; signedUrl: string } | { error: string };
export type FinalizeCoverResult = { ok: true; coverUrl: string; storagePath: string } | { error: string };
export type AutofillResult =
  | {
      ok: true;
      platform: Platform;
      title: string | null;
      coverUrl: string | null;
      storagePath: string | null;
      creatorName: string | null;
      embedUrl: string | null;
    }
  | { error: string };

/* ------------------------------ Input ------------------------------ */

export type PlaylistInput = {
  title: string;
  description?: string;
  platform?: Platform;
  externalUrl: string;
  embedUrl?: string;
  allowEmbed?: boolean;
  coverUrl?: string;
  storagePath?: string | null;
  creatorName?: string;
  category?: string;
  mood?: string;
  isFeatured?: boolean;
  isPublished?: boolean;
  position?: number | null;
};

/* ------------------------------ Helpers ------------------------------ */

function clean(v: string | undefined | null, max: number): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim().slice(0, max);
  return t || null;
}

function cleanUrl(v: string | undefined | null): string | null {
  const t = clean(v, 1000);
  if (!t) return null;
  return /^https?:\/\//i.test(t) ? t : null;
}

function toInt(v: number | null | undefined, min: number, max: number): number {
  if (v == null || !Number.isFinite(v)) return 0;
  const n = Math.round(v);
  return Math.min(max, Math.max(min, n));
}

function safeExt(ext: string): string {
  return String(ext || "").toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
}

function revalidatePlaylists(slug?: string): void {
  revalidatePath("/playlists");
  revalidatePath("/admin/playlists");
  if (slug) revalidatePath(`/playlists/${slug}`);
}

async function uniqueSlug(
  admin: ReturnType<typeof supabaseAdmin>,
  title: string,
  excludeId?: string,
): Promise<string> {
  const base = slugify(title);
  for (let n = 1; n < 50; n++) {
    const candidate = n === 1 ? base : `${base}-${n}`;
    let q = admin.from("playlists").select("id").eq("slug", candidate);
    if (excludeId) q = q.neq("id", excludeId);
    const { data } = await q.maybeSingle();
    if (!data) return candidate;
  }
  return `${base}-${randomUUID().slice(0, 8)}`;
}

/** Normalize form input into a DB row (minus title/slug). Throws on a bad URL. */
function playlistFields(input: PlaylistInput) {
  const externalUrl = cleanUrl(input.externalUrl);
  if (!externalUrl) throw new Error("Enter a valid playlist URL (http/https).");

  const platform: Platform = input.platform ?? detectPlatform(externalUrl);
  if (!isValidPlaylistUrl(externalUrl, platform)) {
    throw new Error("The URL doesn't match the selected platform.");
  }

  const allowEmbed = input.allowEmbed ?? true;
  // Derive the embed src unless the admin supplied one; null when unsupported.
  const embedUrl = allowEmbed
    ? cleanUrl(input.embedUrl) ?? toEmbedUrl(platform, externalUrl)
    : null;

  return {
    description: clean(input.description, 2000),
    platform,
    external_url: externalUrl,
    embed_url: embedUrl,
    allow_embed: allowEmbed,
    cover_url: cleanUrl(input.coverUrl),
    storage_path: clean(input.storagePath, 400),
    creator_name: clean(input.creatorName, 200),
    category: clean(input.category, 60),
    mood: clean(input.mood, 60),
    is_featured: input.isFeatured ?? false,
    is_published: input.isPublished ?? false,
    position: toInt(input.position, 0, 100000),
  };
}

/** Remove a bucket object; non-fatal (a stray object is only cosmetic). */
async function removeCover(admin: ReturnType<typeof supabaseAdmin>, path: string | null): Promise<void> {
  if (path) await admin.storage.from(BUCKET).remove([path]);
}

/* ------------------------------ Autofill (oEmbed) ------------------------------ */

/**
 * Paste-URL autofill: detect the platform, pull oEmbed title/cover/creator, and
 * RE-HOST the cover thumbnail into our bucket (so covers always serve from
 * *.supabase.co — already CSP/next-image allowlisted — and survive the external
 * playlist being deleted). All fields are suggestions the admin can override.
 */
export async function autofillFromUrl(url: string): Promise<AutofillResult> {
  if (!(await getAdminUser())) return { error: "Not authorised." };
  const clean_url = cleanUrl(url);
  if (!clean_url) return { error: "Enter a valid playlist URL (http/https)." };

  const platform = detectPlatform(clean_url);
  const meta = await fetchOembed(platform, clean_url);

  let coverUrl: string | null = null;
  let storagePath: string | null = null;
  if (meta?.thumbnailUrl) {
    const rehosted = await rehostThumbnail(meta.thumbnailUrl);
    if (rehosted) {
      coverUrl = rehosted.coverUrl;
      storagePath = rehosted.storagePath;
    }
  }

  return {
    ok: true,
    platform,
    title: meta?.title ?? null,
    coverUrl,
    storagePath,
    creatorName: meta?.authorName ?? null,
    embedUrl: toEmbedUrl(platform, clean_url),
  };
}

/** Download an external thumbnail and store it in our bucket. Null on any failure. */
async function rehostThumbnail(
  thumbnailUrl: string,
): Promise<{ coverUrl: string; storagePath: string } | null> {
  try {
    const res = await fetch(thumbnailUrl, { next: { revalidate: 86400 } });
    if (!res.ok) return null;
    const contentType = (res.headers.get("content-type") ?? "").split(";")[0].trim();
    if (!ALLOWED_IMAGE_TYPES.has(contentType)) return null;
    const bytes = new Uint8Array(await res.arrayBuffer());
    if (bytes.byteLength === 0 || bytes.byteLength > MAX_IMAGE_BYTES) return null;

    const ext = contentType.split("/")[1] || "jpg";
    return await storeCover(bytes, safeExt(ext), contentType);
  } catch {
    return null;
  }
}

async function storeCover(
  body: Uint8Array | ArrayBuffer,
  ext: string,
  contentType: string,
): Promise<{ coverUrl: string; storagePath: string } | null> {
  const now = new Date();
  const path = `covers/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}/${randomUUID()}.${ext}`;
  const admin = supabaseAdmin();
  const { error } = await admin.storage.from(BUCKET).upload(path, body, { contentType, upsert: false });
  if (error) return null;
  const coverUrl = admin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  return { coverUrl, storagePath: path };
}

/* ------------------------------ Manual cover upload ------------------------------ */

/** Mint a one-shot signed URL for the browser to PUT a cover straight to storage. */
export async function createCoverUploadTarget(input: {
  ext: string;
  contentType: string;
}): Promise<UploadTargetResult> {
  if (!(await getAdminUser())) return { error: "Not authorised." };
  if (!ALLOWED_IMAGE_TYPES.has(input.contentType)) {
    return { error: "Use a JPG, PNG, WebP, GIF, or AVIF image." };
  }
  const now = new Date();
  const path = `covers/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}/${randomUUID()}.${safeExt(input.ext)}`;
  const { data, error } = await supabaseAdmin().storage.from(BUCKET).createSignedUploadUrl(path);
  if (error || !data) return { error: `Could not start the upload: ${error?.message ?? "unknown error"}` };
  return { ok: true, path, signedUrl: data.signedUrl };
}

/** After the browser PUTs the object, resolve its public URL. */
export async function finalizeCoverUpload(input: { path: string }): Promise<FinalizeCoverResult> {
  if (!(await getAdminUser())) return { error: "Not authorised." };
  const path = clean(input.path, 400);
  if (!path) return { error: "Missing upload." };
  const coverUrl = supabaseAdmin().storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  return { ok: true, coverUrl, storagePath: path };
}

/* ------------------------------ Writes ------------------------------ */

export async function createPlaylist(input: PlaylistInput): Promise<SavePlaylistResult> {
  if (!(await getAdminUser())) return { error: "Not authorised." };
  const title = clean(input.title, 200);
  if (!title) return { error: "Give the playlist a title." };

  let fields;
  try {
    fields = playlistFields(input);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Invalid input." };
  }

  const admin = supabaseAdmin();
  const slug = await uniqueSlug(admin, title);
  const { data, error } = await admin
    .from("playlists")
    .insert({ title, slug, ...fields })
    .select("id, slug")
    .single();
  if (error || !data) return { error: `Could not save the playlist: ${error?.message ?? "unknown error"}` };

  revalidatePlaylists(slug);
  return { ok: true, id: (data as { id: string }).id, slug };
}

export async function updatePlaylist(id: string, input: PlaylistInput): Promise<SavePlaylistResult> {
  if (!(await getAdminUser())) return { error: "Not authorised." };
  const title = clean(input.title, 200);
  if (!title) return { error: "Give the playlist a title." };

  let fields;
  try {
    fields = playlistFields(input);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Invalid input." };
  }

  const admin = supabaseAdmin();
  // Slug is stable after creation — never break a live URL by re-slugging.
  const { data: existing } = await admin
    .from("playlists")
    .select("slug, storage_path")
    .eq("id", id)
    .maybeSingle();
  if (!existing) return { error: "Playlist not found." };
  const slug = (existing as { slug: string }).slug;
  const oldPath = (existing as { storage_path: string | null }).storage_path;

  const { error } = await admin.from("playlists").update({ title, ...fields }).eq("id", id);
  if (error) return { error: `Could not save the playlist: ${error.message}` };

  // Cover replaced with a different bucket object → clean up the old one.
  if (oldPath && oldPath !== fields.storage_path) await removeCover(admin, oldPath);

  revalidatePlaylists(slug);
  return { ok: true, id, slug };
}

export async function setPlaylistPublished(id: string, published: boolean): Promise<ActionResult> {
  if (!(await getAdminUser())) return { error: "Not authorised." };
  const { error } = await supabaseAdmin().from("playlists").update({ is_published: published }).eq("id", id);
  if (error) return { error: "Could not update visibility." };
  revalidatePlaylists();
  return { ok: true };
}

export async function setPlaylistFeatured(id: string, featured: boolean): Promise<ActionResult> {
  if (!(await getAdminUser())) return { error: "Not authorised." };
  const { error } = await supabaseAdmin().from("playlists").update({ is_featured: featured }).eq("id", id);
  if (error) return { error: "Could not update featured status." };
  revalidatePlaylists();
  return { ok: true };
}

export async function deletePlaylist(id: string): Promise<ActionResult> {
  if (!(await getAdminUser())) return { error: "Not authorised." };
  const admin = supabaseAdmin();
  const { data: row } = await admin.from("playlists").select("storage_path").eq("id", id).maybeSingle();
  const { error } = await admin.from("playlists").delete().eq("id", id);
  if (error) return { error: "Could not delete the playlist." };
  await removeCover(admin, (row as { storage_path: string | null } | null)?.storage_path ?? null);
  revalidatePlaylists();
  return { ok: true };
}

/** Persist a full ordering: position = index in `ids`. */
export async function reorderPlaylists(ids: string[]): Promise<ActionResult> {
  if (!(await getAdminUser())) return { error: "Not authorised." };
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > 1000) return { error: "Nothing to reorder." };
  const admin = supabaseAdmin();
  // ponytail: N single-row updates; batch upsert if the directory ever gets huge.
  const results = await Promise.all(
    ids.map((id, i) => admin.from("playlists").update({ position: i }).eq("id", id)),
  );
  if (results.some((r) => r.error)) return { error: "Could not save the new order." };
  revalidatePlaylists();
  return { ok: true };
}
