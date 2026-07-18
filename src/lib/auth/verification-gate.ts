/** The window a new account may use the app before verifying its email. */
export const GRACE_MS = 48 * 60 * 60 * 1000;

/**
 * True when an account is unverified AND older than the 48h grace window — the
 * point at which login is blocked until the address is confirmed. Verified
 * accounts are never blocked. `now` is injectable for tests.
 */
export function isUnverifiedPastGrace(
  user: { email_confirmed_at?: string | null; created_at: string },
  now: Date = new Date(),
): boolean {
  if (user.email_confirmed_at) return false;
  return now.getTime() - new Date(user.created_at).getTime() > GRACE_MS;
}
