// Pure reading-stats aggregation over already-fetched books. No DB, no
// server-only import — safe to call from client or server code alike.

import { READING_STATUSES, type BookWithRelations } from "./types";

export type ReadingStats = {
  currentlyReading: { title: string; slug: string; percentage: number }[];
  finishedThisYear: number;
  pagesRead: number;
  averageRating: number | null;
  countsByStatus: Record<string, number>;
  wantToRead: number;
};

export function computeReadingStats(books: BookWithRelations[]): ReadingStats {
  const currentYear = new Date().getFullYear();
  const countsByStatus: Record<string, number> = Object.fromEntries(READING_STATUSES.map((s) => [s, 0]));

  const currentlyReading: ReadingStats["currentlyReading"] = [];
  let finishedThisYear = 0;
  let pagesRead = 0;
  let ratingSum = 0;
  let ratingCount = 0;

  for (const book of books) {
    const reading = book.reading;
    if (!reading) continue;
    if (reading.status in countsByStatus) countsByStatus[reading.status] += 1;

    if (reading.status === "currently_reading") {
      currentlyReading.push({ title: book.title, slug: book.slug, percentage: reading.percentage ?? 0 });
    }

    if (reading.status === "finished") {
      pagesRead += reading.totalPages ?? book.pageCount ?? 0;
      const finishedYear = reading.finishedAt ? new Date(reading.finishedAt).getFullYear() : null;
      if (finishedYear === currentYear) finishedThisYear += 1;
    }

    if (book.review?.rating != null) {
      ratingSum += book.review.rating;
      ratingCount += 1;
    }
  }

  return {
    currentlyReading,
    finishedThisYear,
    pagesRead,
    averageRating: ratingCount > 0 ? Math.round((ratingSum / ratingCount) * 10) / 10 : null,
    countsByStatus,
    wantToRead: countsByStatus.want_to_read ?? 0,
  };
}
