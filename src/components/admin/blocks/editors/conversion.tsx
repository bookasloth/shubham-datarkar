"use client";
import type { ContentBlock } from "@/lib/data/types";
import type { BlockEditorProps } from "../registry";
import { TextField } from "../fields/text-field";
import { SelectField } from "../fields/select-field";
import { RepeaterField } from "../fields/repeater-field";

/* ------------------------------------------------------------------ */
/* cta                                                                  */
/* ------------------------------------------------------------------ */

type CtaBlock = Extract<ContentBlock, { type: "cta" }>;

export function CtaEditor({ block, onChange }: BlockEditorProps<CtaBlock>) {
  return (
    <div className="grid gap-2">
      <TextField
        label="Title"
        value={block.title}
        onChange={(title) => onChange({ ...block, title })}
      />
      <TextField
        label="Text"
        value={block.text}
        onChange={(text) => onChange({ ...block, text })}
      />
      <TextField
        label="Button label"
        value={block.button}
        onChange={(button) => onChange({ ...block, button })}
      />
      <TextField
        label="href"
        value={block.href}
        onChange={(href) => onChange({ ...block, href })}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* newsletter                                                           */
/* ------------------------------------------------------------------ */

type NewsletterBlock = Extract<ContentBlock, { type: "newsletter" }>;

export function NewsletterEditor({ block, onChange }: BlockEditorProps<NewsletterBlock>) {
  return (
    <div className="grid gap-2">
      <TextField
        label="Title"
        value={block.title}
        onChange={(title) => onChange({ ...block, title })}
      />
      <TextField
        label="Text"
        value={block.text}
        onChange={(text) => onChange({ ...block, text })}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* download                                                             */
/* ------------------------------------------------------------------ */

type DownloadBlock = Extract<ContentBlock, { type: "download" }>;

export function DownloadEditor({ block, onChange }: BlockEditorProps<DownloadBlock>) {
  return (
    <div className="grid gap-2">
      <TextField
        label="Title"
        value={block.title}
        onChange={(title) => onChange({ ...block, title })}
      />
      <TextField
        label="Description"
        value={block.description}
        onChange={(description) => onChange({ ...block, description })}
      />
      <TextField
        label="Meta"
        value={block.meta}
        onChange={(meta) => onChange({ ...block, meta })}
      />
      <TextField
        label="Button label"
        value={block.button ?? ""}
        onChange={(button) => onChange({ ...block, button })}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* buttonGroup                                                          */
/* ------------------------------------------------------------------ */

type ButtonGroupBlock = Extract<ContentBlock, { type: "buttonGroup" }>;
type ButtonItem = ButtonGroupBlock["buttons"][number];

const BTN_VARIANTS = ["default", "outline", "secondary", "ghost"] as const;
type BtnVariant = (typeof BTN_VARIANTS)[number];

export function ButtonGroupEditor({ block, onChange }: BlockEditorProps<ButtonGroupBlock>) {
  return (
    <RepeaterField<ButtonItem>
      label="Buttons"
      items={block.buttons}
      onChange={(buttons) => onChange({ ...block, buttons })}
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
          <SelectField<BtnVariant>
            label="Variant"
            value={(item.variant ?? "default") as BtnVariant}
            options={BTN_VARIANTS}
            onChange={(variant) => onItemChange({ ...item, variant })}
          />
        </div>
      )}
    />
  );
}
