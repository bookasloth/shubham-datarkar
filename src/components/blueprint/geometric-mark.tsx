"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { trianglePoints, drawVariants, EASE } from "./blueprint-geometry";

/**
 * Signature construction mark: a dashed triangle overlaid by a filled circle
 * with a triangular notch. Draws itself in on reveal. Monochrome, token-driven.
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
  const reduce = useReducedMotion();
  const animate = draw && !reduce;
  const v = drawVariants(!!reduce || !draw);
  const cx = size * 0.62;
  const cy = size * 0.6;
  const r = size * 0.17;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={cn("overflow-visible", className)}
      aria-hidden
    >
      <motion.polygon
        points={trianglePoints(size)}
        fill="none"
        stroke="var(--muted-foreground)"
        strokeWidth={1}
        strokeDasharray="4 4"
        variants={v}
        initial="initial"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: animate ? 0.9 : 0, ease: EASE }}
      />
      <circle cx={cx} cy={cy} r={r} fill="var(--foreground)" />
      {/* notch: quarter cut so the circle reads as the geometric mark */}
      <path
        d={`M ${cx} ${cy} L ${cx} ${cy - r} A ${r} ${r} 0 0 0 ${cx - r} ${cy} Z`}
        fill="var(--background)"
      />
    </svg>
  );
}
