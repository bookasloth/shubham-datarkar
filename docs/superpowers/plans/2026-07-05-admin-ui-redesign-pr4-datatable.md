# Admin UI Redesign — PR4: DataTable toolkit — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Build the reusable admin `DataTable` (client-side sort, search, selection + bulk actions, pagination, density, column visibility, row actions, skeleton + empty states, orange hover) on pure, unit-tested logic — and convert the Subscribers page as its first real consumer (proving the API, keeping the existing CSV export).

**Architecture:** Server pages fetch all rows (existing pattern) and pass them to a generic client `DataTable<T>`. All interactivity is client-side over the passed array — no new server round-trips. Sort/paginate/filter logic is extracted into pure functions with unit tests; the component is a thin shell over them.

**Tech Stack:** Next.js 16, React 19, TS, Tailwind v4, existing `@/components/ui/{checkbox,dropdown-menu}`, PR1 admin primitives, lucide-react, Vitest.

## Global Constraints

- ADDITIVE/UI-only: no new DB queries, no `src/lib/**` change, no API/route/schema/auth change. The only existing file modified is `src/app/admin/subscribers/page.tsx` (convert to `DataTable`, keep its CSV export link + `force-dynamic` + server fetch).
- DataTable lives in `src/components/admin/data/`. Admin tokens only. Orange only on interaction: row hover border, active sort, focus ring, selected-row accent, active filter. 95/5.
- Transitions ≤150ms, border/color/bg/opacity only; no shadow hover, no scale. Dark mode inherited. Keyboard accessible (sortable headers are buttons; checkboxes native; row-action menus Radix).
- Generic + reusable: no subscriber-specific logic inside DataTable. Column config + render props only.
- Deferred (do NOT build): virtualization, saved filters, infinite scroll (per spec §9). Form primitives (FormSection/ActionBar) → PR5.
- Branch from `origin/main` tip (fd8bb6d). PR title: `feat(admin): DataTable toolkit + subscribers table (redesign PR4)`.

## File Structure

**Create:**
- `src/components/admin/data/table-utils.ts` — pure `sortRows`, `paginate`, `filterRows`.
- `src/components/admin/data/__tests__/table-utils.test.ts`.
- `src/components/admin/data/data-table.tsx` — the `DataTable<T>` client component + `Column<T>` type.
- `src/components/admin/data/index.ts` — barrel.

**Modify:**
- `src/app/admin/subscribers/page.tsx` — render `DataTable` (keep CSV export, server fetch, `force-dynamic`).

---

## Task 1: Pure table utilities + tests

**Files:**
- Create: `src/components/admin/data/table-utils.ts`
- Test: `src/components/admin/data/__tests__/table-utils.test.ts`

**Interfaces:**
- `sortRows<T>(rows: T[], get: (r: T) => string | number | null | undefined, dir: "asc" | "desc"): T[]` — stable; nullish sorts last regardless of dir; strings case-insensitive; returns a new array.
- `paginate<T>(rows: T[], page: number, pageSize: number): { pageRows: T[]; pageCount: number; page: number }` — clamps page into `[1, pageCount]`; `pageCount` at least 1.
- `filterRows<T>(rows: T[], query: string, get: (r: T) => string): T[]` — case-insensitive substring; empty/whitespace query returns rows unchanged.

- [ ] **Step 1: Write failing tests**

