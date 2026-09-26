import * as React from "react";
import Image from "next/image";
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
    // A 3-column grid keeps the title centred on the board column while giving the
    // actions their own track on the right — so a long title (or a wide actions
    // slot) can't overlap the way an absolutely-positioned overlay would on mobile.
    <div className="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-2">
      <span aria-hidden="true" />
      <h1 className="col-start-2 flex min-w-0 items-center gap-2 font-display text-xl font-bold">
        {slug && (
          <Image src={gameIcon(slug)} alt="" aria-hidden="true" width={28} height={28} className="size-7 rounded-btn" />
        )}
        {title}
      </h1>
      {actions && <div className="col-start-3 flex items-center justify-self-end gap-1">{actions}</div>}
    </div>
  );
}
