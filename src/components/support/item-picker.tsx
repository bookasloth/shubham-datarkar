"use client";

import { Candy, Coffee } from "lucide-react";
import { type SupportItem, QTY_MIN, QTY_MAX, formatMoney } from "@/lib/support/config";
import { cn } from "@/lib/utils";

const ICON = { coffee: Coffee, toffee: Candy } as const;

/** One controlled item row: icon + unit price, quantity chips, units input. */
export function ItemPicker({
  item,
  qty,
  onQty,
}: {
  item: SupportItem;
  qty: number;
  onQty: (n: number) => void;
}) {
  const Icon = ICON[item.key];
  const subtotal = qty * item.unitPrice;

  function clamp(n: number) {
    return Math.min(QTY_MAX, Math.max(QTY_MIN, Math.floor(n || QTY_MIN)));
  }

  return (
    <div className="rounded-card border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-btn border border-border bg-muted/50">
            <Icon className="size-5" />
          </span>
          <div>
            <p className="font-semibold leading-tight">{item.label}</p>
            <p className="text-xs text-muted-foreground">{formatMoney(item.unitPrice)} each</p>
          </div>
        </div>
        <p className="text-sm font-semibold tabular-nums">{formatMoney(subtotal)}</p>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground" aria-hidden>
          ×
        </span>
        {item.presets.map((p) => {
          const active = qty === p;
          return (
            <button
              key={p}
              type="button"
              onClick={() => onQty(p)}
              aria-pressed={active}
              className={cn(
                "size-10 rounded-full border text-sm font-medium tabular-nums transition-ui",
                active
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-background text-foreground hover:-translate-y-px hover:border-foreground",
              )}
            >
              {p}
            </button>
          );
        })}
        <input
          type="number"
          inputMode="numeric"
          min={QTY_MIN}
          max={QTY_MAX}
          value={qty}
          onChange={(e) => onQty(clamp(Number(e.target.value)))}
          aria-label={`${item.label} quantity (units)`}
          className="h-10 w-20 rounded-input border border-input bg-background px-3 text-sm tabular-nums transition-ui focus-visible:border-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        />
        <span className="text-xs text-muted-foreground">units</span>
      </div>
    </div>
  );
}
