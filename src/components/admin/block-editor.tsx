"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import type { ContentBlock } from "@/lib/data/types";
import { Button } from "@/components/ui/button";
import { registry, type BlockEditorProps } from "@/components/admin/blocks/registry";
import { BlockPalette } from "@/components/admin/blocks/block-palette";
import type { BlockType } from "@/components/admin/blocks/block-types";
import { cn } from "@/lib/utils";

// Thin "+" that sits between blocks — inserts a new block at that gap.
function Inserter({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="group relative flex h-2 items-center justify-center">
      <button
        type="button"
        aria-label="Add component here"
        onClick={onAdd}
        className={cn(
          "flex size-6 items-center justify-center rounded-btn border border-border bg-background text-muted-foreground opacity-0 transition-ui",
          "group-hover:opacity-100 hover:border-brand hover:text-brand focus-visible:opacity-100",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        )}
      >
        <Plus className="size-3.5" />
      </button>
    </div>
  );
}

export function BlockEditor({ initial }: { initial: ContentBlock[] }) {
  const [blocks, setBlocks] = React.useState<ContentBlock[]>(initial.length ? initial : []);
  // Palette open + the index the new block should be inserted at.
  const [palette, setPalette] = React.useState<{ open: boolean; index: number }>({
    open: false,
    index: 0,
  });

  const update = (i: number, next: ContentBlock) =>
    setBlocks((b) => b.map((x, idx) => (idx === i ? next : x)));
  const remove = (i: number) => setBlocks((b) => b.filter((_, idx) => idx !== i));
  const move = (i: number, dir: -1 | 1) =>
    setBlocks((b) => {
      const j = i + dir;
      if (j < 0 || j >= b.length) return b;
      const copy = [...b];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });
  const insertAt = (index: number, type: BlockType) =>
    setBlocks((b) => {
      const copy = [...b];
      copy.splice(index, 0, registry[type].create());
      return copy;
    });

  const openPalette = (index: number) => setPalette({ open: true, index });

  return (
    <div className="grid gap-1">
      <input type="hidden" name="body" value={JSON.stringify(blocks)} readOnly />

      <Inserter onAdd={() => openPalette(0)} />

      {blocks.map((block, i) => {
        const entry = registry[block.type] as { Editor: (p: BlockEditorProps) => React.ReactNode } | undefined;
        const Editor = entry?.Editor;
        return (
          <React.Fragment key={i}>
            <div className="rounded-card border border-border p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium uppercase text-muted-foreground">{block.type}</span>
                <div className="flex gap-1">
                  <Button type="button" size="sm" variant="ghost" onClick={() => move(i, -1)}>↑</Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => move(i, 1)}>↓</Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => remove(i)}>✕</Button>
                </div>
              </div>
              {Editor ? (
                <Editor block={block} onChange={(b) => update(i, b)} />
              ) : (
                <textarea
                  className="min-h-24 w-full rounded-btn border border-border bg-background p-2 font-mono text-xs"
                  defaultValue={JSON.stringify(block, null, 2)}
                  onChange={(e) => { try { update(i, JSON.parse(e.target.value)); } catch { /* ignore */ } }}
                />
              )}
            </div>
            <Inserter onAdd={() => openPalette(i + 1)} />
          </React.Fragment>
        );
      })}

      {/* Big append button at the bottom. */}
      <button
        type="button"
        onClick={() => openPalette(blocks.length)}
        className={cn(
          "mt-2 flex items-center justify-center gap-2 rounded-card border border-dashed border-border bg-background py-4 text-sm font-medium text-muted-foreground transition-ui",
          "hover:border-brand hover:text-brand hover:shadow-sm",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        )}
      >
        <Plus className="size-4" /> Add component
      </button>

      <BlockPalette
        open={palette.open}
        onClose={() => setPalette((p) => ({ ...p, open: false }))}
        onPick={(type) => insertAt(palette.index, type)}
      />
    </div>
  );
}
