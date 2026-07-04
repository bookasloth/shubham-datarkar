import { describe, it, expect } from "vitest";
import { postStatusCounts } from "@/components/admin/widgets/dashboard-summary";

describe("postStatusCounts", () => {
  it("counts each status", () => {
    const posts = [
      { status: "published" }, { status: "published" },
      { status: "draft" }, { status: "scheduled" },
      { status: "archived" }, // unknown statuses ignored
    ];
    expect(postStatusCounts(posts)).toEqual({ published: 2, drafts: 1, scheduled: 1 });
  });
  it("handles empty", () => {
    expect(postStatusCounts([])).toEqual({ published: 0, drafts: 0, scheduled: 0 });
  });
});
