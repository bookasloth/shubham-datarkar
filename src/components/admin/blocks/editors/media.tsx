"use client";
import type { ContentBlock, EditorialImage } from "@/lib/data/types";
import type { BlockEditorProps } from "../registry";
import { TextField } from "../fields/text-field";
import { NumberField } from "../fields/number-field";
import { RichTextField } from "../fields/rich-text-field";
import { RepeaterField } from "../fields/repeater-field";
import { ImageField } from "../fields/image-field";

/* ------------------------------------------------------------------ */
/* figure                                                               */
/* ------------------------------------------------------------------ */

type FigureBlock = Extract<ContentBlock, { type: "figure" }>;

export function FigureEditor({ block, onChange }: BlockEditorProps<FigureBlock>) {
  return (
    <div className="grid gap-2">
      <ImageField
        label="Image"
        value={block.image}
        onChange={(image) => onChange({ ...block, image })}
      />
      <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <input
          type="checkbox"
          checked={!!block.featured}
          onChange={(e) => onChange({ ...block, featured: e.target.checked || undefined })}
        />
        Featured
      </label>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* figures                                                              */
/* ------------------------------------------------------------------ */

type FiguresBlock = Extract<ContentBlock, { type: "figures" }>;

export function FiguresEditor({ block, onChange }: BlockEditorProps<FiguresBlock>) {
  return (
    <RepeaterField<EditorialImage>
      label="Images"
      items={block.images}
      onChange={(images) => onChange({ ...block, images })}
      create={() => ({ seed: "", alt: "" })}
      renderRow={(image, onImageChange) => (
        <ImageField
          value={image}
          onChange={onImageChange}
        />
      )}
    />
  );
}

/* ------------------------------------------------------------------ */
/* gallery                                                              */
/* ------------------------------------------------------------------ */

type GalleryBlock = Extract<ContentBlock, { type: "gallery" }>;

export function GalleryEditor({ block, onChange }: BlockEditorProps<GalleryBlock>) {
  return (
    <RepeaterField<EditorialImage>
      label="Images"
      items={block.images}
      onChange={(images) => onChange({ ...block, images })}
      create={() => ({ seed: "", alt: "" })}
      renderRow={(image, onImageChange) => (
        <ImageField
          value={image}
          onChange={onImageChange}
        />
      )}
    />
  );
}

/* ------------------------------------------------------------------ */
/* video                                                                */
/* ------------------------------------------------------------------ */

type VideoBlock = Extract<ContentBlock, { type: "video" }>;

export function VideoEditor({ block, onChange }: BlockEditorProps<VideoBlock>) {
  return (
    <div className="grid gap-2">
      <TextField
        label="ID"
        value={block.id}
        onChange={(id) => onChange({ ...block, id })}
      />
      <TextField
        label="Title"
        value={block.title}
        onChange={(title) => onChange({ ...block, title })}
      />
      <RichTextField
        label="Caption (optional)"
        value={block.caption ?? ""}
        onChange={(caption) => onChange({ ...block, caption })}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* audio                                                                */
/* ------------------------------------------------------------------ */

type AudioBlock = Extract<ContentBlock, { type: "audio" }>;

export function AudioEditor({ block, onChange }: BlockEditorProps<AudioBlock>) {
  return (
    <div className="grid gap-2">
      <TextField
        label="Title"
        value={block.title}
        onChange={(title) => onChange({ ...block, title })}
      />
      <TextField
        label="Subtitle (optional)"
        value={block.subtitle ?? ""}
        onChange={(subtitle) => onChange({ ...block, subtitle: subtitle || undefined })}
      />
      <NumberField
        label="Duration (seconds)"
        value={block.duration ?? 0}
        onChange={(duration) => onChange({ ...block, duration: duration || undefined })}
      />
    </div>
  );
}
