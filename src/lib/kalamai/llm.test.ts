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

// A single transient error (529 overloaded, network blip) must NOT fail the
// article — runText retries with backoff. One live prod run flipped an article to
// `failed` on a transient draft-stage error before this guard existed.
describe("runText transient retry", () => {
  const finalMessage = vi.fn();
  const stream = vi.fn(() => ({ finalMessage }));
  const prevKey = process.env.ANTHROPIC_API_KEY;
  const prevFake = process.env.KALAMAI_FAKE_LLM;

  beforeEach(() => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    process.env.KALAMAI_FAKE_LLM = "0";
    vi.resetModules();
    stream.mockClear();
    finalMessage.mockReset();
    vi.doMock("@anthropic-ai/sdk", () => ({
      default: class {
        messages = { stream };
      },
    }));
  });
  afterEach(() => {
    process.env.ANTHROPIC_API_KEY = prevKey;
    process.env.KALAMAI_FAKE_LLM = prevFake;
    vi.doUnmock("@anthropic-ai/sdk");
    vi.useRealTimers();
  });

  const okMessage = {
    content: [{ type: "text", text: "drafted" }],
    usage: { input_tokens: 1, output_tokens: 1 },
  };

  it("retries once on a 529 overloaded error then succeeds", async () => {
    finalMessage
      .mockRejectedValueOnce(Object.assign(new Error("overloaded"), { status: 529 }))
      .mockResolvedValueOnce(okMessage);
    vi.useFakeTimers();

    const { runText } = await import("./llm");
    const p = runText({ system: "s", user: "u", fake: "x" });
    await vi.runAllTimersAsync(); // advance past the backoff sleep
    const { text } = await p;

    expect(text).toBe("drafted");
    expect(stream).toHaveBeenCalledTimes(2);
  });

  it("does NOT retry a 4xx (invalid request) — surfaces immediately", async () => {
    finalMessage.mockRejectedValue(Object.assign(new Error("bad request"), { status: 400 }));

    const { runText } = await import("./llm");
    await expect(runText({ system: "s", user: "u", fake: "x" })).rejects.toThrow("bad request");
    expect(stream).toHaveBeenCalledTimes(1);
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
