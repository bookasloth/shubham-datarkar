import { describe, it, expect } from "vitest";
import { EASE, trianglePoints, gridLines, drawVariants, motionActivation } from "./blueprint-geometry";

describe("blueprint-geometry", () => {
  it("EASE matches the system ease-out-quint", () => {
    expect(EASE).toEqual([0.22, 1, 0.36, 1]);
  });

  it("trianglePoints returns three scaled x,y pairs", () => {
    const pts = trianglePoints(100).trim().split(/\s+/);
    expect(pts).toHaveLength(3);
    for (const p of pts) {
      const [x, y] = p.split(",").map(Number);
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(100);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(100);
    }
  });

  it("gridLines returns interior offsets only (excludes 0 and edges)", () => {
    const { v, h } = gridLines(200, 100, 50);
    expect(v).toEqual([50, 100, 150]);
    expect(h).toEqual([50]);
  });

  it("drawVariants animates 0->1 normally", () => {
    const dv = drawVariants(false);
    expect(dv.initial.pathLength).toBe(0);
    expect(dv.visible.pathLength).toBe(1);
  });

  it("drawVariants renders final state under reduced motion", () => {
    const dv = drawVariants(true);
    expect(dv.initial.pathLength).toBe(1);
    expect(dv.initial.opacity).toBe(1);
  });

  it("motionActivation('mount') animates immediately, not on scroll", () => {
    const m = motionActivation("mount");
    expect(m.animate).toBe("visible");
    expect("whileInView" in m).toBe(false);
  });

  it("motionActivation('inView') animates on scroll into view, once", () => {
    const m = motionActivation("inView");
    expect(m.whileInView).toBe("visible");
    expect(m.viewport).toEqual({ once: true, margin: "-80px" });
  });
});
