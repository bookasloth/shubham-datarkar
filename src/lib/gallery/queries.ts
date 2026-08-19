import { supabaseAnon, supabaseAdmin } from "@/lib/supabase/server";
import { GALLERY_SELECT, mapGalleryRow, type GalleryImage, type GalleryRow } from "./types";

/** Published images in display order — the /gallery page feed. RLS-bound. */
export async function getPublishedGalleryImages(): Promise<GalleryImage[]> {
  const sb = supabaseAnon();
  const { data, error } = await sb
    .from("gallery_images")
    .select(GALLERY_SELECT)
    .eq("is_published", true)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) {
    // Fail soft to the empty state: /gallery prerenders at build time, and a
    // deploy must not depend on the migration having run first.
    console.error("[gallery] query failed:", error.message);
    return [];
  }
  return ((data ?? []) as GalleryRow[]).map(mapGalleryRow);
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
