import { notFound } from "next/navigation";
import { BookEditor } from "@/components/admin/book-editor";
import { BookDeleteButton } from "@/components/admin/book-delete-button";
import {
  getBookByIdAdmin,
  getBookGenreIdsAdmin,
  getBookCollectionIdsAdmin,
  getNotesAdmin,
  getBookPagesAdmin,
  getAllBookGenresAdmin,
  getAllCollectionsAdmin,
} from "@/lib/books/queries";

export const dynamic = "force-dynamic";

export default async function EditBookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [book, genreIds, collectionIds, notes, pages, allGenres, shelves] = await Promise.all([
    getBookByIdAdmin(id),
    getBookGenreIdsAdmin(id),
    getBookCollectionIdsAdmin(id),
    getNotesAdmin(id),
    getBookPagesAdmin(id),
    getAllBookGenresAdmin(),
    getAllCollectionsAdmin(),
  ]);
  if (!book) notFound();

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight">{book.title}</h1>
        <BookDeleteButton id={book.id} title={book.title} />
      </div>
      <BookEditor
        mode="edit"
        book={book}
        genreIds={genreIds}
        collectionIds={collectionIds}
        notes={notes}
        pages={pages}
        allGenres={allGenres}
        allShelves={shelves.map((s) => ({ id: s.id, title: s.title }))}
      />
    </div>
  );
}
