import { describe, expect, it } from "vitest";
import { isChallengeWin, maxGuessesFor, scoreChallenge, validateSecret } from "./engine";

describe("challenge engine adapter", () => {
  it("reports each game's guess budget", () => {
    expect(maxGuessesFor("alfazy")).toBe(6);
    expect(maxGuessesFor("hit_and_blow")).toBe(9);
    expect(maxGuessesFor("integra")).toBe(6);
  });

  it("validates a secret with the game's own rules", () => {
    expect(validateSecret("alfazy", "crane")).toBe(true);
    expect(validateSecret("alfazy", "zzzzz")).toBe(false);
  });

  it("scores a correct alfazy guess as a win", () => {
    const fb = scoreChallenge("alfazy", "crane", "crane");
    expect(fb.kind).toBe("tiles");
    expect(isChallengeWin("alfazy", fb)).toBe(true);
  });

  it("scores a wrong alfazy guess as not a win", () => {
    const fb = scoreChallenge("alfazy", "slate", "crane");
    expect(isChallengeWin("alfazy", fb)).toBe(false);
  });

  it("scores hit-and-blow as hits/blows and wins on all hits", () => {
    const fb = scoreChallenge("hit_and_blow", "1234", "1234");
    expect(fb).toMatchObject({ kind: "code", hits: 4 });
    expect(isChallengeWin("hit_and_blow", fb)).toBe(true);
  });
});
