import Link from "next/link";
import { cn } from "@/lib/utils";
import type { Collection } from "@/lib/movies/types";
import { Poster } from "./poster";

/** Wide editorial collection tile — links to the collection page. */
export function CollectionCard({ collection, className }: { collection: Collection; className?: string }) {
  const cover = collection.coverUrl ?? collection.movies?.[0]?.backdropUrl ?? collection.movies?.[0]?.posterUrl ?? null;
  return (
    <Link
      href={`/collections/${collection.slug}`}
      className={cn(
        "group/coll block overflow-hidden rounded-card border border-border outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        className,
      )}
    >
      <div className="relative aspect-video bg-muted">
        <Poster
          src={cover}
          alt={collection.title}
          sizes="(max-width: 640px) 90vw, 320px"
          className="transition-transform duration-300 ease-out group-hover/coll:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-4">
          <h3 className="font-display text-lg font-bold text-white">{collection.title}</h3>
          {typeof collection.movieCount === "number" && (
            <p className="text-xs text-white/70">
              {collection.movieCount} {collection.movieCount === 1 ? "movie" : "movies"}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
