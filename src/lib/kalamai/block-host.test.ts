import { describe, it, expect } from "vitest";
import { isBlockedHost } from "./block-host";

describe("isBlockedHost", () => {
  it("blocks loopback / private / link-local / metadata IPv4", () => {
    for (const h of ["127.0.0.1", "10.1.2.3", "192.168.0.1", "172.16.0.1", "172.31.255.1", "169.254.169.254", "0.0.0.0"]) {
      expect(isBlockedHost(h), h).toBe(true);
    }
  });

  it("blocks localhost and internal names and IPv6 loopback/local", () => {
    for (const h of ["localhost", "db.local", "svc.internal", "::1", "[::1]", "fe80::1", "fd00::1"]) {
      expect(isBlockedHost(h), h).toBe(true);
    }
  });

  it("blocks IPv4-mapped IPv6 loopback", () => {
    expect(isBlockedHost("::ffff:127.0.0.1")).toBe(true);
  });

  it("allows public hosts", () => {
    for (const h of ["example.com", "8.8.8.8", "172.15.0.1", "172.32.0.1", "shubhamdatarkar.com", "fcdn.example.com"]) {
      expect(isBlockedHost(h), h).toBe(false);
    }
  });
});
