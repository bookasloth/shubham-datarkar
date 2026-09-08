import "server-only";

// TMDB metadata client. Auth via the v4 Read Access Token (Bearer) — set
// TMDB_ACCESS_TOKEN in the env. Used only by admin server actions to populate
// movie METADATA; it is never the source of truth for editorial content.

import type { CastMember } from "./types";

const TMDB_BASE = "https://api.themoviedb.org/3";
const IMG_BASE = "https://image.tmdb.org/t/p";

/** Build a TMDB image URL, or null when the path is missing. */
export function tmdbImage(path: string | null | undefined, size: string): string | null {
  if (!path) return null;
  return `${IMG_BASE}/${size}${path}`;
}

function authHeader(): string {
  const token = process.env.TMDB_ACCESS_TOKEN;
  if (!token) {
    throw new Error(
      "TMDB is not configured. Set TMDB_ACCESS_TOKEN (v4 Read Access Token) in the environment.",
    );
  }
  return `Bearer ${token}`;
}

async function tmdbFetch<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${TMDB_BASE}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url, {
    headers: { Authorization: authHeader(), accept: "application/json" },
    // Metadata is stable; cache a day. Admin import tolerates staleness fine.
    next: { revalidate: 86400 },
  });
  if (!res.ok) {
    throw new Error(`TMDB request failed (${res.status}) for ${path}`);
  }
  return res.json() as Promise<T>;
}

export type TmdbSearchResult = {
  tmdbId: number;
  title: string;
  releaseYear: number | null;
  overview: string;
  posterUrl: string | null;
};

type RawSearch = {
  results: Array<{
    id: number;
    title: string;
    release_date?: string;
    overview?: string;
    poster_path?: string | null;
  }>;
};

/** Search TMDB by title. Returns lightweight results for the admin picker. */
export async function searchMovies(query: string): Promise<TmdbSearchResult[]> {
  const q = query.trim();
  if (!q) return [];
  const data = await tmdbFetch<RawSearch>("/search/movie", {
    query: q,
    include_adult: "false",
    language: "en-US",
  });
  return data.results.slice(0, 12).map((r) => ({
    tmdbId: r.id,
    title: r.title,
    releaseYear: r.release_date ? Number(r.release_date.slice(0, 4)) || null : null,
    overview: r.overview ?? "",
    posterUrl: tmdbImage(r.poster_path, "w185"),
  }));
}

/** Normalized metadata ready to prefill the movie form. */
export type TmdbMovieDetails = {
  tmdbId: number;
  title: string;
  overview: string;
  tagline: string | null;
  posterUrl: string | null;
  backdropUrl: string | null;
  trailerUrl: string | null;
  releaseDate: string | null;
  releaseYear: number | null;
  runtime: number | null;
  originalLanguage: string | null;
  country: string | null;
  director: string | null;
  cast: CastMember[];
  ageRating: string | null;
  genres: string[]; // TMDB genre names
};

type RawDetails = {
  id: number;
  title: string;
  overview?: string;
  tagline?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  release_date?: string;
  runtime?: number | null;
  original_language?: string;
  production_countries?: Array<{ name: string }>;
  genres?: Array<{ name: string }>;
  credits?: {
    cast?: Array<{ name: string; character?: string; profile_path?: string | null }>;
    crew?: Array<{ name: string; job?: string }>;
  };
  videos?: { results?: Array<{ site?: string; type?: string; key?: string; official?: boolean }> };
  release_dates?: {
    results?: Array<{
      iso_3166_1: string;
      release_dates?: Array<{ certification?: string }>;
    }>;
  };
};

function pickTrailer(videos: RawDetails["videos"]): string | null {
  const vids = videos?.results ?? [];
  const yt = vids.filter((v) => v.site === "YouTube" && v.key);
  const trailer =
    yt.find((v) => v.type === "Trailer" && v.official) ??
    yt.find((v) => v.type === "Trailer") ??
    yt.find((v) => v.type === "Teaser") ??
    yt[0];
  return trailer?.key ? `https://www.youtube.com/watch?v=${trailer.key}` : null;
}

function pickAgeRating(rd: RawDetails["release_dates"]): string | null {
  const results = rd?.results ?? [];
  const preferred =
    results.find((r) => r.iso_3166_1 === "US") ??
    results.find((r) => r.iso_3166_1 === "IN") ??
    results[0];
  const cert = preferred?.release_dates?.map((d) => d.certification).find((c) => c && c.trim());
  return cert?.trim() || null;
}

/** Fetch full details for one movie, normalized for the movie form / insert. */
export async function getMovieDetails(tmdbId: number): Promise<TmdbMovieDetails> {
  const d = await tmdbFetch<RawDetails>(`/movie/${tmdbId}`, {
    append_to_response: "credits,videos,release_dates",
    language: "en-US",
  });
  const director = d.credits?.crew?.find((c) => c.job === "Director")?.name ?? null;
  const cast: CastMember[] = (d.credits?.cast ?? []).slice(0, 12).map((c) => ({
    name: c.name,
    character: c.character || undefined,
    profilePath: c.profile_path ?? null,
  }));
  return {
    tmdbId: d.id,
    title: d.title,
    overview: d.overview ?? "",
    tagline: d.tagline || null,
    posterUrl: tmdbImage(d.poster_path, "w780"),
    backdropUrl: tmdbImage(d.backdrop_path, "w1280"),
    trailerUrl: pickTrailer(d.videos),
    releaseDate: d.release_date || null,
    releaseYear: d.release_date ? Number(d.release_date.slice(0, 4)) || null : null,
    runtime: d.runtime ?? null,
    originalLanguage: d.original_language ?? null,
    country: d.production_countries?.[0]?.name ?? null,
    director,
    cast,
    ageRating: pickAgeRating(d.release_dates),
    genres: (d.genres ?? []).map((g) => g.name),
  };
}

/** Whether TMDB import is available (env configured). */
export function tmdbConfigured(): boolean {
  return Boolean(process.env.TMDB_ACCESS_TOKEN);
}
