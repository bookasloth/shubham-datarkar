import "server-only";
import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";

// Identifies a signed-out player's single attempt per challenge. httpOnly so the
// page can't read/forge it. Clearing it grants a fresh budget — the IP rate limit
// on the scorer (see actions.ts) blunts that, by design (friendly-pride stakes).
export const GUEST_COOKIE = "gc_guest";
const YEAR = 60 * 60 * 24 * 365;

export async function readGuestKey(): Promise<string | null> {
  return (await cookies()).get(GUEST_COOKIE)?.value ?? null;
}

/** Read the guest key, issuing (and setting) one if absent. Server-action/route only. */
export async function getOrIssueGuestKey(): Promise<string> {
  const jar = await cookies();
  const existing = jar.get(GUEST_COOKIE)?.value;
  if (existing) return existing;
  const key = randomUUID();
  jar.set(GUEST_COOKIE, key, { httpOnly: true, sameSite: "lax", secure: true, maxAge: YEAR, path: "/" });
  return key;
}
