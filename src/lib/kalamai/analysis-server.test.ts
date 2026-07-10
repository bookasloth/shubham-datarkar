import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";

vi.mock("server-only", () => ({}));

// Force fake LLM regardless of the developer's environment.
beforeAll(() => {
  process.env.KALAMAI_FAKE_LLM = "1";
});

// ---- minimal in-memory Supabase mock (only the calls runStep makes) ----
type Row = Record<string, unknown>;
const store: Record<string, Row[]> = {
  kalamai_analyses: [],
  kalamai_pages: [],
  kalamai_llm_calls: [],
  kalamai_events: [],
};

class Query {
  private mode: "select" | "update" | "upsert" | "insert" = "select";
  private filters: [string, unknown][] = [];
  private patch: Row = {};
  private rows: Row[] = [];
  private conflict = "";
  private orderCol = "";
  private limitN = Infinity;

  constructor(private table: string) {}

  select() {
    this.mode = "select";
    return this;
  }
  update(patch: Row) {
    this.mode = "update";
    this.patch = patch;
    return this;
  }
  upsert(rows: Row[], opts?: { onConflict?: string }) {
    this.mode = "upsert";
    this.rows = rows;
    this.conflict = opts?.onConflict ?? "";
    return this;
  }
  insert(rows: Row | Row[]) {
    this.mode = "insert";
    this.rows = Array.isArray(rows) ? rows : [rows];
    return this;
  }
  eq(col: string, val: unknown) {
    this.filters.push([col, val]);
    return this;
  }
  order(col: string) {
    this.orderCol = col;
    return this;
  }
  limit(n: number) {
    this.limitN = n;
    return this;
  }
  maybeSingle() {
    return Promise.resolve({ data: this.match()[0] ?? null, error: null });
  }
  then(resolve: (v: { data: Row[] | null; error: null }) => void) {
    resolve(this.resolve());
  }

  private table_(): Row[] {
    return store[this.table];
  }
  private match(): Row[] {
    let rows = this.table_().filter((r) => this.filters.every(([c, v]) => r[c] === v));
    if (this.orderCol) rows = [...rows].sort((a, b) => Number(a[this.orderCol]) - Number(b[this.orderCol]));
    if (this.limitN !== Infinity) rows = rows.slice(0, this.limitN);
    return rows;
  }
  private resolve(): { data: Row[] | null; error: null } {
    if (this.mode === "select") return { data: this.match(), error: null };
    if (this.mode === "update") {
      for (const r of this.match()) Object.assign(r, this.patch);
      return { data: null, error: null };
    }
    if (this.mode === "insert") {
      this.table_().push(...this.rows.map((r) => ({ ...r })));
      return { data: null, error: null };
    }
    // upsert
    const keys = this.conflict.split(",").filter(Boolean);
    for (const row of this.rows) {
      const existing = this.table_().find((r) => keys.every((k) => r[k] === row[k]));
      if (existing) Object.assign(existing, row);
      else this.table_().push({ ...row });
    }
    return { data: null, error: null };
  }
}

const mockDb = { from: (t: string) => new Query(t) };
vi.mock("@/lib/supabase/server", () => ({ supabaseAdmin: () => mockDb }));

import { runStep } from "./analysis-server";
import { FakeSerpProvider } from "./serp/fake";
import type { SerpProvider } from "./serp/provider";

const PAGE_HTML = (url: string) =>
  `<html><head><title>Digital Marketing in Nagpur</title><meta name="description" content="seo and content"></head>` +
  `<body><main><article><h1>Digital Marketing Company</h1><h2>SEO Services</h2>` +
  `<p>digital marketing seo content ${url}</p></article></main></body></html>`;

const fakeCrawl = async (url: string) => PAGE_HTML(url);

function seedAnalysis(id: string, over: Row = {}): void {
  store.kalamai_analyses.push({
    id,
    user_id: "user-1",
    keyword: "digital marketing company in nagpur",
    country: "IN",
    locale: "en",
    status: "queued",
    progress: 0,
    crawl_cursor: 0,
    serp_urls: [],
    ai_overview_urls: [],
    paa: [],
    report: null,
    error: null,
    ...over,
  });
}

async function drive(id: string): Promise<string[]> {
  const seen: string[] = [];
  const serp = new FakeSerpProvider();
  for (let i = 0; i < 20; i++) {
    const { status } = await runStep(id, { serp, crawl: fakeCrawl });
    seen.push(status);
    if (status === "complete" || status === "failed") break;
  }
  return seen;
}

beforeEach(() => {
  for (const k of Object.keys(store)) store[k] = [];
});

describe("runStep", () => {
  it("walks queued → crawling ×2 → extracting → analyzing → complete", async () => {
    seedAnalysis("a1");
    const seq = await drive("a1");

    expect(seq).toEqual(["crawling", "crawling", "extracting", "analyzing", "complete"]);

    const a = store.kalamai_analyses[0];
    expect(a.status).toBe("complete");
    expect(a.progress).toBe(100);

    const report = a.report as { terms: unknown[]; competitors: unknown[]; brief: { schemaType: string } };
    expect(report.terms.length).toBeGreaterThan(0);
    expect(report.competitors).toHaveLength(8); // all 8 fixture URLs crawled ok
    expect(report.brief.schemaType).toBe("LocalBusiness"); // FAKE_BRIEF

    expect(store.kalamai_pages.filter((p) => p.ok)).toHaveLength(8);
    expect(store.kalamai_llm_calls.filter((c) => c.stage === "R4")).toHaveLength(1);
  });

  it("marks low_confidence when fewer than 20 pages crawl ok", async () => {
    seedAnalysis("a2");
    await drive("a2");
    expect(store.kalamai_analyses[0].low_confidence).toBe(true); // 8 < 20
    expect(store.kalamai_analyses[0].crawl_success_rate).toBe(1); // all crawled ok
  });

  it("hard-fails and refunds (status→failed, dropped from the quota count) when SERP throws", async () => {
    seedAnalysis("a3");
    const throwingSerp: SerpProvider = { fetch: async () => { throw new Error("serp down"); } };

    const { status } = await runStep("a3", { serp: throwingSerp, crawl: fakeCrawl });

    expect(status).toBe("failed");
    const a = store.kalamai_analyses[0];
    expect(a.status).toBe("failed");
    expect(a.error).toContain("serp down");
    // Quota counts rows where status <> 'failed' — the failed row doesn't count.
    const counted = store.kalamai_analyses.filter((r) => r.user_id === "user-1" && r.status !== "failed");
    expect(counted).toHaveLength(0);
    expect(store.kalamai_events.some((e) => e.event === "analysis_failed")).toBe(true);
  });
});
