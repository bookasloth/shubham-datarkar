/**
 * Anonymous supporter aliases + author resolver for the auto thank-you post.
 * Pure (only node:crypto for randomness) so vitest can exercise it directly.
 */
import { randomInt } from "node:crypto";

import type { UpdateAuthor } from "./update-code";

export const SUPPORTER_ALIASES = [
  "Random Hero",
  "Beautiful Stranger",
  "Kind Soul",
  "Secret Legend",
  "Mystery Champion",
  "Quiet Rockstar",
  "Generous Stranger",
  "Hidden Gem",
  "Unnamed Hero",
  "Anonymous Maverick",
] as const;

/** A random anonymous alias for supporters who hid (or didn't share) their name. */
export function pickAlias(): string {
  return SUPPORTER_ALIASES[randomInt(0, SUPPORTER_ALIASES.length)];
}

/**
 * Resolve the public author for a thank-you post: the supporter's real name if
 * they gave one and didn't opt out, otherwise a random anonymous alias.
 */
export function thankyouAuthor(input: { name: string | null; anonymous: boolean }): UpdateAuthor {
  const name = input.name?.trim();
  if (input.anonymous || !name) return { alias: pickAlias() };
  return { name };
}
