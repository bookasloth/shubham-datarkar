import { cn } from "@/lib/utils";

export type TileState = "correct" | "present" | "absent";

/**
 * One board cell, shared across games. Colour and shape come from per-game
 * CSS (`.{game}-tile` / `.{game}-tile--{state}` in globals.css), so each game
 * keeps its own palette while the markup, flip animation and colour-blind
 * overlay live in one place.
 *
 * `size` stays per-game for now (Alfazy is a fixed 48px grid, Integra fluid);
 * unifying it is a deliberate later call once the adaptive stage lands.
 */
export function Tile({
  game,
  state,
  char = "",
  size = "fixed",
  flip = false,
  flipDelay = 0,
  colorblind = false,
}: {
  game: string;
  state?: TileState;
  char?: string;
  size?: "fixed" | "fluid";
  flip?: boolean;
  flipDelay?: number;
  colorblind?: boolean;
}) {
  return (
    <div
      className={cn(
        `${game}-tile flex items-center justify-center rounded-btn border-2 font-bold uppercase`,
        size === "fluid" ? "aspect-square w-full text-lg" : "h-12 w-12 text-xl",
        state ? `${game}-tile--${state}` : "border-border",
        flip && "animate-tile-flip",
      )}
      style={flip ? { animationDelay: `${flipDelay}s` } : undefined}
    >
      {char}
      {colorblind && state && <span className={`${game}-tile__icon`} aria-hidden="true" />}
    </div>
  );
}
