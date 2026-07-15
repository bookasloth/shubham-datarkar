import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { classifyChargeKind } from "./membership-notify";

describe("classifyChargeKind", () => {
  it("first charge (no prior period) is an activation", () => {
    expect(classifyChargeKind(null)).toBe("activated");
  });
  it("charge with an existing period is a renewal", () => {
    expect(classifyChargeKind("2026-08-01T00:00:00.000Z")).toBe("renewed");
  });
});
