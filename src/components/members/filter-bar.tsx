"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Category, ResourceType } from "@/lib/resources/types";

const SELECT_CLASSES =
  "h-9 rounded-input border border-input bg-background px-2.5 text-xs outline-none transition-ui focus:border-brand";

export function FilterBar({
  types,
  categories,
}: {
  types: ResourceType[];
  categories: Category[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.replace(`${pathname}${next.size ? `?${next}` : ""}`);
  }

  const hasFilters = ["type", "category", "difficulty", "sort", "q"].some((k) => params.get(k));

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        aria-label="Filter by type"
        className={SELECT_CLASSES}
        value={params.get("type") ?? ""}
        onChange={(e) => setParam("type", e.target.value)}
      >
        <option value="">All types</option>
        {types.map((t) => (
          <option key={t.key} value={t.key}>
            {t.label}
          </option>
        ))}
      </select>

      <select
        aria-label="Filter by category"
        className={SELECT_CLASSES}
        value={params.get("category") ?? ""}
        onChange={(e) => setParam("category", e.target.value)}
      >
        <option value="">All categories</option>
        {categories.map((c) => (
          <option key={c.id} value={c.slug}>
            {c.name}
          </option>
        ))}
      </select>

      <select
        aria-label="Filter by difficulty"
        className={SELECT_CLASSES}
        value={params.get("difficulty") ?? ""}
        onChange={(e) => setParam("difficulty", e.target.value)}
      >
        <option value="">Any difficulty</option>
        <option value="beginner">Beginner</option>
        <option value="intermediate">Intermediate</option>
        <option value="advanced">Advanced</option>
      </select>

      <select
        aria-label="Sort"
        className={SELECT_CLASSES}
        value={params.get("sort") ?? "newest"}
        onChange={(e) => setParam("sort", e.target.value === "newest" ? "" : e.target.value)}
      >
        <option value="newest">Newest</option>
        <option value="popular">Popular</option>
      </select>

      {hasFilters && (
        <button
          type="button"
          onClick={() => router.replace(pathname)}
          className="h-9 rounded-btn px-2.5 text-xs text-muted-foreground transition-ui hover:bg-accent hover:text-foreground"
        >
          Clear
        </button>
      )}
    </div>
  );
}
