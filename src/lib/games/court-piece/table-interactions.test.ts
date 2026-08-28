import { describe, it, expect } from "vitest";
import { sortHand, shouldPlayCard } from "./table-interactions";
import { cardId } from "./deck";
import type { Card, Rank, Suit } from "./types";

const c = (rank: Rank, suit: Suit): Card => ({ suit, rank });

describe("sortHand — ♠ ♥ ♣ ♦ left→right, 6→A within a suit", () => {
  it("groups by suit in SHCD order and ascends by rank", () => {
    const hand = [c(14, "D"), c(6, "S"), c(13, "C"), c(9, "H"), c(6, "C"), c(14, "S"), c(7, "H")];
    expect(sortHand(hand).map(cardId)).toEqual(
      ["6S", "14S", "7H", "9H", "6C", "13C", "14D"].map((x) => x),
    );
  });

  it("does not mutate the input", () => {
    const hand = [c(14, "D"), c(6, "S")];
    const copy = [...hand];
    sortHand(hand);
    expect(hand).toEqual(copy);
  });
});

describe("shouldPlayCard — commit a play on drop, big drag, or flick", () => {
  it("plays when released over the table zone", () => {
    expect(shouldPlayCard({ offsetY: -10, velocityY: 0, overZone: true })).toBe(true);
  });
  it("plays when dragged far enough up", () => {
    expect(shouldPlayCard({ offsetY: -90, velocityY: 0, overZone: false })).toBe(true);
  });
  it("plays on a fast upward flick even if the drag was short", () => {
    expect(shouldPlayCard({ offsetY: -20, velocityY: -900, overZone: false })).toBe(true);
  });
  it("does NOT play on a small nudge", () => {
    expect(shouldPlayCard({ offsetY: -20, velocityY: -100, overZone: false })).toBe(false);
  });
  it("does NOT play on a downward drag", () => {
    expect(shouldPlayCard({ offsetY: 60, velocityY: 400, overZone: false })).toBe(false);
  });
});
