import { describe, it, expect } from "vitest";
import { resolveTheme } from "./themes";

// Helper: convert an IST date string to a UTC timestamp that the daily engine
// resolves back to that IST date. IST = UTC+5:30. Themes key off the calendar
// date (todayISO), not any game's puzzle number, so no epoch is involved.
function istDateToTimestamp(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  const utcMs = Date.UTC(y, m - 1, d) - 5.5 * 60 * 60 * 1000;
  // Add 1 hour into the IST day to avoid edge
  return utcMs + 60 * 60 * 1000;
}

describe("resolveTheme", () => {
  it("returns default on a normal day", () => {
    const now = istDateToTimestamp("2026-06-15");
    expect(resolveTheme(now)).toBe("default");
  });

  it("returns holi on 2026-03-04", () => {
    const now = istDateToTimestamp("2026-03-04");
    expect(resolveTheme(now)).toBe("holi");
  });

  it("returns holi on 2026-03-03 (eve)", () => {
    const now = istDateToTimestamp("2026-03-03");
    expect(resolveTheme(now)).toBe("holi");
  });

  it("returns diwali during the 5-day window", () => {
    expect(resolveTheme(istDateToTimestamp("2026-11-06"))).toBe("diwali");
    expect(resolveTheme(istDateToTimestamp("2026-11-08"))).toBe("diwali");
    expect(resolveTheme(istDateToTimestamp("2026-11-10"))).toBe("diwali");
  });

  it("returns christmas on Dec 24-26", () => {
    expect(resolveTheme(istDateToTimestamp("2026-12-24"))).toBe("christmas");
    expect(resolveTheme(istDateToTimestamp("2026-12-25"))).toBe("christmas");
    expect(resolveTheme(istDateToTimestamp("2026-12-26"))).toBe("christmas");
  });

  it("returns christmas for new year", () => {
    expect(resolveTheme(istDateToTimestamp("2026-12-31"))).toBe("christmas");
    expect(resolveTheme(istDateToTimestamp("2027-01-01"))).toBe("christmas");
  });

  it("birthday wins over no festival", () => {
    const now = istDateToTimestamp("2026-07-15");
    expect(resolveTheme(now, { birthday: "1995-07-15" })).toBe("birthday");
  });

  it("birthday wins over festival (higher personal priority)", () => {
    // Birthday on Diwali main day
    const now = istDateToTimestamp("2026-11-08");
    expect(resolveTheme(now, { birthday: "1990-11-08" })).toBe("birthday");
  });

  it("dev override forces theme regardless of date", () => {
    const now = istDateToTimestamp("2026-06-15");
    expect(resolveTheme(now, undefined, "diwali")).toBe("diwali");
  });

  it("invalid override falls through to resolution", () => {
    const now = istDateToTimestamp("2026-03-04");
    expect(resolveTheme(now, undefined, "nonexistent")).toBe("holi");
  });

  it("IST midnight edge: 23:59 UTC on Mar 3 is still Mar 4 IST", () => {
    // Mar 4, 00:00 IST = Mar 3, 18:30 UTC
    // So Mar 3, 23:59 UTC = Mar 4, 05:29 IST → should be Holi
    const mar3_2359_utc = Date.UTC(2026, 2, 3, 23, 59, 0);
    expect(resolveTheme(mar3_2359_utc)).toBe("holi");
  });
});
