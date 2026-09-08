"use client";

import { Plus, Check } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { useMovies } from "./movies-context";

/** Add/remove the movie to the viewer's list. Reads state from MoviesProvider. */
export function MyListButton({
  movieId,
  variant = "outline",
  size = "default",
  iconOnly = false,
  className,
}: {
  movieId: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  iconOnly?: boolean;
  className?: string;
}) {
  const { isSaved, toggle } = useMovies();
  const saved = isSaved(movieId);

  return (
    <Button
      type="button"
      variant={variant}
      size={iconOnly ? "icon" : size}
      aria-pressed={saved}
      aria-label={saved ? "Remove from My List" : "Add to My List"}
      className={className}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(movieId);
      }}
    >
      {saved ? <Check /> : <Plus />}
      {!iconOnly && (saved ? "In My List" : "My List")}
    </Button>
  );
}
