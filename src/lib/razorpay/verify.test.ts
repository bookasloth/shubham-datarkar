import { describe, it, expect, beforeAll } from "vitest";
import { createHmac } from "node:crypto";
import { verifyPaymentSignature } from "./verify";

const SECRET = "test_secret_key_1234567890";
const ORDER = "order_ABC123";
const PAYMENT = "pay_XYZ789";
const goodSig = createHmac("sha256", SECRET).update(`${ORDER}|${PAYMENT}`).digest("hex");

beforeAll(() => {
  process.env.RAZORPAY_KEY_SECRET = SECRET;
});

describe("verifyPaymentSignature", () => {
  it("accepts a correct signature", () => {
    expect(verifyPaymentSignature(ORDER, PAYMENT, goodSig)).toBe(true);
  });
  it("rejects a tampered signature", () => {
    expect(verifyPaymentSignature(ORDER, PAYMENT, goodSig.replace(/.$/, "0"))).toBe(false);
  });
  it("rejects a signature for a different payment", () => {
    const other = createHmac("sha256", SECRET).update(`${ORDER}|pay_OTHER`).digest("hex");
    expect(verifyPaymentSignature(ORDER, PAYMENT, other)).toBe(false);
  });
  it("rejects empty/garbage signatures without throwing", () => {
    expect(verifyPaymentSignature(ORDER, PAYMENT, "")).toBe(false);
    expect(verifyPaymentSignature(ORDER, PAYMENT, "nope")).toBe(false);
  });
});
