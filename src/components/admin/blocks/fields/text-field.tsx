"use client";
import * as React from "react";
import { cn } from "@/lib/utils";

export function TextField({
  label, value, onChange, multiline, placeholder, className,
}: {
  label?: string; value: string; onChange: (v: string) => void;
  multiline?: boolean; placeholder?: string; className?: string;
}) {
  const cls = cn("w-full rounded-btn border border-border bg-background p-2 text-sm", className);
  return (
    <label className="grid gap-1 text-xs font-medium text-muted-foreground">
      {label}
      {multiline ? (
        <textarea className={cn(cls, "min-h-20")} value={value} placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input className={cls} value={value} placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)} />
      )}
    </label>
  );
}
