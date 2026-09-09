import Link from "next/link";
import { cn } from "@/lib/utils";
import type { BookCollection } from "@/lib/books/types";
import { Poster } from "@/components/movies/poster";

/** Wide editorial shelf tile — links to the shelf page. */
export function BookShelfCard({ shelf, className }: { shelf: BookCollection; className?: string }) {
  return (
    <Link
      href={`/books/shelf/${shelf.slug}`}
      className={cn(
        "group/coll block overflow-hidden rounded-card border border-border outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        className,
      )}
    >
      <div className="relative aspect-video bg-muted">
        <Poster
          src={shelf.coverUrl}
          alt={shelf.title}
          sizes="(max-width: 640px) 90vw, 320px"
          className="transition-transform duration-300 ease-out group-hover/coll:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-4">
          <h3 className="font-display text-lg font-bold text-white">{shelf.title}</h3>
          {shelf.description && <p className="line-clamp-1 text-xs text-white/70">{shelf.description}</p>}
        </div>
      </div>
    </Link>
  );
}
