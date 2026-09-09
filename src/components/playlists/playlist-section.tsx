import type { Playlist } from "@/lib/playlists/types";
import { PlaylistCard } from "./playlist-card";

/** A titled, responsive grid of playlist cards (2-up on mobile → 4-up on desktop). */
export function PlaylistSection({ title, playlists }: { title: string; playlists: Playlist[] }) {
  if (playlists.length === 0) return null;
  return (
    <section>
      <h2 className="mb-4 px-0.5 font-display text-lg font-bold tracking-tight sm:text-xl">{title}</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
        {playlists.map((p) => (
          <PlaylistCard key={p.id} playlist={p} />
        ))}
      </div>
    </section>
  );
}
