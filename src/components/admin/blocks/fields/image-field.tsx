"use client";
import type { EditorialImage } from "@/lib/data/types";
import { TextField } from "./text-field";

export function ImageField({
  label, value, onChange,
}: {
  label?: string; value: EditorialImage; onChange: (v: EditorialImage) => void;
}) {
  return (
    <div className="grid gap-2 rounded-btn border border-border/70 p-2">
      {label && <span className="text-xs font-medium text-muted-foreground">{label}</span>}
      <TextField label="Seed" value={value.seed} onChange={(seed) => onChange({ ...value, seed })} />
      <TextField label="Alt" value={value.alt} onChange={(alt) => onChange({ ...value, alt })} />
      <TextField label="Ratio (e.g. 16/9)" value={value.ratio ?? ""} onChange={(ratio) => onChange({ ...value, ratio })} />
    </div>
  );
}