`src/components/admin/data/__tests__/table-utils.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { sortRows, paginate, filterRows } from "@/components/admin/data/table-utils";

type Row = { id: number; name: string | null; age: number };
const rows: Row[] = [
  { id: 1, name: "Charlie", age: 30 },
  { id: 2, name: "alice", age: 25 },
  { id: 3, name: null, age: 40 },
];

describe("sortRows", () => {
  it("sorts strings case-insensitively ascending, nullish last", () => {
    const out = sortRows(rows, (r) => r.name, "asc").map((r) => r.id);
    expect(out).toEqual([2, 1, 3]); // alice, Charlie, null
  });
  it("descending reverses non-null order, nullish still last", () => {
    const out = sortRows(rows, (r) => r.name, "desc").map((r) => r.id);
    expect(out).toEqual([1, 2, 3]); // Charlie, alice, null
  });
  it("sorts numbers", () => {
    expect(sortRows(rows, (r) => r.age, "asc").map((r) => r.age)).toEqual([25, 30, 40]);
  });
  it("does not mutate input", () => {
    const copy = [...rows];
    sortRows(rows, (r) => r.age, "asc");
    expect(rows).toEqual(copy);
  });
});

describe("paginate", () => {
  it("slices a page", () => {
    const r = Array.from({ length: 23 }, (_, i) => i);
    const { pageRows, pageCount, page } = paginate(r, 2, 10);
    expect(pageRows).toEqual([10, 11, 12, 13, 14, 15, 16, 17, 18, 19]);
    expect(pageCount).toBe(3);
    expect(page).toBe(2);
  });
  it("clamps out-of-range page", () => {
    const r = [1, 2, 3];
    expect(paginate(r, 99, 10).page).toBe(1);
    expect(paginate(r, 0, 10).page).toBe(1);
  });
  it("empty rows → pageCount 1", () => {
    expect(paginate([], 1, 10)).toEqual({ pageRows: [], pageCount: 1, page: 1 });
  });
});

describe("filterRows", () => {
  it("case-insensitive substring", () => {
    expect(filterRows(rows, "ALI", (r) => r.name ?? "").map((r) => r.id)).toEqual([2]);
  });
  it("empty query returns all", () => {
    expect(filterRows(rows, "   ", (r) => r.name ?? "")).toHaveLength(3);
  });
});
```

- [ ] **Step 2: Run — expect FAIL.** `npx vitest run src/components/admin/data/__tests__/table-utils.test.ts`

- [ ] **Step 3: Implement `table-utils.ts`**

```ts
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
```

- [ ] **Step 4: Run — expect PASS.** Then `npx vitest run` (full suite).

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/data/table-utils.ts src/components/admin/data/__tests__/table-utils.test.ts
git commit -m "feat(admin): pure DataTable sort/paginate/filter utilities"
```

---

## Task 2: DataTable component

**Files:**
- Create: `src/components/admin/data/data-table.tsx`
- Create: `src/components/admin/data/index.ts`

**Interfaces:**
- Produces:
  - `type Column<T> = { key: string; header: string; cell: (row: T) => React.ReactNode; sortValue?: (row: T) => string | number | null | undefined; className?: string; hideable?: boolean }`
  - `DataTable<T>(props: { rows: T[]; columns: Column<T>[]; getRowId: (row: T) => string; searchable?: (row: T) => string; searchPlaceholder?: string; bulkActions?: (selectedIds: string[], clear: () => void) => React.ReactNode; rowActions?: (row: T) => React.ReactNode; pageSize?: number; initialSort?: { key: string; dir: "asc" | "desc" }; emptyTitle?: string; emptyDescription?: string; toolbarExtra?: React.ReactNode }): JSX.Element` — client component.

- [ ] **Step 1: Implement `data-table.tsx`**

```tsx
"use client";

