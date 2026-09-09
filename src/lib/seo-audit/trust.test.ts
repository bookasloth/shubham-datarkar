import { describe, it, expect } from "vitest";
import { detectTrust } from "./trust";
import { mkPage } from "./_fixtures";

describe("detectTrust", () => {
  it("detects a full set of trust signals", () => {
    const pages = [
      mkPage({ url: "https://x.com/", class: "home", schemas: ["Organization"], hasSameAs: true }),
      mkPage({ url: "https://x.com/about", class: "about" }),
      mkPage({ url: "https://x.com/contact", class: "contact", hasTelLink: true }),
      mkPage({ url: "https://x.com/blog/p", class: "article", hasDates: true, mentionsTestimonials: true }),
      mkPage({ url: "https://x.com/team", class: "author" }),
    ];
    const t = detectTrust(pages);
    expect(t.hasAbout).toBe(true);
    expect(t.hasContactPage).toBe(true);
    expect(t.hasOrganizationSchema).toBe(true);
    expect(t.hasPersonSchema).toBe(true);
    expect(t.hasTestimonials).toBe(true);
    expect(t.hasDatedContent).toBe(true);
    expect(t.coverage).toBeGreaterThan(0.7);
  });

  it("reports low coverage for a bare site", () => {
    const t = detectTrust([mkPage({ url: "https://x.com/", class: "home" })]);
    expect(t.hasAbout).toBe(false);
    expect(t.coverage).toBeLessThan(0.2);
  });
});
