import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { buildMetadata, breadcrumbSchema } from "@/lib/seo";
import { JsonLd } from "@/components/seo/json-ld";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { getBookGenres, getGenreBySlug, getBooksByGenre } from "@/lib/books/queries";
import { BookGrid } from "@/components/books/book-grid";

export const revalidate = 300;

export async function generateStaticParams() {
  const genres = await getBookGenres();
  return genres.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const genre = await getGenreBySlug(slug);
  if (!genre) return buildMetadata({ title: "Genre", path: `/books/genre/${slug}`, noIndex: true });
  return buildMetadata({
    title: `${genre.name} Books I Recommend`,
    description: `Books about ${genre.name} that I've read and recommend.`,
    path: `/books/genre/${genre.slug}`,
  });
}

export default async function BookGenrePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const genre = await getGenreBySlug(slug);
  if (!genre) notFound();
  const books = await getBooksByGenre(slug);

  return (
    <div className="space-y-6">
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Books", path: "/books" },
          { name: genre.name, path: `/books/genre/${genre.slug}` },
        ])}
      />
      <Breadcrumb items={[{ label: "Books", href: "/books" }, { label: genre.name }]} />
      <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">{genre.name} Books</h1>

      {books.length === 0 ? (
        <p className="rounded-card border border-dashed border-border p-10 text-center text-muted-foreground">
          No {genre.name.toLowerCase()} books here yet.
        </p>
      ) : (
        <BookGrid books={books} />
      )}
    </div>
  );
}
