"use client";

import * as React from "react";
import type { ContentBlock } from "@/lib/data/types";
import { Button } from "@/components/ui/button";

const CORE_TYPES = [
  "lead",
  "p",
  "h2",
  "h3",
  "quote",
  "callout",
  "code",
  "ul",
  "ol",
  "tags",
  "takeaways",
  "divider",
] as const;

function newBlock(type: string): ContentBlock {
  switch (type) {
    case "ul":
    case "ol":
      return { type, items: [""] } as ContentBlock;
    case "tags":
      return { type: "tags", items: [] };
    case "takeaways":
      return { type: "takeaways", items: [""] };
    case "divider":
      return { type: "divider" };
    case "callout":
      return { type: "callout", text: "" };
    case "code":
      return { type: "code", code: "" };
    default:
      return { type, text: "" } as ContentBlock;
  }
}

export function BlockEditor({ initial }: { initial: ContentBlock[] }) {
  const [blocks, setBlocks] = React.useState<ContentBlock[]>(initial.length ? initial : []);
  const [addType, setAddType] = React.useState<string>("p");

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

      {blocks.map((block, i) => (
        <div key={i} className="rounded-card border border-border p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium uppercase text-muted-foreground">
              {block.type}
            </span>
            <div className="flex gap-1">
              <Button type="button" size="sm" variant="ghost" onClick={() => move(i, -1)}>
                ↑
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => move(i, 1)}>
                ↓
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => remove(i)}>
                ✕
              </Button>
            </div>
          </div>
          <BlockFields block={block} onChange={(b) => update(i, b)} />
        </div>
      ))}

      <div className="flex items-center gap-2">
        <select
          value={addType}
          onChange={(e) => setAddType(e.target.value)}
          className="rounded-btn border border-border bg-background px-2 py-1.5 text-sm"
        >
          {CORE_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setBlocks((b) => [...b, newBlock(addType)])}
        >
          Add block
        </Button>
      </div>
    </div>
  );
}

function BlockFields({
  block,
  onChange,
}: {
  block: ContentBlock;
  onChange: (b: ContentBlock) => void;
}) {
  const type = block.type;

  if (type === "divider") return null;

  if (
    type === "p" ||
    type === "lead" ||
    type === "h2" ||
    type === "h3" ||
    type === "quote" ||
    type === "callout"
  ) {
    const raw = (block as { text?: unknown }).text;
    const text = typeof raw === "string" ? raw : JSON.stringify(raw ?? "");
    return (
      <textarea
        className="min-h-20 w-full rounded-btn border border-border bg-background p-2 text-sm"
        value={text}
        onChange={(e) => onChange({ ...block, text: e.target.value } as ContentBlock)}
      />
    );
  }

  if (type === "code") {
    return (
      <textarea
        className="min-h-24 w-full rounded-btn border border-border bg-background p-2 font-mono text-sm"
        value={(block as { code: string }).code}
        onChange={(e) => onChange({ ...block, code: e.target.value } as ContentBlock)}
      />
    );
  }

  if (type === "ul" || type === "ol" || type === "tags" || type === "takeaways") {
    const items = (block as { items: unknown[] }).items.map((x) =>
      typeof x === "string" ? x : JSON.stringify(x),
    );
    return (
      <textarea
        className="min-h-20 w-full rounded-btn border border-border bg-background p-2 text-sm"
        placeholder="one item per line"
        value={items.join("\n")}
        onChange={(e) =>
          onChange({ ...block, items: e.target.value.split("\n").filter(Boolean) } as ContentBlock)
        }
      />
    );
  }

  // Fallback: raw JSON for any advanced block type.
  return (
    <textarea
      className="min-h-24 w-full rounded-btn border border-border bg-background p-2 font-mono text-xs"
      value={JSON.stringify(block, null, 2)}
      onChange={(e) => {
        try {
          onChange(JSON.parse(e.target.value));
        } catch {
          /* ignore until valid JSON */
        }
      }}
    />
  );
}
