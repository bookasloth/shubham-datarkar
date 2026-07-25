import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * The neutral mark for empty states — now a calendar/grid glyph (framed square,
 * header bar, hanger ticks, interior grid) instead of the old triangle+circle.
 * Static and token-driven. `draw` is kept for call-site API compatibility.
 */
export function GeometricMark({
  size = 96,
  draw = true,
  className,
}: {
  size?: number;
  draw?: boolean;
  className?: string;
}) {
  void draw;
  const pad = size * 0.16;
  const inner = size - pad * 2;
  const x = pad;
  const y = pad;
  const headerY = y + inner * 0.24;
  const c1 = x + inner / 3;
  const c2 = x + (inner * 2) / 3;
  const rMid = headerY + (y + inner - headerY) / 2;
  const stroke = "var(--muted-foreground)";
  const grid = "var(--border)";

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={cn("overflow-visible", className)}
      aria-hidden
    >
      {/* frame */}
      <rect x={x} y={y} width={inner} height={inner} rx={size * 0.06} fill="none" stroke={stroke} strokeWidth={1.5} />
      {/* header bar */}
      <line x1={x} y1={headerY} x2={x + inner} y2={headerY} stroke={stroke} strokeWidth={1.5} />
      {/* two hanger ticks */}
      <line x1={x + inner * 0.3} y1={y - size * 0.05} x2={x + inner * 0.3} y2={y + inner * 0.08} stroke="var(--foreground)" strokeWidth={1.5} />
      <line x1={x + inner * 0.7} y1={y - size * 0.05} x2={x + inner * 0.7} y2={y + inner * 0.08} stroke="var(--foreground)" strokeWidth={1.5} />
      {/* interior grid: two columns + one row */}
      <line x1={c1} y1={headerY} x2={c1} y2={y + inner} stroke={grid} strokeWidth={1} />
      <line x1={c2} y1={headerY} x2={c2} y2={y + inner} stroke={grid} strokeWidth={1} />
      <line x1={x} y1={rMid} x2={x + inner} y2={rMid} stroke={grid} strokeWidth={1} />
    </svg>
  );
}
