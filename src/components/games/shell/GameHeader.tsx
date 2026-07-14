import * as React from "react";

/**
 * One header for every game: title on the left, an optional actions slot on
 * the right (colour-blind toggle for Alfazy, Help/Stats/Settings for Integra,
 * nothing for Hit and Blow). Replaces the three divergent hand-rolled headers.
 */
export function GameHeader({ title, actions }: { title: React.ReactNode; actions?: React.ReactNode }) {
  return (
    // The title is centred on the column (which is what the board is centred on)
    // rather than pushed to the far-left edge by justify-between — with the actions
    // overlaid on the right so their width can't pull the title off-centre.
    <div className="relative flex w-full items-center justify-center">
      <h1 className="font-display text-xl font-bold">{title}</h1>
      {actions && <div className="absolute right-0 flex items-center gap-1">{actions}</div>}
    </div>
  );
}
