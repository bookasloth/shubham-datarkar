import { describe, it, expect, vi } from "vitest";

// onboarding-actions.ts imports supabaseAuthServer, whose chain has `import
// "server-only"`. That throws outside Next's RSC bundler (no "react-server"
// resolve condition in vitest) — same fix as the other *-server.test.ts files.
vi.mock("server-only", () => ({}));

import { validateUsername } from "./username";

describe("validateUsername", () => {
  it("accepts a valid handle", () => {
    expect(validateUsername("shubham.d")).toBeNull();
  });
  it("rejects too short", () => {
    expect(validateUsername("ab")).toMatch(/3-30/);
  });
  it("rejects illegal characters", () => {
    expect(validateUsername("bad handle!")).toMatch(/letters/);
  });
  it("trims before validating", () => {
    expect(validateUsername("  ok_name  ")).toBeNull();
  });
});
