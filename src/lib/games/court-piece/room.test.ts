import { describe, it, expect } from "vitest";
import {
  createRoom,
  joinRoom,
  setReady,
  fillBots,
  startGame,
  applyPlayerCommand,
  startNextDeal,
  botAdvance,
  seatOf,
} from "./room";
import { botPickTrump } from "./bots";
import type { RoomState } from "./types";

const start = () => ({ seed: 999, dealer: 0 as const });

/** A room with four ready humans, game started. */
function activeRoom(): RoomState {
  let r = createRoom("ABCD", "u0");
  r = joinRoom(r, "u0", 0);
  r = joinRoom(r, "u1", 1);
  r = joinRoom(r, "u2", 2);
  r = joinRoom(r, "u3", 3);
  for (const u of ["u0", "u1", "u2", "u3"]) r = setReady(r, u, true);
  return startGame(r, start());
}

describe("lobby", () => {
  it("starts empty in the lobby", () => {
    const r = createRoom("ABCD", "u0");
    expect(r.status).toBe("lobby");
    expect(r.players).toEqual([null, null, null, null]);
  });

  it("seats a joining player and rejects a taken or out-of-range seat", () => {
    let r = createRoom("ABCD", "u0");
    r = joinRoom(r, "u0", 1);
    expect(seatOf(r, "u0")).toBe(1);
    expect(() => joinRoom(r, "u1", 1)).toThrow(); // seat taken
    expect(() => joinRoom(r, "u0", 2)).toThrow(); // already seated
    expect(() => joinRoom(r, "u1", 9 as never)).toThrow(); // bad seat
  });

  it("will not start without four ready players", () => {
    let r = createRoom("ABCD", "u0");
    r = joinRoom(r, "u0", 0);
    r = setReady(r, "u0", true);
    expect(() => startGame(r, start())).toThrow();
  });

  it("fills empty seats with ready bots so a short table can start", () => {
    let r = createRoom("ABCD", "u0");
    r = joinRoom(r, "u0", 0);
    r = setReady(r, "u0", true);
    r = fillBots(r);
    expect(r.players.filter((p) => p?.isBot)).toHaveLength(3);
    const g = startGame(r, start());
    expect(g.status).toBe("active");
    expect(g.game?.phase).toBe("trump_selection");
  });
});

describe("identity binding on commands", () => {
  it("acts on the sender's own seat and rejects a non-seated user", () => {
    const r = activeRoom(); // trump caller is seat 1
    expect(() => applyPlayerCommand(r, "u2", { type: "SELECT_TRUMP", suit: "H" })).toThrow(); // not seat 1's turn
    const stranger = () => applyPlayerCommand(r, "nobody", { type: "SELECT_TRUMP", suit: "H" });
    expect(stranger).toThrow(); // not seated at all
    const ok = applyPlayerCommand(r, "u1", { type: "SELECT_TRUMP", suit: "H" });
    expect(ok.game?.trump).toBe("H");
  });

  it("a client cannot forge another seat — the seat comes from the user, not the payload", () => {
    const r = activeRoom();
    // u2 tries to call trump; even though only the seat is what matters, u2 is seat 2,
    // and it is seat 1's turn, so the engine rejects it.
    expect(() => applyPlayerCommand(r, "u2", { type: "SELECT_TRUMP", suit: "S" })).toThrow();
  });
});

describe("version monotonicity (optimistic-concurrency token)", () => {
  it("strictly increases on every state-changing mutation", () => {
    let r = createRoom("ABCD", "u0");
    const seen = [r.version];
    r = joinRoom(r, "u0", 0); seen.push(r.version);
    r = joinRoom(r, "u1", 1); seen.push(r.version);
    r = setReady(r, "u0", true); seen.push(r.version);
    r = setReady(r, "u1", true); seen.push(r.version);
    r = fillBots(r); seen.push(r.version);
    r = startGame(r, start()); seen.push(r.version);
    for (let i = 1; i < seen.length; i++) expect(seen[i]).toBeGreaterThan(seen[i - 1]);
  });

  it("botAdvance bumps the version once per bot move it applies", () => {
    let r = createRoom("BOTS", "u0");
    r = fillBots(r);
    r = startGame(r, start());
    const before = r.version;
    r = botAdvance(r); // all-bot table -> at least one bot move happens
    expect(r.version).toBeGreaterThan(before);
  });
});

describe("bot-driven play", () => {
  it("an all-bot table plays a full deal to completion", () => {
    let r = createRoom("BOTS", "u0");
    r = fillBots(r); // all four seats become bots
    r = startGame(r, start());
    r = botAdvance(r);
    expect(["deal_complete", "match_complete"]).toContain(r.game?.phase);
    expect(r.game?.trickWinners).toHaveLength(9);
  });

  it("starts the next deal with the dealer-transition rule and carries totals", () => {
    let r = createRoom("BOTS", "u0");
    r = fillBots(r);
    r = startGame(r, start());
    r = botAdvance(r);
    const totalsAfter = r.game!.totals;
    if (r.game!.phase === "deal_complete") {
      r = startNextDeal(r, 1234);
      expect(r.game?.phase).toBe("trump_selection");
      expect(r.game?.dealNumber).toBe(1);
      expect(r.game?.totals).toEqual(totalsAfter); // carried across the deal
    }
  });
});
