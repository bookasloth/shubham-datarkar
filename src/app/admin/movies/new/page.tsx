import { PageHeader } from "@/components/admin";
import { MovieEditor } from "@/components/admin/movie-editor";
import { getAllGenresAdmin, getAllCollectionsAdmin } from "@/lib/movies/queries";
import { tmdbConfigured } from "@/lib/movies/tmdb";

export const dynamic = "force-dynamic";

export default async function NewMoviePage() {
  const [genres, collections] = await Promise.all([getAllGenresAdmin(), getAllCollectionsAdmin()]);
  return (
    <div>
      <PageHeader title="New movie" description="Search TMDB to auto-fill, then add your rating and review." />
      <MovieEditor
        mode="create"
        allGenres={genres}
        allCollections={collections}
        tmdbConfigured={tmdbConfigured()}
      />
    </div>
  );
}
