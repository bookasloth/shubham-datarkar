import { cn } from "@/lib/utils";
import type { TileState } from "@/components/games/board/Tile";

export type KeyDef = { label: string; value: string; wide?: boolean };

/**
 * Config-driven on-screen keyboard. The caller passes rows of keys, so a word
 * game hands it QWERTY (`variant="flex"`, fixed-width keys, wide Enter/Back)
 * and a math game hands it a digit/ops pad (`variant="grid"`, keys sized by
 * the grid track). Key colour comes from per-game CSS (`.{game}-key`).
 */
export function Keyboard({
  game,
  rows,
  keyStates,
  onKey,
  variant = "flex",
}: {
  game: string;
  rows: KeyDef[][];
  keyStates?: Record<string, TileState | undefined>;
  onKey: (value: string) => void;
  variant?: "flex" | "grid";
}) {
  const grid = variant === "grid";
  return (
    <div className={cn("flex flex-col gap-1.5", grid ? "w-full max-w-[22rem]" : "items-center")}>
      {rows.map((row, i) => (
        <div
          key={i}
          className={grid ? "grid gap-1" : "flex gap-1.5"}
          style={grid ? { gridTemplateColumns: `repeat(${row.length}, minmax(0, 1fr))` } : undefined}
        >
          {row.map((k) => {
            const st = keyStates?.[k.value];
            return (
              <button
                key={k.value}
                onClick={() => onKey(k.value)}
                className={cn(
                  `${game}-key h-12 rounded-btn font-semibold transition-ui`,
                  st ? `${game}-key--${st}` : "bg-secondary text-secondary-foreground",
                  grid ? "text-base" : "uppercase",
                  !grid && (k.wide ? "px-3" : "w-8"),
                )}
              >
                {k.label}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
