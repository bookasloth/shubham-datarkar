import type { ReactNode } from "react";
import { MoviesProvider } from "@/components/movies/movies-provider";
import { MovieNav } from "@/components/movies/movie-nav";

export default function CollectionsLayout({ children }: { children: ReactNode }) {
  return (
    <MoviesProvider>
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <MovieNav />
        {children}
      </div>
    </MoviesProvider>
  );
}
