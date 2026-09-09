import { describe, it, expect } from "vitest";
import { scoreLead } from "./lead-score";
import { mkPage } from "./_fixtures";

describe("scoreLead", () => {
  it("flags a HOT lead: big opportunity + real commercial business", () => {
    const pages = [
      mkPage({ url: "https://x.com/", class: "home", hasDates: true }),
      mkPage({ url: "https://x.com/services/a", class: "service" }),
      mkPage({ url: "https://x.com/services/b", class: "service" }),
      mkPage({ url: "https://x.com/products/p", class: "product" }),
      mkPage({ url: "https://x.com/contact", class: "contact", hasTelLink: true }),
    ];
    const lead = scoreLead({ seo: 55, ai: 40 }, pages);
    expect(lead.bucket).toBe("HOT");
    expect(lead.seoOpportunity).toBe(45);
    expect(lead.aiOpportunity).toBe(60);
    expect(lead.businessQuality).toBeGreaterThanOrEqual(55);
  });

  it("flags COLD when the site is already strong and thin", () => {
    const lead = scoreLead({ seo: 92, ai: 90 }, [mkPage({ url: "https://x.com/", class: "home" })]);
    expect(lead.bucket).toBe("COLD");
  });
});
