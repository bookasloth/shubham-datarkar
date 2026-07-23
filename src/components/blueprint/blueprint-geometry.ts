/** Shared motion + geometry helpers for the blueprint kit. Pure, no React. */

/** System ease-out-quint (matches --ease-out-quint). */
export const EASE = [0.22, 1, 0.36, 1] as const;

/** SVG `points` for a triangle inscribed in a size×size box: apex top-center. */
export function trianglePoints(size: number): string {
  const apex = `${size * 0.5},${size * 0.14}`;
  const left = `${size * 0.14},${size * 0.72}`;
  const right = `${size * 0.86},${size * 0.72}`;
  return `${apex} ${left} ${right}`;
}

/** Interior grid line offsets for a width×height box on a `cell` grid. */
export function gridLines(
  width: number,
  height: number,
  cell: number,
): { v: number[]; h: number[] } {
  const v: number[] = [];
  for (let x = cell; x < width; x += cell) v.push(x);
  const h: number[] = [];
  for (let y = cell; y < height; y += cell) h.push(y);
  return { v, h };
}

/** framer-motion draw-in variants; reduced motion → final drawn state. */
export function drawVariants(reduce: boolean) {
  return {
    initial: reduce
      ? { pathLength: 1, opacity: 1 }
      : { pathLength: 0, opacity: 0.5 },
    visible: { pathLength: 1, opacity: 1 },
  };
}
