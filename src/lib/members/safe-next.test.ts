import { describe, expect, it } from "vitest";
import { safeMembersNext } from "./safe-next";

describe("safeMembersNext", () => {
  it("allows /members and nested paths", () => {
    expect(safeMembersNext("/members")).toBe("/members");
    expect(safeMembersNext("/members/explore?type=prompt")).toBe(
      "/members/explore?type=prompt",
    );
    expect(safeMembersNext("/members/resources/some-slug")).toBe(
      "/members/resources/some-slug",
    );
  });

  it("rejects external and foreign paths", () => {
    expect(safeMembersNext("https://evil.com")).toBe("/members");
    expect(safeMembersNext("//evil.com")).toBe("/members");
    expect(safeMembersNext("/admin")).toBe("/members");
    expect(safeMembersNext("/membersfake")).toBe("/members");
    expect(safeMembersNext("")).toBe("/members");
    expect(safeMembersNext(null)).toBe("/members");
  });
});
