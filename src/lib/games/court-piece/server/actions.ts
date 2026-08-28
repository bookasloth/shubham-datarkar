"use server";

import { getGameUser } from "@/lib/games/session";
import { loadRoomByCode, insertRoom, saveRoom } from "./store";
import {
  applyPlayerCommand,
  botAdvance,
  courtWindow,
  createRoom,
  declineCourt,
  fillBots,
  joinRoom,
  seatOf,
  setReady,
  startGame,
  startNextDeal,
} from "../room";
import { sanitizeFor } from "../engine";
import type { PlayerCommand, RoomState, RoomView, Seat } from "../types";

type ActionResult =
  | { ok: true; view: RoomView }
  | { ok: false; reason: string };

const rndSeed = () => Math.floor(Math.random() * 0x7fffffff);
const rndSeat = () => Math.floor(Math.random() * 4) as Seat;

/** Invite code — unambiguous uppercase, 6 chars. */
function genCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

/** Build the client-facing view — never leaks other hands or user ids. */
function roomView(room: RoomState, userId: string): RoomView {
  const yourSeat = seatOf(room, userId);
  const seats = room.players.map((p, i) => ({
    seat: i as Seat,
    occupied: !!p,
    isBot: p?.isBot ?? false,
    ready: p?.ready ?? false,
    connected: p?.connected ?? false,
    you: p?.userId === userId,
  }));
  const game = room.game && yourSeat >= 0 ? sanitizeFor(room.game, yourSeat as Seat) : null;
  const sweeper = courtWindow(room.game);
  const canCallCourt = sweeper !== null && yourSeat >= 0 && yourSeat % 2 === sweeper;
  return { code: room.code, status: room.status, version: room.version, yourSeat, seats, game, canCallCourt };
}

/** Load → transform → optimistic save, retrying a few times on a version conflict. */
async function withRoom(
  code: string,
  transform: (room: RoomState) => RoomState,
): Promise<{ ok: true; room: RoomState } | { ok: false; reason: string }> {
  for (let attempt = 0; attempt < 4; attempt++) {
    const loaded = await loadRoomByCode(code);
    if (!loaded) return { ok: false, reason: "not_found" };
    let next: RoomState;
    try {
      next = transform(loaded.room);
    } catch (e) {
      return { ok: false, reason: (e as Error).message };
    }
    if (await saveRoom(loaded.id, loaded.version, next)) return { ok: true, room: next };
  }
  return { ok: false, reason: "conflict" };
}

export async function createCourtRoom(): Promise<ActionResult> {
  const user = await getGameUser();
  if (!user) return { ok: false, reason: "unauthenticated" };
  let room = createRoom(genCode(), user.id);
  room = joinRoom(room, user.id, 0); // creator takes the first seat
  await insertRoom(room, user.id);
  return { ok: true, view: roomView(room, user.id) };
}

export async function joinCourtSeat(code: string, seat: number): Promise<ActionResult> {
  const user = await getGameUser();
  if (!user) return { ok: false, reason: "unauthenticated" };
  const res = await withRoom(code, (r) => joinRoom(r, user.id, seat));
  return res.ok ? { ok: true, view: roomView(res.room, user.id) } : res;
}

export async function setCourtReady(code: string, ready: boolean): Promise<ActionResult> {
  const user = await getGameUser();
  if (!user) return { ok: false, reason: "unauthenticated" };
  const res = await withRoom(code, (r) => setReady(r, user.id, ready));
  return res.ok ? { ok: true, view: roomView(res.room, user.id) } : res;
}

export async function addCourtBots(code: string): Promise<ActionResult> {
  const user = await getGameUser();
  if (!user) return { ok: false, reason: "unauthenticated" };
  const res = await withRoom(code, (r) => {
    if (seatOf(r, user.id) === -1) throw new Error("not seated");
    return fillBots(r);
  });
  return res.ok ? { ok: true, view: roomView(res.room, user.id) } : res;
}

export async function startCourtGame(code: string): Promise<ActionResult> {
  const user = await getGameUser();
  if (!user) return { ok: false, reason: "unauthenticated" };
  const res = await withRoom(code, (r) => {
    if (seatOf(r, user.id) === -1) throw new Error("not seated");
    return botAdvance(startGame(r, { seed: rndSeed(), dealer: rndSeat() }));
  });
  return res.ok ? { ok: true, view: roomView(res.room, user.id) } : res;
}

export async function playCourt(code: string, cmd: PlayerCommand): Promise<ActionResult> {
  const user = await getGameUser();
  if (!user) return { ok: false, reason: "unauthenticated" };
  // seat is bound from the authenticated user inside applyPlayerCommand — the
  // client cannot act as another seat. Bots then take any following bot turns.
  const res = await withRoom(code, (r) => botAdvance(applyPlayerCommand(r, user.id, cmd)));
  return res.ok ? { ok: true, view: roomView(res.room, user.id) } : res;
}

export async function declineCourtCall(code: string): Promise<ActionResult> {
  const user = await getGameUser();
  if (!user) return { ok: false, reason: "unauthenticated" };
  const res = await withRoom(code, (r) => botAdvance(declineCourt(r, user.id)));
  return res.ok ? { ok: true, view: roomView(res.room, user.id) } : res;
}

export async function nextCourtDeal(code: string): Promise<ActionResult> {
  const user = await getGameUser();
  if (!user) return { ok: false, reason: "unauthenticated" };
  const res = await withRoom(code, (r) => {
    if (seatOf(r, user.id) === -1) throw new Error("not seated");
    return botAdvance(startNextDeal(r, rndSeed()));
  });
  return res.ok ? { ok: true, view: roomView(res.room, user.id) } : res;
}

export async function getCourtView(code: string): Promise<ActionResult> {
  const user = await getGameUser();
  if (!user) return { ok: false, reason: "unauthenticated" };
  const loaded = await loadRoomByCode(code);
  if (!loaded) return { ok: false, reason: "not_found" };
  return { ok: true, view: roomView(loaded.room, user.id) };
}
