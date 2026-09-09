import type { ReactNode } from "react";
import { BooksProvider } from "@/components/books/books-provider";
import { BookNav } from "@/components/books/book-nav";

export default function BooksLayout({ children }: { children: ReactNode }) {
  return (
    <BooksProvider>
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <BookNav />
        {children}
      </div>
    </BooksProvider>
  );
}
