import { cn } from "@/lib/utils";
import type { BookWithRelations } from "@/lib/books/types";
import { BookCard } from "./book-card";

/** Responsive cover grid — shelf, genre, search, and My List pages. */
export function BookGrid({ books, className }: { books: BookWithRelations[]; className?: string }) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6",
        className,
      )}
    >
      {books.map((b) => (
        <BookCard key={b.id} book={b} />
      ))}
    </div>
  );
}
