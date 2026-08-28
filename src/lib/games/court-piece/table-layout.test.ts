import { describe, it, expect } from "vitest";
import { screenSeat, seatsAround } from "./table-layout";
import type { Seat } from "./types";

describe("screenSeat — rotate the table so the viewer is always South", () => {
  it("puts the viewer at South and their partner at North", () => {
    for (const you of [0, 1, 2, 3] as Seat[]) {
      expect(screenSeat(you, you)).toBe("S");
      expect(screenSeat(((you + 2) % 4) as Seat, you)).toBe("N"); // partner opposite
    }
  });

  it("puts the next player (play goes right) at East and the previous at West", () => {
    // viewer seat 0: next=1 -> E, prev=3 -> W
    expect(screenSeat(1, 0)).toBe("E");
    expect(screenSeat(3, 0)).toBe("W");
    // viewer seat 2: next=3 -> E, prev=1 -> W
    expect(screenSeat(3, 2)).toBe("E");
    expect(screenSeat(1, 2)).toBe("W");
  });
});

describe("seatsAround", () => {
  it("maps every screen position to the right engine seat for the viewer", () => {
    expect(seatsAround(1)).toEqual({ S: 1, E: 2, N: 3, W: 0 });
  });
});
