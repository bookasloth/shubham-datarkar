"use client";

import * as React from "react";
import { Search, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { BLOCK_TYPES, type BlockType } from "@/components/admin/blocks/block-types";
import { cn } from "@/lib/utils";

const SORTED = [...BLOCK_TYPES].sort((a, b) => a.rank - b.rank);

/**
 * Visual component picker. Opens from a "+" in the block editor.
 * Grid is ordered by blog popularity (rank). Single-click highlights a tile
 * (brand border) and arms the Insert button; double-click inserts instantly.
 */
export function BlockPalette({
  open,
  onClose,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (type: BlockType) => void;
}) {
  const [query, setQuery] = React.useState("");
  const [selected, setSelected] = React.useState<BlockType | null>(null);

  // Reset on close so the next open starts fresh (no setState-in-effect).
  const close = () => {
    setQuery("");
    setSelected(null);
    onClose();
  };

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SORTED;
    return SORTED.filter(
      (b) => b.label.toLowerCase().includes(q) || b.type.toLowerCase().includes(q),
    );
  }, [query]);

  const insert = (type: BlockType) => {
    onPick(type);
    close();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) close(); }}>
      <DialogContent hideClose className="max-w-2xl">
        <div className="flex items-center justify-between gap-3">
          <DialogTitle>Add a component</DialogTitle>
          <button
            type="button"
            disabled={!selected}
            onClick={() => selected && insert(selected)}
            className={cn(
              "inline-flex h-9 items-center gap-1.5 rounded-btn px-4 text-sm font-medium transition-ui",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              selected
                ? "bg-brand text-brand-foreground hover:-translate-y-px hover:shadow-sm"
                : "cursor-not-allowed bg-foreground/70 text-background",
            )}
          >
            <Plus className="size-4" /> Insert
          </button>
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search components…"
            className="pl-9"
          />
        </div>

        <div className="max-h-[55vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {filtered.map((b) => {
              const Icon = b.icon;
              const isSel = selected === b.type;
              return (
                <button
                  key={b.type}
                  type="button"
                  aria-pressed={isSel}
                  onClick={() => setSelected(b.type)}
                  onDoubleClick={() => insert(b.type)}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-card border p-3 text-center transition-ui",
                    "hover:-translate-y-px hover:bg-accent hover:shadow-sm",
                    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                    isSel ? "border-brand bg-accent ring-1 ring-brand" : "border-border",
                  )}
                >
                  <Icon className="size-6 text-foreground" />
                  <span className="text-xs leading-tight text-muted-foreground">{b.label}</span>
                </button>
              );
            })}
            {filtered.length === 0 && (
              <p className="col-span-full py-8 text-center text-sm text-muted-foreground">
                No components match “{query}”.
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
