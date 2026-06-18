import { describe, it, expect } from "vitest";
import { buildCommentTree, countComments, type SafeComment } from "./comment-tree";

const c = (id: string, parentId: string | null): SafeComment => ({
  id,
  parentId,
  name: id,
  tier: null,
  body: id,
  createdAt: "2026-01-01",
});

describe("buildCommentTree", () => {
  it("nests replies under their parent, preserving order", () => {
    const tree = buildCommentTree([c("a", null), c("b", "a"), c("c", "a"), c("d", "b")]);
    expect(tree).toHaveLength(1);
    expect(tree[0].id).toBe("a");
    expect(tree[0].replies.map((r) => r.id)).toEqual(["b", "c"]);
    expect(tree[0].replies[0].replies.map((r) => r.id)).toEqual(["d"]);
  });

  it("keeps multiple roots in input order", () => {
    expect(buildCommentTree([c("a", null), c("b", null)]).map((n) => n.id)).toEqual(["a", "b"]);
  });

  it("treats orphans (missing parent) as roots — never drops a comment", () => {
    expect(buildCommentTree([c("x", "missing")]).map((n) => n.id)).toEqual(["x"]);
  });

  it("counts the whole tree", () => {
    expect(countComments(buildCommentTree([c("a", null), c("b", "a"), c("d", "b")]))).toBe(3);
  });
});
