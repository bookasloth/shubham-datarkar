import { legalPlays, trickWinner } from "./trick";
import { SUITS } from "./deck";
import type { Card, Contract, Play, Seat, Suit } from "./types";

// Heuristic bot — permanent (fills empty/dropped seats), deliberately simple.
// ponytail: naive baseline; upgrade path is the offline-trained "pro bot" that
// learns from the logged (state -> action -> outcome) corpus. Do not gold-plate here.

/** Trump = the suit the bot holds the most of (ties broken by total rank). */
export function botPickTrump(fiveCards: Card[]): Suit {
  const score = (suit: Suit) =>
    fiveCards.filter((c) => c.suit === suit).reduce((n, c) => n + 1000 + c.rank, 0);
  return [...SUITS].sort((a, b) => score(b) - score(a))[0];
}

/** Rough trick-taking strength: trumps + high off-suit cards (A/K). */
function handStrength(hand: Card[], trump: Suit): number {
  const trumps = hand.filter((c) => c.suit === trump).length;
  const highOffs = hand.filter((c) => c.suit !== trump && c.rank >= 13).length;
  return trumps + highOffs;
}

/** Raise one step above the current contract when strength clearly supports it,
 *  capped at 8; otherwise pass. Conservative on purpose. */
export function botDecideBid(hand: Card[], trump: Suit, currentContract: Contract): Contract | "pass" {
  const target = handStrength(hand, trump);
  if (target > currentContract && currentContract < 8) return (currentContract + 1) as Contract;
  return "pass";
}

const SENTINEL = -1 as Seat;

/** Would playing `card` currently win the trick-in-progress? */
function winsTrick(card: Card, plays: Play[], trump: Suit): boolean {
  return trickWinner([...plays, { seat: SENTINEL, card }], trump) === SENTINEL;
}

/** Pick a card to play. Leading: lead the highest card. Following: win with the
 *  cheapest card that takes the trick, else duck with the lowest legal card. */
export function botPickCard(hand: Card[], plays: Play[], trump: Suit): Card {
  const ledSuit = plays.length ? plays[0].card.suit : null;
  const legal = legalPlays(hand, ledSuit);
  const byRankAsc = [...legal].sort((a, b) => a.rank - b.rank);

  if (plays.length === 0) return byRankAsc[byRankAsc.length - 1]; // lead high

  const winners = byRankAsc.filter((c) => winsTrick(c, plays, trump));
  return winners.length ? winners[0] : byRankAsc[0]; // cheapest win, else lowest duck
}
