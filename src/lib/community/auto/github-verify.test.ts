import { describe, it, expect } from "vitest";
import { createHmac } from "node:crypto";
import { verifyGithubSignature } from "./github-verify";

const secret = "s3cr3t";
const payload = '{"hello":"world"}';
const good = "sha256=" + createHmac("sha256", secret).update(payload).digest("hex");

describe("verifyGithubSignature", () => {
  it("accepts a correct signature", () => {
    expect(verifyGithubSignature(secret, payload, good)).toBe(true);
  });
  it("rejects a wrong signature", () => {
    expect(verifyGithubSignature(secret, payload, "sha256=deadbeef")).toBe(false);
  });
  it("rejects a missing header", () => {
    expect(verifyGithubSignature(secret, payload, null)).toBe(false);
  });
});
