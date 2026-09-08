"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { toggleMyList, getMyListState } from "@/lib/movies/actions";
import type { Movie } from "@/lib/movies/types";
import { MoviesContext, type MoviesContextValue } from "./movies-context";
import { MovieModal } from "./movie-modal";

/**
 * Wraps any page that renders movie cards. Owns the detail modal + the viewer's
 * My List (optimistic; reverts + toasts on failure). It fetches list state on
 * mount rather than taking it from a Server Component — that keeps the movie
 * pages statically renderable (ISR) instead of forcing per-request cookies.
 */
export function MoviesProvider({ children }: { children: React.ReactNode }) {
  const [saved, setSaved] = React.useState<Set<string>>(new Set());
  const [loggedIn, setLoggedIn] = React.useState(false);
  const [current, setCurrent] = React.useState<Movie | null>(null);
  const pending = React.useRef<Set<string>>(new Set());
  const { toast } = useToast();
  const router = useRouter();

  React.useEffect(() => {
    let active = true;
    getMyListState()
      .then((s) => {
        if (!active) return;
        setSaved(new Set(s.savedIds));
        setLoggedIn(s.loggedIn);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const open = React.useCallback((movie: Movie) => setCurrent(movie), []);
  const isSaved = React.useCallback((id: string) => saved.has(id), [saved]);

  const toggle = React.useCallback(
    async (id: string) => {
      if (!loggedIn) {
        toast({
          title: "Sign in to save movies",
          description: "Your list is kept on your account.",
          action: { label: "Sign in", onClick: () => router.push("/login?returnTo=/movies") },
        });
        return;
      }
      if (pending.current.has(id)) return;
      pending.current.add(id);
      const wasSaved = saved.has(id);
      setSaved((s) => {
        const n = new Set(s);
        if (wasSaved) n.delete(id);
        else n.add(id);
        return n;
      });

      const res = await toggleMyList(id);
      pending.current.delete(id);
      if ("error" in res) {
        setSaved((s) => {
          const n = new Set(s);
          if (wasSaved) n.add(id);
          else n.delete(id);
          return n;
        });
        toast({ title: res.error, variant: "danger" });
      }
    },
    [loggedIn, saved, toast, router],
  );

  const value = React.useMemo<MoviesContextValue>(
    () => ({ open, isSaved, toggle, loggedIn }),
    [open, isSaved, toggle, loggedIn],
  );

  return (
    <MoviesContext.Provider value={value}>
      {children}
      <MovieModal movie={current} onClose={() => setCurrent(null)} />
    </MoviesContext.Provider>
  );
}
