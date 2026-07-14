export type GameKey = "alfazy" | "hit_and_blow" | "integra";

export type GameConfig = {
  key: GameKey;
  slug: string;
  name: string;
  tag: string;
  /** Tailwind background for the card's thumbnail panel — the game's accent. */
  tint: string;
};

/** Single source of truth for the games on /games. Add a game = one entry here. */
export const GAMES: GameConfig[] = [
  { key: "alfazy", slug: "alfazy", name: "Alfazy", tag: "Guess the 5-letter word", tint: "bg-emerald-100 dark:bg-emerald-950" },
  { key: "hit_and_blow", slug: "hit-and-blow", name: "Hit and Blow", tag: "Crack the 4-digit code", tint: "bg-sky-100 dark:bg-sky-950" },
  { key: "integra", slug: "integra", name: "Integra", tag: "Guess the hidden equation", tint: "bg-violet-100 dark:bg-violet-950" },
];

/** Icon art lives on the asset CDN, one PNG per slug. */
export function gameIcon(slug: string) {
  return `https://website-assets.shubhamdatarkar.com/logos/games/${slug}.png`;
}

export function gameBySlug(slug: string): GameConfig | undefined {
  return GAMES.find((g) => g.slug === slug);
}
