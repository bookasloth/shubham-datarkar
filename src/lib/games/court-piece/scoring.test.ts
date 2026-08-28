import { describe, it, expect } from "vitest";
import {
  scoreDeal,
  calculateMatchScore,
  matchWinner,
  courtEligible,
  MATCH_TARGET,
} from "./scoring";
import type { DealResult } from "./types";

const deal = (over: Partial<DealResult> = {}): DealResult => ({
  contract: 5,
  declarerTeam: 0,
  tricks: [5, 4],
  court: null,
  ...over,
});

describe("scoreDeal — normal contracts (declarer team only scores)", () => {
  it("call 5 made => +1, opponents 0", () => {
    expect(scoreDeal(deal({ contract: 5, tricks: [5, 4] }))).toEqual([1, 0]);
  });
  it("call 5 failed => -10, opponents 0", () => {
    expect(scoreDeal(deal({ contract: 5, tricks: [4, 5] }))).toEqual([-10, 0]);
  });
  it("call 6 made => +6 / failed => -12", () => {
    expect(scoreDeal(deal({ contract: 6, tricks: [6, 3] }))).toEqual([6, 0]);
    expect(scoreDeal(deal({ contract: 6, tricks: [5, 4] }))).toEqual([-12, 0]);
  });
  it("call 7 made => +7 / failed => -14", () => {
    expect(scoreDeal(deal({ contract: 7, tricks: [7, 2] }))).toEqual([7, 0]);
    expect(scoreDeal(deal({ contract: 7, tricks: [6, 3] }))).toEqual([-14, 0]);
  });
  it("call 8 made => +8 / failed => -16", () => {
    expect(scoreDeal(deal({ contract: 8, tricks: [8, 1] }))).toEqual([8, 0]);
    expect(scoreDeal(deal({ contract: 8, tricks: [7, 2] }))).toEqual([-16, 0]);
  });
  it("overtricks give no bonus — call 5 taking 8 is still +1", () => {
    expect(scoreDeal(deal({ contract: 5, tricks: [8, 1] }))).toEqual([1, 0]);
  });
  it("scores the correct side when team 1 is declarer", () => {
    expect(scoreDeal(deal({ contract: 6, declarerTeam: 1, tricks: [3, 6] }))).toEqual([0, 6]);
    expect(scoreDeal(deal({ contract: 6, declarerTeam: 1, tricks: [4, 5] }))).toEqual([0, -12]);
  });
});

describe("scoreDeal — court overrides contract scoring entirely", () => {
  it("court made (caller sweeps all 9) => +52 caller, 0 opponents", () => {
    expect(
      scoreDeal(deal({ contract: 5, declarerTeam: 0, tricks: [9, 0], court: { callerTeam: 0 } })),
    ).toEqual([52, 0]);
  });
  it("court failed (opponents break the sweep) => +52 to opponents", () => {
    expect(
      scoreDeal(deal({ contract: 5, declarerTeam: 0, tricks: [8, 1], court: { callerTeam: 0 } })),
    ).toEqual([0, 52]);
  });
  it("court by the defending team also pays them +52 when made", () => {
    expect(
      scoreDeal(deal({ contract: 6, declarerTeam: 0, tricks: [0, 9], court: { callerTeam: 1 } })),
    ).toEqual([0, 52]);
  });
});

describe("match score", () => {
  it("adds deal deltas to the running totals", () => {
    expect(calculateMatchScore([7, -13], [8, 0])).toEqual([15, -13]);
  });
  it("target is 52", () => {
    expect(MATCH_TARGET).toBe(52);
  });
  it("no winner below the target", () => {
    expect(matchWinner([51, 20])).toBeNull();
  });
  it("declares the team that reaches 52", () => {
    expect(matchWinner([75, -31])).toBe(0);
    expect(matchWinner([10, 52])).toBe(1);
  });
});

describe("courtEligible — needs all first six tricks by one team", () => {
  it("true when the same team won all first six tricks", () => {
    expect(courtEligible([0, 0, 0, 0, 0, 0], 0)).toBe(true);
  });
  it("false when the caller did not sweep the first six", () => {
    expect(courtEligible([0, 0, 0, 1, 0, 0], 0)).toBe(false);
  });
  it("false before six tricks are complete", () => {
    expect(courtEligible([0, 0, 0, 0, 0], 0)).toBe(false);
  });
});
