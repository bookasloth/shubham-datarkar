import { describe, it, expect } from "vitest";
import { isPrivateIp } from "./ip";

describe("isPrivateIp — SSRF guard", () => {
  it("blocks loopback, private, link-local, and metadata ranges", () => {
    for (const ip of [
      "127.0.0.1",
      "10.0.0.1",
      "10.255.255.255",
      "172.16.0.1",
      "172.31.255.255",
      "192.168.1.1",
      "169.254.169.254", // cloud metadata
      "100.64.0.1", // CGNAT
      "0.0.0.0",
      "224.0.0.1", // multicast
      "::1",
      "fc00::1",
      "fd12:3456::1",
      "fe80::1",
      "::ffff:127.0.0.1", // IPv4-mapped loopback
    ]) {
      expect(isPrivateIp(ip), ip).toBe(true);
    }
  });

  it("allows public addresses", () => {
    for (const ip of ["8.8.8.8", "1.1.1.1", "142.250.72.14", "2606:4700:4700::1111"]) {
      expect(isPrivateIp(ip), ip).toBe(false);
    }
  });

  it("blocks unparseable input", () => {
    expect(isPrivateIp("not-an-ip")).toBe(true);
  });
});
