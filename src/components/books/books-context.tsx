"use client";

import * as React from "react";
import type { BookWithRelations } from "@/lib/books/types";

/**
 * Shared client state for the books experience: opening the detail modal from
 * any card, and the viewer's My List (optimistic). Provided by BooksProvider,
 * which every page rendering cards wraps its content in.
 */
export type BooksContextValue = {
  open: (book: BookWithRelations) => void;
  isSaved: (id: string) => boolean;
  toggle: (id: string, status?: string) => void;
  loggedIn: boolean;
};

export const BooksContext = React.createContext<BooksContextValue | null>(null);

export function useBooks(): BooksContextValue {
  const ctx = React.useContext(BooksContext);
  if (!ctx) throw new Error("useBooks must be used within a BooksProvider");
  return ctx;
}
