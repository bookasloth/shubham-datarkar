"use client";

import { Plus, Check } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { useBooks } from "./books-context";

/** Add/remove the book to the viewer's list. Reads state from BooksProvider. */
export function MyBookListButton({
  bookId,
  variant = "outline",
  size = "default",
  iconOnly = false,
  className,
}: {
  bookId: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  iconOnly?: boolean;
  className?: string;
}) {
  const { isSaved, toggle } = useBooks();
  const saved = isSaved(bookId);

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
        toggle(bookId);
      }}
    >
      {saved ? <Check /> : <Plus />}
      {!iconOnly && (saved ? "In My List" : "My List")}
    </Button>
  );
}
