import Link from "next/link";
import { CldImage } from "next-cloudinary";
import { getAllPhotosAdmin } from "@/lib/photos/queries";
import { Button } from "@/components/ui/button";
import type { Photo } from "@/lib/photos/types";

export const dynamic = "force-dynamic";

export default async function AdminPhotosPage() {
  // Error-surfacing variant (Task 1 carryover): a DB/auth failure throws here
  // and we render a clear error state, so a real failure is never mistaken for
  // an empty gallery.
  let photos: Photo[] | null = null;
  let loadError = false;
  try {
    photos = await getAllPhotosAdmin();
  } catch {
    loadError = true;
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Photos</h1>
        <Button asChild size="sm">
          <Link href="/admin/photos/new">New photo</Link>
        </Button>
      </div>

      {loadError ? (
        <div className="rounded-card border border-danger/40 bg-danger/5 p-4 text-sm text-danger">
          Could not load photos. This is a fetch error, not an empty gallery.
          Check your connection and try again.
        </div>
      ) : photos && photos.length === 0 ? (
        <p className="text-sm text-muted-foreground">No photos yet.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {photos?.map((p) => (
            <Link
              key={p.id}
              href={`/admin/photos/${p.id}`}
              className="group overflow-hidden rounded-card border border-border hover:bg-accent"
            >
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
                <CldImage
                  src={p.cloudinaryPublicId}
                  alt={p.title}
                  fill
                  sizes="(max-width: 640px) 50vw, 33vw"
                  crop="fill"
                  gravity="auto"
                  className="object-cover"
                />
              </div>
              <div className="flex items-start justify-between gap-2 p-3">
                <span className="min-w-0 truncate text-sm font-medium">{p.title}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {p.published ? "Published" : "Draft"} · #{p.sortOrder}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
