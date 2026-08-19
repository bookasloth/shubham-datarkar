import { supabaseAnon, supabaseAdmin } from "@/lib/supabase/server";
import {
  ALBUM_SELECT, GALLERY_SELECT, mapAlbumRow, mapGalleryRow,
  type GalleryAlbum, type GalleryAlbumRow, type GalleryImage, type GalleryRow,
} from "./types";

/** Published images, optionally scoped to one album, in display order. RLS-bound. */
export async function getPublishedGalleryImages(albumId?: string): Promise<GalleryImage[]> {
  let q = supabaseAnon()
    .from("gallery_images")
    .select(GALLERY_SELECT)
    .eq("is_published", true);
  if (albumId) q = q.eq("album_id", albumId);
  const { data, error } = await q
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) {
    // Fail soft to the empty state: /gallery prerenders at build time, and a
    // deploy must not depend on the migration having run first.
    console.error("[gallery] image query failed:", error.message);
    return [];
  }
  return ((data ?? []) as GalleryRow[]).map(mapGalleryRow);
}

/** Published albums with a live published-image count and resolved cover URL. */
export async function getPublishedAlbums(): Promise<GalleryAlbum[]> {
  const sb = supabaseAnon();
  const { data, error } = await sb
    .from("gallery_albums")
    .select(ALBUM_SELECT)
    .eq("is_published", true)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[gallery] album query failed:", error.message);
    return [];
  }
  const albums = ((data ?? []) as GalleryAlbumRow[]).map(mapAlbumRow);
  return decorateAlbums(sb, albums);
}

/** One published album by slug, or null. */
export async function getPublishedAlbumBySlug(slug: string): Promise<GalleryAlbum | null> {
  const { data, error } = await supabaseAnon()
    .from("gallery_albums")
    .select(ALBUM_SELECT)
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();
  if (error) {
    console.error("[gallery] album-by-slug query failed:", error.message);
    return null;
  }
  return data ? mapAlbumRow(data as GalleryAlbumRow) : null;
}

/** Attach imageCount + coverUrl to each album in one round-trip each. */
async function decorateAlbums(
  sb: ReturnType<typeof supabaseAnon>,
  albums: GalleryAlbum[],
): Promise<GalleryAlbum[]> {
  if (albums.length === 0) return albums;
  // Pull every published image's (album_id, url) once, tally in memory — cheaper
  // and simpler than N count queries for a gallery of this size.
  const { data } = await sb
    .from("gallery_images")
    .select("id, album_id, image_url, display_order, created_at")
    .eq("is_published", true)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: false });
  const rows = (data ?? []) as { id: string; album_id: string | null; image_url: string }[];
  const counts = new Map<string, number>();
  const firstUrl = new Map<string, string>();
  const urlById = new Map<string, string>();
  for (const r of rows) {
    urlById.set(r.id, r.image_url);
    if (!r.album_id) continue;
    counts.set(r.album_id, (counts.get(r.album_id) ?? 0) + 1);
    if (!firstUrl.has(r.album_id)) firstUrl.set(r.album_id, r.image_url);
  }
  return albums.map((a) => ({
    ...a,
    imageCount: counts.get(a.id) ?? 0,
    // Explicit cover wins (when its image is still published); else first image.
    coverUrl: (a.coverImageId && urlById.get(a.coverImageId)) || firstUrl.get(a.id) || null,
  }));
}

/** Every image, hidden included — the admin manager list. */
export async function getAllGalleryImagesAdmin(): Promise<GalleryImage[]> {
  const { data, error } = await supabaseAdmin()
    .from("gallery_images")
    .select(GALLERY_SELECT)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return ((data ?? []) as GalleryRow[]).map(mapGalleryRow);
}

/** Every album, hidden included — the admin manager list. */
export async function getAllAlbumsAdmin(): Promise<GalleryAlbum[]> {
  const { data, error } = await supabaseAdmin()
    .from("gallery_albums")
    .select(ALBUM_SELECT)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return ((data ?? []) as GalleryAlbumRow[]).map(mapAlbumRow);
}
