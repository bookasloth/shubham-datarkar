import Link from "next/link";
import { Play } from "lucide-react";
import type { Playlist } from "@/lib/playlists/types";
import { PlaylistCover } from "./playlist-cover";
import { PlatformBadge } from "./platform-badge";

/**
 * Playlist card. The whole card links to the detail page; the Listen button
 * opens the external playlist in a new tab. On desktop the cover lifts and a
 * Listen affordance fades in — the button below stays tappable on mobile.
 */
export function PlaylistCard({ playlist }: { playlist: Playlist }) {
  return (
    <div className="group/card flex flex-col">
      <Link
        href={`/playlists/${playlist.slug}`}
        aria-label={playlist.title}
        className="block outline-none"
      >
        <div className="relative aspect-square overflow-hidden rounded-img border border-border bg-muted">
          <PlaylistCover
            src={playlist.coverUrl}
            alt={playlist.title}
            className="transition-transform duration-300 ease-out group-hover/card:scale-105"
          />
          {/* Hover overlay (desktop enhancement) */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 transition-opacity duration-300 group-hover/card:opacity-100">
            <span className="inline-flex items-center gap-1.5 rounded-btn bg-white/95 px-3 py-1.5 text-sm font-medium text-black">
              <Play className="size-4 fill-current" aria-hidden /> Listen
            </span>
          </div>
        </div>
      </Link>

      <div className="mt-2.5 flex flex-1 flex-col px-0.5">
        <div className="flex items-start justify-between gap-2">
          <Link href={`/playlists/${playlist.slug}`} className="min-w-0 outline-none">
            <p className="line-clamp-1 text-sm font-semibold text-foreground">{playlist.title}</p>
          </Link>
        </div>
        {playlist.description && (
          <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-muted-foreground">
            {playlist.description}
          </p>
        )}
        <div className="mt-2 flex items-center gap-1.5">
          <PlatformBadge platform={playlist.platform} />
          {playlist.mood && (
            <span className="text-[11px] text-muted-foreground">· {playlist.mood}</span>
          )}
        </div>
        <a
          href={playlist.externalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2.5 inline-flex h-8 w-fit items-center gap-1.5 rounded-btn border border-border px-3 text-xs font-medium transition-ui hover:bg-accent hover:text-foreground"
        >
          <Play className="size-3 fill-current" aria-hidden /> Listen
        </a>
      </div>
    </div>
  );
}
