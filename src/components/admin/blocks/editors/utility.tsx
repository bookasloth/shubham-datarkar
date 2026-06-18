"use client";
import type { ContentBlock } from "@/lib/data/types";
import type { BlockEditorProps } from "../registry";
import { SelectField } from "../fields/select-field";
import { ListField } from "../fields/list-field";

type Divider = Extract<ContentBlock, { type: "divider" }>;
export function DividerEditor(_props: BlockEditorProps<Divider>) {
  return <p className="text-xs text-muted-foreground">No options.</p>;
}

const SPACER_SIZES = ["sm", "md", "lg"] as const;
type SpacerSize = (typeof SPACER_SIZES)[number];

type Spacer = Extract<ContentBlock, { type: "spacer" }>;
export function SpacerEditor({ block, onChange }: BlockEditorProps<Spacer>) {
  return (
    <div className="grid gap-2">
      <SelectField<SpacerSize>
        label="Size"
        value={(block.size ?? "md") as SpacerSize}
        options={SPACER_SIZES}
        onChange={(size) => onChange({ ...block, size })}
      />
    </div>
  );
}

type Tags = Extract<ContentBlock, { type: "tags" }>;
export function TagsEditor({ block, onChange }: BlockEditorProps<Tags>) {
  return (
    <div className="grid gap-2">
      <ListField
        label="Items"
        items={block.items}
        onChange={(items) => onChange({ ...block, items: items as string[] })}
      />
    </div>
  );
}
