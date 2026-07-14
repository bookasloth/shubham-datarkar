import { todayISO } from "@/lib/daily";

/** Parse a YYYY-MM-DD as a UTC-midnight Date (calendar math only, no TZ drift). */
function fromISO(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`);
}
function toISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Today's IST calendar date as YYYY-MM-DD. Leaderboard windows span all games,
 *  so this is deliberately game-agnostic — not any one game's puzzle numbering. */
function todayIST(now: number): string {
  return todayISO(now);
}

/** Monday–Sunday (YYYY-MM-DD) of the IST week containing `now`. */
export function weekBoundsIST(now: number = Date.now()): { start: string; end: string } {
  const d = fromISO(todayIST(now));
  const dow = d.getUTCDay(); // 0=Sun..6=Sat
  const sinceMonday = (dow + 6) % 7;
  const start = new Date(d);
  start.setUTCDate(d.getUTCDate() - sinceMonday);
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);
  return { start: toISO(start), end: toISO(end) };
}

/** First–last day (YYYY-MM-DD) of the IST month containing `now`. */
export function monthBoundsIST(now: number = Date.now()): { start: string; end: string } {
  const d = fromISO(todayIST(now));
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  const start = new Date(Date.UTC(y, m, 1));
  const end = new Date(Date.UTC(y, m + 1, 0)); // day 0 of next month = last day of this month
  return { start: toISO(start), end: toISO(end) };
}
