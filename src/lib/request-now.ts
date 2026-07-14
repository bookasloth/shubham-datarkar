import "server-only";
import { connection } from "next/server";

/**
 * The current time, read at request time, for Server Components.
 *
 * `Date.now()` is impure, so react-hooks/purity rejects it inside a component
 * render body. Reading it here — outside any component — is the fix, and
 * `connection()` is what Next needs to know the render is per-request rather
 * than prerendered with a build-time clock.
 */
export async function requestNow(): Promise<number> {
  await connection();
  return Date.now();
}
