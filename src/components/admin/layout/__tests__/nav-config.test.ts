import { describe, it, expect } from "vitest";
import { ADMIN_NAV, isNavItemActive, resolveBreadcrumbs } from "@/components/admin/layout/nav-config";

const allHrefs = ADMIN_NAV.flatMap((g) => g.items.map((i) => i.href));

describe("ADMIN_NAV", () => {
  it("covers every legacy admin route", () => {
    for (const href of [
      "/admin", "/admin/posts", "/admin/updates", "/admin/photos", "/admin/links",
      "/admin/content/case-studies", "/admin/content/projects", "/admin/content/products",
      "/admin/content/services", "/admin/content/testimonials",
      "/admin/subscribers", "/admin/contacts", "/admin/payments", "/admin/affiliate", "/admin/integrations",
    ]) {
      expect(allHrefs).toContain(href);
    }
  });

  it("groups under the real-route headings", () => {
    expect(ADMIN_NAV.map((g) => g.heading)).toEqual([
      "Overview", "Content", "Audience", "Commerce", "Distribution",
    ]);
  });
});

describe("isNavItemActive", () => {
  it("matches /admin only exactly (not for every sub-route)", () => {
    expect(isNavItemActive("/admin", "/admin")).toBe(true);
    expect(isNavItemActive("/admin/posts", "/admin")).toBe(false);
  });
  it("matches a section and its descendants", () => {
    expect(isNavItemActive("/admin/posts", "/admin/posts")).toBe(true);
    expect(isNavItemActive("/admin/posts/new", "/admin/posts")).toBe(true);
    expect(isNavItemActive("/admin/postscript", "/admin/posts")).toBe(false);
  });
});

describe("resolveBreadcrumbs", () => {
  it("dashboard root is a single crumb", () => {
    expect(resolveBreadcrumbs("/admin")).toEqual([{ label: "Dashboard", href: "/admin" }]);
  });
  it("section page has dashboard + section", () => {
    expect(resolveBreadcrumbs("/admin/posts")).toEqual([
      { label: "Dashboard", href: "/admin" },
      { label: "Posts", href: "/admin/posts" },
    ]);
  });
  it("new page appends a New crumb", () => {
    const crumbs = resolveBreadcrumbs("/admin/posts/new");
    expect(crumbs[crumbs.length - 1]).toEqual({ label: "New", href: "/admin/posts/new" });
    expect(crumbs.some((c) => c.label === "Posts")).toBe(true);
  });
  it("entity row edit appends an Edit crumb", () => {
    const crumbs = resolveBreadcrumbs("/admin/content/projects/abc123");
    expect(crumbs.some((c) => c.label === "Projects")).toBe(true);
    expect(crumbs[crumbs.length - 1]).toEqual({ label: "Edit", href: "/admin/content/projects/abc123" });
  });
});
