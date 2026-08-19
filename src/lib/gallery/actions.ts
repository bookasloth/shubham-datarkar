"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getAdminUser } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { validateImageFile, imageExt } from "@/lib/media/image-upload";
import {
  ALBUM_SELECT, GALLERY_SELECT, mapAlbumRow, mapGalleryRow, slugify,
  type GalleryAlbum, type GalleryAlbumRow, type GalleryImage, type GalleryRow,
} from "./types";

const BUCKET = "gallery";
const MAX_CAPTION = 300;
const MAX_DESCRIPTION = 2000;
const MAX_DIMENSION = 20000;

export type GalleryActionResult = { ok: true } | { error: string };
export type GalleryUploadResult = { ok: true; image: GalleryImage } | { error: string };

function revalidateGallery(): void {
  revalidatePath("/gallery");
  revalidatePath("/admin/gallery");
}

/** Trimmed text field capped at `max`; null when empty. */
function text(formData: FormData, key: string, max: number): string | null {
  const v = formData.get(key);
  if (typeof v !== "string") return null;
  const trimmed = v.trim().slice(0, max);
  return trimmed || null;
}

export async function uploadGalleryImage(formData: FormData): Promise<GalleryUploadResult> {
  if (!(await getAdminUser())) return { error: "Not authorised." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose an image." };
  const invalid = validateImageFile(file);
  if (invalid) return { error: invalid };

  // Dimensions are measured client-side (createImageBitmap) — no image decoder
  // on the server. Validated as sane positive integers; they only drive layout.
  const width = Number(formData.get("width"));
  const height = Number(formData.get("height"));
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0 || width > MAX_DIMENSION || height > MAX_DIMENSION) {
    return { error: "Could not read image dimensions." };
  }

  const admin = supabaseAdmin();
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const path = `${yyyy}/${mm}/${randomUUID()}.${imageExt(file)}`;

  const { error: upErr } = await admin.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (upErr) return { error: `Upload failed: ${upErr.message}` };

  const publicUrl = admin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;

  // New images append after the current tail. Single-admin panel — the max+1
  // read/write race is not reachable in practice.
  const { data: tail } = await admin
    .from("gallery_images")
    .select("display_order")
    .order("display_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const displayOrder = (tail?.display_order ?? -1) + 1;

  const { data, error: dbErr } = await admin
    .from("gallery_images")
    .insert({
      caption: text(formData, "caption", MAX_CAPTION) ?? "",
      image_url: publicUrl,
      storage_path: path,
      width,
      height,
      file_size: file.size,
      mime_type: file.type,
      display_order: displayOrder,
    })
    .select(GALLERY_SELECT)
    .single();
  if (dbErr || !data) {
    // Don't strand the object when the row insert fails.
    await admin.storage.from(BUCKET).remove([path]);
    return { error: `Could not save the image: ${dbErr?.message ?? "unknown error"}` };
  }

  revalidateGallery();
  return { ok: true, image: mapGalleryRow(data as GalleryRow) };
}

export async function updateGalleryImage(id: string, formData: FormData): Promise<GalleryActionResult> {
  if (!(await getAdminUser())) return { error: "Not authorised." };

  const { error } = await supabaseAdmin()
    .from("gallery_images")
    .update({
      caption: text(formData, "caption", MAX_CAPTION) ?? "",
      description: text(formData, "description", MAX_DESCRIPTION),
      location: text(formData, "location", MAX_CAPTION),
      photographer: text(formData, "photographer", MAX_CAPTION),
    })
    .eq("id", id);
  if (error) return { error: "Could not save changes." };

  revalidateGallery();
  return { ok: true };
}

export async function setGalleryPublished(id: string, published: boolean): Promise<GalleryActionResult> {
  if (!(await getAdminUser())) return { error: "Not authorised." };

  const { error } = await supabaseAdmin()
    .from("gallery_images")
    .update({ is_published: published })
    .eq("id", id);
  if (error) return { error: "Could not update visibility." };

  revalidateGallery();
  return { ok: true };
}

export async function deleteGalleryImage(id: string): Promise<GalleryActionResult> {
  if (!(await getAdminUser())) return { error: "Not authorised." };

  const admin = supabaseAdmin();
  const { data: row } = await admin
    .from("gallery_images")
    .select("storage_path")
    .eq("id", id)
    .maybeSingle();

  const { error } = await admin.from("gallery_images").delete().eq("id", id);
  if (error) return { error: "Could not delete the image." };

  // Row is gone — a lingering object is cosmetic, so storage cleanup is non-fatal.
  if (row?.storage_path) await admin.storage.from(BUCKET).remove([row.storage_path]);

  revalidateGallery();
  return { ok: true };
}

/** Persist a full ordering: display_order = position in `ids`. */
export async function reorderGalleryImages(ids: string[]): Promise<GalleryActionResult> {
  if (!(await getAdminUser())) return { error: "Not authorised." };
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > 1000) return { error: "Nothing to reorder." };

  const admin = supabaseAdmin();
  // ponytail: N single-row updates; batch upsert if the gallery ever gets huge.
  const results = await Promise.all(
    ids.map((id, i) => admin.from("gallery_images").update({ display_order: i }).eq("id", id)),
  );
  if (results.some((r) => r.error)) return { error: "Could not save the new order." };

  revalidateGallery();
  return { ok: true };
}

