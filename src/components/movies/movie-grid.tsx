import { cn } from "@/lib/utils";
import type { Movie } from "@/lib/movies/types";
import { MovieCard } from "./movie-card";

/** Responsive poster grid — collection, genre, search, and My List pages. */
export function MovieGrid({ movies, className }: { movies: Movie[]; className?: string }) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6",
        className,
      )}
    >
      {movies.map((m) => (
        <MovieCard key={m.id} movie={m} />
      ))}
    </div>
  );
}
