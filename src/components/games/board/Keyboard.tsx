import { cn } from "@/lib/utils";
import type { TileState } from "@/components/games/board/Tile";

export type KeyDef = { label: string; value: string; wide?: boolean };

/**
 * Config-driven on-screen keyboard. The caller passes rows of keys, so a word
 * game hands it QWERTY and a code game hands it a digit pad — same component,
 * same styling. Key colour comes from per-game CSS (`.{game}-key`), matching
 * the board tiles. Wide keys (Enter / Backspace) get horizontal padding; the
 * rest are fixed-width, exactly as before.
 */
export function Keyboard({
  game,
  rows,
  keyStates,
  onKey,
}: {
  game: string;
  rows: KeyDef[][];
  keyStates?: Record<string, TileState | undefined>;
  onKey: (value: string) => void;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      {rows.map((row, i) => (
        <div key={i} className="flex gap-1.5">
          {row.map((k) => {
            const st = keyStates?.[k.value];
            return (
              <button
                key={k.value}
                onClick={() => onKey(k.value)}
                className={cn(
                  `${game}-key h-12 rounded-btn font-semibold uppercase transition-ui`,
                  st ? `${game}-key--${st}` : "bg-secondary text-secondary-foreground",
                  k.wide ? "px-3" : "w-8",
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
