/**
 * Pure helpers for the photos admin forms. No I/O, no server-only imports —
 * safe to unit-test in isolation. The server actions in `actions.ts` call
 * these to turn a submitted `FormData` into a DB row.
 */

/** A row shaped for insert/update into the `photos` table (snake_case). */
export type PhotoRow = {
  storage_path: string;
  title: string;
  description: string | null;
  tags: string[];
  sort_order: number;
  published: boolean;
};

/**
 * Parses a comma-separated tag string into a normalized list:
 * trimmed, empties dropped, duplicates removed (first spelling wins),
 * order preserved. Non-string input yields `[]`.
 */
export function parseTags(raw: unknown): string[] {
  if (typeof raw !== "string") return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of raw.split(",")) {
    const tag = part.trim();
    if (!tag || seen.has(tag)) continue;
    seen.add(tag);
    out.push(tag);
  }
  return out;
}

/** Parses a sort-order form value to an integer, defaulting to 0 when blank/invalid. */
export function parseSortOrder(raw: unknown): number {
  const n = Number(String(raw ?? "").trim());
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}

/**
 * Maps a submitted `FormData` to a `photos` row. Trims strings; a blank
 * description becomes `null`; an unchecked checkbox is absent → `published: false`.
 */
export function photoRowFromFormData(formData: FormData): PhotoRow {
  const description = String(formData.get("description") ?? "").trim();
  return {
    storage_path: String(formData.get("storage_path") ?? "").trim(),
    title: String(formData.get("title") ?? "").trim(),
    description: description || null,
    tags: parseTags(formData.get("tags")),
    sort_order: parseSortOrder(formData.get("sort_order")),
    published: formData.get("published") === "on",
  };
}
