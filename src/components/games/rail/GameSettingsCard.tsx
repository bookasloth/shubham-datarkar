"use client";

import { useEffect, useState } from "react";
import type { GameKey } from "@/lib/games/registry";

/**
 * Per-game settings card lives in the rail. Owns the colour-blind pref for
 * Alfazy + Integra (Hit and Blow has no colour cue). Writes localStorage and
 * fires a same-tab `game:setting` CustomEvent so the game board's theme
 * provider can react live without a reload.
 */
export function GameSettingsCard({ game }: { game: GameKey }) {
  const key = `${game === "hit_and_blow" ? "hit-and-blow" : game}:colorblind`;
  const supportsColorblind = game !== "hit_and_blow";

  const [colorblind, setColorblind] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setColorblind(localStorage.getItem(key) === "1" || localStorage.getItem(key) === "true");
  }, [key]);

  function toggle(v: boolean) {
    setColorblind(v);
    localStorage.setItem(key, v ? "1" : "0");
    window.dispatchEvent(
      new CustomEvent("game:setting", { detail: { key, value: v ? "1" : "0" } }),
    );
  }

  return (
    <div className="space-y-3 text-sm">
      {supportsColorblind ? (
        <label className="flex items-start justify-between gap-3">
          <span>
            <span className="font-medium text-foreground">Colour-blind mode</span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              Adds a shape to each tile so colour isn&apos;t the only cue.
            </span>
          </span>
          <input
            type="checkbox"
            checked={colorblind}
            onChange={(e) => toggle(e.target.checked)}
            className="mt-0.5 size-5 shrink-0 accent-brand"
          />
        </label>
      ) : (
        <p className="text-muted-foreground">
          No colour cue in Hit and Blow, so no colour-blind toggle is needed.
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        Light and dark mode follow the site theme toggle in the header.
      </p>
    </div>
  );
}
