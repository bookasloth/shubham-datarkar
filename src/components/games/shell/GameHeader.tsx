import * as React from "react";
import { gameIcon } from "@/lib/games/registry";

/**
 * One header for every game: the game's icon + centred title, with an optional
 * actions slot pinned right (colour-blind toggle for Alfazy, Help/Stats/Settings
 * for Integra, nothing for Hit and Blow). Actions are absolute so they never
 * pull the title off centre.
 */
export function GameHeader({
  title,
  slug,
  actions,
}: {
  title: React.ReactNode;
  /** Game slug — renders its CDN icon in front of the name. */
  slug?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="relative flex w-full items-center justify-center">
      <h1 className="flex items-center gap-2 font-display text-xl font-bold">
        {slug && (
          // plain <img>: CDN host is CSP-allowed but not a next/image remote pattern
          <img src={gameIcon(slug)} alt="" aria-hidden="true" width={28} height={28} className="size-7 rounded-[6px]" />
        )}
        {title}
      </h1>
      {actions && (
        <div className="absolute right-0 flex items-center gap-1">{actions}</div>
      )}
    </div>
  );
}
