import { randomInt } from "node:crypto";

/**
 * Unambiguous charset — no 0/O/1/I/l/o — so a temp password read aloud, copied,
 * or relayed over chat isn't misread. Mixed case + digits keeps it strong enough
 * for a one-time credential the user changes at leisure.
 */
export const TEMP_PASSWORD_CHARSET =
  "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

/** Cryptographically-random temp password (crypto.randomInt, not Math.random). */
export function generateTempPassword(length = 14): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += TEMP_PASSWORD_CHARSET[randomInt(TEMP_PASSWORD_CHARSET.length)];
  }
  return out;
}
