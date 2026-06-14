"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export function TagInput({
  defaultTags = [],
  placeholder = "Add a tag…",
  onChange,
  className,
}: {
  defaultTags?: string[];
  placeholder?: string;
  onChange?: (tags: string[]) => void;
  className?: string;
}) {
  const [tags, setTags] = React.useState<string[]>(defaultTags);
  const [draft, setDraft] = React.useState("");

  function commit(tags: string[]) {
    setTags(tags);
    onChange?.(tags);
  }

  function add() {
    const value = draft.trim().replace(/,$/, "");
    if (value && !tags.includes(value)) commit([...tags, value]);
    setDraft("");
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add();
    } else if (e.key === "Backspace" && !draft && tags.length) {
      commit(tags.slice(0, -1));
    }
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-1.5 rounded-input border border-input bg-background p-1.5",
        "focus-within:border-foreground focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring",
        className,
      )}
    >
      {tags.map((tag) => (
        <span key={tag} className="inline-flex items-center gap-1 rounded-btn bg-muted px-2 py-1 text-sm">
          {tag}
          <button
            type="button"
            onClick={() => commit(tags.filter((t) => t !== tag))}
            aria-label={`Remove ${tag}`}
            className="rounded-full text-muted-foreground hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={add}
        placeholder={tags.length ? "" : placeholder}
        className="h-7 min-w-24 flex-1 bg-transparent px-1.5 text-sm outline-none placeholder:text-muted-foreground/70"
        aria-label="Add tag"
      />
    </div>
  );
}
