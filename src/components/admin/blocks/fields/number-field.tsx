"use client";
import { cn } from "@/lib/utils";

export function NumberField({
  label, value, onChange,
}: {
  label?: string; value: number; onChange: (v: number) => void;
}) {
  return (
    <label className="grid gap-1 text-xs font-medium text-muted-foreground">
      {label}
      <input type="number" value={Number.isFinite(value) ? value : 0}
        className={cn("rounded-btn border border-border bg-background p-2 text-sm")}
        onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))} />
    </label>
  );
}
