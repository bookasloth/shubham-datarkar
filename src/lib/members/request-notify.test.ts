import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { statusToTemplateKind } from "./request-notify";

describe("statusToTemplateKind", () => {
  it("shipped and planned mean approved", () => {
    expect(statusToTemplateKind("shipped")).toBe("approved");
    expect(statusToTemplateKind("planned")).toBe("approved");
  });
  it("declined means declined", () => {
    expect(statusToTemplateKind("declined")).toBe("declined");
  });
  it("open sends nothing", () => {
    expect(statusToTemplateKind("open")).toBeNull();
  });
});
