import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { buildMetadata, collectionSchema, breadcrumbSchema } from "@/lib/seo";
import { JsonLd } from "@/components/seo/json-ld";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { getCollectionBySlug, getPublishedCollectionSlugs } from "@/lib/books/queries";
import { Poster } from "@/components/movies/poster";
import { BookGrid } from "@/components/books/book-grid";

export const revalidate = 300;

export async function generateStaticParams() {
  const slugs = await getPublishedCollectionSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const result = await getCollectionBySlug(slug);
  if (!result) return buildMetadata({ title: "Shelf", path: `/books/shelf/${slug}`, noIndex: true });
  const { collection, books } = result;
  const base = buildMetadata({
    title: collection.title,
    description: collection.description || `A curated shelf of ${books.length} books.`,
    path: `/books/shelf/${slug}`,
  });
  const cover = collection.coverUrl ?? books[0]?.backdropUrl ?? books[0]?.coverUrl;
  return cover ? { ...base, openGraph: { ...base.openGraph, images: [{ url: cover }] } } : base;
}

export default async function BookShelfPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const result = await getCollectionBySlug(slug);
  if (!result) notFound();
  const { collection, books } = result;
  const cover = collection.coverUrl ?? books[0]?.backdropUrl ?? books[0]?.coverUrl ?? null;

  return (
    <div className="space-y-8">
      <JsonLd
        data={[
          collectionSchema({
            title: collection.title,
            description: collection.description ?? `A curated shelf of ${books.length} books.`,
            path: `/books/shelf/${slug}`,
            movies: books.map((b) => ({ title: b.title, path: `/books/${b.slug}` })),
          }),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Books", path: "/books" },
            { name: collection.title, path: `/books/shelf/${slug}` },
          ]),
        ]}
      />

      <Breadcrumb items={[{ label: "Books", href: "/books" }, { label: collection.title }]} />

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
            {books.length} {books.length === 1 ? "book" : "books"}
          </p>
        </div>
      </header>

      {books.length === 0 ? (
        <p className="rounded-card border border-dashed border-border p-10 text-center text-muted-foreground">
          This shelf doesn&apos;t have any books yet.
        </p>
      ) : (
        <BookGrid books={books} />
      )}
    </div>
  );
}
