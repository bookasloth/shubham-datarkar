import { describe, it, expect } from "vitest";
import { buildDeck, shuffleDeck, dealHands, cardId, RANKS } from "./deck";
import type { Card } from "./types";

const ids = (cards: Card[]) => cards.map(cardId);

describe("court-piece deck", () => {
  it("has 36 unique cards — 4 suits x 9 ranks", () => {
    const deck = buildDeck();
    expect(deck).toHaveLength(36);
    expect(new Set(ids(deck)).size).toBe(36);
  });

  it("uses only ranks 6..A (14), never 2-5", () => {
    expect(RANKS).toEqual([6, 7, 8, 9, 10, 11, 12, 13, 14]);
    expect(buildDeck().every((c) => c.rank >= 6 && c.rank <= 14)).toBe(true);
  });

  it("shuffle preserves the exact multiset", () => {
    const shuffled = shuffleDeck(0x1234);
    expect(shuffled).toHaveLength(36);
    expect(ids(shuffled).sort()).toEqual(ids(buildDeck()).sort());
  });

  it("same seed => identical order (deterministic)", () => {
    expect(shuffleDeck(0xabcd)).toEqual(shuffleDeck(0xabcd));
  });

  it("different seed => different order", () => {
    expect(shuffleDeck(1)).not.toEqual(shuffleDeck(2));
  });
});

describe("court-piece deal", () => {
  it("deals 4 hands of 9, covering all 36 cards with no duplicates", () => {
    const hands = dealHands(shuffleDeck(7));
    expect(hands).toHaveLength(4);
    expect(hands.every((h) => h.length === 9)).toBe(true);
    expect(new Set(ids(hands.flat())).size).toBe(36);
  });

  it("deals first-five to every seat before the remaining four (5-then-4 phase)", () => {
    const deck = buildDeck();
    const hands = dealHands(deck);
    // seat 0: first 5 cards of the deck, then cards 20-23 (after all four got their 5)
    expect(hands[0].slice(0, 5)).toEqual(deck.slice(0, 5));
    expect(hands[0].slice(5)).toEqual(deck.slice(20, 24));
    // seat 3: cards 15-19, then 32-35
    expect(hands[3].slice(0, 5)).toEqual(deck.slice(15, 20));
    expect(hands[3].slice(5)).toEqual(deck.slice(32, 36));
  });
});
