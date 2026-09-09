import { notFound } from "next/navigation";
import { PageHeader } from "@/components/admin";
import { ShelfEditor, type PickBook } from "@/components/admin/shelf-editor";
import { getCollectionByIdAdmin, getBooksForPickerAdmin, type BookPickerEntry } from "@/lib/books/queries";
import type { BookWithRelations } from "@/lib/books/types";

export const dynamic = "force-dynamic";

// getCollectionByIdAdmin returns full BookWithRelations for its member books (already
// ordered by sort_order), while the picker returns the lighter BookPickerEntry — field
// names differ (publicationYear vs year), so two small mappers instead of one shared toPick.
const toPickFromBook = (b: BookWithRelations): PickBook => ({
  id: b.id,
  title: b.title,
  coverUrl: b.coverUrl,
  year: b.publicationYear?.toString() ?? "",
});

const toPickFromPicker = (b: BookPickerEntry): PickBook => ({
  id: b.id,
  title: b.title,
  coverUrl: b.coverUrl,
  year: b.year?.toString() ?? "",
});

export default async function EditShelfPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [shelf, allBooks] = await Promise.all([getCollectionByIdAdmin(id), getBooksForPickerAdmin()]);
  if (!shelf) notFound();

  return (
    <div>
      <PageHeader title="Edit shelf" description="Rename, describe, and order the books inside." />
      <ShelfEditor
        mode="edit"
        shelf={{
          id: shelf.collection.id,
          title: shelf.collection.title,
          description: shelf.collection.description,
          coverUrl: shelf.collection.coverUrl,
          isPublished: shelf.collection.isPublished,
        }}
        allBooks={allBooks.map(toPickFromPicker)}
        initialBooks={(shelf.books ?? []).map(toPickFromBook)}
      />
    </div>
  );
}
