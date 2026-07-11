import { describe, it, expect, beforeEach } from "vitest";
import { allow, clientIp, _reset } from "./rate-limit";

describe("allow", () => {
  beforeEach(() => _reset());

  it("permits up to the limit, then blocks within the window", () => {
    const t = 1000;
    expect(allow("k", 3, 60_000, t)).toBe(true);
    expect(allow("k", 3, 60_000, t)).toBe(true);
    expect(allow("k", 3, 60_000, t)).toBe(true);
    expect(allow("k", 3, 60_000, t)).toBe(false); // 4th hit blocked
  });

  it("resets after the window elapses", () => {
    expect(allow("k", 1, 1000, 0)).toBe(true);
    expect(allow("k", 1, 1000, 500)).toBe(false); // still in window
    expect(allow("k", 1, 1000, 1000)).toBe(true); // window rolled over
  });

  it("keys are independent", () => {
    expect(allow("a", 1, 1000, 0)).toBe(true);
    expect(allow("b", 1, 1000, 0)).toBe(true); // different key, own budget
    expect(allow("a", 1, 1000, 0)).toBe(false);
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