// ===========================================================================
// Albums
// ===========================================================================

export type AlbumCreateResult = { ok: true; album: GalleryAlbum } | { error: string };

/** Unique slug from a title: append -2, -3, … on collision. */
async function uniqueSlug(admin: ReturnType<typeof supabaseAdmin>, title: string, excludeId?: string): Promise<string> {
  const base = slugify(title);
  for (let n = 1; n < 50; n++) {
    const candidate = n === 1 ? base : `${base}-${n}`;
    let q = admin.from("gallery_albums").select("id").eq("slug", candidate);
    if (excludeId) q = q.neq("id", excludeId);
    const { data } = await q.maybeSingle();
    if (!data) return candidate;
  }
  return `${base}-${randomUUID().slice(0, 8)}`;
}

export async function createAlbum(formData: FormData): Promise<AlbumCreateResult> {
  if (!(await getAdminUser())) return { error: "Not authorised." };
  const title = text(formData, "title", MAX_CAPTION);
  if (!title) return { error: "Give the album a title." };

  const admin = supabaseAdmin();
  const { data: tail } = await admin
    .from("gallery_albums")
    .select("display_order")
    .order("display_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await admin
    .from("gallery_albums")
    .insert({
      title,
      slug: await uniqueSlug(admin, title),
      description: text(formData, "description", MAX_DESCRIPTION),
      display_order: (tail?.display_order ?? -1) + 1,
    })
    .select(ALBUM_SELECT)
    .single();
  if (error || !data) return { error: `Could not create the album: ${error?.message ?? "unknown error"}` };

  revalidateGallery();
  return { ok: true, album: mapAlbumRow(data as GalleryAlbumRow) };
}

export async function updateAlbum(id: string, formData: FormData): Promise<GalleryActionResult> {
  if (!(await getAdminUser())) return { error: "Not authorised." };
  const title = text(formData, "title", MAX_CAPTION);
  if (!title) return { error: "Give the album a title." };

  const admin = supabaseAdmin();
  const { error } = await admin
    .from("gallery_albums")
    .update({
      title,
      slug: await uniqueSlug(admin, title, id),
      description: text(formData, "description", MAX_DESCRIPTION),
    })
    .eq("id", id);
  if (error) return { error: "Could not save the album." };

  revalidateGallery();
  return { ok: true };
}

export async function setAlbumPublished(id: string, published: boolean): Promise<GalleryActionResult> {
  if (!(await getAdminUser())) return { error: "Not authorised." };
  const { error } = await supabaseAdmin()
    .from("gallery_albums")
    .update({ is_published: published })
    .eq("id", id);
  if (error) return { error: "Could not update visibility." };
  revalidateGallery();
  return { ok: true };
}

/** Delete an album. Images survive (FK on delete set null) — they become unfiled. */
export async function deleteAlbum(id: string): Promise<GalleryActionResult> {
  if (!(await getAdminUser())) return { error: "Not authorised." };
  const { error } = await supabaseAdmin().from("gallery_albums").delete().eq("id", id);
  if (error) return { error: "Could not delete the album." };
  revalidateGallery();
  return { ok: true };
}

export async function reorderAlbums(ids: string[]): Promise<GalleryActionResult> {
  if (!(await getAdminUser())) return { error: "Not authorised." };
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > 1000) return { error: "Nothing to reorder." };
  const admin = supabaseAdmin();
  const results = await Promise.all(
    ids.map((id, i) => admin.from("gallery_albums").update({ display_order: i }).eq("id", id)),
  );
  if (results.some((r) => r.error)) return { error: "Could not save the new order." };
  revalidateGallery();
  return { ok: true };
}

/** Move images into an album (or out, with albumId = null). */
export async function assignImagesToAlbum(imageIds: string[], albumId: string | null): Promise<GalleryActionResult> {
  if (!(await getAdminUser())) return { error: "Not authorised." };
  if (!Array.isArray(imageIds) || imageIds.length === 0 || imageIds.length > 1000) return { error: "No images selected." };
  const { error } = await supabaseAdmin()
    .from("gallery_images")
    .update({ album_id: albumId })
    .in("id", imageIds);
  if (error) return { error: "Could not move the images." };
  revalidateGallery();
  return { ok: true };
}

export async function setAlbumCover(albumId: string, imageId: string): Promise<GalleryActionResult> {
  if (!(await getAdminUser())) return { error: "Not authorised." };
  const { error } = await supabaseAdmin()
    .from("gallery_albums")
    .update({ cover_image_id: imageId })
    .eq("id", albumId);
  if (error) return { error: "Could not set the cover." };
  revalidateGallery();
  return { ok: true };
}
