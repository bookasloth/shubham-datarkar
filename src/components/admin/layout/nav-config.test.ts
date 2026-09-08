import { describe, it, expect } from "vitest";
import { resolveActiveGroup, ADMIN_NAV } from "./nav-config";

describe("resolveActiveGroup", () => {
  it("/admin resolves to Overview", () => {
    expect(resolveActiveGroup("/admin").heading).toBe("Overview");
  });

  it("a page resolves to its own section", () => {
    expect(resolveActiveGroup("/admin/posts").heading).toBe("Content");
    expect(resolveActiveGroup("/admin/members/analytics").heading).toBe("Audience");
  });

  it("deepest match wins within a section", () => {
    // /admin/seo/pages is under both "SEO Overview" and "Pages" — both SEO.
    expect(resolveActiveGroup("/admin/seo/pages").heading).toBe("SEO");
    expect(resolveActiveGroup("/admin/resources/taxonomy").heading).toBe("Library");
  });

  it("a detail route falls under its section", () => {
    expect(resolveActiveGroup("/admin/posts/new").heading).toBe("Content");
  });

  it("an unknown route defaults to the first group", () => {
    expect(resolveActiveGroup("/admin/does-not-exist").heading).toBe(ADMIN_NAV[0].heading);
  });

  it("every group has an icon", () => {
    for (const g of ADMIN_NAV) expect(g.icon).toBeTruthy();
  });
});
