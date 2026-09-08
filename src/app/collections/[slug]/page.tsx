import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { buildMetadata, collectionSchema, breadcrumbSchema } from "@/lib/seo";
import { JsonLd } from "@/components/seo/json-ld";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import {
  getPublishedCollectionBySlug,
  getPublishedCollectionSlugs,
  getPublishedCollections,
} from "@/lib/movies/queries";
import { Poster } from "@/components/movies/poster";
import { MovieGrid } from "@/components/movies/movie-grid";
import { CollectionCard } from "@/components/movies/collection-card";

export const revalidate = 300;

export async function generateStaticParams() {
  const slugs = await getPublishedCollectionSlugs();
  return slugs.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const collection = await getPublishedCollectionBySlug(slug);
  if (!collection) return buildMetadata({ title: "Collection", path: `/collections/${slug}`, noIndex: true });
  const description =
    collection.description ||
    `A curated collection of ${collection.movies?.length ?? 0} movies — hand-picked and reviewed.`;
  const base = buildMetadata({
    title: collection.title,
    description,
    path: `/collections/${collection.slug}`,
  });
  const cover = collection.coverUrl ?? collection.movies?.[0]?.backdropUrl;
  return cover ? { ...base, openGraph: { ...base.openGraph, images: [{ url: cover }] } } : base;
}

export default async function CollectionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const collection = await getPublishedCollectionBySlug(slug);
  if (!collection) notFound();

  const movies = collection.movies ?? [];
  const others = (await getPublishedCollections()).filter((c) => c.id !== collection.id).slice(0, 3);
  const cover = collection.coverUrl ?? movies[0]?.backdropUrl ?? movies[0]?.posterUrl ?? null;

  return (
    <div className="space-y-8">
      <JsonLd
        data={[
          collectionSchema({
            title: collection.title,
            description: collection.description ?? collection.title,
            path: `/collections/${collection.slug}`,
            movies: movies.map((m) => ({ title: m.title, path: `/movies/${m.slug}` })),
          }),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Collections", path: "/collections" },
            { name: collection.title, path: `/collections/${collection.slug}` },
          ]),
        ]}
      />

      <Breadcrumb items={[{ label: "Collections", href: "/collections" }, { label: collection.title }]} />

      <header className="relative overflow-hidden rounded-card border border-border">
        <div className="relative h-[34vh] min-h-[220px] w-full sm:max-h-[380px]">
          <Poster src={cover} alt={collection.title} sizes="100vw" priority />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        </div>
        <div className="absolute inset-x-0 bottom-0 p-5 sm:p-8">
          <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">{collection.title}</h1>
          {collection.description && (
            <p className="mt-2 max-w-2xl text-sm text-foreground/90 sm:text-base">{collection.description}</p>
          )}
          <p className="mt-2 text-xs text-muted-foreground">
            {movies.length} {movies.length === 1 ? "movie" : "movies"}
          </p>
        </div>
      </header>

      {movies.length === 0 ? (
        <p className="rounded-card border border-dashed border-border p-10 text-center text-muted-foreground">
          This collection doesn&apos;t have any movies yet.
        </p>
      ) : (
        <MovieGrid movies={movies} />
      )}

      {others.length > 0 && (
        <section>
          <h2 className="mb-3 px-1 font-display text-lg font-bold tracking-tight sm:text-xl">
            More Collections
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {others.map((c) => (
              <CollectionCard key={c.id} collection={c} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
