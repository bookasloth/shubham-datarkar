import { describe, it, expect } from "vitest";
import { determineNextDealer } from "./dealer";

// Seats 0..3 clockwise; teams by parity {0,2} vs {1,3}; partner = (seat+2)%4.
// lastDealerByTeam = [last seat that dealt for team0, for team1].

describe("determineNextDealer", () => {
  it("keeps dealing with the tailing team, alternating partners (A->B)", () => {
    const next = determineNextDealer({
      currentDealer: 0,
      totals: [3, 10], // team0 behind => stays the dealing (tailing) team
      lastDealerByTeam: [0, 1],
    });
    expect(next.dealer).toBe(2); // partner of seat 0
    expect(next.lastDealerByTeam).toEqual([2, 1]);
  });

  it("alternates back the other way on the following deal (B->A)", () => {
    const next = determineNextDealer({
      currentDealer: 2,
      totals: [3, 10], // team0 still behind
      lastDealerByTeam: [2, 1],
    });
    expect(next.dealer).toBe(0); // partner of seat 2
  });

  it("moves dealing to the other team once the lead flips", () => {
    const next = determineNextDealer({
      currentDealer: 0,
      totals: [12, 7], // team0 now leads => team1 is tailing and deals
      lastDealerByTeam: [0, 1],
    });
    expect(next.dealer).toBe(3); // partner of team1's last dealer (seat 1)
    expect(next.lastDealerByTeam).toEqual([0, 3]);
  });

  it("on an exact tie, the same dealing team continues its alternation", () => {
    const next = determineNextDealer({
      currentDealer: 1,
      totals: [7, 7],
      lastDealerByTeam: [0, 1],
    });
    expect(next.dealer).toBe(3); // team1 continues, partner of seat 1
  });

  it("derives the trump caller and first leader as the dealer's right", () => {
    const next = determineNextDealer({
      currentDealer: 0,
      totals: [3, 10],
      lastDealerByTeam: [0, 1],
    });
    // dealer 2 -> right is seat 3
    expect(next.trumpCaller).toBe(3);
    expect(next.firstLeader).toBe(3);
  });
});
