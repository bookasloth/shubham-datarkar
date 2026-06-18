import { describe, it, expect } from "vitest";
import robots from "@/app/robots";

describe("robots", () => {
  it("disallows /admin for every rule group", () => {
    const { rules } = robots();
    const groups = Array.isArray(rules) ? rules : [rules];
    for (const g of groups) {
      const disallow = Array.isArray(g.disallow) ? g.disallow : [g.disallow];
      expect(disallow).toContain("/admin");
    }
  });
});
