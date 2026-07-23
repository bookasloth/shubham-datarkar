/** Core Web Vitals "good" cutoffs (Google) + display formatting. Pure. */

export const GOOD_THRESHOLDS = { LCP: 2500, CLS: 0.1, INP: 200 } as const;

export type VitalName = keyof typeof GOOD_THRESHOLDS;

export const VITAL_LABELS: Record<VitalName, string> = {
  LCP: "Largest Contentful Paint",
  CLS: "Cumulative Layout Shift",
  INP: "Interaction to Next Paint",
};

/** True when the measured value is within Google's "good" range. */
export function isGood(name: VitalName, value: number): boolean {
  return value <= GOOD_THRESHOLDS[name];
}

/** Human-readable value: LCP in seconds, INP in ms, CLS as a bare decimal. */
export function formatVital(name: VitalName, value: number): string {
  if (name === "LCP") return `${(value / 1000).toFixed(2)}s`;
  if (name === "INP") return `${Math.round(value)}ms`;
  // CLS — trim trailing zeros, keep at least "0".
  const cls = value.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
  return cls === "" ? "0" : cls;
}
