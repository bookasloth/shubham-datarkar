"use client";
import type { ContentBlock } from "@/lib/data/types";
import type { BlockEditorProps } from "../registry";
import { ListField } from "../fields/list-field";
import { RepeaterField } from "../fields/repeater-field";
import { TextField } from "../fields/text-field";

type UlBlock = Extract<ContentBlock, { type: "ul" }>;
export function UlEditor({ block, onChange }: BlockEditorProps<UlBlock>) {
  return (
    <div className="grid gap-2">
      <ListField
        label="Items"
        items={block.items}
        onChange={(items) => onChange({ ...block, items })}
      />
    </div>
  );
}

type OlBlock = Extract<ContentBlock, { type: "ol" }>;
export function OlEditor({ block, onChange }: BlockEditorProps<OlBlock>) {
  return (
    <div className="grid gap-2">
      <ListField
        label="Items"
        items={block.items}
        onChange={(items) => onChange({ ...block, items })}
      />
    </div>
  );
}

type TasklistBlock = Extract<ContentBlock, { type: "tasklist" }>;
type TaskItem = TasklistBlock["items"][number];

export function TasklistEditor({ block, onChange }: BlockEditorProps<TasklistBlock>) {
  return (
    <div className="grid gap-2">
      <RepeaterField<TaskItem>
        label="Items"
        items={block.items}
        onChange={(items) => onChange({ ...block, items })}
        create={() => ({ text: "", done: false })}
        renderRow={(item, onItemChange) => (
          <div className="grid gap-2">
            <TextField
              label="Text"
              value={typeof item.text === "string" ? item.text : ""}
              onChange={(v) => onItemChange({ ...item, text: v })}
            />
            <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <input
                type="checkbox"
                checked={item.done}
                onChange={(e) => onItemChange({ ...item, done: e.target.checked })}
              />
              Done
            </label>
          </div>
        )}
      />
    </div>
  );
}
