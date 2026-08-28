import { seededShuffle } from "../../daily";
import type { Card, Suit, Rank } from "./types";

export const SUITS: Suit[] = ["S", "H", "D", "C"];
export const RANKS: Rank[] = [6, 7, 8, 9, 10, 11, 12, 13, 14];

/** Stable id for a card, e.g. "14S" (ace of spades). For dedupe/tests/keys. */
export const cardId = (c: Card): string => `${c.rank}${c.suit}`;

/** Structural validation — real suit, real integer rank. Rejects malformed input
 *  (string ranks, floats, out-of-range) before it can corrupt hand bookkeeping. */
export function isValidCard(card: Card): boolean {
  return (
    !!card &&
    (SUITS as string[]).includes(card.suit) &&
    (RANKS as number[]).includes(card.rank)
  );
}

/** The 36-card deck, suit-major. Order is fixed — shuffling is a separate step. */
export function buildDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) for (const rank of RANKS) deck.push({ suit, rank });
  return deck;
}

/** Deterministic shuffle. Same seed => same order (mulberry32, server === client).
 *  The seed is SERVER-ONLY for multiplayer — it must never reach a client, or the
 *  whole deck becomes reconstructable. Reuses the platform shuffle from daily.ts. */
export function shuffleDeck(seed: number): Card[] {
  return seededShuffle(buildDeck(), seed);
}

/** Deal a shuffled deck into 4 hands of 9, in the 5-then-4 phases Court Piece uses:
 *  every seat gets 5 cards first (trump is called off those), then the remaining 4.
 *  Each returned hand is [5 first-phase cards, 4 second-phase cards]. */
export function dealHands(deck: Card[]): [Card[], Card[], Card[], Card[]] {
  const hands: Card[][] = [[], [], [], []];
  for (let seat = 0; seat < 4; seat++) hands[seat].push(...deck.slice(seat * 5, seat * 5 + 5));
  for (let seat = 0; seat < 4; seat++) hands[seat].push(...deck.slice(20 + seat * 4, 24 + seat * 4));
  return hands as [Card[], Card[], Card[], Card[]];
}
