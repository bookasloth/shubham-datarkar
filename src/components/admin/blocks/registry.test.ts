import { describe, it, expect } from "vitest";
import { BLOCK_TYPES } from "./block-types";

describe("BLOCK_TYPES", () => {
  it("lists all 50 block types with a group each", () => {
    expect(BLOCK_TYPES).toHaveLength(50);
    for (const b of BLOCK_TYPES) {
      expect(typeof b.type).toBe("string");
      expect(typeof b.group).toBe("string");
      expect(typeof b.label).toBe("string");
    }
    // unique types
    expect(new Set(BLOCK_TYPES.map((b) => b.type)).size).toBe(50);
  });
});
