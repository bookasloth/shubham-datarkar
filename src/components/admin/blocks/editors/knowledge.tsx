"use client";
import type { ContentBlock, ListItem, RichText } from "@/lib/data/types";
import type { BlockEditorProps } from "../registry";
import { TextField } from "../fields/text-field";
import { RichTextField } from "../fields/rich-text-field";
import { ListField } from "../fields/list-field";
import { NumberField } from "../fields/number-field";
import { RepeaterField } from "../fields/repeater-field";

/* ------------------------------------------------------------------ */
/* takeaways                                                            */
/* ------------------------------------------------------------------ */

type TakeawaysBlock = Extract<ContentBlock, { type: "takeaways" }>;

export function TakeawaysEditor({ block, onChange }: BlockEditorProps<TakeawaysBlock>) {
  return (
    <div className="grid gap-2">
      <TextField
        label="Title (optional)"
        value={block.title ?? ""}
        onChange={(title) => onChange({ ...block, title })}
      />
      <RepeaterField<RichText>
        label="Items"
        items={block.items}
        onChange={(items) => onChange({ ...block, items })}
        create={() => ""}
        renderRow={(item, onItemChange) => (
          <RichTextField
            value={item}
            onChange={(next) => onItemChange(next)}
          />
        )}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* summary                                                              */
/* ------------------------------------------------------------------ */

type SummaryBlock = Extract<ContentBlock, { type: "summary" }>;

export function SummaryEditor({ block, onChange }: BlockEditorProps<SummaryBlock>) {
  return (
    <div className="grid gap-2">
      <TextField
        label="Title (optional)"
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

/* ------------------------------------------------------------------ */
/* prosCons                                                             */
/* ------------------------------------------------------------------ */

type ProsConsBlock = Extract<ContentBlock, { type: "prosCons" }>;

export function ProsConsEditor({ block, onChange }: BlockEditorProps<ProsConsBlock>) {
  return (
    <div className="grid gap-2">
      <ListField
        label="Pros"
        items={block.pros as ListItem[]}
        onChange={(pros) => onChange({ ...block, pros: pros as string[] })}
      />
      <ListField
        label="Cons"
        items={block.cons as ListItem[]}
        onChange={(cons) => onChange({ ...block, cons: cons as string[] })}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* steps                                                                */
/* ------------------------------------------------------------------ */

type StepsBlock = Extract<ContentBlock, { type: "steps" }>;
type StepItem = StepsBlock["items"][number];

export function StepsEditor({ block, onChange }: BlockEditorProps<StepsBlock>) {
  return (
    <RepeaterField<StepItem>
      label="Steps"
      items={block.items}
      onChange={(items) => onChange({ ...block, items })}
      create={() => ({ title: "", detail: "" })}
      renderRow={(item, onItemChange) => (
        <div className="grid gap-2">
          <TextField
            label="Title"
            value={item.title}
            onChange={(title) => onItemChange({ ...item, title })}
          />
          <RichTextField
            label="Detail"
            value={item.detail}
            onChange={(detail) => onItemChange({ ...item, detail })}
          />
        </div>
      )}
    />
  );
}

/* ------------------------------------------------------------------ */
/* timeline                                                             */
/* ------------------------------------------------------------------ */

type TimelineBlock = Extract<ContentBlock, { type: "timeline" }>;
type TimelineItem = TimelineBlock["items"][number];

export function TimelineEditor({ block, onChange }: BlockEditorProps<TimelineBlock>) {
  return (
    <RepeaterField<TimelineItem>
      label="Timeline items"
      items={block.items}
      onChange={(items) => onChange({ ...block, items })}
      create={() => ({ marker: "", title: "" })}
      renderRow={(item, onItemChange) => (
        <div className="grid gap-2">
          <TextField
            label="Marker"
            value={item.marker}
            onChange={(marker) => onItemChange({ ...item, marker })}
          />
          <TextField
            label="Title"
            value={item.title}
            onChange={(title) => onItemChange({ ...item, title })}
          />
          <TextField
            label="Description (optional)"
            value={item.description ?? ""}
            onChange={(description) => onItemChange({ ...item, description })}
          />
        </div>
      )}
    />
  );
}

/* ------------------------------------------------------------------ */
/* references                                                           */
/* ------------------------------------------------------------------ */

type ReferencesBlock = Extract<ContentBlock, { type: "references" }>;
type ReferenceItem = ReferencesBlock["items"][number];

export function ReferencesEditor({ block, onChange }: BlockEditorProps<ReferencesBlock>) {
  return (
    <RepeaterField<ReferenceItem>
      label="References"
      items={block.items}
      onChange={(items) => onChange({ ...block, items })}
      create={() => ({ label: "", href: "" })}
      renderRow={(item, onItemChange) => (
        <div className="grid gap-2">
          <TextField
            label="Label"
            value={item.label}
            onChange={(label) => onItemChange({ ...item, label })}
          />
          <TextField
            label="href"
            value={item.href}
            onChange={(href) => onItemChange({ ...item, href })}
          />
          <TextField
            label="Source (optional)"
            value={item.source ?? ""}
            onChange={(source) => onItemChange({ ...item, source })}
          />
        </div>
      )}
    />
  );
}

/* ------------------------------------------------------------------ */
/* footnotes                                                            */
/* ------------------------------------------------------------------ */

type FootnotesBlock = Extract<ContentBlock, { type: "footnotes" }>;
type FootnoteItem = FootnotesBlock["items"][number];

export function FootnotesEditor({ block, onChange }: BlockEditorProps<FootnotesBlock>) {
  return (
    <RepeaterField<FootnoteItem>
      label="Footnotes"
      items={block.items}
      onChange={(items) => onChange({ ...block, items })}
      create={() => ({ n: 1, text: "" })}
      renderRow={(item, onItemChange) => (
        <div className="grid gap-2">
          <NumberField
            label="Number"
            value={item.n}
            onChange={(n) => onItemChange({ ...item, n })}
          />
          <RichTextField
            label="Text"
            value={item.text}
            onChange={(text) => onItemChange({ ...item, text })}
          />
        </div>
      )}
    />
  );
}
