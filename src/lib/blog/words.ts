import type { ContentBlock, RichText, InlineNode } from "@/lib/data/types";

function richTextToString(rt: RichText): string {
  if (typeof rt === "string") return rt;
  return rt
    .map((node: InlineNode) => (typeof node === "string" ? node : "text" in node ? node.text : ""))
    .join(" ");
}

/** Approximate word count across all text-bearing blocks. Best-effort, not exact. */
export function countWords(body: ContentBlock[]): number {
  let text = "";
  for (const block of body) {
    if ("text" in block && block.text != null) {
      text += " " + richTextToString(block.text as RichText);
    }
    if ("items" in block && Array.isArray(block.items)) {
      for (const item of block.items) {
        if (typeof item === "string") text += " " + item;
        else if (Array.isArray(item)) text += " " + richTextToString(item as RichText);
        else if (item && typeof item === "object" && "text" in item) {
          text += " " + richTextToString((item as { text: RichText }).text);
        }
      }
    }
  }
  return text.split(/\s+/).filter(Boolean).length;
}
