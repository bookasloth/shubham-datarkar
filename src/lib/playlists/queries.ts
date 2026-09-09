import { supabaseAnon, supabaseAdmin } from "@/lib/supabase/server";
import {
  PLAYLIST_SELECT,
  CATEGORIES,
  mapPlaylistRow,
  type Playlist,
  type PlaylistRow,
} from "./types";

// ===========================================================================
// PUBLIC READS (anon client, RLS-bound, fail soft to empty for prerender)
// ===========================================================================

/** Every published playlist, in manual position order (newest breaks ties). */
export async function getPublishedPlaylists(): Promise<Playlist[]> {
  const { data, error } = await supabaseAnon()
    .from("playlists")
    .select(PLAYLIST_SELECT)
    .eq("is_published", true)
    .order("position", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[playlists] published list failed:", error.message);
    return [];
  }
  return ((data ?? []) as PlaylistRow[]).map(mapPlaylistRow);
}

export async function getPublishedPlaylistBySlug(slug: string): Promise<Playlist | null> {
  const { data, error } = await supabaseAnon()
    .from("playlists")
    .select(PLAYLIST_SELECT)
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();
  if (error) {
    console.error("[playlists] by-slug failed:", error.message);
    return null;
  }
  return data ? mapPlaylistRow(data as PlaylistRow) : null;
}

/** Slugs of every published playlist — for generateStaticParams / sitemap. */
export async function getPublishedPlaylistSlugs(): Promise<{ slug: string; updatedAt: string }[]> {
  const { data, error } = await supabaseAnon()
    .from("playlists")
    .select("slug, updated_at")
    .eq("is_published", true);
  if (error) return [];
  return ((data ?? []) as { slug: string; updated_at: string }[]).map((r) => ({
    slug: r.slug,
    updatedAt: r.updated_at,
  }));
}

export type PlaylistSection = { category: string; playlists: Playlist[] };

export type PlaylistDirectory = {
  featured: Playlist[];
  sections: PlaylistSection[];
  uncategorized: Playlist[];
};

/**
 * The whole public page in one round-trip: featured picks + playlists grouped
 * into category sections (in CATEGORIES order; unknown categories appended
 * alphabetically). Featured playlists still appear in their category section.
 */
export async function getPlaylistDirectory(): Promise<PlaylistDirectory> {
  const all = await getPublishedPlaylists();
  const featured = all.filter((p) => p.isFeatured);

  const byCategory = new Map<string, Playlist[]>();
  const uncategorized: Playlist[] = [];
  for (const p of all) {
    if (!p.category) {
      uncategorized.push(p);
      continue;
    }
    const bucket = byCategory.get(p.category) ?? [];
    bucket.push(p);
    byCategory.set(p.category, bucket);
  }

  const known = CATEGORIES.filter((c) => byCategory.has(c));
  const extra = [...byCategory.keys()]
    .filter((c) => !CATEGORIES.includes(c as (typeof CATEGORIES)[number]))
    .sort();
  const sections: PlaylistSection[] = [...known, ...extra].map((category) => ({
    category,
    playlists: byCategory.get(category)!,
  }));

  return { featured, sections, uncategorized };
}

/** Other published playlists sharing this one's category — "more like this". */
export async function getRelatedPlaylists(playlist: Playlist, limit = 6): Promise<Playlist[]> {
  if (!playlist.category) return [];
  const { data } = await supabaseAnon()
    .from("playlists")
    .select(PLAYLIST_SELECT)
    .eq("is_published", true)
    .eq("category", playlist.category)
    .neq("id", playlist.id)
    .order("position", { ascending: true })
    .limit(limit);
  return ((data ?? []) as PlaylistRow[]).map(mapPlaylistRow);
}

// ===========================================================================
// ADMIN READS (service role, bypasses RLS — includes drafts)
// ===========================================================================

export async function getAllPlaylistsAdmin(): Promise<Playlist[]> {
  const { data, error } = await supabaseAdmin()
    .from("playlists")
    .select(PLAYLIST_SELECT)
    .order("position", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return ((data ?? []) as PlaylistRow[]).map(mapPlaylistRow);
}

export async function getPlaylistByIdAdmin(id: string): Promise<Playlist | null> {
  const { data, error } = await supabaseAdmin()
    .from("playlists")
    .select(PLAYLIST_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapPlaylistRow(data as PlaylistRow) : null;
}
