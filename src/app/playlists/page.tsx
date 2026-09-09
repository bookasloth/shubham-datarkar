import { Music } from "lucide-react";
import { buildMetadata, playlistCollectionSchema } from "@/lib/seo";
import { JsonLd } from "@/components/seo/json-ld";
import { getPlaylistDirectory } from "@/lib/playlists/queries";
import { FeaturedPlaylist } from "@/components/playlists/featured-playlist";
import { PlaylistSection } from "@/components/playlists/playlist-section";

export const revalidate = 300;

export const metadata = buildMetadata({
  title: "Playlists I Love",
  description:
    "A hand-picked collection of playlists for focus, workouts, late nights and everything between — curated by Shubham and linked straight to Spotify, YouTube, and Apple Music.",
  path: "/playlists",
});

const MAX_FEATURED = 3;

export default async function PlaylistsPage() {
  const { featured, sections, uncategorized } = await getPlaylistDirectory();
  const nothing = sections.length === 0 && uncategorized.length === 0;

  const allForSchema = [
    ...featured,
    ...sections.flatMap((s) => s.playlists),
    ...uncategorized,
  ];
  const seen = new Set<string>();
  const schemaItems = allForSchema
    .filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)))
    .map((p) => ({ title: p.title, path: `/playlists/${p.slug}` }));

  return (
    <div className="space-y-10">
      {schemaItems.length > 0 && (
        <JsonLd
          data={playlistCollectionSchema({
            title: "Playlists I Love",
            description: "A curated directory of music playlists for every mood and moment.",
            path: "/playlists",
            items: schemaItems,
          })}
        />
      )}

      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Handpicked by Shubham
        </p>
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">Playlists</h1>
        <p className="max-w-xl text-sm text-muted-foreground">Music I&apos;ve picked for you.</p>
      </header>

      {nothing ? (
        <EmptyShelf />
      ) : (
        <>
          {featured.slice(0, MAX_FEATURED).map((p, i) => (
            <FeaturedPlaylist key={p.id} playlist={p} priority={i === 0} />
          ))}

          {sections.map((s) => (
            <PlaylistSection key={s.category} title={s.category} playlists={s.playlists} />
          ))}

          {uncategorized.length > 0 && (
            <PlaylistSection title="More Playlists" playlists={uncategorized} />
          )}
        </>
      )}
    </div>
  );
}

function EmptyShelf() {
  return (
    <div className="flex flex-col items-center justify-center rounded-card border border-dashed border-border py-20 text-center">
      <Music className="mb-3 size-8 text-muted-foreground" aria-hidden />
      <p className="font-display text-lg font-semibold">Nothing playing yet.</p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        The first playlists are on their way — check back soon.
      </p>
    </div>
  );
}
