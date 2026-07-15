import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { postEmailKind } from "./community-notify";

describe("postEmailKind", () => {
  it("first post (0 prior) welcomes", () => {
    expect(postEmailKind(0)).toBe("welcome");
  });
  it("later posts are publish notices", () => {
    expect(postEmailKind(1)).toBe("published");
    expect(postEmailKind(42)).toBe("published");
  });
});
