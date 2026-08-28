import type { Seat, Team } from "./types";

const teamOf = (seat: Seat): Team => (seat % 2) as Team;
const partnerOf = (seat: Seat): Seat => ((seat + 2) % 4) as Seat;
/** Play proceeds clockwise; the dealer's right (next to act / trump caller) is +1. */
const rightOf = (seat: Seat): Seat => ((seat + 1) % 4) as Seat;

export type NextDealerInput = {
  currentDealer: Seat;
  /** Match totals AFTER the deal just finished: [team0, team1]. */
  totals: [number, number];
  /** Seat that most recently dealt for [team0, team1], including the deal just finished. */
  lastDealerByTeam: [Seat, Seat];
};

export type NextDealer = {
  dealer: Seat;
  trumpCaller: Seat;
  firstLeader: Seat;
  lastDealerByTeam: [Seat, Seat];
};

/** Explicit dealer transition (deliberately NOT a plain clockwise rotation).
 *  The team that is BEHIND (tailing) deals; its two partners alternate each deal.
 *  When the lead flips, dealing moves to the now-behind team. An exact tie keeps
 *  the current dealing team going. Trump caller / first leader = dealer's right. */
export function determineNextDealer(input: NextDealerInput): NextDealer {
  const { totals, currentDealer, lastDealerByTeam } = input;

  const tailing: Team =
    totals[0] < totals[1] ? 0 : totals[1] < totals[0] ? 1 : teamOf(currentDealer);

  const dealer = partnerOf(lastDealerByTeam[tailing]);
  const updated: [Seat, Seat] = [...lastDealerByTeam];
  updated[tailing] = dealer;

  const trumpCaller = rightOf(dealer);
  return { dealer, trumpCaller, firstLeader: trumpCaller, lastDealerByTeam: updated };
}
