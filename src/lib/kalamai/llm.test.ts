import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { runText, buildSystem } from "./llm";

describe("buildSystem (prompt-cache ordering)", () => {
  it("puts the cacheable brief FIRST with the cache_control marker, instructions last", () => {
    const s = buildSystem("BRIEF", "stage instructions");
    expect(s).toHaveLength(2);
    // brief first + marked → the cached prefix is invariant across W2-W4
    expect(s[0].text).toBe("BRIEF");
    expect(s[0].cache_control).toEqual({ type: "ephemeral" });
    // varying instructions come AFTER the marker, so they don't break the cache prefix
    expect(s[1].text).toBe("stage instructions");
    expect(s[1].cache_control).toBeUndefined();
  });

  it("no cachePrefix → single uncached instruction block", () => {
    const s = buildSystem(undefined, "sys");
    expect(s).toHaveLength(1);
    expect(s[0].cache_control).toBeUndefined();
  });

  it("mark=false (structured output) → brief sent first but NOT cached (no orphan write)", () => {
    const s = buildSystem("BRIEF", "sys", false);
    expect(s[0].text).toBe("BRIEF");
    expect(s[0].cache_control).toBeUndefined();
  });
});

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
