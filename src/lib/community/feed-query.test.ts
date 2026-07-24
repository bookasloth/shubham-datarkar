import { describe, it, expect } from "vitest";
import { clampSeed, newSeed, sanitizeQuery } from "./feed-query";

// sanitizeQuery is the trust boundary for loadFeedPage: everything it returns
// goes to the feed RPC, and everything it receives came from a browser.
describe("sanitizeQuery", () => {
  it("defaults an empty query to the plain newest feed", () => {
    expect(sanitizeQuery({})).toEqual({
      sort: "new",
      window: "all",
      author: undefined,
      bookmarked: false,
      liked: false,
      reblogged: false,
      seed: 0,
    });
  });

  it("keeps valid values", () => {
    const q = sanitizeQuery({ sort: "top", window: "week", author: "datarkar" });
    expect(q.sort).toBe("top");
    expect(q.window).toBe("week");
    expect(q.author).toBe("datarkar");
  });

  it("falls back rather than forwarding an unknown sort or window", () => {
    // @ts-expect-error — the point is a client sending something off-menu
    const q = sanitizeQuery({ sort: "controversial", window: "decade" });
    expect(q.sort).toBe("new");
    expect(q.window).toBe("all");
  });

  it("drops a handle that isn't one", () => {
    expect(sanitizeQuery({ author: "rm -rf; drop table" }).author).toBeUndefined();
    expect(sanitizeQuery({ author: "a".repeat(65) }).author).toBeUndefined();
    expect(sanitizeQuery({ author: "" }).author).toBeUndefined();
  });

  it("keeps real handles, which contain dots", () => {
    expect(sanitizeQuery({ author: "shubham.datarkar" }).author).toBe("shubham.datarkar");
    expect(sanitizeQuery({ author: "Datarkar" }).author).toBe("datarkar");
  });

  it("coerces the viewer filters to real booleans", () => {
    // @ts-expect-error — a truthy non-boolean must not turn a filter on
    expect(sanitizeQuery({ bookmarked: "yes", liked: 1 })).toMatchObject({
      bookmarked: false,
      liked: false,
    });
    expect(sanitizeQuery({ bookmarked: true }).bookmarked).toBe(true);
  });

  it("survives null and undefined", () => {
    expect(sanitizeQuery(null).sort).toBe("new");
    expect(sanitizeQuery(undefined).window).toBe("all");
  });

  it("clamps the shuffle seed to a postgres int", () => {
    expect(sanitizeQuery({ seed: 41273 }).seed).toBe(41273);
    // Out of range in either direction would overflow p_seed::text in the RPC.
    expect(sanitizeQuery({ seed: -1 }).seed).toBe(0);
    expect(sanitizeQuery({ seed: 9_999_999_999 }).seed).toBe(2_147_483_647);
  });

  it("treats a junk seed as 0 rather than erroring", () => {
    // A bad URL should still render a feed, just an unshuffled-looking one.
    // @ts-expect-error — this is what a hand-edited ?seed= sends
    expect(sanitizeQuery({ seed: "abc" }).seed).toBe(0);
    expect(clampSeed(NaN)).toBe(0);
    expect(clampSeed(Infinity)).toBe(0);
    expect(clampSeed(null)).toBe(0);
    expect(clampSeed("41273")).toBe(41273);
    expect(clampSeed(12.9)).toBe(12);
  });
});

// The shuffle's whole correctness claim: a fixed seed means limit/offset paging
// over a random order never duplicates or skips a card. hashtext() lives in
// Postgres, so mirror its contract — a deterministic key per (row, seed) — and
// assert the property the feed depends on.
describe("seeded shuffle paging", () => {
  const rows = Array.from({ length: 97 }, (_, i) => `row-${i}`);

  // Stand-in for `hashtext(row_id || seed)`: any stable hash has the same
  // stability property, which is the thing under test.
  const key = (row: string, seed: number) => {
    let h = 0;
    for (const ch of `${row}${seed}`) h = (Math.imul(h, 31) + ch.charCodeAt(0)) | 0;
    return h;
  };
  const order = (seed: number) => [...rows].sort((a, b) => key(a, seed) - key(b, seed));
  const page = (seed: number, offset: number, limit: number) =>
    order(seed).slice(offset, offset + limit);

  it("pages a fixed seed without repeating or skipping a row", () => {
    const seen: string[] = [];
    for (let offset = 0; offset < rows.length; offset += 10) seen.push(...page(41273, offset, 10));
    expect(seen).toHaveLength(rows.length);
    expect(new Set(seen).size).toBe(rows.length);
  });

  it("gives the same page twice for the same seed", () => {
    expect(page(41273, 20, 10)).toEqual(page(41273, 20, 10));
  });

  it("gives a different order for a different seed", () => {
    expect(order(41273)).not.toEqual(order(99));
  });

  it("mints seeds inside the clamp range", () => {
    for (let i = 0; i < 50; i++) {
      const s = newSeed();
      expect(s).toBe(clampSeed(s));
    }
  });
});
