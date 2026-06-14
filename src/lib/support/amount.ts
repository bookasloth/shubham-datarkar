import { ITEMS, FEE_PCT } from "./config";

const PRICE = Object.fromEntries(ITEMS.map((i) => [i.key, i.unitPrice])) as Record<string, number>;

export type Amount = {
  /** Displayed support total — what the supporter "gives". */
  base: number;
  /** Cover-fees delta added on top when the box is checked. */
  fee: number;
  /** What actually gets charged at the gateway. */
  total: number;
};

/**
 * Single source of truth for the support total: quantity x unit price, plus an
 * optional cover-fees amount. Pure + synchronous so the UI never waits on it.
 */
export function computeAmount(coffeeQty: number, toffeeQty: number, coversFee: boolean): Amount {
  const c = Math.max(0, Math.floor(Number.isFinite(coffeeQty) ? coffeeQty : 0));
  const t = Math.max(0, Math.floor(Number.isFinite(toffeeQty) ? toffeeQty : 0));
  const base = c * PRICE.coffee + t * PRICE.toffee;
  const fee = coversFee ? Math.round(base * FEE_PCT) : 0;
  return { base, fee, total: base + fee };
}
