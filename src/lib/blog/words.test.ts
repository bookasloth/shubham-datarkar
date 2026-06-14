import { describe, it, expect } from "vitest";
import { countWords } from "./words";
import type { ContentBlock } from "@/lib/data/types";

describe("countWords", () => {
  it("counts words across text blocks, ignoring structure", () => {
    const body: ContentBlock[] = [
      { type: "h2", text: "Two words" },
      { type: "p", text: "three more words here" }, // 4
    ];
    expect(countWords(body)).toBe(6);
  });

  it("handles RichText arrays (inline spans)", () => {
    const body: ContentBlock[] = [
      { type: "p", text: ["plain ", { t: "b", text: "bold one" }, " tail"] },
    ];
    // "plain" + "bold one" (2) + "tail" = 4
    expect(countWords(body)).toBe(4);
  });

  it("returns 0 for an empty body", () => {
    expect(countWords([])).toBe(0);
  });
});
