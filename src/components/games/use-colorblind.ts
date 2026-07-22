"use client";

import { useEffect, useState } from "react";

/**
 * Shared colour-blind toggle for every game. Reads `{game}:colorblind` from
 * localStorage on mount and stays in sync with the rail's Settings card via the
 * `game:setting` custom event — one mechanism instead of each board hand-rolling
 * its own storage read + event listener.
 */
export function useColorblind(game: string): [boolean, (v: boolean) => void] {
  const key = `${game}:colorblind`;
  const [on, setOn] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(key);
    if (saved === "1" || saved === "true") setOn(true);
    function onSetting(e: Event) {
      const d = (e as CustomEvent).detail as { key?: string; value?: string } | undefined;
      if (d?.key === key) setOn(d.value === "1" || d.value === "true");
    }
    window.addEventListener("game:setting", onSetting);
    return () => window.removeEventListener("game:setting", onSetting);
  }, [key]);

  return [on, setOn];
}
