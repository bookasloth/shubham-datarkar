"use client";
import * as React from "react";
import type { ContentBlock } from "@/lib/data/types";
import type { BlockEditorProps } from "../registry";
import { ListField } from "../fields/list-field";
import { RepeaterField } from "../fields/repeater-field";
import { RichTextField } from "../fields/rich-text-field";
import { TextField } from "../fields/text-field";

/* ------------------------------------------------------------------ */
/* table                                                                */
/* ------------------------------------------------------------------ */

type TableBlock = Extract<ContentBlock, { type: "table" }>;
type TableRow = TableBlock["rows"][number]; // RichText[]

export function TableEditor({ block, onChange }: BlockEditorProps<TableBlock>) {
  return (
    <div className="grid gap-3">
      <ListField
        label="Columns (one per line)"
        items={block.columns}
        onChange={(columns) => onChange({ ...block, columns: columns as string[] })}
      />
      <RepeaterField<TableRow>
        label="Rows"
        items={block.rows}
        onChange={(rows) => onChange({ ...block, rows })}
        create={() => [""]}
        renderRow={(row, onRowChange) => (
          <ListField
            label="Cells (one per line)"
            items={row}
            onChange={(cells) => onRowChange(cells as string[])}
          />
        )}
      />
      <RichTextField
        label="Caption"
        value={block.caption ?? ""}
        onChange={(caption) => onChange({ ...block, caption })}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* comparisonTable                                                       */
/* ------------------------------------------------------------------ */

type ComparisonTableBlock = Extract<ContentBlock, { type: "comparisonTable" }>;
type ComparisonRow = ComparisonTableBlock["rows"][number];

export function ComparisonTableEditor({ block, onChange }: BlockEditorProps<ComparisonTableBlock>) {
  return (
    <div className="grid gap-3">
      <ListField
        label="Columns (one per line)"
        items={block.columns}
        onChange={(columns) => onChange({ ...block, columns: columns as string[] })}
      />
      <RepeaterField<ComparisonRow>
        label="Rows"
        items={block.rows}
        onChange={(rows) => onChange({ ...block, rows })}
        create={() => ({ label: "", cells: [] })}
        renderRow={(row, onRowChange) => (
          <div className="grid gap-2">
            <TextField
              label="Row label"
              value={row.label}
              onChange={(label) => onRowChange({ ...row, label })}
            />
            <ListField
              label="Cells (one per line, text values)"
              items={row.cells as string[]}
              onChange={(cells) => onRowChange({ ...row, cells: cells as string[] })}
            />
          </div>
        )}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* pricing                                                              */
/* ------------------------------------------------------------------ */

export function PricingEditor(_props: BlockEditorProps<Extract<ContentBlock, { type: "pricing" }>>) {
  return (
    <p className="text-xs text-muted-foreground">Uses the site pricing plans. No options.</p>
  );
}
