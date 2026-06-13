"use client";

import * as React from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function Rating({
  value,
  defaultValue = 0,
  max = 5,
  onChange,
  readOnly = false,
  className,
}: {
  value?: number;
  defaultValue?: number;
  max?: number;
  onChange?: (value: number) => void;
  readOnly?: boolean;
  className?: string;
}) {
  const [internal, setInternal] = React.useState(defaultValue);
  const [hover, setHover] = React.useState<number | null>(null);
  const current = value ?? internal;

  function set(n: number) {
    if (readOnly) return;
    setInternal(n);
    onChange?.(n);
  }

  return (
    <div role="radiogroup" aria-label="Rating" className={cn("flex items-center gap-1", className)}>
      {Array.from({ length: max }, (_, i) => i + 1).map((n) => {
        const active = (hover ?? current) >= n;
        return (
          <button
            key={n}
            type="button"
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            aria-pressed={current === n}
            disabled={readOnly}
            onMouseEnter={() => !readOnly && setHover(n)}
            onMouseLeave={() => setHover(null)}
            onFocus={() => !readOnly && setHover(n)}
            onBlur={() => setHover(null)}
            onClick={() => set(n)}
            className="rounded-btn p-0.5 transition-ui focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-default"
          >
            <Star className={cn("size-5 transition-ui", active ? "fill-foreground text-foreground" : "text-muted-foreground/40")} />
          </button>
        );
      })}
    </div>
  );
}
