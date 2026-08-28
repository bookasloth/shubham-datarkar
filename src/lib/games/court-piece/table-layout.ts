import type { Seat } from "./types";

/** Screen position of a seat, from the viewer's chair. The viewer is always South;
 *  the table rotates around them. Play goes to the right, so the next seat sits East.
 *    offset 0 = South (you), 1 = East (next), 2 = North (partner), 3 = West (previous). */
export type ScreenPos = "S" | "E" | "N" | "W";

const POS: ScreenPos[] = ["S", "E", "N", "W"];

export function screenSeat(seat: Seat, viewer: Seat): ScreenPos {
  return POS[(seat - viewer + 4) % 4];
}

/** Inverse map: which engine seat sits at each screen position, for this viewer. */
export function seatsAround(viewer: Seat): Record<ScreenPos, Seat> {
  return {
    S: viewer,
    E: ((viewer + 1) % 4) as Seat,
    N: ((viewer + 2) % 4) as Seat,
    W: ((viewer + 3) % 4) as Seat,
  };
}
