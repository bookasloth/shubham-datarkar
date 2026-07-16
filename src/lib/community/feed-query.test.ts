import { describe, it, expect } from "vitest";
import { sanitizeQuery } from "./feed-query";

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
});
