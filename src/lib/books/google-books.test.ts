// src/lib/books/google-books.test.ts
import { describe, it, expect } from "vitest";
import { normalizeVolume, type GoogleVolume } from "./google-books";

const sample: GoogleVolume = {
  id: "abc123",
  volumeInfo: {
    title: "The Psychology of Money",
    subtitle: "Timeless lessons on wealth, greed, and happiness",
    authors: ["Morgan Housel"],
    description: "Doing well with money...",
    publisher: "Harriman House",
    publishedDate: "2020-09-08",
    pageCount: 256,
    language: "en",
    categories: ["Business & Economics"],
    imageLinks: { thumbnail: "http://books.google.com/img?id=abc123&zoom=1" },
    industryIdentifiers: [
      { type: "ISBN_10", identifier: "0857197681" },
      { type: "ISBN_13", identifier: "9780857197689" },
    ],
  },
};

describe("normalizeVolume", () => {
  it("maps fields and prefers ISBN_13", () => {
    const b = normalizeVolume(sample);
    expect(b.googleId).toBe("abc123");
    expect(b.title).toBe("The Psychology of Money");
    expect(b.authors).toEqual(["Morgan Housel"]);
    expect(b.isbn).toBe("9780857197689");
    expect(b.pageCount).toBe(256);
  });
  it("upgrades cover URL to https", () => {
    const b = normalizeVolume(sample);
    expect(b.cover?.startsWith("https://")).toBe(true);
  });
  it("tolerates a bare volume with no volumeInfo fields", () => {
    const b = normalizeVolume({ id: "x", volumeInfo: {} } as GoogleVolume);
    expect(b.googleId).toBe("x");
    expect(b.title).toBe("");
    expect(b.authors).toEqual([]);
    expect(b.isbn).toBeNull();
    expect(b.cover).toBeNull();
  });
});
