import { describe, it, expect } from "vitest";
import { clampParentDepth, MAX_REPLY_DEPTH } from "./reply-depth";

// The whole risk of nested replies is this clamp: a new reply must never land
// deeper than MAX_REPLY_DEPTH, and re-parenting must produce a sibling, not an
// error. targetDepth is the depth of the post being replied to (root post = 0);
// the new reply's depth is clampParentDepth(targetDepth) + 1.
describe("clampParentDepth", () => {
  const newDepth = (targetDepth: number) => clampParentDepth(targetDepth) + 1;

  it("parents a reply to the root post at depth 1", () => {
    expect(clampParentDepth(0)).toBe(0); // attach under the root post
    expect(newDepth(0)).toBe(1);
  });

  it("nests normally while under the cap", () => {
    expect(newDepth(1)).toBe(2); // reply to a depth-1 reply → depth 2
    expect(newDepth(2)).toBe(3); // reply to a depth-2 reply → depth 3
  });

  it("re-parents a reply to a max-depth post into a sibling, not a 4th level", () => {
    // target is at the cap: attach to its parent (depth 2), so the reply is a
    // depth-3 sibling of the target rather than a depth-4 child.
    expect(clampParentDepth(3)).toBe(2);
    expect(newDepth(3)).toBe(MAX_REPLY_DEPTH);
  });

  it("never exceeds the cap, however deep the target claims to be", () => {
    for (let d = 0; d <= 10; d++) expect(newDepth(d)).toBeLessThanOrEqual(MAX_REPLY_DEPTH);
  });
});
