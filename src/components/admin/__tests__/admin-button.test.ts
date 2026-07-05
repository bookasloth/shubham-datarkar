import { describe, it, expect } from "vitest";
import { adminButtonVariants } from "@/components/admin/ui/admin-button";

describe("adminButtonVariants", () => {
  it("primary uses the accent fill", () => {
    const cls = adminButtonVariants({ variant: "primary" });
    expect(cls).toContain("bg-admin-accent");
    expect(cls).toContain("text-admin-accent-fg");
  });

  it("secondary is outline with accent hover border", () => {
    const cls = adminButtonVariants({ variant: "secondary" });
    expect(cls).toContain("border-admin-border");
    expect(cls).toContain("hover:border-admin-border-hover");
  });

  it("danger uses the danger token", () => {
    expect(adminButtonVariants({ variant: "danger" })).toContain("bg-admin-danger");
  });

  it("defaults to primary + default size", () => {
    const cls = adminButtonVariants();
    expect(cls).toContain("bg-admin-accent");
    expect(cls).toContain("h-9");
  });

  it("merges caller className last", () => {
    expect(adminButtonVariants({ className: "w-full" })).toContain("w-full");
  });
});
