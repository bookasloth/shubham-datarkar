// Playlist directory — types, mapper, configurable vocab, and platform helpers.
// Hand-written per project convention (no Supabase codegen). Mirrors lib/movies.

/* ------------------------------ Vocab ------------------------------ */
// Kept in TS (not DB enums) so new values ship without a migration; the admin
// form reads these arrays for its selects, and the public page groups by category.

export const PLATFORMS = [
  { value: "spotify", label: "Spotify" },
  { value: "youtube", label: "YouTube" },
  { value: "apple_music", label: "Apple Music" },
  { value: "soundcloud", label: "SoundCloud" },
  { value: "other", label: "Other" },
] as const;
export type Platform = (typeof PLATFORMS)[number]["value"];

// Section order on the public page follows this array.
export const CATEGORIES = [
  "Focus",
  "Work",
  "Study",
  "Workout",
  "Travel",
  "Relax",
  "Party",
  "Morning",
  "Night",
  "Driving",
  "Weekend",
  "Chill",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const MOODS = [
  "Chill",
  "Energetic",
  "Calm",
  "Dark",
  "Happy",
  "Nostalgic",
  "Focused",
  "Motivational",
  "Emotional",
  "Late Night",
] as const;
export type Mood = (typeof MOODS)[number];

/* ------------------------------ App type ------------------------------ */

export type Playlist = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  platform: Platform;
  externalUrl: string;
  embedUrl: string | null;
  allowEmbed: boolean;
  coverUrl: string | null;
  storagePath: string | null;
  creatorName: string | null;
  category: string | null;
  mood: string | null;
  isFeatured: boolean;
  isPublished: boolean;
  position: number;
  createdAt: string;
  updatedAt: string;
};

export type PlaylistRow = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  platform: string;
  external_url: string;
  embed_url: string | null;
  allow_embed: boolean;
  cover_url: string | null;
  storage_path: string | null;
  creator_name: string | null;
  category: string | null;
  mood: string | null;
  is_featured: boolean;
  is_published: boolean;
  position: number;
  created_at: string;
  updated_at: string;
};

export const PLAYLIST_SELECT =
  "id, title, slug, description, platform, external_url, embed_url, allow_embed, cover_url, storage_path, creator_name, category, mood, is_featured, is_published, position, created_at, updated_at";

export function mapPlaylistRow(r: PlaylistRow): Playlist {
  return {
    id: r.id,
    title: r.title,
    slug: r.slug,
    description: r.description,
    platform: (PLATFORMS.some((p) => p.value === r.platform) ? r.platform : "other") as Platform,
    externalUrl: r.external_url,
    embedUrl: r.embed_url,
    allowEmbed: r.allow_embed,
    coverUrl: r.cover_url,
    storagePath: r.storage_path,
    creatorName: r.creator_name,
    category: r.category,
    mood: r.mood,
    isFeatured: r.is_featured,
    isPublished: r.is_published,
    position: r.position,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

/* ------------------------------ Helpers ------------------------------ */

/** URL-safe slug from a title. Empty → "playlist" so the column is never blank. */
export function slugify(title: string): string {
  return (
    title
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "playlist"
  );
}

export function platformLabel(platform: string): string {
  return PLATFORMS.find((p) => p.value === platform)?.label ?? "Other";
}

/** Detect the platform from a URL. Unknown/invalid → "other". */
export function detectPlatform(url: string): Platform {
  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return "other";
  }
  if (host.endsWith("spotify.com")) return "spotify";
  if (host.endsWith("music.apple.com")) return "apple_music";
  if (host.endsWith("youtube.com") || host === "youtu.be" || host.endsWith("music.youtube.com")) return "youtube";
  if (host.endsWith("soundcloud.com")) return "soundcloud";
  return "other";
}

/** A well-formed http(s) URL whose host matches the declared platform (any host for "other"). */
export function isValidPlaylistUrl(url: string, platform?: Platform): boolean {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return false;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return false;
  if (!platform || platform === "other") return true;
  return detectPlatform(url) === platform;
}

/**
 * Official embed src for a platform's playlist URL, or null when the platform
 * has no reliable iframe embed (SoundCloud/other → external link only).
 * ponytail: string transforms over the public URL shapes — no API calls.
 */
export function toEmbedUrl(platform: Platform, url: string): string | null {
  try {
    const u = new URL(url);
    switch (platform) {
      case "spotify":
        // open.spotify.com/playlist/ID → open.spotify.com/embed/playlist/ID
        return `https://open.spotify.com/embed${u.pathname}`;
      case "apple_music":
        // music.apple.com/... → embed.music.apple.com/... (same path/query)
        return `https://embed.music.apple.com${u.pathname}${u.search}`;
      case "youtube": {
        const list = u.searchParams.get("list");
        return list ? `https://www.youtube-nocookie.com/embed/videoseries?list=${list}` : null;
      }
      default:
        return null;
    }
  } catch {
    return null;
  }
}
