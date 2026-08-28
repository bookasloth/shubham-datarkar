import { describe, it, expect } from "vitest";
import { startDeal, applyCommand } from "./engine";
import { botPickTrump, botDecideBid, botPickCard } from "./bots";
import { scoreDeal } from "./scoring";
import type { GameState, Seat, Team } from "./types";

/** Play a whole deal with bots: trump call, a real bot auction, then all 9 tricks. */
function playOut(state: GameState): GameState {
  let s = state;
  s = applyCommand(s, {
    type: "SELECT_TRUMP",
    seat: s.trumpCaller,
    suit: botPickTrump(s.hands[s.trumpCaller].slice(0, 5)),
  });
  while (s.phase === "auction") {
    const seat = s.auctionTurn;
    const bid = botDecideBid(s.hands[seat], s.trump!, s.contract);
    s = bid === "pass"
      ? applyCommand(s, { type: "PASS", seat })
      : applyCommand(s, { type: "RAISE", seat, call: bid });
  }
  while (s.phase === "playing") {
    const seat = s.turn;
    s = applyCommand(s, { type: "PLAY_CARD", seat, card: botPickCard(s.hands[seat], s.currentTrick, s.trump!) });
  }
  return s;
}

const deal = (seed: number) =>
  playOut(startDeal({ dealNumber: 0, dealer: (seed % 4) as Seat, seed, totals: [0, 0], lastDealerByTeam: [0, 1] }));

describe("engine invariants across 500 random bot deals", () => {
  it("every deal resolves cleanly and scores consistently", () => {
    for (let seed = 1; seed <= 500; seed++) {
      const end = deal(seed);

      // exactly 9 tricks, split between the teams, all cards played
      expect(end.trickWinners, `seed ${seed}`).toHaveLength(9);
      expect(end.teamTricks[0] + end.teamTricks[1], `seed ${seed}`).toBe(9);
      expect(end.teamTricks[0]).toBeGreaterThanOrEqual(0);
      expect(end.teamTricks[1]).toBeGreaterThanOrEqual(0);
      expect(end.hands.every((h) => h.length === 0), `seed ${seed}`).toBe(true);
      expect(["deal_complete", "match_complete"]).toContain(end.phase);

      // the running totals equal exactly what scoring says for this deal
      const expected = scoreDeal({
        contract: end.contract,
        declarerTeam: (end.declarer % 2) as Team,
        tricks: end.teamTricks,
        court: end.courtCall,
      });
      expect(end.totals, `seed ${seed}`).toEqual(expected);

      // command log integrity: one log entry + one version bump per command
      expect(end.log.length, `seed ${seed}`).toBe(end.version);
      expect(end.version, `seed ${seed}`).toBeGreaterThan(9);
    }
  });

  it("produces the exact same result for the same seed (determinism)", () => {
    expect(deal(77)).toEqual(deal(77));
  });

  it("produces different deals for different seeds", () => {
    expect(deal(1).trickWinners).not.toEqual(deal(2).trickWinners);
  });
});
