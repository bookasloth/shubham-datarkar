"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { toggleBookList, getBookListState } from "@/lib/books/actions";
import type { BookWithRelations } from "@/lib/books/types";
import { BooksContext, type BooksContextValue } from "./books-context";
import { BookModal } from "./book-modal";

const DEFAULT_STATUS = "want_to_read";

/**
 * Wraps any page that renders book cards. Owns the detail modal + the viewer's
 * My List (optimistic; reverts + toasts on failure). It fetches list state on
 * mount rather than taking it from a Server Component — that keeps the book
 * pages statically renderable (ISR) instead of forcing per-request cookies.
 */
export function BooksProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<Map<string, string>>(new Map());
  const [loggedIn, setLoggedIn] = React.useState(false);
  const [current, setCurrent] = React.useState<BookWithRelations | null>(null);
  const pending = React.useRef<Set<string>>(new Set());
  const { toast } = useToast();
  const router = useRouter();

  React.useEffect(() => {
    let active = true;
    getBookListState()
      .then((s) => {
        if (!active) return;
        setItems(new Map(Object.entries(s.items)));
        setLoggedIn(s.loggedIn);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const open = React.useCallback((book: BookWithRelations) => setCurrent(book), []);
  const isSaved = React.useCallback((id: string) => items.has(id), [items]);

  const toggle = React.useCallback(
    async (id: string, status: string = DEFAULT_STATUS) => {
      if (!loggedIn) {
        toast({
          title: "Sign in to save books",
          description: "Your list is kept on your account.",
          action: { label: "Sign in", onClick: () => router.push("/login?returnTo=/books") },
        });
        return;
      }
      if (pending.current.has(id)) return;
      pending.current.add(id);
      const prevStatus = items.get(id);
      const willClear = prevStatus === status;
      setItems((m) => {
        const n = new Map(m);
        if (willClear) n.delete(id);
        else n.set(id, status);
        return n;
      });

      const res = await toggleBookList(id, status);
      pending.current.delete(id);
      if ("error" in res) {
        setItems((m) => {
          const n = new Map(m);
          if (prevStatus == null) n.delete(id);
          else n.set(id, prevStatus);
          return n;
        });
        toast({ title: res.error, variant: "danger" });
      }
    },
    [loggedIn, items, toast, router],
  );

  const value = React.useMemo<BooksContextValue>(
    () => ({ open, isSaved, toggle, loggedIn }),
    [open, isSaved, toggle, loggedIn],
  );

  return (
    <BooksContext.Provider value={value}>
      {children}
      <BookModal book={current} onClose={() => setCurrent(null)} />
    </BooksContext.Provider>
  );
}
