/**
 * Support module config — single source of truth for items, pricing, fees,
 * currency, and supporter tiers. Edit here; everything downstream follows.
 */

export type ItemKey = "coffee" | "toffee";

export type SupportItem = {
  key: ItemKey;
  label: string;
  /** Rupees per single unit. Fixed — the supporter changes quantity, not price. */
  unitPrice: number;
  /** Quantity presets (units) shown as quick-select chips. */
  presets: number[];
  /** Default selected quantity. */
  defaultQty: number;
};

export const ITEMS: readonly SupportItem[] = [
  { key: "coffee", label: "Coffee", unitPrice: 20, presets: [1, 3, 5], defaultQty: 5 },
  { key: "toffee", label: "Toffee", unitPrice: 5, presets: [2, 5, 10], defaultQty: 5 },
];

/** Cover-fees rate added to the charged amount only (not the displayed total). */
export const FEE_PCT = 0.02;

/** Custom quantity input bounds. */
export const QTY_MIN = 1;
export const QTY_MAX = 1000;

export const CURRENCY = { code: "INR", symbol: "₹" } as const;

export type TierKey = "pillars" | "guardians" | "torchbearers";

export type Tier = {
  key: TierKey;
  label: string;
  /** Minimum lifetime contribution (₹) to reach this tier. */
  min: number;
  /** lucide icon key — mapped to a glyph in the UI. */
  icon: "crown" | "shield" | "flame";
  blurb: string;
};

/** Highest threshold first — `tierFor` relies on this order. */
export const TIERS: readonly Tier[] = [
  { key: "pillars", label: "Pillars", min: 2500, icon: "crown", blurb: "The people holding the roof up." },
  { key: "guardians", label: "Guardians", min: 1000, icon: "shield", blurb: "Steady, generous, always around." },
  // Floor of 1 so every paid supporter lands here — anyone who's given anything is a Torchbearer.
  { key: "torchbearers", label: "Torchbearers", min: 1, icon: "flame", blurb: "Lighting the way early." },
];

/** Format an integer rupee amount: 125 -> "₹125". No decimals for whole amounts. */
export function formatMoney(n: number) {
  return `${CURRENCY.symbol}${Math.round(n).toLocaleString("en-IN")}`;
}

/** Deterministic initials from a name: "Aanya Rao" -> "AR". */
export function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] ?? "";
  const b = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (a + b).toUpperCase() || "?";
}
