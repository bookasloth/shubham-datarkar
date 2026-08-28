import { describe, it, expect } from "vitest";
import { botPickTrump, botDecideBid, botPickCard } from "./bots";
import { cardId } from "./deck";
import type { Card, Play, Suit, Rank } from "./types";

const c = (rank: Rank, suit: Suit): Card => ({ suit, rank });
const play = (seat: 0 | 1 | 2 | 3, card: Card): Play => ({ seat, card });

describe("botPickTrump", () => {
  it("picks the suit it holds the most of", () => {
    const five = [c(6, "H"), c(9, "H"), c(14, "H"), c(7, "D"), c(8, "S")];
    expect(botPickTrump(five)).toBe("H");
  });
});

describe("botDecideBid", () => {
  it("passes on a weak hand", () => {
    const junk = [c(6, "H"), c(7, "D"), c(8, "S"), c(9, "C"), c(6, "D"), c(7, "S"), c(8, "H"), c(9, "D"), c(6, "S")];
    expect(botDecideBid(junk, "H", 5)).toBe("pass");
  });

  it("raises above the current contract on a strong trump-heavy hand", () => {
    const strong = [c(14, "H"), c(13, "H"), c(12, "H"), c(11, "H"), c(14, "S"), c(14, "D"), c(14, "C"), c(6, "D"), c(7, "C")];
    const bid = botDecideBid(strong, "H", 5);
    expect(bid).not.toBe("pass");
    expect(bid).toBeGreaterThan(5);
  });
});

describe("botPickCard", () => {
  it("plays the winning card, not its lowest, when only the higher card wins", () => {
    // H8 cannot beat the current best H9; H10 can. A bot that always ducked would
    // wrongly play H8 — this pins that winning detection actually works.
    const hand = [c(8, "H"), c(10, "H")];
    const plays: Play[] = [play(0, c(6, "H")), play(1, c(9, "H"))];
    expect(cardId(botPickCard(hand, plays, "S"))).toBe(cardId(c(10, "H")));
  });

  it("wins as cheaply as possible when several cards would win", () => {
    const hand = [c(10, "H"), c(13, "H")]; // both beat H9 -> take the cheaper
    const plays: Play[] = [play(0, c(6, "H")), play(1, c(9, "H"))];
    expect(cardId(botPickCard(hand, plays, "S"))).toBe(cardId(c(10, "H")));
  });

  it("following suit, ducks with its lowest card when it cannot win", () => {
    const hand = [c(6, "H"), c(7, "H")];
    const plays: Play[] = [play(0, c(14, "H")), play(1, c(13, "H"))];
    expect(cardId(botPickCard(hand, plays, "S"))).toBe(cardId(c(6, "H")));
  });

  it("ruffs to win with trump even when a lower off-suit discard exists", () => {
    // D6 is the lowest card but only a discard; the S9 trump actually wins the trick.
    const hand = [c(6, "D"), c(9, "S")]; // S is trump; void in led hearts
    const plays: Play[] = [play(0, c(14, "H")), play(1, c(13, "H"))];
    expect(cardId(botPickCard(hand, plays, "S"))).toBe(cardId(c(9, "S")));
  });

  it("always returns a legal card", () => {
    const hand = [c(9, "S"), c(14, "D")];
    const plays: Play[] = [play(0, c(6, "H"))]; // void in hearts -> anything legal
    const picked = botPickCard(hand, plays, "S");
    expect(hand.map(cardId)).toContain(cardId(picked));
  });
});
