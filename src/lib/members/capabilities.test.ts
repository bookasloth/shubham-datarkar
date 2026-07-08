import { describe, expect, it } from "vitest";
import {
  can,
  requiredCapabilityForType,
  ALL_CAPABILITIES,
  GRANTABLE_CAPABILITIES,
} from "./capabilities";

describe("can", () => {
  it("is true only when the set holds the capability", () => {
    const caps = new Set(["view_archive", "download_assets"]);
    expect(can(caps, "view_archive")).toBe(true);
    expect(can(caps, "view_premium_blog")).toBe(false);
  });
  it("empty set grants nothing", () => {
    expect(can(new Set(), "view_archive")).toBe(false);
  });
});

describe("requiredCapabilityForType", () => {
  it("maps known types", () => {
    expect(requiredCapabilityForType("article")).toBe("view_premium_blog");
    expect(requiredCapabilityForType("case-study")).toBe("view_premium_case_study");
    expect(requiredCapabilityForType("video")).toBe("view_premium_video");
    expect(requiredCapabilityForType("prompt")).toBe("access_prompt_library");
    expect(requiredCapabilityForType("template")).toBe("download_templates");
    expect(requiredCapabilityForType("download")).toBe("download_assets");
  });
  it("falls back to the generic capability", () => {
    expect(requiredCapabilityForType("tool")).toBe("view_premium_resource");
    expect(requiredCapabilityForType("snippet")).toBe("view_premium_resource");
  });
});

describe("capability catalogs", () => {
  it("grantable excludes admin_only, all includes it", () => {
    expect(ALL_CAPABILITIES).toContain("admin_only");
    expect(GRANTABLE_CAPABILITIES).not.toContain("admin_only");
    expect(GRANTABLE_CAPABILITIES.length).toBe(ALL_CAPABILITIES.length - 1);
  });
});
