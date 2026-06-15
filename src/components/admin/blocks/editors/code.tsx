"use client";
import type { ContentBlock } from "@/lib/data/types";
import type { BlockEditorProps } from "../registry";
import { TextField } from "../fields/text-field";

type Code = Extract<ContentBlock, { type: "code" }>;
export function CodeEditor({ block, onChange }: BlockEditorProps<Code>) {
  return (
    <div className="grid gap-2">
      <TextField
        label="Code"
        multiline
        value={block.code}
        onChange={(code) => onChange({ ...block, code })}
        className="font-mono"
      />
      <TextField
        label="Language"
        value={block.lang ?? ""}
        onChange={(lang) => onChange({ ...block, lang })}
        placeholder="e.g. ts, js, bash"
      />
      <TextField
        label="Filename"
        value={block.filename ?? ""}
        onChange={(filename) => onChange({ ...block, filename })}
        placeholder="e.g. src/index.ts"
      />
    </div>
  );
}
