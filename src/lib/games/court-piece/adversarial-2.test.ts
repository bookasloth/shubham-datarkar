import { describe, it, expect } from "vitest";
import { startDeal, applyCommand } from "./engine";
import type { Card, GameState, Rank, Seat, Suit } from "./types";

const c = (rank: Rank, suit: Suit): Card => ({ suit, rank });
const fresh = () =>
  startDeal({ dealNumber: 0, dealer: 0, seed: 4242, totals: [0, 0], lastDealerByTeam: [0, 1] });
const afterTrump = () => applyCommand(fresh(), { type: "SELECT_TRUMP", seat: 1, suit: "H" });

/** Feed passes until the auction closes. */
function passOut(state: GameState): GameState {
  let s = state;
  while (s.phase === "auction") s = applyCommand(s, { type: "PASS", seat: s.auctionTurn });
  return s;
}

describe("auction war — edges", () => {
  it("no raises => trump caller declares at 5", () => {
    const s = passOut(afterTrump());
    expect(s.phase).toBe("playing");
    expect(s.declarer).toBe(1);
    expect(s.contract).toBe(5);
  });

  it("war climbs to the ceiling of 8, then closes on the last raiser", () => {
    let s = afterTrump();
    s = applyCommand(s, { type: "RAISE", seat: s.auctionTurn, call: 6 });
    s = applyCommand(s, { type: "RAISE", seat: s.auctionTurn, call: 7 });
    s = applyCommand(s, { type: "RAISE", seat: s.auctionTurn, call: 8 });
    const last = s.declarer;
    s = passOut(s); // nobody can exceed 8
    expect(s.phase).toBe("playing");
    expect(s.contract).toBe(8);
    expect(s.declarer).toBe(last);
  });

  it("the outbid trump caller can re-enter and raise again", () => {
    let s = afterTrump(); // caller seat 1, floor 5
    s = applyCommand(s, { type: "RAISE", seat: s.auctionTurn, call: 6 }); // seat 2 -> 6
    s = applyCommand(s, { type: "PASS", seat: s.auctionTurn }); // seat 3
    s = applyCommand(s, { type: "PASS", seat: s.auctionTurn }); // seat 0
    expect(s.auctionTurn).toBe(1); // back to the trump caller
    s = applyCommand(s, { type: "RAISE", seat: 1, call: 7 }); // caller re-enters
    expect(s.declarer).toBe(1);
    expect(s.contract).toBe(7);
  });

  it("a raise resets the pass counter (needs 3 fresh passes to close)", () => {
    let s = afterTrump();
    s = applyCommand(s, { type: "PASS", seat: s.auctionTurn }); // pass 1
    s = applyCommand(s, { type: "PASS", seat: s.auctionTurn }); // pass 2
    s = applyCommand(s, { type: "RAISE", seat: s.auctionTurn, call: 6 }); // resets
    expect(s.phase).toBe("auction"); // not closed despite 2 earlier passes
    s = passOut(s);
    expect(s.contract).toBe(6);
  });
});

describe("malformed card / rank tampering", () => {
  function playingWith(p0: Card[]): GameState {
    return { ...afterTrumpToPlaying(), turn: 0, currentTrick: [], ledSuit: null, hands: [p0, [c(6, "D")], [c(6, "C")], [c(7, "C")]] };
  }
  function afterTrumpToPlaying(): GameState {
    return passOut(afterTrump());
  }

  it("rejects a rank outside 6..A", () => {
    const s = playingWith([c(7, "H")]);
    expect(() => applyCommand(s, { type: "PLAY_CARD", seat: 0, card: { rank: 99 as Rank, suit: "H" } })).toThrow();
    expect(() => applyCommand(s, { type: "PLAY_CARD", seat: 0, card: { rank: 5 as Rank, suit: "H" } })).toThrow();
  });

  it("rejects a bad suit", () => {
    const s = playingWith([c(7, "H")]);
    expect(() => applyCommand(s, { type: "PLAY_CARD", seat: 0, card: { rank: 7, suit: "X" as Suit } })).toThrow();
  });

  it("rejects a string rank that would string-match a held card but corrupt removal", () => {
    const s = playingWith([c(7, "H")]);
    // "7" would pass a naive cardId string-compare yet fail strict removal -> duplication
    expect(() => applyCommand(s, { type: "PLAY_CARD", seat: 0, card: { rank: "7" as unknown as Rank, suit: "H" } })).toThrow();
  });
});

describe("malformed raise values", () => {
  it("rejects a non-integer raise", () => {
    const s = afterTrump();
    expect(() => applyCommand(s, { type: "RAISE", seat: s.auctionTurn, call: 6.5 as never })).toThrow();
  });
  it("rejects a string raise value", () => {
    const s = afterTrump();
    expect(() => applyCommand(s, { type: "RAISE", seat: s.auctionTurn, call: "7" as never })).toThrow();
  });
});
