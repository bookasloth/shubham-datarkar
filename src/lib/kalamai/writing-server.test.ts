import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";

vi.mock("server-only", () => ({}));

beforeAll(() => {
  process.env.KALAMAI_FAKE_LLM = "1";
});

// ---- minimal in-memory Supabase mock (same shape as analysis-server.test) ----
type Row = Record<string, unknown>;
const store: Record<string, Row[]> = {
  kalamai_articles: [],
  kalamai_analyses: [],
  kalamai_llm_calls: [],
  kalamai_events: [],
  kalamai_pages: [],
};

class Query {
  private mode: "select" | "update" | "insert" = "select";
  private filters: [string, unknown][] = [];
  private orGroups: string[] = [];
  private selectRequested = false;
  private patch: Row = {};
  private rows: Row[] = [];

  constructor(private table: string) {}
  select() {
    this.selectRequested = true;
    return this;
  }
  update(patch: Row) {
    this.mode = "update";
    this.patch = patch;
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
  or(expr: string) {
    this.orGroups.push(expr);
    return this;
  }
  order() {
    return this;
  }
  limit() {
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
    return this.table_().filter(
      (r) => this.filters.every(([c, v]) => r[c] === v) && this.orGroups.every((g) => this.orOk(r, g)),
    );
  }
  private resolve(): { data: Row[] | null; error: null } {
    if (this.mode === "select") return { data: this.match(), error: null };
    if (this.mode === "update") {
      const matched = this.match();
      for (const r of matched) Object.assign(r, this.patch);
      return { data: this.selectRequested ? matched.map((r) => ({ ...r })) : null, error: null };
    }
    this.table_().push(...this.rows.map((r) => ({ ...r })));
    return { data: null, error: null };
  }
}
const mockDb = { from: (t: string) => new Query(t) };
vi.mock("@/lib/supabase/server", () => ({ supabaseAdmin: () => mockDb }));

import { runArticleStep } from "./writing-server";
import { FAKE_BRIEF } from "./brief";

function seed(over: { article?: Row; analysisReport?: unknown } = {}): void {
  store.kalamai_analyses.push({ id: "an-1", user_id: "user-1", report: over.analysisReport ?? { brief: FAKE_BRIEF } });
  store.kalamai_articles.push({
    id: "art-1",
    user_id: "user-1",
    analysis_id: "an-1",
    params: { targetWords: 300, tone: "professional", audience: "Nagpur SMB owners" },
    status: "queued",
    progress: 0,
    stage_state: {},
    blocks: null,
    meta: null,
    score: null,
    error: null,
    locked_at: null,
    ...over.article,
  });
}

async function drive(id: string): Promise<string[]> {
  const seen: string[] = [];
  for (let i = 0; i < 12; i++) {
    const { status } = await runArticleStep(id);
    seen.push(status);
    if (status === "complete" || status === "failed") break;
  }
  return seen;
}

beforeEach(() => {
  for (const k of Object.keys(store)) store[k] = [];
});

describe("runArticleStep", () => {
  it("walks queued → … → complete and persists blocks, meta, and score", async () => {
    seed();
    const seq = await drive("art-1");

    expect(seq[seq.length - 1]).toBe("complete");
    // drafts section-by-section (FAKE_OUTLINE has 3 sections) — status stays 'outlining'
    // for one poke per section before advancing to 'drafting'.
    expect(seq.filter((s) => s === "outlining").length).toBeGreaterThanOrEqual(3);
    const art = store.kalamai_articles[0];
    expect(art.status).toBe("complete");
    expect(art.progress).toBe(100);
    expect(Array.isArray(art.blocks)).toBe(true);
    expect((art.blocks as unknown[]).length).toBeGreaterThan(0);
    expect((art.meta as { title: string }).title).toBeTruthy();
    expect(typeof (art.score as { overall: number }).overall).toBe("number");

    const stages = store.kalamai_llm_calls.map((c) => c.stage);
    expect(stages).toContain("W1");
    expect(stages).toContain("W2");
    expect(stages).toContain("W3");
    expect(store.kalamai_events.some((e) => e.event === "article_completed")).toBe(true);
  });

  it("runs the W4 rewrite one section per call when the critique is not ok", async () => {
    seed({
      article: {
        status: "reviewing",
        stage_state: {
          plan: { title: "T", description: "D", ogTitle: "OG", ogDescription: "OGD", sections: [{ heading: "Only section", points: [], words: 300 }] },
          sectionBlocks: [[{ type: "p", text: "draft" }]],
          blocks: [{ type: "p", text: "draft" }],
          critique: { missingTerms: ["local seo"], missingSections: [], issues: ["thin intro"], ok: false },
        },
      },
    });
    const { status } = await runArticleStep("art-1");
    // single section → the rewrite loop finishes in one call and advances straight to scoring
    expect(status).toBe("scoring");
    expect(store.kalamai_llm_calls.some((c) => c.stage === "W4")).toBe(true);
    const art = store.kalamai_articles[0];
    expect((art.stage_state as { blocks: unknown[] }).blocks.length).toBeGreaterThan(0);
  });

  it("hard-fails and refunds (status→failed) when the source analysis has no brief", async () => {
    seed({ analysisReport: {} }); // report present but no .brief
    const { status } = await runArticleStep("art-1");
    expect(status).toBe("failed");
    const art = store.kalamai_articles[0];
    expect(art.status).toBe("failed");
    // Quota counts rows where status <> 'failed' — the failed row doesn't count.
    expect(store.kalamai_articles.filter((r) => r.user_id === "user-1" && r.status !== "failed")).toHaveLength(0);
    expect(store.kalamai_events.some((e) => e.event === "article_failed")).toBe(true);
  });
});
