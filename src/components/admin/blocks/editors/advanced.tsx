"use client";
import type { ContentBlock } from "@/lib/data/types";
import type { BlockEditorProps } from "../registry";
import { TextField } from "../fields/text-field";
import { RichTextField } from "../fields/rich-text-field";
import { RepeaterField } from "../fields/repeater-field";

/* ------------------------------------------------------------------ */
/* authorNote                                                           */
/* ------------------------------------------------------------------ */

type AuthorNoteBlock = Extract<ContentBlock, { type: "authorNote" }>;

export function AuthorNoteEditor({ block, onChange }: BlockEditorProps<AuthorNoteBlock>) {
  return (
    <RichTextField
      label="Text"
      value={block.text}
      onChange={(text) => onChange({ ...block, text })}
    />
  );
}

/* ------------------------------------------------------------------ */
/* expertInsight                                                        */
/* ------------------------------------------------------------------ */

type ExpertInsightBlock = Extract<ContentBlock, { type: "expertInsight" }>;

export function ExpertInsightEditor({ block, onChange }: BlockEditorProps<ExpertInsightBlock>) {
  return (
    <div className="grid gap-2">
      <TextField
        label="Name"
        value={block.name}
        onChange={(name) => onChange({ ...block, name })}
      />
      <TextField
        label="Role"
        value={block.role}
        onChange={(role) => onChange({ ...block, role })}
      />
      <RichTextField
        label="Quote"
        value={block.quote}
        onChange={(quote) => onChange({ ...block, quote })}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* relatedCard                                                          */
/* ------------------------------------------------------------------ */

type RelatedCardBlock = Extract<ContentBlock, { type: "relatedCard" }>;

export function RelatedCardEditor({ block, onChange }: BlockEditorProps<RelatedCardBlock>) {
  return (
    <TextField
      label="Slug"
      value={block.slug}
      onChange={(slug) => onChange({ ...block, slug })}
    />
  );
}

/* ------------------------------------------------------------------ */
/* resourceList                                                         */
/* ------------------------------------------------------------------ */

type ResourceListBlock = Extract<ContentBlock, { type: "resourceList" }>;
type ResourceItem = ResourceListBlock["items"][number];

export function ResourceListEditor({ block, onChange }: BlockEditorProps<ResourceListBlock>) {
  return (
    <RepeaterField<ResourceItem>
      label="Resources"
      items={block.items}
      onChange={(items) => onChange({ ...block, items })}
      create={() => ({ title: "", kind: "", href: "" })}
      renderRow={(item, onItemChange) => (
        <div className="grid gap-2">
          <TextField
            label="Title"
            value={item.title}
            onChange={(title) => onItemChange({ ...item, title })}
          />
          <TextField
            label="Kind"
            value={item.kind}
            onChange={(kind) => onItemChange({ ...item, kind })}
          />
          <TextField
            label="href"
            value={item.href}
            onChange={(href) => onItemChange({ ...item, href })}
          />
        </div>
      )}
    />
  );
}

/* ------------------------------------------------------------------ */
/* quickFacts                                                           */
/* ------------------------------------------------------------------ */

type QuickFactsBlock = Extract<ContentBlock, { type: "quickFacts" }>;
type FactItem = QuickFactsBlock["facts"][number];

export function QuickFactsEditor({ block, onChange }: BlockEditorProps<QuickFactsBlock>) {
  return (
    <div className="grid gap-2">
      <TextField
        label="Title (optional)"
        value={block.title ?? ""}
        onChange={(title) => onChange({ ...block, title })}
      />
      <RepeaterField<FactItem>
        label="Facts"
        items={block.facts}
        onChange={(facts) => onChange({ ...block, facts })}
        create={() => ({ label: "", value: "" })}
        renderRow={(item, onItemChange) => (
          <div className="grid gap-2">
            <TextField
              label="Label"
              value={item.label}
              onChange={(label) => onItemChange({ ...item, label })}
            />
            <TextField
              label="Value"
              value={item.value}
              onChange={(value) => onItemChange({ ...item, value })}
            />
          </div>
        )}
      />
    </div>
  );
}
