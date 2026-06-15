"use client";
import type { ContentBlock } from "@/lib/data/types";
import type { BlockEditorProps } from "../registry";
import { SelectField } from "../fields/select-field";
import { TextField } from "../fields/text-field";
import { RichTextField } from "../fields/rich-text-field";

/* ------------------------------------------------------------------ */
/* callout                                                              */
/* ------------------------------------------------------------------ */

type CalloutBlock = Extract<ContentBlock, { type: "callout" }>;

const CALLOUT_VARIANTS = ["default", "info", "accent", "note", "tip", "success", "warning", "error"] as const;
type CalloutVariant = (typeof CALLOUT_VARIANTS)[number];

export function CalloutEditor({ block, onChange }: BlockEditorProps<CalloutBlock>) {
  return (
    <div className="grid gap-2">
      <SelectField<CalloutVariant>
        label="Variant"
        value={(block.variant ?? "default") as CalloutVariant}
        options={CALLOUT_VARIANTS}
        onChange={(variant) => onChange({ ...block, variant })}
      />
      <TextField
        label="Title"
        value={block.title ?? ""}
        onChange={(title) => onChange({ ...block, title })}
      />
      <RichTextField
        label="Text"
        value={block.text}
        onChange={(text) => onChange({ ...block, text })}
      />
    </div>
  );
}
