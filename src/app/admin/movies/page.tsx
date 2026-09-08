import Link from "next/link";
import { AdminButton, PageHeader } from "@/components/admin";
import { getAllMoviesAdmin } from "@/lib/movies/queries";
import { RefreshArtworkButton } from "@/components/admin/refresh-artwork-button";
import { MoviesTable } from "./movies-table";

export const dynamic = "force-dynamic";

export default async function AdminMoviesPage() {
  const movies = await getAllMoviesAdmin();
  return (
    <div>
      <PageHeader
        title="Movies"
        description="Every movie in the recommendation library — metadata, ratings, and my reviews."
        actions={
          <div className="flex gap-2">
            <RefreshArtworkButton />
            <AdminButton asChild size="sm" variant="secondary">
              <Link href="/admin/collections">Collections</Link>
            </AdminButton>
            <AdminButton asChild size="sm">
              <Link href="/admin/movies/new">New movie</Link>
            </AdminButton>
          </div>
        }
      />
      <MoviesTable
        rows={movies.map((m) => ({
          id: m.id,
          title: m.title,
          slug: m.slug,
          year: m.releaseYear?.toString() ?? "",
          rating: m.review?.rating != null ? m.review.rating.toFixed(1) : "",
          recommendation: m.review?.recommendationType ?? "",
          published: m.isPublished,
          reviewPublished: m.review?.published ?? false,
          genres: (m.genres ?? []).map((g) => g.name).join(", "),
          updatedAt: m.updatedAt,
        }))}
      />
    </div>
  );
}
