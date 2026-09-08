import { notFound } from "next/navigation";
import { PageHeader } from "@/components/admin";
import { CollectionEditor, type PickMovie } from "@/components/admin/collection-editor";
import { getCollectionByIdAdmin, getAllMoviesAdmin } from "@/lib/movies/queries";
import type { Movie } from "@/lib/movies/types";

export const dynamic = "force-dynamic";

const toPick = (m: Movie): PickMovie => ({
  id: m.id,
  title: m.title,
  posterUrl: m.posterUrl,
  year: m.releaseYear?.toString() ?? "",
});

export default async function EditCollectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [collection, allMovies] = await Promise.all([getCollectionByIdAdmin(id), getAllMoviesAdmin()]);
  if (!collection) notFound();

  return (
    <div>
      <PageHeader title="Edit collection" description="Rename, describe, and order the movies inside." />
      <CollectionEditor
        mode="edit"
        collection={{
          id: collection.id,
          title: collection.title,
          description: collection.description,
          coverUrl: collection.coverUrl,
          isPublished: collection.isPublished,
        }}
        allMovies={allMovies.map(toPick)}
        initialMovies={(collection.movies ?? []).map(toPick)}
      />
    </div>
  );
}
