import { describe, it, expect } from "vitest";
import { buildShareText, gameLeaderboardUrl, gameShareUrl } from "@/lib/games/share";
import { GAMES } from "@/lib/games/registry";

describe("buildShareText", () => {
  it("reads as a solve, with the score, grid and link", () => {
    expect(
      buildShareText({
        game: "alfazy",
        puzzleNumber: 142,
        status: "won",
        tries: 4,
        maxGuesses: 6,
        grid: "⬜🟨⬜⬜⬜\n🟩🟩🟩🟩🟩",
      }),
    ).toBe(
      "I Solved Alfazy #142 in 4/6\n⬜🟨⬜⬜⬜\n🟩🟩🟩🟩🟩\n\nTry now at https://shubhamdatarkar.com/g/alfz",
    );
  });

  it("never claims a solve on a loss", () => {
    const text = buildShareText({
      game: "integra",
      puzzleNumber: 7,
      status: "lost",
      tries: 6,
      maxGuesses: 6,
      grid: "⬛",
    });
    expect(text).toContain("I played Integra #7 — X/6");
    expect(text).not.toContain("Solved");
  });

  it("gives every game a distinct, non-empty short link", () => {
    const urls = GAMES.map((g) => gameShareUrl(g.key));
    expect(urls).toEqual([
      "https://shubhamdatarkar.com/g/alfz",
      "https://shubhamdatarkar.com/g/htbl",
      "https://shubhamdatarkar.com/g/intg",
    ]);
    expect(new Set(urls).size).toBe(GAMES.length);
  });

  it("returns each player to that game's leaderboard after a community post", () => {
    expect(gameLeaderboardUrl("alfazy")).toBe("/games/alfazy/leaderboard");
    expect(gameLeaderboardUrl("hit_and_blow")).toBe("/games/hit-and-blow/leaderboard");
    expect(gameLeaderboardUrl("integra")).toBe("/games/integra/leaderboard");
  });
});
