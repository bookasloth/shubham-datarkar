import "server-only";

import { supabaseAdmin } from "@/lib/supabase/server";
import type { RoomState } from "../types";

// The authoritative room (hands, deck, shuffle seed, move log) lives in ONE JSONB
// column, readable only by the service role. Clients never touch this table; they
// go through server actions that return a per-seat sanitized view. Concurrency is
// optimistic: writes are guarded on the version they read, so simultaneous moves
// serialize (the loser retries) without holding a DB lock across a JS round-trip.

export type LoadedRoom = { id: string; version: number; room: RoomState };

export async function loadRoomByCode(code: string): Promise<LoadedRoom | null> {
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("cp_games")
    .select("id, version, state")
    .eq("code", code)
    .maybeSingle();
  if (error || !data) return null;
  return { id: data.id, version: data.version, room: data.state as RoomState };
}

/** A player's display name for the table — profile display_name, else username. */
export async function getDisplayName(userId: string): Promise<string> {
  const sb = supabaseAdmin();
  const { data } = await sb
    .from("profiles")
    .select("display_name, username")
    .eq("id", userId)
    .maybeSingle();
  return (data?.display_name as string) || (data?.username as string) || "Player";
}

export async function insertRoom(room: RoomState, createdBy: string): Promise<void> {
  const sb = supabaseAdmin();
  const { error } = await sb.from("cp_games").insert({
    code: room.code,
    status: room.status,
    state: room,
    version: room.version,
    created_by: createdBy,
  });
  if (error) throw new Error(error.message);
}

/** Optimistic write. Succeeds (true) only if the row is still at `expectedVersion`;
 *  a concurrent writer that already advanced it makes this return false. */
export async function saveRoom(
  id: string,
  expectedVersion: number,
  room: RoomState,
): Promise<boolean> {
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("cp_games")
    .update({
      state: room,
      status: room.status,
      version: room.version,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("version", expectedVersion)
    .select("id");
  if (error) return false;
  return (data?.length ?? 0) > 0;
}
