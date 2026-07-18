import { describe, it, expect } from "vitest";
import { kmeans, silhouette, selectClusters } from "./kmeans";

// Build a unit vector pointing mostly along axis `dim` with small jitter.
function vec(dim: number, size: number, axis: number, jitter: number): number[] {
  const v = new Array(size).fill(0).map(() => jitter * (((axis * 7 + 13) % 5) - 2) * 0.01);
  v[axis] = 1;
  const n = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
  return v.map((x) => x / n);
}

describe("kmeans + silhouette", () => {
  it("separates two well-defined groups", () => {
    const size = 8;
    const groupA = Array.from({ length: 10 }, (_, i) => vec(size, size, 0, i));
    const groupB = Array.from({ length: 10 }, (_, i) => vec(size, size, 4, i));
    const vectors = [...groupA, ...groupB];
    const { assignments } = kmeans(vectors, 2);
    // All of group A share one label, all of group B the other.
    const aLabels = new Set(assignments.slice(0, 10));
    const bLabels = new Set(assignments.slice(10));
    expect(aLabels.size).toBe(1);
    expect(bLabels.size).toBe(1);
    expect([...aLabels][0]).not.toBe([...bLabels][0]);
  });

  it("silhouette is higher for the correct k than an over-split k", () => {
    const size = 8;
    const vectors = [
      ...Array.from({ length: 12 }, (_, i) => vec(size, size, 0, i)),
      ...Array.from({ length: 12 }, (_, i) => vec(size, size, 5, i)),
    ];
    const s2 = silhouette(vectors, kmeans(vectors, 2).assignments, 2);
    const s6 = silhouette(vectors, kmeans(vectors, 6).assignments, 6);
    expect(s2).toBeGreaterThan(s6); // 2 real groups → k=2 cleaner than k=6
  });

  it("selectClusters is deterministic and returns a valid k in range", () => {
    const size = 10;
    const vectors = Array.from({ length: 40 }, (_, i) => vec(size, size, i % 4, i));
    const a = selectClusters(vectors, 2, 8);
    const b = selectClusters(vectors, 2, 8);
    expect(a.k).toBe(b.k);
    expect(a.assignments).toEqual(b.assignments);
    expect(a.k).toBeGreaterThanOrEqual(2);
    expect(a.k).toBeLessThanOrEqual(8);
    expect(a.centroids).toHaveLength(a.k);
  });

  it("handles fewer vectors than kMin", () => {
    const size = 6;
    const vectors = Array.from({ length: 3 }, (_, i) => vec(size, size, i, i));
    const r = selectClusters(vectors, 6, 16);
    expect(r.k).toBeLessThanOrEqual(3);
    expect(r.assignments).toHaveLength(3);
  });
});
