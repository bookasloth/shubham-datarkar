import { describe, it, expect, beforeEach } from "vitest";
import { withinCommunityLimit } from "./limits";
import { _reset } from "@/lib/rate-limit";

// No KV env in tests → allow() uses the deterministic in-memory window.
describe("withinCommunityLimit", () => {
  beforeEach(() => _reset());

  it("allows up to the action budget, then blocks", async () => {
    // 'report' budget is 10/hour.
    const results: boolean[] = [];
    for (let i = 0; i < 11; i++) results.push(await withinCommunityLimit("u1", "report"));
    expect(results.slice(0, 10).every(Boolean)).toBe(true); // first 10 within budget
    expect(results[10]).toBe(false); // 11th blocked
  });

  it("budgets are per-user, not global", async () => {
    for (let i = 0; i < 10; i++) await withinCommunityLimit("u1", "report");
    expect(await withinCommunityLimit("u1", "report")).toBe(false); // u1 exhausted
    expect(await withinCommunityLimit("u2", "report")).toBe(true); // u2 unaffected
  });

  it("budgets are per-action, not shared", async () => {
    for (let i = 0; i < 10; i++) await withinCommunityLimit("u1", "report");
    expect(await withinCommunityLimit("u1", "report")).toBe(false);
    expect(await withinCommunityLimit("u1", "post")).toBe(true); // different action, own budget
  });
});
