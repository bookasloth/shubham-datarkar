"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { gridLines, drawVariants, EASE } from "./blueprint-geometry";

// Fixed viewBox; SVG scales to fill the parent via width/height 100%.
const W = 1000;
const H = 600;

/**
 * Faint blueprint background: interior grid lines plus optional circle
 * intersections. Absolutely fills a `relative` parent. Draws in on reveal.
 */
export function CrosshairGrid({
  cell = 50,
  circles = true,
  draw = true,
  className,
}: {
  cell?: number;
  circles?: boolean;
  draw?: boolean;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const animate = draw && !reduce;
  const v = drawVariants(!!reduce || !draw);
  const scaled = cell * (W / 200); // keep ~visual density independent of viewBox
  const { v: vx, h: hy } = gridLines(W, H, scaled);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className={cn("pointer-events-none absolute inset-0 h-full w-full", className)}
      aria-hidden
    >
      {vx.map((x, i) => (
        <motion.line
          key={`v${x}`}
          x1={x}
          y1={0}
          x2={x}
          y2={H}
          stroke="var(--border)"
          strokeWidth={1}
          variants={v}
          initial="initial"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: animate ? 0.8 : 0, ease: EASE, delay: animate ? i * 0.03 : 0 }}
        />
      ))}
      {hy.map((y, i) => (
        <motion.line
          key={`h${y}`}
          x1={0}
          y1={y}
          x2={W}
          y2={y}
          stroke="var(--border)"
          strokeWidth={1}
          variants={v}
          initial="initial"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: animate ? 0.8 : 0, ease: EASE, delay: animate ? i * 0.03 : 0 }}
        />
      ))}
      {circles && (
        <>
          <circle cx={W * 0.25} cy={H * 0.5} r={H * 0.28} fill="none" stroke="var(--border)" strokeWidth={1} />
          <circle cx={W * 0.75} cy={H * 0.5} r={H * 0.28} fill="none" stroke="var(--border)" strokeWidth={1} />
        </>
      )}
    </svg>
  );
}
