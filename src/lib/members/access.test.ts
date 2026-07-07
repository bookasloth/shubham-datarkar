import { describe, expect, it } from "vitest";
import { canAccess, type MemberRole, type Visibility } from "./access";

const CASES: Array<[Visibility, MemberRole, boolean]> = [
  ["free", "guest", true],
  ["free", "member", true],
  ["free", "premium", true],
  ["free", "admin", true],
  ["members", "guest", false],
  ["members", "member", true],
  ["members", "premium", true],
  ["members", "admin", true],
  ["premium", "guest", false],
  ["premium", "member", false],
  ["premium", "premium", true],
  ["premium", "admin", true],
  ["hidden", "guest", false],
  ["hidden", "member", false],
  ["hidden", "premium", false],
  ["hidden", "admin", true],
];

describe("canAccess", () => {
  it.each(CASES)("visibility=%s role=%s -> %s", (visibility, role, expected) => {
    expect(canAccess(visibility, role)).toBe(expected);
  });
});
