import { site } from "@/lib/site";
import { gameByKey, type GameKey } from "@/lib/games/registry";

export type ShareInput = {
  game: GameKey;
  puzzleNumber: number;
  status: "won" | "lost";
  /** Tries used on a win; ignored when lost (which always reads X/max). */
  tries: number;
  maxGuesses: number;
  /** Pre-rendered result block — emoji grid, or Hit and Blow's text summary. */
  grid: string;
};

/** The public link that rides along in every share: /g/alfz, /g/intg, /g/htbl. */
export function gameShareUrl(game: GameKey): string {
  const g = gameByKey(game);
  return `${site.url}/g/${g?.code ?? ""}`;
}

/** Where "Share to Community" returns the player after they post. */
export function gameLeaderboardUrl(game: GameKey): string {
  const g = gameByKey(game);
  return `/games/${g?.slug ?? ""}/leaderboard`;
}

/** The headline line — reused by the share text and the shareable image. */
export function shareTitle(i: ShareInput): string {
  const name = gameByKey(i.game)?.name ?? "Game";
  const score = i.status === "won" ? `${i.tries}/${i.maxGuesses}` : `X/${i.maxGuesses}`;
  return i.status === "won"
    ? `I Solved ${name} #${i.puzzleNumber} in ${score}`
    : `I played ${name} #${i.puzzleNumber} — ${score}`;
}

/**
 * The one share string, used by the clipboard and every social target.
 *
 * Plain text on purpose: the destinations disagree on markup (WhatsApp wants
 * *asterisks*, X and the community feed have none), and Unicode bold glyphs read
 * as gibberish to a screen reader. The grid is the visual anchor, not the title.
 */
export function buildShareText(i: ShareInput): string {
  return `${shareTitle(i)}\n${i.grid}\n\nTry now at ${gameShareUrl(i.game)}`;
}
