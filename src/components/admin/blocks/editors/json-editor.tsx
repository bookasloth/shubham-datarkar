"use client";
import type { ContentBlock } from "@/lib/data/types";

export function JsonEditor({ block, onChange }: { block: ContentBlock; onChange: (b: ContentBlock) => void }) {
  return (
    <textarea
      className="min-h-24 w-full rounded-btn border border-border bg-background p-2 font-mono text-xs"
      defaultValue={JSON.stringify(block, null, 2)}
      onChange={(e) => { try { onChange(JSON.parse(e.target.value)); } catch { /* wait for valid JSON */ } }}
    />
  );
}
