"use client";

import * as React from "react";
import type { Movie } from "@/lib/movies/types";

/**
 * Shared client state for the movie experience: opening the detail modal from
 * any card, and the viewer's My List (optimistic). Provided by MoviesProvider,
 * which every page rendering cards wraps its content in.
 */
export type MoviesContextValue = {
  open: (movie: Movie) => void;
  isSaved: (id: string) => boolean;
  toggle: (id: string) => void;
  loggedIn: boolean;
};

export const MoviesContext = React.createContext<MoviesContextValue | null>(null);

export function useMovies(): MoviesContextValue {
  const ctx = React.useContext(MoviesContext);
  if (!ctx) throw new Error("useMovies must be used within a MoviesProvider");
  return ctx;
}
