import "server-only";

// Best-effort oEmbed metadata for a pasted playlist URL — title, cover art, and
// creator. Used ONLY to prefill the admin form; the admin always overrides. No
// API keys: Spotify, YouTube, and SoundCloud expose public oEmbed endpoints.
// Apple Music has no reliable public oEmbed, so it stays manual.

import type { Platform } from "./types";

export type OembedMeta = {
  title: string | null;
  thumbnailUrl: string | null;
  authorName: string | null;
};

// Public oEmbed endpoints keyed by platform. Missing = manual entry only.
const ENDPOINTS: Partial<Record<Platform, string>> = {
  spotify: "https://open.spotify.com/oembed",
  youtube: "https://www.youtube.com/oembed",
  soundcloud: "https://soundcloud.com/oembed",
};

type RawOembed = {
  title?: string;
  thumbnail_url?: string;
  author_name?: string;
};

/**
 * Fetch oEmbed metadata for a URL, or null when the platform has no endpoint or
 * the lookup fails (deleted/private playlist, network error). Never throws.
 */
export async function fetchOembed(platform: Platform, url: string): Promise<OembedMeta | null> {
  const base = ENDPOINTS[platform];
  if (!base) return null;
  try {
    const endpoint = new URL(base);
    endpoint.searchParams.set("url", url);
    endpoint.searchParams.set("format", "json");
    const res = await fetch(endpoint, {
      headers: { accept: "application/json" },
      // oEmbed is stable per URL; cache a day. Admin tolerates staleness fine.
      next: { revalidate: 86400 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as RawOembed;
    return {
      title: data.title?.trim() || null,
      thumbnailUrl: data.thumbnail_url?.trim() || null,
      authorName: data.author_name?.trim() || null,
    };
  } catch {
    return null;
  }
}
