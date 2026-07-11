import { describe, it, expect, afterEach } from "vitest";
import { safeNext, postLoginPath, loginDestination } from "./redirect";

describe("safeNext", () => {
  it("allows same-app authed subtrees", () => {
    expect(safeNext("/members")).toBe("/members");
    expect(safeNext("/members/explore?type=prompt")).toBe("/members/explore?type=prompt");
    expect(safeNext("/games/alfazy")).toBe("/games/alfazy");
    expect(safeNext("/community/compose")).toBe("/community/compose");
    expect(safeNext("/tools/kalamai")).toBe("/tools/kalamai");
    expect(safeNext("/admin/plans")).toBe("/admin/plans");
  });

  it("rejects open redirects and unknown paths", () => {
    expect(safeNext("https://evil.com")).toBeNull();
    expect(safeNext("//evil.com")).toBeNull();
    expect(safeNext("/\\evil.com")).toBeNull();
    expect(safeNext("/membersfake")).toBeNull(); // prefix must be path-anchored
    expect(safeNext("/")).toBeNull();
    expect(safeNext("")).toBeNull();
    expect(safeNext(null)).toBeNull();
  });
});

describe("loginDestination", () => {
  const ADMIN = "admin@example.com";
  afterEach(() => {
    delete process.env.ADMIN_EMAIL;
  });

  it("prefers a safe next over the identity default", () => {
    process.env.ADMIN_EMAIL = ADMIN;
    expect(loginDestination("/games/integra", ADMIN)).toBe("/games/integra");
  });

  it("falls back to the admin console for the admin identity", () => {
    process.env.ADMIN_EMAIL = ADMIN;
    expect(loginDestination(null, ADMIN)).toBe("/admin");
    expect(loginDestination("//evil.com", ADMIN)).toBe("/admin");
  });

  it("falls back to /members for everyone else", () => {
    process.env.ADMIN_EMAIL = ADMIN;
    expect(loginDestination(null, "user@example.com")).toBe("/members");
    expect(postLoginPath("user@example.com")).toBe("/members");
  });
});
