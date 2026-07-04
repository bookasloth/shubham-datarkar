export type GameKey = "alfazy" | "hit_and_blow";

export type GameConfig = {
  key: GameKey;
  slug: string;
  name: string;
  tag: string;
};

/** Single source of truth for the games on /games. Add a game = one entry here. */
export const GAMES: GameConfig[] = [
  { key: "alfazy", slug: "alfazy", name: "Alfazy", tag: "Guess the 5-letter word" },
  { key: "hit_and_blow", slug: "hit-and-blow", name: "Hit and Blow", tag: "Crack the 4-digit code" },
];

export function gameBySlug(slug: string): GameConfig | undefined {
  return GAMES.find((g) => g.slug === slug);
}
