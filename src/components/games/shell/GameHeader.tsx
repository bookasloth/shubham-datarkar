import * as React from "react";

/**
 * One header for every game: title on the left, an optional actions slot on
 * the right (colour-blind toggle for Alfazy, Help/Stats/Settings for Integra,
 * nothing for Hit and Blow). Replaces the three divergent hand-rolled headers.
 */
export function GameHeader({ title, actions }: { title: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="flex w-full items-center justify-between">
      <h1 className="font-display text-xl font-bold">{title}</h1>
      {actions && <div className="flex items-center gap-1">{actions}</div>}
    </div>
  );
}
