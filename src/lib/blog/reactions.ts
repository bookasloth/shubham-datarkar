/**
 * Blog reaction config — single source of truth for keys, labels, and order
 * (best → worst). Pure data: safe to import from both the server action
 * (validation) and the client component (rendering). Icons are mapped to
 * lucide components in the client component, not here.
 */

export const REACTIONS = [
  { key: "love", label: "Loved it" },
  { key: "fire", label: "Great" },
  { key: "insightful", label: "Insightful" },
  { key: "meh", label: "Meh" },
  { key: "confused", label: "Confused" },
  { key: "down", label: "Not for me" },
] as const;

export type ReactionKey = (typeof REACTIONS)[number]["key"];

export const REACTION_KEYS = REACTIONS.map((r) => r.key) as ReactionKey[];

/** Count map returned by the server. Missing keys mean zero. */
export type ReactionCounts = Partial<Record<ReactionKey, number>>;

export function isReactionKey(value: unknown): value is ReactionKey {
  return typeof value === "string" && (REACTION_KEYS as string[]).includes(value);
}
