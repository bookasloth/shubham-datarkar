import { cardId } from "./deck";
import type { Card, Play, Seat, Suit } from "./types";

/** Winner of a completed trick. plays[0] led (its suit is the led suit).
 *  Highest trump wins; if none, highest card of the led suit wins. */
export function trickWinner(plays: Play[], trump: Suit): Seat {
  const led = plays[0].card.suit;
  const trumps = plays.filter((p) => p.card.suit === trump);
  const contenders = trumps.length ? trumps : plays.filter((p) => p.card.suit === led);
  return contenders.reduce((best, p) => (p.card.rank > best.card.rank ? p : best)).seat;
}

/** The cards a player may legally play. Must follow the led suit if holding it;
 *  otherwise (or when leading) any card is legal. `ledSuit` is null when leading. */
export function legalPlays(hand: Card[], ledSuit: Suit | null): Card[] {
  if (ledSuit == null) return hand;
  const following = hand.filter((c) => c.suit === ledSuit);
  return following.length ? following : hand;
}

/** Is playing `card` legal given the hand and led suit? Also enforces card-in-hand. */
export function isLegalPlay(card: Card, hand: Card[], ledSuit: Suit | null): boolean {
  return legalPlays(hand, ledSuit).some((c) => cardId(c) === cardId(card));
}
