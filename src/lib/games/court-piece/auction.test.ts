import { describe, it, expect } from "vitest";
import { resolveAuction, isLegalRaise } from "./auction";
import type { Seat, Contract } from "./types";

const raise = (seat: Seat, call: Contract) => ({ seat, call });

describe("resolveAuction", () => {
  it("with no raises, the trump caller declares at the floor of 5", () => {
    expect(resolveAuction(1, [])).toEqual({ declarer: 1, contract: 5 });
  });

  it("a single raise to 6 makes that seat the declarer", () => {
    expect(resolveAuction(1, [raise(2, 6)])).toEqual({ declarer: 2, contract: 6 });
  });

  it("a bidding war leaves the highest bidder as declarer", () => {
    // trump caller seat 1 floor 5; 2 -> 6, 3 -> 7, 1 -> 8
    expect(resolveAuction(1, [raise(2, 6), raise(3, 7), raise(1, 8)])).toEqual({
      declarer: 1,
      contract: 8,
    });
  });

  it("the dealer's team can win the contract (either team may declare)", () => {
    // trump caller seat 1 (team 1); seat 0 (dealer's team) out-bids to 7
    expect(resolveAuction(1, [raise(2, 6), raise(0, 7)])).toEqual({ declarer: 0, contract: 7 });
  });

  it("rejects a raise that does not exceed the current highest", () => {
    expect(() => resolveAuction(1, [raise(2, 6), raise(3, 6)])).toThrow();
  });
});

describe("isLegalRaise", () => {
  it("must be strictly above the current highest (floor starts at 5)", () => {
    expect(isLegalRaise(6, 5)).toBe(true);
    expect(isLegalRaise(5, 5)).toBe(false);
    expect(isLegalRaise(6, 6)).toBe(false);
    expect(isLegalRaise(8, 7)).toBe(true);
  });

  it("cannot exceed the ceiling of 8 (there is no bid of 9 — court is not bid)", () => {
    expect(isLegalRaise(9 as Contract, 8)).toBe(false);
  });
});
