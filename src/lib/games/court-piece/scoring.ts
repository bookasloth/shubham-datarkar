import type { Contract, DealResult, Team } from "./types";

/** First team to this many points wins the match. */
export const MATCH_TARGET = 52;

/** Points awarded to the declarer team when they MAKE the contract.
 *  Floor call of 5 pays a token +1; every higher call pays its face value. */
const madePoints = (contract: Contract): number => (contract === 5 ? 1 : contract);

/** Penalty to the declarer team when they FAIL. Opponents gain nothing on a fail. */
const failPenalty = (contract: Contract): number => -2 * contract;

const other = (team: Team): Team => (team === 0 ? 1 : 0);

/** Points delta for a finished deal, as [team0, team1].
 *  Court (a declared all-nine gamble) overrides contract scoring completely:
 *  the side that wins the court takes +52, the other side nothing. */
export function scoreDeal(result: DealResult): [number, number] {
  const deltas: [number, number] = [0, 0];

  if (result.court) {
    const caller = result.court.callerTeam;
    const made = result.tricks[caller] === 9;
    deltas[made ? caller : other(caller)] = MATCH_TARGET;
    return deltas;
  }

  const made = result.tricks[result.declarerTeam] >= result.contract;
  deltas[result.declarerTeam] = made ? madePoints(result.contract) : failPenalty(result.contract);
  return deltas;
}

/** Add a deal's deltas onto the running match totals. */
export function calculateMatchScore(
  totals: [number, number],
  deltas: [number, number],
): [number, number] {
  return [totals[0] + deltas[0], totals[1] + deltas[1]];
}

/** The winning team, or null if neither has reached the target yet.
 *  Only one team can cross in a single deal, so ties at/above target don't arise. */
export function matchWinner(totals: [number, number]): Team | null {
  if (totals[0] >= MATCH_TARGET || totals[1] >= MATCH_TARGET) {
    return totals[0] >= totals[1] ? 0 : 1;
  }
  return null;
}

/** May `team` call court now? Only if it won every one of the first six tricks.
 *  `firstSixWinners` is the winning team of tricks 1..6 (length must be 6). */
export function courtEligible(firstSixWinners: Team[], team: Team): boolean {
  return firstSixWinners.length === 6 && firstSixWinners.every((w) => w === team);
}
