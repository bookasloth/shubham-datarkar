"use client";
import { cn } from "@/lib/utils";

export function SelectField<T extends string>({
  label, value, options, onChange,
}: {
  label?: string; value: T; options: readonly T[]; onChange: (v: T) => void;
}) {
  return (
    <label className="grid gap-1 text-xs font-medium text-muted-foreground">
      {label}
      <select
        className={cn("rounded-btn border border-border bg-background px-2 py-1.5 text-sm")}
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
      >
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </label>
  );
}
