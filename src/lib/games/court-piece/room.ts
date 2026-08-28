import { applyCommand, startDeal } from "./engine";
import { determineNextDealer } from "./dealer";
import { botDecideBid, botPickCard, botPickTrump } from "./bots";
import type { Command, GameState, RoomState, PlayerCommand, PlayerSlot, Seat, Team } from "./types";

const teamOf = (seat: Seat): 0 | 1 => (seat % 2) as 0 | 1;

/** Is the game at the court window — six tricks all won by one team, between tricks,
 *  court not yet called? Returns the sweeping team, or null. */
export function courtWindow(game: GameState | null): Team | null {
  if (!game || game.phase !== "playing") return null;
  if (game.trickWinners.length !== 6 || game.currentTrick.length !== 0 || game.courtCall) return null;
  const sweeper = game.trickWinners[0];
  return game.trickWinners.every((t) => t === sweeper) ? sweeper : null;
}

/** True while the court window is open, a human sits on the sweeping team, and they
 *  haven't declined — the point at which bots must WAIT for a court decision. */
function awaitingCourtDecision(room: RoomState): boolean {
  const sweeper = courtWindow(room.game);
  if (sweeper === null || room.courtDeclined) return false;
  return room.players.some((p, i) => p && !p.isBot && teamOf(i as Seat) === sweeper);
}

/** Seat index of a user in a room, or -1 if not seated. */
export function seatOf(room: RoomState, userId: string): number {
  return room.players.findIndex((p) => p?.userId === userId);
}

const bump = (room: RoomState, patch: Partial<RoomState>): RoomState => ({
  ...room,
  ...patch,
  version: room.version + 1,
});

export function createRoom(code: string, _creatorId: string): RoomState {
  return { code, status: "lobby", players: [null, null, null, null], game: null, courtDeclined: false, version: 0 };
}

export function joinRoom(room: RoomState, userId: string, seat: number): RoomState {
  if (room.status !== "lobby") throw new Error("room already started");
  if (seat < 0 || seat > 3) throw new Error("seat out of range");
  if (seatOf(room, userId) !== -1) throw new Error("already seated");
  if (room.players[seat]) throw new Error("seat taken");
  const players = [...room.players] as RoomState["players"];
  players[seat] = { userId, isBot: false, ready: false, connected: true };
  return bump(room, { players });
}

export function setReady(room: RoomState, userId: string, ready: boolean): RoomState {
  const seat = seatOf(room, userId);
  if (seat === -1) throw new Error("not seated");
  const players = [...room.players] as RoomState["players"];
  players[seat] = { ...(players[seat] as NonNullable<PlayerSlot>), ready };
  return bump(room, { players });
}

/** Fill every empty seat with a ready bot. Bots are permanent — they cover empty
 *  or dropped seats so a short table can still play. */
export function fillBots(room: RoomState): RoomState {
  if (room.status !== "lobby") throw new Error("room already started");
  const players = room.players.map((p) =>
    p ?? { userId: null, isBot: true, ready: true, connected: true },
  ) as RoomState["players"];
  return bump(room, { players });
}

export function startGame(room: RoomState, opts: { seed: number; dealer: Seat }): RoomState {
  if (room.status !== "lobby") throw new Error("already started");
  if (room.players.some((p) => p === null)) throw new Error("need four players (fill bots to start short)");
  if (room.players.some((p) => !p!.ready)) throw new Error("not everyone is ready");

  const lastDealerByTeam: [Seat, Seat] = [2, 3];
  lastDealerByTeam[teamOf(opts.dealer)] = opts.dealer;

  const game = startDeal({
    dealNumber: 0,
    dealer: opts.dealer,
    seed: opts.seed,
    totals: [0, 0],
    lastDealerByTeam,
  });
  return bump(room, { status: "active", game, courtDeclined: false });
}

/** Apply a player's command. The seat is taken from the authenticated user — never
 *  from the payload — so no client can act as another seat. */
export function applyPlayerCommand(room: RoomState, userId: string, cmd: PlayerCommand): RoomState {
  if (room.status !== "active" || !room.game) throw new Error("game not active");
  const seat = seatOf(room, userId);
  if (seat === -1) throw new Error("not seated in this game");
  return applySeatCommand(room, seat as Seat, cmd);
}

/** Internal: apply a command for a known seat (human or bot). */
function applySeatCommand(room: RoomState, seat: Seat, cmd: PlayerCommand): RoomState {
  const command = { ...cmd, seat } as Command;
  const game = applyCommand(room.game!, command);
  const status = game.phase === "match_complete" ? "finished" : room.status;
  return bump(room, { game, status });
}

/** Start the next deal after one completes, applying the dealer-transition rule. */
export function startNextDeal(room: RoomState, seed: number): RoomState {
  const g = room.game;
  if (!g || g.phase !== "deal_complete") throw new Error("no completed deal to advance from");
  const next = determineNextDealer({
    currentDealer: g.dealer,
    totals: g.totals,
    lastDealerByTeam: g.lastDealerByTeam,
  });
  const game = startDeal({
    dealNumber: g.dealNumber + 1,
    dealer: next.dealer,
    seed,
    totals: g.totals,
    lastDealerByTeam: next.lastDealerByTeam,
  });
  return bump(room, { game, courtDeclined: false });
}

/** A human on the sweeping team declines court — bots may then resume. */
export function declineCourt(room: RoomState, userId: string): RoomState {
  const sweeper = courtWindow(room.game);
  if (sweeper === null) throw new Error("not the court window");
  const seat = seatOf(room, userId);
  if (seat === -1) throw new Error("not seated");
  if (teamOf(seat as Seat) !== sweeper) throw new Error("not your team's court decision");
  return bump(room, { courtDeclined: true });
}

/** The seat that must act next, or -1 if the deal isn't awaiting a move. */
function actorSeat(room: RoomState): number {
  const g = room.game;
  if (!g) return -1;
  if (g.phase === "trump_selection") return g.trumpCaller;
  if (g.phase === "auction") return g.auctionTurn;
  if (g.phase === "playing") return g.turn;
  return -1;
}

/** Play out every consecutive bot turn until it's a human's move or the deal ends.
 *  Bots never call court (kept simple). This is how empty seats keep the game moving. */
export function botAdvance(room: RoomState): RoomState {
  let r = room;
  for (;;) {
    if (awaitingCourtDecision(r)) break; // wait for the sweeping team's human to decide
    const seat = actorSeat(r);
    if (seat === -1) break;
    const slot = r.players[seat];
    if (!slot?.isBot) break;

    const g = r.game!;
    const hand = g.hands[seat];
    let cmd: PlayerCommand;
    if (g.phase === "trump_selection") {
      cmd = { type: "SELECT_TRUMP", suit: botPickTrump(hand.slice(0, 5)) };
    } else if (g.phase === "auction") {
      const bid = botDecideBid(hand, g.trump!, g.contract);
      cmd = bid === "pass" ? { type: "PASS" } : { type: "RAISE", call: bid };
    } else {
      cmd = { type: "PLAY_CARD", card: botPickCard(hand, g.currentTrick, g.trump!) };
    }
    r = applySeatCommand(r, seat as Seat, cmd);
  }
  return r;
}
