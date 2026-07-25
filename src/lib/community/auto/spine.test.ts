import { describe, it, expect } from "vitest";
import { extractThread, extractVersion } from "./pr";

describe("extractThread", () => {
  it("slugifies the line", () => {
    expect(extractThread("Thread: Sign-in Wall")).toBe("sign-in-wall");
  });
  it("null when absent", () => {
    expect(extractThread("no line here")).toBeNull();
  });
  it("strips junk chars and caps", () => {
    expect(extractThread("Thread:  Profile Redesign!! ")).toBe("profile-redesign");
  });
  it("null when the line is blank", () => {
    expect(extractThread("Thread:   ")).toBeNull();
  });
});

describe("extractVersion", () => {
  it("accepts v3.6", () => {
    expect(extractVersion("Version: v3.6")).toBe("v3.6");
  });
  it("accepts 3.6.1 and trims", () => {
    expect(extractVersion("Version:  3.6.1 ")).toBe("3.6.1");
  });
  it("null on garbage", () => {
    expect(extractVersion("Version: next-big-thing")).toBeNull();
  });
  it("null when absent", () => {
    expect(extractVersion("nothing")).toBeNull();
  });
});
