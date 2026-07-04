import "server-only";

import { supabaseAnon } from "@/lib/supabase/server";
import { supabaseAuthServer } from "@/lib/supabase/auth-server";
import type { Photo } from "@/lib/photos/types";

type DbRow = {
  id: string;
  cloudinary_public_id: string;
  title: string;
  description: string | null;
  tags: string[] | null;
  sort_order: number;
  published: boolean;
  created_at: string;
  updated_at: string;
};

const PHOTO_COLS =
  "id,cloudinary_public_id,title,description,tags,sort_order,published,created_at,updated_at";

/** Maps a DB row (snake_case) to the shared `Photo` type (camelCase). */
export function mapRow(row: DbRow): Photo {
  return {
    id: row.id,
    cloudinaryPublicId: row.cloudinary_public_id,
    title: row.title,
    description: row.description ?? null,
    tags: row.tags ?? [],
    sortOrder: row.sort_order,
    published: row.published,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function warn(where: string, e: unknown) {
  console.warn(`[photos] ${where} failed; returning empty:`, (e as Error)?.message ?? e);
}

/**
 * Published photos, ordered by sort_order asc then created_at desc,
 * paginated. Optional tag filter (array contains).
 */
export async function getPublishedPhotos({
  offset,
  limit,
  tag,
}: {
  offset: number;
  limit: number;
  tag?: string;
}): Promise<Photo[]> {
  try {
    let query = supabaseAnon()
      .from("photos")
      .select(PHOTO_COLS)
      .eq("published", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (tag) {
      query = query.contains("tags", [tag]);
    }

    const { data, error } = await query;
    if (error) throw error;
    return ((data as DbRow[]) ?? []).map(mapRow);
  } catch (e) {
    warn("getPublishedPhotos", e);
    return [];
  }
}

/** Count of published photos, optionally filtered by tag. */
export async function getPublishedPhotosCount(tag?: string): Promise<number> {
  try {
    let query = supabaseAnon()
      .from("photos")
      .select("id", { count: "exact", head: true })
      .eq("published", true);

    if (tag) {
      query = query.contains("tags", [tag]);
    }

    const { count, error } = await query;
    if (error) throw error;
    return count ?? 0;
  } catch (e) {
    warn("getPublishedPhotosCount", e);
    return 0;
  }
}

/** Admin: all photos (incl. unpublished), ordered by sort_order asc then created_at desc. */
export async function getAllPhotos(): Promise<Photo[]> {
  try {
    const supabase = await supabaseAuthServer();
    const { data, error } = await supabase
      .from("photos")
      .select(PHOTO_COLS)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) throw error;
    return ((data as DbRow[]) ?? []).map(mapRow);
  } catch (e) {
    warn("getAllPhotos", e);
    return [];
  }
}

/** Admin: one photo by id, or null. */
export async function getPhotoById(id: string): Promise<Photo | null> {
  try {
    const supabase = await supabaseAuthServer();
    const { data, error } = await supabase
      .from("photos")
      .select(PHOTO_COLS)
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data ? mapRow(data as DbRow) : null;
  } catch (e) {
    warn("getPhotoById", e);
    return null;
  }
}

/**
 * Admin: all photos, error-surfacing variant of {@link getAllPhotos}.
 *
 * Task 1 carryover: `getAllPhotos()` swallows DB/auth failures into `[]`,
 * indistinguishable from a genuinely empty gallery. The admin list must not
 * render "no photos" when the real cause is a failed fetch, so this variant
 * lets the error propagate for the page to catch and show an error state.
 */
export async function getAllPhotosAdmin(): Promise<Photo[]> {
  const supabase = await supabaseAuthServer();
  const { data, error } = await supabase
    .from("photos")
    .select(PHOTO_COLS)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return ((data as DbRow[]) ?? []).map(mapRow);
}

/**
 * Admin: one photo by id, error-surfacing variant of {@link getPhotoById}.
 * Returns `null` ONLY for a genuine not-found; a DB/auth failure throws so the
 * edit page can distinguish "no such photo" from "fetch failed".
 */
export async function getPhotoByIdAdmin(id: string): Promise<Photo | null> {
  const supabase = await supabaseAuthServer();
  const { data, error } = await supabase
    .from("photos")
    .select(PHOTO_COLS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapRow(data as DbRow) : null;
}

/** Distinct tags across published photos. */
export async function getDistinctTags(): Promise<string[]> {
  try {
    const { data, error } = await supabaseAnon()
      .from("photos")
      .select("tags")
      .eq("published", true);
    if (error) throw error;
    const rows = (data as { tags: string[] | null }[]) ?? [];
    const tagSet = new Set<string>();
    for (const row of rows) {
      for (const t of row.tags ?? []) tagSet.add(t);
    }
    return Array.from(tagSet).sort();
  } catch (e) {
    warn("getDistinctTags", e);
    return [];
  }
}
