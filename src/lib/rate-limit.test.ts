import { describe, it, expect, beforeEach } from "vitest";
import { allow, clientIp, _reset } from "./rate-limit";

describe("allow", () => {
  beforeEach(() => _reset());

  // No KV env in the test process → allow() uses the deterministic in-memory path.
  it("permits up to the limit, then blocks within the window", async () => {
    const t = 1000;
    expect(await allow("k", 3, 60_000, t)).toBe(true);
    expect(await allow("k", 3, 60_000, t)).toBe(true);
    expect(await allow("k", 3, 60_000, t)).toBe(true);
    expect(await allow("k", 3, 60_000, t)).toBe(false); // 4th hit blocked
  });

  it("resets after the window elapses", async () => {
    expect(await allow("k", 1, 1000, 0)).toBe(true);
    expect(await allow("k", 1, 1000, 500)).toBe(false); // still in window
    expect(await allow("k", 1, 1000, 1000)).toBe(true); // window rolled over
  });

  it("keys are independent", async () => {
    expect(await allow("a", 1, 1000, 0)).toBe(true);
    expect(await allow("b", 1, 1000, 0)).toBe(true); // different key, own budget
    expect(await allow("a", 1, 1000, 0)).toBe(false);
  });
});

describe("clientIp", () => {
  it("takes the first x-forwarded-for hop", () => {
    expect(clientIp(new Headers({ "x-forwarded-for": "1.2.3.4, 10.0.0.1" }))).toBe("1.2.3.4");
  });
  it("falls back to x-real-ip then unknown", () => {
    expect(clientIp(new Headers({ "x-real-ip": "9.9.9.9" }))).toBe("9.9.9.9");
    expect(clientIp(new Headers())).toBe("unknown");
  });
});
