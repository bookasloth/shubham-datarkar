import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { supporterMilestoneFor } from "./supporter";

describe("supporterMilestoneFor", () => {
  it("returns the threshold when count lands on one", () => {
    expect(supporterMilestoneFor(10)).toBe(10);
    expect(supporterMilestoneFor(100)).toBe(100);
  });
  it("returns null off-threshold", () => {
    expect(supporterMilestoneFor(11)).toBeNull();
    expect(supporterMilestoneFor(0)).toBeNull();
  });
});
