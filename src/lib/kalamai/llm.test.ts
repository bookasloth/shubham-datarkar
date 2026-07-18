import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { runText } from "./llm";

// runText's real path streams from the Anthropic SDK; the offline branch (no key
// or KALAMAI_FAKE_LLM) is the seam every writing test and local dev run hits.
describe("runText fake mode", () => {
  const prev = process.env.KALAMAI_FAKE_LLM;
  beforeEach(() => {
    process.env.KALAMAI_FAKE_LLM = "1";
  });
  afterEach(() => {
    process.env.KALAMAI_FAKE_LLM = prev;
  });

  it("returns the supplied fake text and zero usage without calling the API", async () => {
    const { text, usage } = await runText({ system: "sys", user: "u", fake: "[]" });
    expect(text).toBe("[]");
    expect(usage.costUsd).toBe(0);
    expect(usage.inputTokens).toBe(0);
  });
});