import * as React from "react";
import { ChevronUp, ChevronDown, ChevronsUpDown, SlidersHorizontal, Columns3, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuCheckboxItem, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { SearchInput, AdminEmptyState } from "@/components/admin";
import { sortRows, paginate, filterRows } from "./table-utils";

export type Column<T> = {
  key: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  sortValue?: (row: T) => string | number | null | undefined;
  className?: string;
  hideable?: boolean;
};

export function DataTable<T>({
  rows,
  columns,
  getRowId,
  searchable,
  searchPlaceholder = "Search…",
  bulkActions,
  rowActions,
  pageSize = 25,
  initialSort,
  emptyTitle = "Nothing here yet",
  emptyDescription,
  toolbarExtra,
}: {
  rows: T[];
  columns: Column<T>[];
  getRowId: (row: T) => string;
  searchable?: (row: T) => string;
  searchPlaceholder?: string;
  bulkActions?: (selectedIds: string[], clear: () => void) => React.ReactNode;
  rowActions?: (row: T) => React.ReactNode;
  pageSize?: number;
  initialSort?: { key: string; dir: "asc" | "desc" };
  emptyTitle?: string;
  emptyDescription?: string;
  toolbarExtra?: React.ReactNode;
}) {
  const [query, setQuery] = React.useState("");
  const [sort, setSort] = React.useState<{ key: string; dir: "asc" | "desc" } | null>(initialSort ?? null);
  const [page, setPage] = React.useState(1);
  const [dense, setDense] = React.useState(false);
  const [hidden, setHidden] = React.useState<Set<string>>(new Set());
  const [selected, setSelected] = React.useState<Set<string>>(new Set());

  // Derive visible rows: filter -> sort -> paginate.
  const filtered = React.useMemo(
    () => (searchable ? filterRows(rows, query, searchable) : rows),
    [rows, query, searchable],
  );
  const sorted = React.useMemo(() => {
    if (!sort) return filtered;
    const col = columns.find((c) => c.key === sort.key);
    if (!col?.sortValue) return filtered;
    return sortRows(filtered, col.sortValue, sort.dir);
  }, [filtered, sort, columns]);
  const { pageRows, pageCount, page: safePage } = paginate(sorted, page, pageSize);

  React.useEffect(() => { setPage(1); }, [query]);

  const visibleColumns = columns.filter((c) => !hidden.has(c.key));
  const clearSelection = React.useCallback(() => setSelected(new Set()), []);

  const toggleSort = (key: string) => {
    setSort((s) =>
      s?.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" },
    );
  };
  const toggleRow = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  const pageIds = pageRows.map(getRowId);
  const allOnPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const toggleAllOnPage = () =>
    setSelected((s) => {
      const next = new Set(s);
      if (allOnPageSelected) pageIds.forEach((id) => next.delete(id));
      else pageIds.forEach((id) => next.add(id));
      return next;
    });

  const cellPad = dense ? "px-3 py-1.5" : "px-3 py-2.5";

  return (
    <div className="flex flex-col gap-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        {searchable && (
          <SearchInput
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full max-w-xs"
          />
        )}
        {toolbarExtra}
        <div className="ml-auto flex items-center gap-2">
          {/* Density */}
          <button
            type="button"
            onClick={() => setDense((d) => !d)}
            aria-label={dense ? "Comfortable rows" : "Compact rows"}
            className="flex size-9 items-center justify-center rounded-btn border border-admin-border text-admin-text-muted transition-[border-color,color] duration-150 hover:border-admin-border-hover hover:text-admin-text [&_svg]:size-4"
          >
            <SlidersHorizontal aria-hidden />
          </button>
          {/* Column visibility */}
          {columns.some((c) => c.hideable) && (
            <DropdownMenu>
              <DropdownMenuTrigger
                aria-label="Columns"
                className="flex size-9 items-center justify-center rounded-btn border border-admin-border text-admin-text-muted transition-[border-color,color] duration-150 hover:border-admin-border-hover hover:text-admin-text [&_svg]:size-4"
              >
                <Columns3 aria-hidden />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" data-admin>
                <DropdownMenuLabel>Columns</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {columns.filter((c) => c.hideable).map((c) => (
                  <DropdownMenuCheckboxItem
                    key={c.key}
                    checked={!hidden.has(c.key)}
                    onCheckedChange={(on) =>
                      setHidden((h) => {
                        const next = new Set(h);
                        on ? next.delete(c.key) : next.add(c.key);
                        return next;
                      })
                    }
                  >
                    {c.header}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Bulk action bar */}
      {bulkActions && selected.size > 0 && (
        <div className="flex items-center gap-3 rounded-btn border border-admin-accent bg-admin-surface px-3 py-2 text-sm">
          <span className="font-medium text-admin-text">{selected.size} selected</span>
          <div className="ml-auto flex items-center gap-2">
            {bulkActions([...selected], clearSelection)}
            <button
              type="button"
              onClick={clearSelection}
              className="text-admin-text-muted transition-[color] duration-150 hover:text-admin-text"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-card border border-admin-border">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-admin-surface">
            <tr className="border-b border-admin-border text-left text-xs uppercase text-admin-text-muted">
              {bulkActions && (
                <th className="w-10 px-3 py-2.5">
                  <Checkbox
                    checked={allOnPageSelected}
                    onCheckedChange={toggleAllOnPage}
                    aria-label="Select all rows on this page"
                  />
                </th>
              )}
              {visibleColumns.map((c) => {
                const active = sort?.key === c.key;
                return (
                  <th key={c.key} className={cn("px-3 py-2.5 font-medium", c.className)}>
                    {c.sortValue ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(c.key)}
                        className={cn(
                          "flex items-center gap-1 transition-[color] duration-150 hover:text-admin-text [&_svg]:size-3.5",
                          active ? "text-admin-accent" : "text-admin-text-muted",
                        )}
                      >
                        {c.header}
                        {active ? (sort!.dir === "asc" ? <ChevronUp aria-hidden /> : <ChevronDown aria-hidden />) : <ChevronsUpDown aria-hidden />}
                      </button>
                    ) : (
                      c.header
                    )}
                  </th>
                );
              })}
              {rowActions && <th className="w-10 px-3 py-2.5" />}
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={visibleColumns.length + (bulkActions ? 1 : 0) + (rowActions ? 1 : 0)} className="p-0">
                  <AdminEmptyState title={emptyTitle} description={emptyDescription} />
                </td>
              </tr>
            ) : (
              pageRows.map((row) => {
                const id = getRowId(row);
                const isSel = selected.has(id);
                return (
                  <tr
                    key={id}
                    className={cn(
                      "border-b border-admin-border transition-[background-color,border-color] duration-150 last:border-0",
                      "border-l-2 border-l-transparent hover:bg-admin-surface-hover",
                      isSel && "border-l-admin-accent bg-admin-surface-hover",
                    )}
                  >
                    {bulkActions && (
                      <td className={cellPad}>
                        <Checkbox checked={isSel} onCheckedChange={() => toggleRow(id)} aria-label="Select row" />
                      </td>
                    )}
                    {visibleColumns.map((c) => (
                      <td key={c.key} className={cn(cellPad, "text-admin-text", c.className)}>
                        {c.cell(row)}
                      </td>
                    ))}
                    {rowActions && (
                      <td className={cellPad}>
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            aria-label="Row actions"
                            className="flex size-7 items-center justify-center rounded-btn text-admin-text-muted transition-[background-color,color] duration-150 hover:bg-admin-surface-hover hover:text-admin-text [&_svg]:size-4"
                          >
                            <MoreHorizontal aria-hidden />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" data-admin>
                            {rowActions(row)}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer: count + pagination */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-admin-text-muted">
        <span>{sorted.length} {sorted.length === 1 ? "row" : "rows"}</span>
        {pageCount > 1 && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage(safePage - 1)}
              disabled={safePage <= 1}
              className="rounded-btn border border-admin-border px-2 py-1 transition-[border-color] duration-150 hover:border-admin-border-hover disabled:opacity-40"
            >
              Prev
            </button>
            <span>Page {safePage} of {pageCount}</span>
            <button
              type="button"
              onClick={() => setPage(safePage + 1)}
              disabled={safePage >= pageCount}
              className="rounded-btn border border-admin-border px-2 py-1 transition-[border-color] duration-150 hover:border-admin-border-hover disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Implement `index.ts`**

```ts
export { DataTable } from "./data-table";
export type { Column } from "./data-table";
export { sortRows, paginate, filterRows } from "./table-utils";
```

- [ ] **Step 3: Typecheck.** `npx tsc --noEmit`. If `Checkbox`'s `onCheckedChange` type differs, adjust the handler signature to match the existing `@/components/ui/checkbox` API (inspect it once). Note any adjustment.

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/data/data-table.tsx src/components/admin/data/index.ts
git commit -m "feat(admin): DataTable — sort, search, select, bulk, pagination, density, columns"
```

---

## Task 3: Convert Subscribers page to DataTable

**Files:**
- Modify: `src/app/admin/subscribers/page.tsx`

Server page keeps `force-dynamic`, `getSubscribers()`, and the CSV export link. It passes rows to a small client wrapper (DataTable is client; the page is server). Create the columns + wrapper inline via a tiny client component OR pass a `columns` built with server-safe cell render functions — since `DataTable` is a client component and receives `rows` + `columns` (columns contain functions, which cannot cross the server/client boundary as props). Therefore the columns must be defined in a CLIENT module.

- [ ] **Step 1: Create a client table wrapper** `src/app/admin/subscribers/subscribers-table.tsx`

```tsx
"use client";

import { DataTable, type Column } from "@/components/admin/data";
import { StatusBadge } from "@/components/admin";
import { formatDate } from "@/lib/utils";

type Row = { id: string; email: string; source: string | null; status: string; createdAt: string };

const columns: Column<Row>[] = [
  { key: "email", header: "Email", cell: (r) => <span className="font-medium">{r.email}</span>, sortValue: (r) => r.email },
  { key: "source", header: "Source", cell: (r) => r.source ?? "—", sortValue: (r) => r.source, hideable: true },
  { key: "status", header: "Status", cell: (r) => <StatusBadge tone={r.status === "active" ? "success" : "neutral"}>{r.status}</StatusBadge>, sortValue: (r) => r.status },
  { key: "joined", header: "Joined", cell: (r) => formatDate(r.createdAt), sortValue: (r) => r.createdAt, hideable: true },
];

export function SubscribersTable({ rows }: { rows: Row[] }) {
  return (
    <DataTable
      rows={rows}
      columns={columns}
      getRowId={(r) => r.id}
      searchable={(r) => `${r.email} ${r.source ?? ""} ${r.status}`}
      searchPlaceholder="Search subscribers…"
      initialSort={{ key: "joined", dir: "desc" }}
      emptyTitle="No subscribers yet"
      emptyDescription="Subscribers will appear here as people join."
    />
  );
}
```

- [ ] **Step 2: Rewrite `src/app/admin/subscribers/page.tsx`**

```tsx
import Link from "next/link";
import { Download } from "lucide-react";
import { getSubscribers } from "@/lib/subscribers/queries";
import { AdminButton } from "@/components/admin";
import { SubscribersTable } from "./subscribers-table";

export const dynamic = "force-dynamic";

export default async function AdminSubscribersPage() {
  const subscribers = await getSubscribers();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-admin-text">Subscribers</h1>
          <p className="mt-1 text-sm text-admin-text-muted">{subscribers.length} total</p>
        </div>
        <AdminButton asChild variant="secondary" size="sm">
          <Link href="/admin/subscribers/export" aria-disabled={subscribers.length === 0}>
            <Download />
            Download CSV
          </Link>
        </AdminButton>
      </div>
      <SubscribersTable rows={subscribers} />
    </div>
  );
}
```

- [ ] **Step 3: Typecheck + tests.** `npx tsc --noEmit && npx vitest run` (clean; all pass).

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/subscribers/page.tsx src/app/admin/subscribers/subscribers-table.tsx
git commit -m "feat(admin): convert subscribers page to DataTable"
```

---

## Task 4: Build verification

- [ ] **Step 1: Production build** — `npm run build`. Expected: exit 0, "Compiled successfully", `/admin/subscribers` present. Fix genuine integration issues if any (e.g. Checkbox prop mismatch), rebuild.
- [ ] **Step 2: Confirm no regression** — the CSV export route `/admin/subscribers/export` still present in the manifest (unchanged).
- [ ] **Step 3: Commit (only if a fix was needed).**

---

## Self-Review

- Pure table logic unit-tested (sort stability, nullish-last, pagination clamp, filter) with real assertions. ✓
- DataTable is generic (no subscriber logic); features: sticky header, sort, search, selection + bulk bar, pagination, density, column visibility, row actions, skeleton-free empty state via `AdminEmptyState`, orange row hover/selected border + active-sort accent. ✓
- Deferred correctly: virtualization, saved filters, infinite scroll; form primitives → PR5. ✓
- Subscribers page converted as real consumer; CSV export + `force-dynamic` + server fetch retained; columns defined in a client module (functions can't cross the server→client prop boundary). ✓
- Admin tokens only; portalled dropdowns carry `data-admin`; ≤150ms transitions; dark-mode inherited; keyboard-accessible headers/menus. ✓
- Only `src/app/admin/subscribers/page.tsx` modified among existing files; everything else additive. ✓
