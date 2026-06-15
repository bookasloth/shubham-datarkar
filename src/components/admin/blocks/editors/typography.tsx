"use client";
import type { ContentBlock } from "@/lib/data/types";
import type { BlockEditorProps } from "../registry";
import { TextField } from "../fields/text-field";
import { RichTextField } from "../fields/rich-text-field";

type H2 = Extract<ContentBlock, { type: "h2" }>;
export function H2Editor({ block, onChange }: BlockEditorProps<H2>) {
  return (
    <div className="grid gap-2">
      <TextField label="Text" value={block.text} onChange={(text) => onChange({ ...block, text })} />
    </div>
  );
}

type H3 = Extract<ContentBlock, { type: "h3" }>;
export function H3Editor({ block, onChange }: BlockEditorProps<H3>) {
  return (
    <div className="grid gap-2">
      <TextField label="Text" value={block.text} onChange={(text) => onChange({ ...block, text })} />
    </div>
  );
}

type H4 = Extract<ContentBlock, { type: "h4" }>;
export function H4Editor({ block, onChange }: BlockEditorProps<H4>) {
  return (
    <div className="grid gap-2">
      <TextField label="Text" value={block.text} onChange={(text) => onChange({ ...block, text })} />
    </div>
  );
}

type Lead = Extract<ContentBlock, { type: "lead" }>;
export function LeadEditor({ block, onChange }: BlockEditorProps<Lead>) {
  return (
    <div className="grid gap-2">
      <RichTextField label="Text" value={block.text} onChange={(text) => onChange({ ...block, text })} />
    </div>
  );
}

type P = Extract<ContentBlock, { type: "p" }>;
export function PEditor({ block, onChange }: BlockEditorProps<P>) {
  return (
    <div className="grid gap-2">
      <RichTextField label="Text" value={block.text} onChange={(text) => onChange({ ...block, text })} />
    </div>
  );
}

type Small = Extract<ContentBlock, { type: "small" }>;
export function SmallEditor({ block, onChange }: BlockEditorProps<Small>) {
  return (
    <div className="grid gap-2">
      <RichTextField label="Text" value={block.text} onChange={(text) => onChange({ ...block, text })} />
    </div>
  );
}

type Caption = Extract<ContentBlock, { type: "caption" }>;
export function CaptionEditor({ block, onChange }: BlockEditorProps<Caption>) {
  return (
    <div className="grid gap-2">
      <RichTextField label="Text" value={block.text} onChange={(text) => onChange({ ...block, text })} />
    </div>
  );
}
