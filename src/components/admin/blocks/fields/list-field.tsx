"use client";
import type { ListItem, RichText } from "@/lib/data/types";
import { cn } from "@/lib/utils";

const toLine = (x: ListItem): string =>
  typeof x === "string" ? x
  : Array.isArray(x) ? JSON.stringify(x)
  : typeof x.text === "string" ? x.text
  : JSON.stringify(x.text);

export function ListField({
  label, items, onChange,
}: {
  label?: string; items: ListItem[]; onChange: (items: ListItem[]) => void;
}) {
  // v1: flat string-per-line editing. Nested sub-lists author via JSON in advanced blocks.
  const text = items.map(toLine).join("\n");
  return (
    <label className="grid gap-1 text-xs font-medium text-muted-foreground">
      {label}
      <textarea
        className={cn("min-h-20 w-full rounded-btn border border-border bg-background p-2 text-sm")}
        placeholder="one item per line"
        value={text}
        onChange={(e) => onChange(e.target.value.split("\n").filter(Boolean) as RichText[])}
      />
    </label>
  );
}
