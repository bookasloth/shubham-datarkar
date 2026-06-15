"use client";
import type { ContentBlock } from "@/lib/data/types";
import type { BlockEditorProps } from "../registry";
import { TextField } from "../fields/text-field";

/* ------------------------------------------------------------------ */
/* socialEmbed                                                          */
/* ------------------------------------------------------------------ */

type SocialEmbedBlock = Extract<ContentBlock, { type: "socialEmbed" }>;

export function SocialEmbedEditor({ block, onChange }: BlockEditorProps<SocialEmbedBlock>) {
  return (
    <div className="grid gap-2">
      <TextField
        label="Author"
        value={block.author}
        onChange={(author) => onChange({ ...block, author })}
      />
      <TextField
        label="Handle"
        value={block.handle}
        onChange={(handle) => onChange({ ...block, handle })}
      />
      <TextField
        label="Text"
        value={block.text}
        onChange={(text) => onChange({ ...block, text })}
        multiline
      />
      <TextField
        label="Date"
        value={block.date}
        onChange={(date) => onChange({ ...block, date })}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* map                                                                  */
/* ------------------------------------------------------------------ */

type MapBlock = Extract<ContentBlock, { type: "map" }>;

export function MapEditor({ block, onChange }: BlockEditorProps<MapBlock>) {
  return (
    <div className="grid gap-2">
      <TextField
        label="Query"
        value={block.query}
        onChange={(query) => onChange({ ...block, query })}
      />
      <TextField
        label="Label"
        value={block.label}
        onChange={(label) => onChange({ ...block, label })}
      />
    </div>
  );
}
