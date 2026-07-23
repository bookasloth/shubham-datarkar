"use client";

import * as React from "react";
import { useReportWebVitals } from "next/web-vitals";
import { BlueprintFrame } from "@/components/blueprint";
import {
  isGood,
  formatVital,
  VITAL_LABELS,
  type VitalName,
} from "./web-vitals-thresholds";

const TRACKED: VitalName[] = ["LCP", "CLS", "INP"];

/**
 * Live Core Web Vitals for THIS page — an SEO-expert's site proving its own
 * speed. Shows only metrics that pass Google's "good" thresholds; a slow
 * visitor's device never surfaces a red number that misrepresents the site.
 * Values are always real (measured, never hardcoded); the block hides entirely
 * until at least one good metric is in.
 */
export function WebVitalsStrip() {
  const [vitals, setVitals] = React.useState<Partial<Record<VitalName, number>>>({});

  useReportWebVitals((metric) => {
    if ((TRACKED as string[]).includes(metric.name)) {
      setVitals((prev) => ({ ...prev, [metric.name as VitalName]: metric.value }));
    }
  });

  const good = TRACKED.filter((n) => {
    const v = vitals[n];
    return v != null && isGood(n, v);
  });

  if (good.length === 0) return null;

  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        This page, measured live
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        {good.map((n) => (
          <BlueprintFrame key={n} variant="dashed" className="p-5">
            <div className="font-display text-3xl font-extrabold tracking-tight">
              {formatVital(n, vitals[n]!)}
            </div>
            <div className="mt-1 text-xs font-medium">{n}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">{VITAL_LABELS[n]}</div>
          </BlueprintFrame>
        ))}
      </div>
    </div>
  );
}
