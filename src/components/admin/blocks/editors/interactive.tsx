"use client";
import type { ContentBlock } from "@/lib/data/types";
import type { BlockEditorProps } from "../registry";
import { TextField } from "../fields/text-field";
import { RichTextField } from "../fields/rich-text-field";
import { RepeaterField } from "../fields/repeater-field";

/* ------------------------------------------------------------------ */
/* faq                                                                  */
/* ------------------------------------------------------------------ */

type FaqBlock = Extract<ContentBlock, { type: "faq" }>;
type FaqItem = FaqBlock["items"][number];

export function FaqEditor({ block, onChange }: BlockEditorProps<FaqBlock>) {
  return (
    <RepeaterField<FaqItem>
      label="FAQ items"
      items={block.items}
      onChange={(items) => onChange({ ...block, items })}
      create={() => ({ q: "", a: "" })}
      renderRow={(item, onItemChange) => (
        <div className="grid gap-2">
          <TextField
            label="Question"
            value={item.q}
            onChange={(q) => onItemChange({ ...item, q })}
          />
          <RichTextField
            label="Answer"
            value={item.a}
            onChange={(a) => onItemChange({ ...item, a })}
          />
        </div>
      )}
    />
  );
}

/* ------------------------------------------------------------------ */
/* tabs                                                                 */
/* ------------------------------------------------------------------ */

type TabsBlock = Extract<ContentBlock, { type: "tabs" }>;
type TabItem = TabsBlock["items"][number];

export function TabsEditor({ block, onChange }: BlockEditorProps<TabsBlock>) {
  return (
    <RepeaterField<TabItem>
      label="Tabs"
      items={block.items}
      onChange={(items) => onChange({ ...block, items })}
      create={() => ({ label: "", content: "" })}
      renderRow={(item, onItemChange) => (
        <div className="grid gap-2">
          <TextField
            label="Label"
            value={item.label}
            onChange={(label) => onItemChange({ ...item, label })}
          />
          <RichTextField
            label="Content"
            value={item.content}
            onChange={(content) => onItemChange({ ...item, content })}
          />
        </div>
      )}
    />
  );
}

/* ------------------------------------------------------------------ */
/* expand                                                               */
/* ------------------------------------------------------------------ */

type ExpandBlock = Extract<ContentBlock, { type: "expand" }>;

export function ExpandEditor({ block, onChange }: BlockEditorProps<ExpandBlock>) {
  return (
    <div className="grid gap-2">
      <TextField
        label="Summary"
        value={block.summary}
        onChange={(summary) => onChange({ ...block, summary })}
      />
      <RichTextField
        label="Content"
        value={block.content}
        onChange={(content) => onChange({ ...block, content })}
      />
    </div>
  );
}
