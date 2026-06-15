import { describe, it, expect } from "vitest";
import { BLOCK_TYPES } from "./block-types";
import { registry } from "./registry";

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

describe("registry", () => {
  it("has a create() + Editor for every listed block type", () => {
    for (const { type } of BLOCK_TYPES) {
      const entry = (registry as Record<string, unknown>)[type];
      expect(entry, `missing registry entry: ${type}`).toBeDefined();
      const e = entry as { create: () => { type: string }; Editor: unknown };
      expect(typeof e.create).toBe("function");
      expect(e.create().type).toBe(type);
      expect(e.Editor).toBeTruthy();
    }
  });
});
