// Deterministic daily engine — shared by every game.
// Reset timezone: IST (UTC+5:30, no DST).
//
// Each game numbers its puzzles from ITS OWN launch day, so Alfazy #0, Integra #0
// and Hit and Blow #0 are three different calendar dates. Every puzzle-number call
// therefore takes a game. Pure calendar math that isn't about a specific game
// (today's date, the countdown to the next reset) stays game-agnostic and hangs off
// the platform epoch below.

import type { GameKey } from "@/lib/games/registry";

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const DAY_MS = 86_400_000;

/** 2025-01-01 00:00 IST. Calendar anchor only — NOT a puzzle number for any game. */
const EPOCH_UTC_MS = Date.UTC(2024, 11, 31, 18, 30, 0);

/** Each game's puzzle #0, expressed as the UTC instant of that IST midnight. */
const GAME_EPOCH_UTC_MS: Record<GameKey, number> = {
  alfazy: Date.UTC(2026, 3, 30, 18, 30, 0), // 2026-05-01 00:00 IST
  integra: Date.UTC(2026, 4, 31, 18, 30, 0), // 2026-06-01 00:00 IST
  hit_and_blow: Date.UTC(2026, 5, 30, 18, 30, 0), // 2026-07-01 00:00 IST
};

/** Whole IST days since the platform epoch. Game-agnostic. */
function dayIndex(now: number): number {
  return Math.floor((now - EPOCH_UTC_MS) / DAY_MS);
}

/** Today's puzzle number for a game — identical for everyone worldwide. */
export function puzzleNumberFor(game: GameKey, now: number = Date.now()): number {
  return Math.floor((now - GAME_EPOCH_UTC_MS[game]) / DAY_MS);
}

/** The IST calendar date (YYYY-MM-DD) of a game's given puzzle number. */
export function puzzleDateISO(game: GameKey, puzzleNumber: number): string {
  return new Date(GAME_EPOCH_UTC_MS[game] + puzzleNumber * DAY_MS + IST_OFFSET_MS)
    .toISOString()
    .slice(0, 10);
}

/** Today's IST calendar date (YYYY-MM-DD). No game involved. */
export function todayISO(now: number = Date.now()): string {
  return new Date(EPOCH_UTC_MS + dayIndex(now) * DAY_MS + IST_OFFSET_MS)
    .toISOString()
    .slice(0, 10);
}

/** Milliseconds until the next IST midnight — every game rolls over together. */
export function msUntilNextPuzzle(now: number = Date.now()): number {
  return EPOCH_UTC_MS + (dayIndex(now) + 1) * DAY_MS - now;
}

/** Is this puzzle the live one? (archive access is gated on !isToday.) */
export function isToday(game: GameKey, puzzleNumber: number, now: number = Date.now()): boolean {
  return puzzleNumber === puzzleNumberFor(game, now);
}

/** Was this the puzzle exactly one day before today's? */
export function isYesterday(game: GameKey, puzzleNumber: number, now: number = Date.now()): boolean {
  return puzzleNumber === puzzleNumberFor(game, now) - 1;
}

/** Free window: the live puzzle and the one before it. Older puzzles need view_archive. */
export function isTodayOrYesterday(
  game: GameKey,
  puzzleNumber: number,
  now: number = Date.now(),
): boolean {
  return isToday(game, puzzleNumber, now) || isYesterday(game, puzzleNumber, now);
}

/** mulberry32 — deterministic PRNG, identical output on server and client. */
export function seededRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic Fisher-Yates. Same seed → same order on server and client. */
export function seededShuffle<T>(items: readonly T[], seed: number): T[] {
  const out = [...items];
  const rng = seededRng(seed);
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
