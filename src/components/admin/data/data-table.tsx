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
