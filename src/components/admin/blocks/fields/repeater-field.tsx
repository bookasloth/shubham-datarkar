"use client";
import * as React from "react";
import { Button } from "@/components/ui/button";

export function RepeaterField<T>({
  label, items, onChange, create, renderRow,
}: {
  label?: string;
  items: T[];
  onChange: (items: T[]) => void;
  create: () => T;
  renderRow: (item: T, onItemChange: (next: T) => void, index: number) => React.ReactNode;
}) {
  const set = (i: number, next: T) => onChange(items.map((x, idx) => (idx === i ? next : x)));
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const copy = [...items];
    [copy[i], copy[j]] = [copy[j], copy[i]];
    onChange(copy);
  };
  return (
    <div className="grid gap-2">
      {label && <span className="text-xs font-medium text-muted-foreground">{label}</span>}
      {items.map((item, i) => (
        <div key={i} className="grid gap-2 rounded-btn border border-border/70 p-2">
          <div className="flex justify-end gap-1">
            <Button type="button" size="sm" variant="ghost" onClick={() => move(i, -1)}>↑</Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => move(i, 1)}>↓</Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => remove(i)}>✕</Button>
          </div>
          {renderRow(item, (next) => set(i, next), i)}
        </div>
      ))}
      <Button type="button" size="sm" variant="outline" onClick={() => onChange([...items, create()])}>
        Add item
      </Button>
    </div>
  );
}
