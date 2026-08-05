import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

// ---- minimal chain mock: .from().select().eq().order().limit() resolves to fixed rows ----
type Row = Record<string, unknown>;
let rows: Row[] = [];
let lastUserId: unknown;

class Query {
  eq(_col: string, val: unknown) {
    lastUserId = val;
    return this;
  }
  order() {
    return this;
  }
  limit() {
    return Promise.resolve({ data: rows, error: null });
  }
}

const mockDb = { from: () => ({ select: () => new Query() }) };
vi.mock("@/lib/supabase/server", () => ({ supabaseAdmin: () => mockDb }));

import { listRecentArticles } from "./queries-server";

describe("listRecentArticles", () => {
  it("maps rows, joins keyword, filters by user_id, applies fallbacks", async () => {
    rows = [
      {
        id: "art1",
        status: "complete",
        meta: { title: "My Landing Page", contentType: "landing" },
        score: { overall: 87 },
        created_at: "2026-08-01T00:00:00Z",
        kalamai_analyses: { keyword: "email marketing" },
      },
      {
        id: "art2",
        status: "queued",
        meta: {},
        score: null,
        created_at: "2026-08-02T00:00:00Z",
        kalamai_analyses: [],
      },
    ];

    const result = await listRecentArticles("u1", 10);

    expect(lastUserId).toBe("u1");
    expect(result[0].articleId).toBe("art1");
    expect(result[0].keyword).toBe("email marketing");
    expect(result[0].contentType).toBe("landing");
    expect(result[0].title).toBe("My Landing Page");
    expect(result[0].overall).toBe(87);
    expect(result[1].title).toBe("Untitled article");
    expect(result[1].contentType).toBe("blog");
    expect(result[1].overall).toBeNull();
  });
});
