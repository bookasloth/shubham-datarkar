/** Stable sort by an accessor. Nullish values always sort last (both dirs).
 *  Strings compared case-insensitively. Returns a new array. */
export function sortRows<T>(
  rows: T[],
  get: (r: T) => string | number | null | undefined,
  dir: "asc" | "desc",
): T[] {
  const factor = dir === "asc" ? 1 : -1;
  return [...rows]
    .map((row, i) => ({ row, i }))
    .sort((a, b) => {
      const va = get(a.row);
      const vb = get(b.row);
      const na = va === null || va === undefined;
      const nb = vb === null || vb === undefined;
      if (na && nb) return a.i - b.i;
      if (na) return 1; // nullish last
      if (nb) return -1;
      let cmp: number;
      if (typeof va === "number" && typeof vb === "number") cmp = va - vb;
      else cmp = String(va).toLowerCase().localeCompare(String(vb).toLowerCase());
      return cmp !== 0 ? cmp * factor : a.i - b.i;
    })
    .map((x) => x.row);
}

/** Slice one page; clamps page into [1, pageCount]; pageCount >= 1. */
export function paginate<T>(
  rows: T[],
  page: number,
  pageSize: number,
): { pageRows: T[]; pageCount: number; page: number } {
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const clamped = Math.min(Math.max(1, Math.floor(page) || 1), pageCount);
  const start = (clamped - 1) * pageSize;
  return { pageRows: rows.slice(start, start + pageSize), pageCount, page: clamped };
}

/** Case-insensitive substring filter over an accessor. Blank query → unchanged. */
export function filterRows<T>(rows: T[], query: string, get: (r: T) => string): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter((r) => get(r).toLowerCase().includes(q));
}
