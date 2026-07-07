import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  verifySubscriptionSignature,
  verifyWebhookSignature,
} from "./subscription-verify";

const SECRET = "test_key_secret";
const WEBHOOK_SECRET = "test_webhook_secret";

describe("verifySubscriptionSignature", () => {
  beforeEach(() => {
    process.env.RAZORPAY_KEY_SECRET = SECRET;
  });
  afterEach(() => {
    delete process.env.RAZORPAY_KEY_SECRET;
  });

  it("accepts the signature Razorpay produces (payment_id|subscription_id)", () => {
    const sig = createHmac("sha256", SECRET)
      .update("pay_123|sub_456")
      .digest("hex");
    expect(verifySubscriptionSignature("pay_123", "sub_456", sig)).toBe(true);
  });

  it("rejects a signature over the wrong field order", () => {
    const sig = createHmac("sha256", SECRET)
      .update("sub_456|pay_123")
      .digest("hex");
    expect(verifySubscriptionSignature("pay_123", "sub_456", sig)).toBe(false);
  });

  it("rejects tampered ids and empty signatures", () => {
    const sig = createHmac("sha256", SECRET)
      .update("pay_123|sub_456")
      .digest("hex");
    expect(verifySubscriptionSignature("pay_999", "sub_456", sig)).toBe(false);
    expect(verifySubscriptionSignature("pay_123", "sub_456", "")).toBe(false);
  });
});

describe("verifyWebhookSignature", () => {
  it("accepts an HMAC of the raw body with the webhook secret", () => {
    const body = JSON.stringify({ event: "subscription.charged" });
    const sig = createHmac("sha256", WEBHOOK_SECRET).update(body).digest("hex");
    expect(verifyWebhookSignature(body, sig, WEBHOOK_SECRET)).toBe(true);
  });

  it("rejects a tampered body, wrong secret, or empty signature", () => {
    const body = JSON.stringify({ event: "subscription.charged" });
    const sig = createHmac("sha256", WEBHOOK_SECRET).update(body).digest("hex");
    expect(verifyWebhookSignature(body + " ", sig, WEBHOOK_SECRET)).toBe(false);
    expect(verifyWebhookSignature(body, sig, "other_secret")).toBe(false);
    expect(verifyWebhookSignature(body, "", WEBHOOK_SECRET)).toBe(false);
  });
});
