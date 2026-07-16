import { describe, it, expect } from "vitest";
import { site, socials, sameAs } from "@/lib/site";

describe("social links / sameAs", () => {
  it("every href is a full profile URL, not a bare domain root", () => {
    for (const s of socials) {
      const u = new URL(s.href); // throws if not a valid URL
      expect(u.pathname.replace(/\/+$/, "")).not.toBe(""); // must have a path beyond "/"
    }
  });

  // sameAs feeds JSON-LD identity profiles, so it is deliberately NOT a mirror of
  // `socials` — the Book A Sloth booking page is a service, not a profile of the
  // person, and asserting an exact mirror would forbid that distinction.
  it("sameAs lists every social profile", () => {
    const profiles = socials.filter((s) => s.href !== site.bookingUrl).map((s) => s.href);
    expect(sameAs).toEqual(profiles);
  });

  it("sameAs excludes the booking page, which is not an identity profile", () => {
    expect(sameAs).not.toContain(site.bookingUrl);
  });
});
