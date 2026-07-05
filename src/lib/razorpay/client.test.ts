import { describe, it, expect, beforeAll, afterEach, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createOrder, razorpayKeyId } from "./client";

beforeAll(() => {
  process.env.RAZORPAY_KEY_ID = "rzp_test_KEYID";
  process.env.RAZORPAY_KEY_SECRET = "SECRET";
});
afterEach(() => vi.restoreAllMocks());

describe("razorpayKeyId", () => {
  it("returns the env key id", () => {
    expect(razorpayKeyId()).toBe("rzp_test_KEYID");
  });
});

describe("createOrder", () => {
  it("posts with Basic auth + paise body and returns the order id", async () => {
    const fetchMock = vi.fn(async (url: string, init: RequestInit) => {
      expect(url).toBe("https://api.razorpay.com/v1/orders");
      expect(init.method).toBe("POST");
      const auth = (init.headers as Record<string, string>)["Authorization"];
      expect(auth).toBe("Basic " + Buffer.from("rzp_test_KEYID:SECRET").toString("base64"));
      const body = JSON.parse(init.body as string);
      expect(body).toMatchObject({ amount: 2000, currency: "INR", receipt: "sup_1" });
      return { ok: true, json: async () => ({ id: "order_123", amount: 2000 }) } as Response;
    });
    vi.stubGlobal("fetch", fetchMock);

    const res = await createOrder({ amountPaise: 2000, currency: "INR", receipt: "sup_1" });
    expect(res).toEqual({ ok: true, id: "order_123" });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("returns ok:false on a non-2xx response", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: false,
      status: 400,
      json: async () => ({ error: { description: "bad amount" } }),
    } as Response)));
    const res = await createOrder({ amountPaise: 50, currency: "INR", receipt: "sup_2" });
    expect(res.ok).toBe(false);
  });
});
