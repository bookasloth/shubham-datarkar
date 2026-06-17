import { describe, it, expect, beforeAll } from "vitest";
import { createHash } from "node:crypto";
import { signIdentity, verifyToken, hashOtp, emailKey } from "./comment-auth-crypto";

beforeAll(() => {
  process.env.COMMENTER_TOKEN_SECRET = "test-secret";
  process.env.COMMENTER_OTP_PEPPER = "test-pepper";
});

describe("identity token", () => {
  it("round-trips a signed identity", () => {
    const token = signIdentity({ email: "a@b.com", name: "Aanya", iat: 1000 });
    expect(verifyToken(token)).toEqual({ email: "a@b.com", name: "Aanya", iat: 1000 });
  });
  it("rejects a tampered token", () => {
    const token = signIdentity({ email: "a@b.com", name: "Aanya", iat: 1000 });
    const tampered = token.replace(/^./, (c) => (c === "x" ? "y" : "x"));
    expect(verifyToken(tampered)).toBeNull();
  });
  it("rejects undefined / malformed", () => {
    expect(verifyToken(undefined)).toBeNull();
    expect(verifyToken("garbage")).toBeNull();
  });
});

describe("otp hashing", () => {
  it("hashes with the pepper deterministically", () => {
    expect(hashOtp("123456")).toBe(hashOtp("123456"));
    expect(hashOtp("123456")).not.toBe(hashOtp("654321"));
  });
});

describe("emailKey", () => {
  it("matches the support_lifetime recipe sha256(lower(email))", () => {
    const expected = createHash("sha256").update("foo@bar.com").digest("hex");
    expect(emailKey("Foo@Bar.com")).toBe(expected);
  });
});
