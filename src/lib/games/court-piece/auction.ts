import type { Contract, Seat } from "./types";

const FLOOR = 5;
const CEILING = 8;

/** Is `call` a legal raise over the current highest? Must strictly exceed it and
 *  stay within [6, 8]. There is no bid of 9 — court is a mid-deal call, never bid. */
export function isLegalRaise(call: Contract, highestSoFar: number): boolean {
  return Number.isInteger(call) && call > highestSoFar && call >= FLOOR + 1 && call <= CEILING;
}

/** Resolve a completed auction. The trump caller opens at the floor (5); each raise
 *  in order must beat the running highest. Highest bid wins — the declarer is whoever
 *  made it (either team may). With no raises the trump caller declares at 5. */
export function resolveAuction(
  trumpCaller: Seat,
  raises: { seat: Seat; call: Contract }[],
): { declarer: Seat; contract: Contract } {
  let declarer = trumpCaller;
  let contract: Contract = FLOOR;
  for (const r of raises) {
    if (!isLegalRaise(r.call, contract)) {
      throw new Error(`illegal raise ${r.call} over ${contract}`);
    }
    declarer = r.seat;
    contract = r.call;
  }
  return { declarer, contract };
}
