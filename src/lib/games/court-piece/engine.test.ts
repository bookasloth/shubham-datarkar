import { describe, it, expect } from "vitest";
import { startDeal, applyCommand, sanitizeFor } from "./engine";
import { botPickTrump, botPickCard } from "./bots";
import type { GameState, Seat } from "./types";

const fresh = () =>
  startDeal({ dealNumber: 0, dealer: 0, seed: 12345, totals: [0, 0], lastDealerByTeam: [0, 1] });

/** Drive a deal to completion: trump caller picks, everyone passes, bots play it out. */
function playOut(state: GameState): GameState {
  let s = state;
  s = applyCommand(s, { type: "SELECT_TRUMP", seat: s.trumpCaller, suit: botPickTrump(s.hands[s.trumpCaller].slice(0, 5)) });
  // three non-declarers pass -> declarer stays the trump caller at 5
  while (s.phase === "auction") s = applyCommand(s, { type: "PASS", seat: s.auctionTurn });
  while (s.phase === "playing") {
    const seat = s.turn;
    s = applyCommand(s, { type: "PLAY_CARD", seat, card: botPickCard(s.hands[seat], s.currentTrick, s.trump!) });
  }
  return s;
}

describe("startDeal", () => {
  it("opens in trump selection with the caller on the dealer's right", () => {
    const s = fresh();
    expect(s.phase).toBe("trump_selection");
    expect(s.trumpCaller).toBe(1);
    expect(s.dealer).toBe(0);
  });
});

describe("SELECT_TRUMP", () => {
  it("sets the trump and moves to the auction", () => {
    let s = fresh();
    s = applyCommand(s, { type: "SELECT_TRUMP", seat: 1, suit: "H" });
    expect(s.trump).toBe("H");
    expect(s.phase).toBe("auction");
  });
  it("rejects a trump call from anyone but the trump caller", () => {
    const s = fresh();
    expect(() => applyCommand(s, { type: "SELECT_TRUMP", seat: 2, suit: "H" })).toThrow();
  });
});

describe("turn & legality enforcement (playing)", () => {
  const start = () => {
    let s = fresh();
    s = applyCommand(s, { type: "SELECT_TRUMP", seat: 1, suit: "H" });
    while (s.phase === "auction") s = applyCommand(s, { type: "PASS", seat: s.auctionTurn });
    return s;
  };

  it("rejects a play from the wrong seat", () => {
    const s = start();
    const wrong = ((s.turn + 1) % 4) as Seat;
    expect(() => applyCommand(s, { type: "PLAY_CARD", seat: wrong, card: s.hands[wrong][0] })).toThrow();
  });

  it("rejects a card the player does not hold", () => {
    const s = start();
    const notMine = s.hands[(s.turn + 1) % 4][0];
    expect(() => applyCommand(s, { type: "PLAY_CARD", seat: s.turn, card: notMine })).toThrow();
  });
});

describe("full deal", () => {
  it("plays 9 tricks, splits them, scores the deal, and logs every command", () => {
    const end = playOut(fresh());
    expect(["deal_complete", "match_complete"]).toContain(end.phase);
    expect(end.teamTricks[0] + end.teamTricks[1]).toBe(9);
    expect(end.trickWinners).toHaveLength(9);
    // totals moved by exactly the deal's scoring (only one side can be non-zero here)
    expect(end.totals[0] + end.totals[1]).not.toBe(0);
    // every command captured for training/audit
    expect(end.log.length).toBeGreaterThan(9);
    expect(end.hands.every((h) => h.length === 0)).toBe(true);
    // the last completed trick is captured (four plays + a winner) for the sweep
    expect(end.lastTrick?.plays).toHaveLength(4);
    expect(end.lastTrick?.winner).toBeGreaterThanOrEqual(0);
  });

  it("has no lastTrick before any trick resolves", () => {
    expect(fresh().lastTrick).toBeNull();
  });
});

describe("court call gating", () => {
  it("cannot be called before six tricks are complete", () => {
    let s = fresh();
    s = applyCommand(s, { type: "SELECT_TRUMP", seat: 1, suit: "H" });
    while (s.phase === "auction") s = applyCommand(s, { type: "PASS", seat: s.auctionTurn });
    expect(() => applyCommand(s, { type: "CALL_COURT", seat: s.turn })).toThrow();
  });
});

describe("sanitizeFor — anti-cheat view", () => {
  it("during trump selection, reveals only the viewer's first 5 and no other cards", () => {
    const s = fresh();
    const view = sanitizeFor(s, 2);
    expect(view.yourHand).toEqual(s.hands[2].slice(0, 5)); // undealt 4 stay hidden
    expect(view.handCounts).toEqual([5, 5, 5, 5]); // counts only, no cards
    expect((view as Record<string, unknown>).hands).toBeUndefined();
  });

  it("after the reveal, shows the viewer their full hand but still hides others", () => {
    let s = fresh();
    s = applyCommand(s, { type: "SELECT_TRUMP", seat: 1, suit: "H" });
    const view = sanitizeFor(s, 2);
    expect(view.yourHand).toEqual(s.hands[2]); // all 9 now
    expect(view.handCounts).toEqual([9, 9, 9, 9]);
    expect((view as Record<string, unknown>).hands).toBeUndefined();
  });
});
