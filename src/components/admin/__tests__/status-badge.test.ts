import { describe, it, expect } from "vitest";
import { statusBadgeVariants } from "@/components/admin/ui/status-badge";

describe("statusBadgeVariants", () => {
  it("neutral is the default tone", () => {
    expect(statusBadgeVariants()).toContain("text-admin-text-muted");
  });

  it("success uses a subtle tinted background (no bright fill)", () => {
    const cls = statusBadgeVariants({ tone: "success" });
    expect(cls).toContain("bg-admin-success/12");
    expect(cls).toContain("text-admin-success");
  });

  it("danger maps to the danger token", () => {
    expect(statusBadgeVariants({ tone: "danger" })).toContain("text-admin-danger");
  });

  it("merges caller className", () => {
    expect(statusBadgeVariants({ className: "ml-2" })).toContain("ml-2");
  });
});
