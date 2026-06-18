import { describe, it, expect } from "vitest";
import { socials, sameAs } from "@/lib/site";

describe("social links / sameAs", () => {
  it("every href is a full profile URL, not a bare domain root", () => {
    for (const s of socials) {
      const u = new URL(s.href); // throws if not a valid URL
      expect(u.pathname.replace(/\/+$/, "")).not.toBe(""); // must have a path beyond "/"
    }
  });

  it("sameAs mirrors the social hrefs exactly", () => {
    expect(sameAs).toEqual(socials.map((s) => s.href));
  });
});
