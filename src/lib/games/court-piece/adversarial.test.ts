import { describe, it, expect } from "vitest";
import { startDeal, applyCommand } from "./engine";
import type { Card, Command, GameState, Rank, Seat, Suit } from "./types";

const c = (rank: Rank, suit: Suit): Card => ({ suit, rank });
const fresh = () =>
  startDeal({ dealNumber: 0, dealer: 0, seed: 4242, totals: [0, 0], lastDealerByTeam: [0, 1] });

/** fresh -> trump called -> everyone passes -> playing */
function playing(): GameState {
  let s = applyCommand(fresh(), { type: "SELECT_TRUMP", seat: 1, suit: "H" });
  while (s.phase === "auction") s = applyCommand(s, { type: "PASS", seat: s.auctionTurn });
  return s;
}

describe("cheat: playing out of phase / turn", () => {
  it("rejects PLAY_CARD during trump selection", () => {
    const s = fresh();
    expect(() => applyCommand(s, { type: "PLAY_CARD", seat: 1, card: s.hands[1][0] })).toThrow();
  });
  it("rejects PLAY_CARD during the auction", () => {
    const s = applyCommand(fresh(), { type: "SELECT_TRUMP", seat: 1, suit: "H" });
    expect(() => applyCommand(s, { type: "PLAY_CARD", seat: 1, card: s.hands[1][0] })).toThrow();
  });
  it("rejects PLAY_CARD from the wrong seat", () => {
    const s = playing();
    const wrong = ((s.turn + 1) % 4) as Seat;
    expect(() => applyCommand(s, { type: "PLAY_CARD", seat: wrong, card: s.hands[wrong][0] })).toThrow();
  });
  it("rejects a card the player does not hold", () => {
    const s = playing();
    const notMine = s.hands[(s.turn + 1) % 4][0];
    expect(() => applyCommand(s, { type: "PLAY_CARD", seat: s.turn, card: notMine })).toThrow();
  });
});

describe("cheat: reneging (breaking follow-suit)", () => {
  it("rejects an off-suit card while holding the led suit", () => {
    const base = playing();
    const s: GameState = {
      ...base,
      turn: 0,
      currentTrick: [],
      ledSuit: null,
      hands: [
        [c(6, "H")],
        [c(9, "H"), c(9, "S")], // holds hearts AND a spade
        [c(6, "D")],
        [c(6, "C")],
      ],
    };
    const led = applyCommand(s, { type: "PLAY_CARD", seat: 0, card: c(6, "H") }); // leads hearts
    // P1 holds a heart but tries to dump a spade -> renege
    expect(() => applyCommand(led, { type: "PLAY_CARD", seat: 1, card: c(9, "S") })).toThrow();
    // the legal heart is accepted
    expect(() => applyCommand(led, { type: "PLAY_CARD", seat: 1, card: c(9, "H") })).not.toThrow();
  });
});

describe("cheat: trump selection abuse", () => {
  it("rejects a trump call from anyone but the caller", () => {
    expect(() => applyCommand(fresh(), { type: "SELECT_TRUMP", seat: 2, suit: "H" })).toThrow();
  });
  it("rejects a second trump call", () => {
    const s = applyCommand(fresh(), { type: "SELECT_TRUMP", seat: 1, suit: "H" });
    expect(() => applyCommand(s, { type: "SELECT_TRUMP", seat: 1, suit: "S" })).toThrow();
  });
  it("rejects an invalid trump suit", () => {
    expect(() =>
      applyCommand(fresh(), { type: "SELECT_TRUMP", seat: 1, suit: "X" as Suit }),
    ).toThrow();
  });
});

describe("cheat: auction abuse", () => {
  it("rejects a raise out of turn", () => {
    const s = applyCommand(fresh(), { type: "SELECT_TRUMP", seat: 1, suit: "H" });
    const notTurn = ((s.auctionTurn + 1) % 4) as Seat;
    expect(() => applyCommand(s, { type: "RAISE", seat: notTurn, call: 6 })).toThrow();
  });
  it("rejects a raise not above the current contract", () => {
    const s = applyCommand(fresh(), { type: "SELECT_TRUMP", seat: 1, suit: "H" });
    expect(() => applyCommand(s, { type: "RAISE", seat: s.auctionTurn, call: 5 })).toThrow();
  });
  it("rejects a raise above the ceiling of 8", () => {
    const s = applyCommand(fresh(), { type: "SELECT_TRUMP", seat: 1, suit: "H" });
    expect(() => applyCommand(s, { type: "RAISE", seat: s.auctionTurn, call: 9 as never })).toThrow();
  });
  it("rejects a pass out of turn", () => {
    const s = applyCommand(fresh(), { type: "SELECT_TRUMP", seat: 1, suit: "H" });
    const notTurn = ((s.auctionTurn + 2) % 4) as Seat;
    expect(() => applyCommand(s, { type: "PASS", seat: notTurn })).toThrow();
  });
});

describe("cheat: court abuse", () => {
  it("rejects a court call during trump selection", () => {
    expect(() => applyCommand(fresh(), { type: "CALL_COURT", seat: 1 })).toThrow();
  });
});

describe("cheat: garbage & tampering", () => {
  it("rejects an unknown command type", () => {
    expect(() =>
      applyCommand(playing(), { type: "GIVE_ME_52" } as unknown as Command),
    ).toThrow();
  });
  it("does not mutate the input state (purity)", () => {
    const s = playing();
    const snapshot = structuredClone(s);
    applyCommand(s, { type: "PLAY_CARD", seat: s.turn, card: s.hands[s.turn][0] });
    expect(s).toEqual(snapshot); // original untouched
  });
});
