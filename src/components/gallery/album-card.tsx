import Link from "next/link";
import Image from "next/image";
import { ImageIcon } from "lucide-react";
import type { GalleryAlbum } from "@/lib/gallery/types";

export function AlbumCard({ album }: { album: GalleryAlbum }) {
  const count = album.imageCount ?? 0;
  return (
    <Link
      href={`/gallery/${album.slug}`}
      className="group block overflow-hidden rounded-img border border-border bg-muted transition-ui hover:border-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <div className="relative aspect-[4/3] bg-muted">
        {album.coverUrl ? (
          <Image
            src={album.coverUrl}
            alt=""
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <ImageIcon className="size-8 text-muted-foreground" aria-hidden />
          </div>
        )}
      </div>
      <div className="flex items-baseline justify-between gap-3 p-3">
        <span className="truncate text-sm font-medium">{album.title}</span>
        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
          {count} {count === 1 ? "photo" : "photos"}
        </span>
      </div>
    </Link>
  );
}
