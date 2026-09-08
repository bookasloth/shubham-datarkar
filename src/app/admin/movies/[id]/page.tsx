import { notFound } from "next/navigation";
import { MovieEditor } from "@/components/admin/movie-editor";
import { MovieDeleteButton } from "@/components/admin/movie-delete-button";
import {
  getMovieByIdAdmin,
  getMovieGenreIdsAdmin,
  getMovieCollectionIdsAdmin,
  getAllGenresAdmin,
  getAllCollectionsAdmin,
} from "@/lib/movies/queries";
import { tmdbConfigured } from "@/lib/movies/tmdb";

export const dynamic = "force-dynamic";

export default async function EditMoviePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [movie, genreIds, collectionIds, allGenres, allCollections] = await Promise.all([
    getMovieByIdAdmin(id),
    getMovieGenreIdsAdmin(id),
    getMovieCollectionIdsAdmin(id),
    getAllGenresAdmin(),
    getAllCollectionsAdmin(),
  ]);
  if (!movie) notFound();

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Edit movie</h1>
        <MovieDeleteButton id={movie.id} title={movie.title} />
      </div>
      <MovieEditor
        mode="edit"
        movie={movie}
        genreIds={genreIds}
        collectionIds={collectionIds}
        allGenres={allGenres}
        allCollections={allCollections}
        tmdbConfigured={tmdbConfigured()}
      />
    </div>
  );
}
