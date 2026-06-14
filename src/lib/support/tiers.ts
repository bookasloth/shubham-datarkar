import { TIERS, type Tier } from "./config";

/**
 * Map a lifetime contribution (₹) to a tier, or null if below the lowest
 * threshold. TIERS is ordered highest-first, so the first match wins.
 */
export function tierFor(lifetime: number): Tier | null {
  return TIERS.find((t) => lifetime >= t.min) ?? null;
}

export type { Tier };
