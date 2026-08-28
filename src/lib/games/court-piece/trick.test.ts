import { describe, it, expect } from "vitest";
import { trickWinner, legalPlays, isLegalPlay } from "./trick";
import type { Card, Play, Suit, Rank } from "./types";

const c = (rank: Rank, suit: Suit): Card => ({ suit, rank });
const play = (seat: 0 | 1 | 2 | 3, card: Card): Play => ({ seat, card });

describe("trickWinner", () => {
  it("highest card of the led suit wins when no trump is played", () => {
    // trump = spades, but only hearts + one off-suit diamond are played
    const plays: Play[] = [
      play(0, c(6, "H")), // lead
      play(1, c(13, "H")), // K hearts
      play(2, c(9, "H")),
      play(3, c(14, "D")), // ace of diamonds — off suit, not trump, cannot win
    ];
    expect(trickWinner(plays, "S")).toBe(1);
  });

  it("a single trump (ruff) beats every card of the led suit", () => {
    const plays: Play[] = [
      play(0, c(14, "H")), // ace of hearts leads
      play(1, c(7, "H")),
      play(2, c(6, "S")), // six of trumps — lowest trump, still wins
      play(3, c(13, "H")),
    ];
    expect(trickWinner(plays, "S")).toBe(2);
  });

  it("with multiple trumps, the highest trump wins", () => {
    const plays: Play[] = [
      play(0, c(14, "H")),
      play(1, c(6, "S")),
      play(2, c(13, "S")), // K trumps
      play(3, c(9, "S")),
    ];
    expect(trickWinner(plays, "S")).toBe(2);
  });

  it("when the trump suit itself is led, highest trump still wins", () => {
    const plays: Play[] = [
      play(0, c(10, "S")),
      play(1, c(14, "S")), // A trumps
      play(2, c(6, "S")),
      play(3, c(13, "S")),
    ];
    expect(trickWinner(plays, "S")).toBe(1);
  });

  it("ignores off-suit discards entirely (no trump present)", () => {
    const plays: Play[] = [
      play(0, c(6, "D")), // lead diamonds
      play(1, c(14, "C")), // discard — higher rank but wrong suit, loses
      play(2, c(11, "D")), // J diamonds — highest diamond wins
      play(3, c(14, "H")), // discard
    ];
    expect(trickWinner(plays, "S")).toBe(2);
  });
});

describe("legalPlays / follow-suit", () => {
  const hand: Card[] = [c(6, "H"), c(13, "H"), c(9, "S"), c(14, "D")];

  it("leading (no led suit) allows the whole hand", () => {
    expect(legalPlays(hand, null)).toEqual(hand);
  });

  it("must follow the led suit when holding it", () => {
    expect(legalPlays(hand, "H")).toEqual([c(6, "H"), c(13, "H")]);
  });

  it("may play anything when void in the led suit", () => {
    expect(legalPlays(hand, "C")).toEqual(hand);
  });

  it("rejects an off-suit card while the led suit is held", () => {
    expect(isLegalPlay(c(9, "S"), hand, "H")).toBe(false); // holds hearts, can't play a spade
    expect(isLegalPlay(c(6, "H"), hand, "H")).toBe(true);
  });

  it("rejects a card that is not in the hand", () => {
    expect(isLegalPlay(c(7, "C"), hand, null)).toBe(false);
  });
});
