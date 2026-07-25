"use client";

import { Bookmark } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { cn } from "@/lib/utils";
import { toggleBookmark } from "@/lib/members/bookmark-actions";

export function BookmarkButton({
  resourceId,
  initialBookmarked,
  signedIn,
  returnPath,
}: {
  resourceId: string;
  initialBookmarked: boolean;
  signedIn: boolean;
  returnPath: string;
}) {
  const router = useRouter();
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [, startTransition] = useTransition();

  function onClick() {
    if (!signedIn) {
      router.push(`/login?next=${encodeURIComponent(returnPath)}`);
      return;
    }
    const next = !bookmarked;
    setBookmarked(next); // optimistic
    startTransition(async () => {
      const result = await toggleBookmark(resourceId);
      if (result.error) setBookmarked(!next); // roll back
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={bookmarked}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-btn border px-2.5 py-1.5 text-xs transition-ui",
        bookmarked
          ? "border-foreground bg-foreground text-background"
          : "border-border hover:bg-accent",
      )}
    >
      <Bookmark className={cn("size-3.5", bookmarked && "fill-current")} />
      {bookmarked ? "Saved" : "Bookmark"}
    </button>
  );
}
