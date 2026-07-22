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
    <div className={cn("flex w-full flex-col gap-1.5", grid ? "max-w-[22rem]" : "max-w-[26rem]")}>
      {rows.map((row, i) => (
        <div
          key={i}
          className={grid ? "grid gap-1" : "flex justify-center gap-1.5"}
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
                  // Flex keys share the row width instead of a fixed 32px, so the
                  // QWERTY row can't overflow a narrow phone and mis-taps shrink.
                  !grid && (k.wide ? "flex-[1.4] px-2" : "min-w-0 flex-1"),
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
