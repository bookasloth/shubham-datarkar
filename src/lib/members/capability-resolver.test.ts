import { describe, expect, it } from "vitest";
import { resolveCapabilities } from "./capability-resolver";
import { ALL_CAPABILITIES } from "./capabilities";

describe("resolveCapabilities", () => {
  it("admin gets every capability including admin_only", () => {
    const caps = resolveCapabilities({ isAdmin: true, planCapabilities: [] });
    for (const c of ALL_CAPABILITIES) expect(caps.has(c)).toBe(true);
  });
  it("non-admin gets exactly the plan's capabilities", () => {
    const caps = resolveCapabilities({ isAdmin: false, planCapabilities: ["view_archive"] });
    expect(caps.has("view_archive")).toBe(true);
    expect(caps.has("view_premium_blog")).toBe(false);
    expect(caps.has("admin_only")).toBe(false);
  });
  it("free/guest (no plan) gets nothing", () => {
    expect(resolveCapabilities({ isAdmin: false, planCapabilities: [] }).size).toBe(0);
  });
});
