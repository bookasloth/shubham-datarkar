import { describe, it, expect } from "vitest";
import { startDeal, applyCommand } from "./engine";
import { botPickCard } from "./bots";
import type { Card, GameState, Rank, Seat, Suit } from "./types";

const c = (rank: Rank, suit: Suit): Card => ({ suit, rank });

/** Build a state parked at the last-three point (team0 has swept the first 6),
 *  with rigged 3-card hands and spades as trump. */
function atLastThree(hands: [Card[], Card[], Card[], Card[]]): GameState {
  const s = startDeal({ dealNumber: 0, dealer: 0, seed: 1, totals: [0, 0], lastDealerByTeam: [0, 1] });
  return {
    ...s,
    phase: "playing",
    trump: "S",
    hands,
    turn: 0,
    currentTrick: [],
    ledSuit: null,
    trickWinners: [0, 0, 0, 0, 0, 0],
    teamTricks: [6, 0],
  };
}

function botFinish(state: GameState): GameState {
  let s = state;
  while (s.phase === "playing") {
    const seat = s.turn;
    s = applyCommand(s, { type: "PLAY_CARD", seat, card: botPickCard(s.hands[seat], s.currentTrick, s.trump!) });
  }
  return s;
}

describe("court — made (caller sweeps all nine)", () => {
  it("P0 (team0) calls court and takes the last three too => +52 team0, match over", () => {
    // P0 holds the top spades and leads; opponents are void, P2 can only under-trump.
    const s0 = atLastThree([
      [c(14, "S"), c(13, "S"), c(12, "S")],
      [c(6, "H"), c(7, "H"), c(8, "H")],
      [c(11, "S"), c(10, "S"), c(9, "S")],
      [c(6, "D"), c(7, "D"), c(8, "D")],
    ]);
    let s = applyCommand(s0, { type: "CALL_COURT", seat: 0 });
    s = botFinish(s);
    expect(s.teamTricks).toEqual([9, 0]);
    expect(s.totals).toEqual([52, 0]);
    expect(s.matchWinner).toBe(0);
    expect(s.phase).toBe("match_complete");
  });
});

describe("court — failed (a defender breaks the sweep)", () => {
  it("P0 calls court but P1 wins a trick => +52 to the opponents (team1)", () => {
    // P1 holds the ace of trumps and must follow P0's spade lead — steals trick 7.
    const s0 = atLastThree([
      [c(13, "S"), c(12, "S"), c(11, "S")],
      [c(14, "S"), c(6, "D"), c(7, "D")],
      [c(10, "S"), c(9, "S"), c(8, "S")],
      [c(6, "H"), c(7, "H"), c(8, "H")],
    ]);
    let s = applyCommand(s0, { type: "CALL_COURT", seat: 0 });
    s = botFinish(s);
    expect(s.teamTricks[0]).toBeLessThan(9); // caller did not sweep
    expect(s.totals).toEqual([0, 52]); // opponents bank the 52
    expect(s.phase).toBe("match_complete"); // team1 reached 52
  });
});

describe("court — call legality", () => {
  it("rejects a call from the team that did NOT sweep the first six", () => {
    const s = atLastThree([
      [c(14, "S"), c(13, "S"), c(12, "S")],
      [c(6, "H"), c(7, "H"), c(8, "H")],
      [c(11, "S"), c(10, "S"), c(9, "S")],
      [c(6, "D"), c(7, "D"), c(8, "D")],
    ]);
    expect(() => applyCommand(s, { type: "CALL_COURT", seat: 1 })).toThrow(); // team1 didn't sweep
  });

  it("rejects a second court call", () => {
    const s0 = atLastThree([
      [c(14, "S"), c(13, "S"), c(12, "S")],
      [c(6, "H"), c(7, "H"), c(8, "H")],
      [c(11, "S"), c(10, "S"), c(9, "S")],
      [c(6, "D"), c(7, "D"), c(8, "D")],
    ]);
    const s = applyCommand(s0, { type: "CALL_COURT", seat: 0 });
    expect(() => applyCommand(s, { type: "CALL_COURT", seat: 2 })).toThrow();
  });
});
