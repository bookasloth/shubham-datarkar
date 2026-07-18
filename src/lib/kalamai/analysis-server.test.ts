import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";

vi.mock("server-only", () => ({}));

// Force fake LLM + fake SERP: this is the offline pipeline test. Fake SERP mode
// bypasses the weekly cache + budget reservation (which need real DB tables); the
// injected providers below drive the state machine directly.
beforeAll(() => {
  process.env.KALAMAI_FAKE_LLM = "1";
  process.env.KALAMAI_FAKE_SERP = "1";
});

// ---- minimal in-memory Supabase mock (only the calls runStep makes) ----
type Row = Record<string, unknown>;
const store: Record<string, Row[]> = {
  kalamai_analyses: [],
  kalamai_pages: [],
  kalamai_llm_calls: [],
  kalamai_events: [],
  kalamai_chunks: [],
  kalamai_term_signals: [],
  kalamai_corpus_terms: [],
  kalamai_corpus_totals: [],
};

class Query {
  private mode: "select" | "update" | "upsert" | "insert" | "delete" = "select";
  private filters: [string, unknown][] = [];
  private orGroups: string[] = [];
  private selectRequested = false;
  private patch: Row = {};
  private rows: Row[] = [];
  private conflict = "";
  private orderCol = "";
  private limitN = Infinity;

  constructor(private table: string) {}

  select() {
    // On a write chain (.update(...).select()), keep the write mode but return
    // the affected rows — don't clobber it back to a plain select.
    this.selectRequested = true;
    if (this.mode === "select") this.mode = "select";
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
  delete() {
    this.mode = "delete";
    return this;
  }
  eq(col: string, val: unknown) {
    this.filters.push([col, val]);
    return this;
  }
  // Only the shapes runStep uses: "col.is.null" / "col.lt.<value>", comma-joined.
  or(expr: string) {
    this.orGroups.push(expr);
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
  private orOk(r: Row, expr: string): boolean {
    return expr.split(",").some((cond) => {
      const [col, op, ...rest] = cond.split(".");
      const val = rest.join(".");
      if (op === "is" && val === "null") return r[col] == null;
      if (op === "lt") return r[col] != null && String(r[col]) < val;
      return false;
    });
  }
  private match(): Row[] {
    let rows = this.table_().filter(
      (r) => this.filters.every(([c, v]) => r[c] === v) && this.orGroups.every((g) => this.orOk(r, g)),
    );
    if (this.orderCol) rows = [...rows].sort((a, b) => Number(a[this.orderCol]) - Number(b[this.orderCol]));
    if (this.limitN !== Infinity) rows = rows.slice(0, this.limitN);
    return rows;
  }
  private resolve(): { data: Row[] | null; error: null } {
    if (this.mode === "select") return { data: this.match(), error: null };
    if (this.mode === "update") {
      const matched = this.match(); // evaluate filters BEFORE applying the patch
      for (const r of matched) Object.assign(r, this.patch);
      return { data: this.selectRequested ? matched.map((r) => ({ ...r })) : null, error: null };
    }
    if (this.mode === "insert") {
      this.table_().push(...this.rows.map((r) => ({ ...r })));
      return { data: null, error: null };
    }
    if (this.mode === "delete") {
      store[this.table] = this.table_().filter((r) => !this.filters.every(([c, v]) => r[c] === v));
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

// Long enough (>250 words) to clear the distill competitor threshold + trip Readability.
const LONG_BODY = Array.from(
  { length: 40 },
  (_, i) =>
    `<p>Section ${i}: digital marketing agencies offer seo, content marketing, ppc, and social ` +
    `media services for local businesses seeking growth, leads, and brand visibility online.</p>`,
).join("");
const PAGE_HTML = (url: string) =>
  `<html><head><title>Digital Marketing in Nagpur</title><meta name="description" content="seo and content"></head>` +
  `<body><main><article><h1>Digital Marketing Company</h1><h2>SEO Services</h2>${LONG_BODY}` +
  `<p>contact us ${url}</p></article></main></body></html>`;

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

    // Competitor chunks embedded (fake-embed) with the pinned model.
    const chunks = store.kalamai_chunks;
    expect(chunks.length).toBeGreaterThanOrEqual(8); // >= 1 per ok page
    expect(chunks.every((c) => c.source_type === "competitor")).toBe(true);
    expect(chunks.every((c) => c.embedding_model === "gemini-embedding-001")).toBe(true);

    // distill v2 wrote gated term signals + clusters (shadow, alongside v1).
    expect(store.kalamai_term_signals.length).toBeGreaterThan(0);
    expect((a.report as { clusters?: unknown[] }).clusters).toBeDefined();
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
