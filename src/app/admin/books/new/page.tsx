import { PageHeader } from "@/components/admin";
import { BookEditor } from "@/components/admin/book-editor";
import { getAllBookGenresAdmin, getAllCollectionsAdmin } from "@/lib/books/queries";

export const dynamic = "force-dynamic";

export default async function NewBookPage() {
  const [genres, shelves] = await Promise.all([getAllBookGenresAdmin(), getAllCollectionsAdmin()]);
  return (
    <div>
      <PageHeader title="New book" description="Search Google Books to auto-fill, then add your rating and review." />
      <BookEditor
        mode="create"
        allGenres={genres}
        allShelves={shelves.map((s) => ({ id: s.id, title: s.title }))}
      />
    </div>
  );
}
