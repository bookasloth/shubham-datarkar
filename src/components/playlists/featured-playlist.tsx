import Link from "next/link";
import { Play, ArrowRight } from "lucide-react";
import type { Playlist } from "@/lib/playlists/types";
import { PlaylistCover } from "./playlist-cover";
import { PlatformBadge } from "./platform-badge";

/** Large editorial presentation for a featured playlist. */
export function FeaturedPlaylist({ playlist, priority }: { playlist: Playlist; priority?: boolean }) {
  return (
    <section className="overflow-hidden rounded-card border border-border bg-card">
      <div className="flex flex-col sm:flex-row">
        <Link
          href={`/playlists/${playlist.slug}`}
          className="group/cover relative aspect-square w-full shrink-0 overflow-hidden bg-muted sm:w-64 md:w-72"
          aria-label={playlist.title}
        >
          <PlaylistCover
            src={playlist.coverUrl}
            alt={playlist.title}
            sizes="(max-width: 640px) 100vw, 288px"
            priority={priority}
            className="transition-transform duration-300 ease-out group-hover/cover:scale-105"
          />
        </Link>

        <div className="flex min-w-0 flex-1 flex-col justify-center gap-3 p-5 sm:p-7">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Featured
            </span>
            <PlatformBadge platform={playlist.platform} />
          </div>
          <h2 className="font-display text-2xl font-bold leading-tight tracking-tight sm:text-3xl">
            <Link href={`/playlists/${playlist.slug}`} className="hover:underline">
              {playlist.title}
            </Link>
          </h2>
          {playlist.description && (
            <p className="line-clamp-3 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              {playlist.description}
            </p>
          )}
          {(playlist.creatorName || playlist.mood) && (
            <p className="text-xs text-muted-foreground">
              {[playlist.creatorName, playlist.mood].filter(Boolean).join(" · ")}
            </p>
          )}
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <a
              href={playlist.externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center gap-1.5 rounded-btn bg-foreground px-5 text-sm font-medium text-background transition-ui hover:opacity-90"
            >
              <Play className="size-4 fill-current" aria-hidden /> Listen now
            </a>
            <Link
              href={`/playlists/${playlist.slug}`}
              className="inline-flex h-11 items-center gap-1.5 rounded-btn border border-border px-5 text-sm font-medium transition-ui hover:bg-accent"
            >
              Details <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
