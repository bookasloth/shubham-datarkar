import { describe, it, expect } from "vitest";
import { EMAIL_RE, isEmail } from "./email";

describe("EMAIL_RE", () => {
  it("accepts normal addresses", () => {
    for (const ok of [
      "you@company.com",
      "user+tag@sub.example.co.uk",
      "a.b-c@mail.io",
      "hamiddhamid216@gmail.com",
    ]) {
      expect(EMAIL_RE.test(ok)).toBe(true);
    }
  });

  it("rejects URLs and handles that the old loose regex let through", () => {
    for (const bad of [
      "https://youtube.com/@abinash.patraa?si=pzytynms-g3crfcz", // the row that slipped in
      "http://example.com/@user.name",
      "user@host/path.html",
      "@handle.name",
      "foo@bar",
      "no-at-sign.com",
      "spaces in@email.com",
    ]) {
      expect(EMAIL_RE.test(bad)).toBe(false);
    }
  });

  it("isEmail trims before checking", () => {
    expect(isEmail("  you@company.com  ")).toBe(true);
    expect(isEmail(" https://youtube.com/@x.y ")).toBe(false);
  });
});
