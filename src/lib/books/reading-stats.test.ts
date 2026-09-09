// src/lib/books/reading-stats.test.ts
import { describe, it, expect } from "vitest";
import { computeReadingStats } from "./reading-stats";

const yr = new Date().getFullYear();
const mk = (o: any) => ({ id: o.id, title: o.title ?? "T", slug: o.slug ?? o.id, pageCount: o.pageCount ?? null,
  reading: o.reading ?? null, review: o.review ?? null, genres: [] } as any);

describe("computeReadingStats", () => {
  const books = [
    mk({ id: "a", reading: { status: "currently_reading", currentPage: 180, totalPages: 300, percentage: 60 } }),
    mk({ id: "b", reading: { status: "finished", finishedAt: `${yr}-02-01`, totalPages: 320 }, review: { rating: 9 } }),
    mk({ id: "c", reading: { status: "finished", finishedAt: `${yr - 1}-05-01`, totalPages: 200 }, review: { rating: 8 } }),
    mk({ id: "d", reading: { status: "want_to_read" } }),
  ];
  const s = computeReadingStats(books);
  it("counts currently reading with percentage", () => {
    expect(s.currentlyReading).toEqual([{ title: "T", slug: "a", percentage: 60 }]);
  });
  it("finished-this-year excludes prior years", () => { expect(s.finishedThisYear).toBe(1); });
  it("pages read sums finished totalPages (all years)", () => { expect(s.pagesRead).toBe(520); });
  it("average rating over reviews, 1dp", () => { expect(s.averageRating).toBe(8.5); });
  it("want to read count", () => { expect(s.wantToRead).toBe(1); });
  it("counts by status", () => {
    expect(s.countsByStatus.finished).toBe(2);
    expect(s.countsByStatus.currently_reading).toBe(1);
  });
  it("null average when no reviews", () => {
    expect(computeReadingStats([mk({ id: "x", reading: { status: "want_to_read" } })]).averageRating).toBeNull();
  });
});
