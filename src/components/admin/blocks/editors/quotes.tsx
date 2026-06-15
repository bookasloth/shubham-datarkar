"use client";
import type { ContentBlock } from "@/lib/data/types";
import type { BlockEditorProps } from "../registry";
import { TextField } from "../fields/text-field";
import { RichTextField } from "../fields/rich-text-field";

type Quote = Extract<ContentBlock, { type: "quote" }>;
export function QuoteEditor({ block, onChange }: BlockEditorProps<Quote>) {
  return (
    <div className="grid gap-2">
      <RichTextField label="Quote" value={block.text} onChange={(text) => onChange({ ...block, text })} />
      <TextField label="Citation" value={block.cite ?? ""} onChange={(cite) => onChange({ ...block, cite })} />
    </div>
  );
}

type Pull = Extract<ContentBlock, { type: "pullquote" }>;
export function PullquoteEditor({ block, onChange }: BlockEditorProps<Pull>) {
  return (
    <div className="grid gap-2">
      <TextField label="Quote" value={block.text} onChange={(text) => onChange({ ...block, text })} />
      <TextField label="Citation" value={block.cite ?? ""} onChange={(cite) => onChange({ ...block, cite })} />
    </div>
  );
}
