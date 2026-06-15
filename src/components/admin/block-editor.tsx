"use client";

import * as React from "react";
import type { ContentBlock } from "@/lib/data/types";
import { Button } from "@/components/ui/button";
import { BLOCK_TYPES, type BlockGroup } from "@/components/admin/blocks/block-types";
import { registry, type BlockEditorProps } from "@/components/admin/blocks/registry";

const GROUP_ORDER: BlockGroup[] = [
  "Typography", "Lists", "Media", "Quotes", "Code", "Tables", "Callouts",
  "Interactive", "Embeds", "Data & statistics", "Utility", "Conversion", "Knowledge", "Advanced",
];

export function BlockEditor({ initial }: { initial: ContentBlock[] }) {
  const [blocks, setBlocks] = React.useState<ContentBlock[]>(initial.length ? initial : []);
  const [addType, setAddType] = React.useState<ContentBlock["type"]>("p");

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

  return (
    <div className="grid gap-3">
      <input type="hidden" name="body" value={JSON.stringify(blocks)} readOnly />

      {blocks.map((block, i) => {
        const entry = registry[block.type] as { Editor: (p: BlockEditorProps) => React.ReactNode } | undefined;
        const Editor = entry?.Editor;
        return (
          <div key={i} className="rounded-card border border-border p-3">
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
        );
      })}

      <div className="flex items-center gap-2">
        <select
          value={addType}
          onChange={(e) => setAddType(e.target.value as ContentBlock["type"])}
          className="rounded-btn border border-border bg-background px-2 py-1.5 text-sm"
        >
          {GROUP_ORDER.map((group) => (
            <optgroup key={group} label={group}>
              {BLOCK_TYPES.filter((b) => b.group === group).map((b) => (
                <option key={b.type} value={b.type}>{b.label}</option>
              ))}
            </optgroup>
          ))}
        </select>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setBlocks((b) => [...b, registry[addType].create()])}
        >
          Add block
        </Button>
      </div>
    </div>
  );
}
