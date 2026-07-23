"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search as SearchIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Standalone search field. Submits to the /search route. Reusable inside the
 * right-brain drawer or anywhere a lightweight search entry point is needed.
 */
export function Search({
  className,
  placeholder = "Search projects, writing…",
  onSubmitted,
}: {
  className?: string;
  placeholder?: string;
  onSubmitted?: () => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        const term = query.trim();
        router.push(term ? `/search?q=${encodeURIComponent(term)}` : "/search");
        onSubmitted?.();
      }}
      className={cn("relative", className)}
    >
      <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        aria-label="Search"
        className="h-10 w-full rounded-input border border-border bg-muted/40 pl-9 pr-3 text-sm text-foreground outline-none transition-ui placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      />
    </form>
  );
}
