import type { Card } from "./types";

/** Auto-sort order: suits ♠ ♥ ♣ ♦ left→right, ranks ascending 6→A within each. */
const SUIT_ORDER = "SHCD";

export function sortHand(cards: Card[]): Card[] {
  return [...cards].sort(
    (a, b) => SUIT_ORDER.indexOf(a.suit) - SUIT_ORDER.indexOf(b.suit) || a.rank - b.rank,
  );
}

/** Given a drag/flick release, should the card be played? True on a drop over the
 *  table zone, a big enough upward drag, or a fast upward flick. Pure so the
 *  thresholds are testable without a browser. Coords: y grows downward (up = negative). */
export function shouldPlayCard(p: { offsetY: number; velocityY: number; overZone: boolean }): boolean {
  const UP_DISTANCE = -80; // dragged this far up = commit
  const FLICK_VELOCITY = -550; // released moving up this fast = commit
  return p.overZone || p.offsetY <= UP_DISTANCE || p.velocityY <= FLICK_VELOCITY;
}
