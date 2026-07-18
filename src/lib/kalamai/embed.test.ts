import { describe, it, expect, vi, beforeAll } from "vitest";

vi.mock("server-only", () => ({}));

// Force fake-embed regardless of environment.
beforeAll(() => {
  process.env.KALAMAI_FAKE_EMBED = "1";
});

import { embedTexts, toPgVector, isFakeEmbed, EMBED_DIM, EMBED_MODEL } from "./embed";

describe("embed (fake mode)", () => {
  it("is fake when flagged", () => {
    expect(isFakeEmbed()).toBe(true);
    expect(EMBED_MODEL).toBe("gemini-embedding-001");
    expect(EMBED_DIM).toBe(768);
  });

  it("returns one 768-dim unit vector per input", async () => {
    const v = await embedTexts(["hello world", "another chunk"], "RETRIEVAL_DOCUMENT");
    expect(v).toHaveLength(2);
    expect(v[0]).toHaveLength(768);
    const norm = Math.sqrt(v[0].reduce((s, x) => s + x * x, 0));
    expect(norm).toBeCloseTo(1, 5); // unit length
  });

  it("is deterministic — same text → same vector", async () => {
    const [a] = await embedTexts(["stable text"], "RETRIEVAL_QUERY");
    const [b] = await embedTexts(["stable text"], "RETRIEVAL_QUERY");
    expect(a).toEqual(b);
  });

  it("empty input → empty output", async () => {
    expect(await embedTexts([], "RETRIEVAL_DOCUMENT")).toEqual([]);
  });

  it("toPgVector formats a vector literal", () => {
    expect(toPgVector([0.1, 0.2, 0.3])).toBe("[0.1,0.2,0.3]");
  });
});
