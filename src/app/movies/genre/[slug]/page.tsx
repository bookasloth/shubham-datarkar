import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { buildMetadata, breadcrumbSchema } from "@/lib/seo";
import { JsonLd } from "@/components/seo/json-ld";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { getGenreBySlug, getGenres, getMoviesByGenre } from "@/lib/movies/queries";
import { MovieGrid } from "@/components/movies/movie-grid";

export const revalidate = 300;

export async function generateStaticParams() {
  const genres = await getGenres();
  return genres.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const genre = await getGenreBySlug(slug);
  if (!genre) return buildMetadata({ title: "Genre", path: `/movies/genre/${slug}`, noIndex: true });
  return buildMetadata({
    title: `${genre.name} Movies I Recommend`,
    description: `The ${genre.name.toLowerCase()} films I actually recommend — with my ratings, verdicts, and honest reviews.`,
    path: `/movies/genre/${genre.slug}`,
  });
}

export default async function GenrePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const genre = await getGenreBySlug(slug);
  if (!genre) notFound();
  const movies = await getMoviesByGenre(genre.id);

  return (
    <div className="space-y-6">
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Movies", path: "/movies" },
          { name: genre.name, path: `/movies/genre/${genre.slug}` },
        ])}
      />
      <Breadcrumb items={[{ label: "Movies", href: "/movies" }, { label: genre.name }]} />
      <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">{genre.name}</h1>

      {movies.length === 0 ? (
        <p className="rounded-card border border-dashed border-border p-10 text-center text-muted-foreground">
          No {genre.name.toLowerCase()} movies here yet.
        </p>
      ) : (
        <MovieGrid movies={movies} />
      )}
    </div>
  );
}
