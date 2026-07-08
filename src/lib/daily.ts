// Deterministic daily engine — shared by every game.
// Reset timezone: IST (UTC+5:30, no DST). Puzzle #0 = 2025-01-01 IST.

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const EPOCH_UTC_MS = Date.UTC(2024, 11, 31, 18, 30, 0); // 2025-01-01 00:00 IST
const DAY_MS = 86_400_000;

/** Today's puzzle number (an integer that is identical for everyone worldwide). */
export function puzzleNumberFor(now: number = Date.now()): number {
  return Math.floor((now - EPOCH_UTC_MS) / DAY_MS);
}

/** The IST calendar date (YYYY-MM-DD) for a given puzzle number. */
export function puzzleDateISO(puzzleNumber: number): string {
  return new Date(EPOCH_UTC_MS + puzzleNumber * DAY_MS + IST_OFFSET_MS)
    .toISOString()
    .slice(0, 10);
}

/** Milliseconds until the next puzzle unlocks (for a countdown timer). */
export function msUntilNextPuzzle(now: number = Date.now()): number {
  const next = EPOCH_UTC_MS + (puzzleNumberFor(now) + 1) * DAY_MS;
  return next - now;
}

/** Is this puzzle the live one? (archive access is gated on !isToday.) */
export function isToday(puzzleNumber: number, now: number = Date.now()): boolean {
  return puzzleNumber === puzzleNumberFor(now);
}

/** Was this the puzzle exactly one day before today's? */
export function isYesterday(puzzleNumber: number, now: number = Date.now()): boolean {
  return puzzleNumber === puzzleNumberFor(now) - 1;
}

/** Free window: the live puzzle and the one before it. Older puzzles need view_archive. */
export function isTodayOrYesterday(puzzleNumber: number, now: number = Date.now()): boolean {
  return isToday(puzzleNumber, now) || isYesterday(puzzleNumber, now);
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
